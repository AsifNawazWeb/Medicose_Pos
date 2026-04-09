// /**
//  * sales.model.js — All features: new customer, balance, discounts, packaging, edit bill
//  */
// [... legacy commented code preserved above this line ...]

/**
 * sales.model.js — Fixed FK constraint issue + extraDiscount support.
 * Root cause: userId / customerId not validated before INSERT.
 * Fix: validate both outside the transaction; cast to int or null.
 *
 * extraDiscount: a second per-item discount applied AFTER productDiscount.
 *   price=100, productDiscount=10% → 90, extraDiscount=5% → 85.5
 * Backward compatible: if the extraDiscount column is missing in sale_items,
 * the model falls back to the old INSERT statement gracefully.
 */
const { getDb } = require('../config/db');
const { nanoid } = require('nanoid');

// ─────────────────────────────────────────────────────────────────────────────
// Schema detection — called once per request, OUTSIDE any transaction
// ─────────────────────────────────────────────────────────────────────────────
function getSchemaInfo(db) {
  const saleCols  = db.prepare("PRAGMA table_info('sales')").all().map(r => r.name);
  const siCols    = db.prepare("PRAGMA table_info('sale_items')").all().map(r => r.name);
  const custCols  = db.prepare("PRAGMA table_info('customers')").all().map(r => r.name);
  const hasLedger = !!db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='customer_ledger'"
  ).get();
  return {
    hasNewSaleCols:  saleCols.includes('amountPaid'),
    hasExtItemCols:  siCols.includes('productDiscount'),    // extended item cols (productDiscount etc.)
    hasExtraDiscCols: siCols.includes('extraDiscount'),     // new: extraDiscount column
    hasBalance:      custCols.includes('balance'),
    hasLedger,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe integer cast — returns integer or null (never undefined / NaN / 0)
// ─────────────────────────────────────────────────────────────────────────────
function toIdOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────────────────────────────────────
function list({ from, to, q = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const clauses = [], params = [];
  if (from) { clauses.push('s.createdAt >= ?'); params.push(from); }
  if (to)   { clauses.push('s.createdAt <= ?'); params.push(to + 'T23:59:59.999Z'); }
  const qq = String(q || '').trim();
  if (qq) { clauses.push('(s.invoiceNo LIKE ? OR c.name LIKE ?)'); params.push(`%${qq}%`, `%${qq}%`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(`
    SELECT s.*, c.name AS customerName, c.phone AS customerPhone
    FROM sales s LEFT JOIN customers c ON c.id = s.customerId
    ${where} ORDER BY s.createdAt DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET BY ID
// ─────────────────────────────────────────────────────────────────────────────
function getById(id) {
  const db   = getDb();
  const sale = db.prepare(`
    SELECT s.*, c.name AS customerName, c.phone AS customerPhone, c.balance AS customerBalance
    FROM sales s LEFT JOIN customers c ON c.id = s.customerId WHERE s.id = ?
  `).get(id);
  if (!sale) return null;
  const items = db.prepare(`
    SELECT si.*, p.name AS productName, p.barcode, p.unitsPerStrip, p.stripsPerBox
    FROM sale_items si JOIN products p ON p.id = si.productId
    WHERE si.saleId = ? ORDER BY si.id ASC
  `).all(id);
  return { ...sale, items };
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
function create({
  userId,
  customerId     = null,
  isNewCustomer  = false,
  customerName   = null,
  customerPhone  = null,
  paymentMethod  = 'CASH',
  items          = [],
  discount       = 0,
  billDiscount   = 0,
  amountPaid     = null,
}) {
  const db = getDb();
  if (!Array.isArray(items) || items.length === 0) throw new Error('No items');

  // ── 1. Validate and cast userId  (OUTSIDE transaction) ─────────────────
  const safeUserId = toIdOrNull(userId);
  if (!safeUserId) throw new Error('Invalid userId');

  const userRow = db.prepare('SELECT id FROM users WHERE id = ?').get(safeUserId);
  if (!userRow) throw new Error(`User ${safeUserId} not found`);

  // ── 2. Validate customerId if provided  (OUTSIDE transaction) ──────────
  let safeCustomerId = toIdOrNull(customerId); // null for walk-in / new customer

  if (safeCustomerId && !isNewCustomer) {
    const custRow = db.prepare('SELECT id FROM customers WHERE id = ?').get(safeCustomerId);
    if (!custRow) {
      // Customer was deleted — fall back to walk-in rather than crashing
      safeCustomerId = null;
    }
  } else if (!isNewCustomer) {
    safeCustomerId = null; // explicit walk-in
  }

  // ── 3. Detect schema  (OUTSIDE transaction) ────────────────────────────
  const { hasNewSaleCols, hasExtItemCols, hasExtraDiscCols, hasBalance, hasLedger } = getSchemaInfo(db);

  // ── 4. Pre-fetch prevBalance for existing customer  (OUTSIDE tx) ────────
  let prevBalance = 0;
  if (safeCustomerId && hasBalance) {
    const cust = db.prepare('SELECT balance FROM customers WHERE id = ?').get(safeCustomerId);
    prevBalance = cust ? Number(cust.balance || 0) : 0;
  }

  // ── 5. Pre-prepare all SQL statements  (OUTSIDE transaction) ───────────
  // Customer INSERT variants
  const insertCustWithBalance = hasBalance
    ? db.prepare('INSERT INTO customers (name,phone,email,address,loyaltyPoints,balance,createdAt,updatedAt) VALUES (?,?,NULL,NULL,0,0,?,?)')
    : null;
  const insertCustNoBalance   = db.prepare('INSERT INTO customers (name,phone,email,address,loyaltyPoints,createdAt,updatedAt) VALUES (?,?,NULL,NULL,0,?,?)');
  const findCustByPhone       = db.prepare('SELECT id FROM customers WHERE phone = ? LIMIT 1');
  const findCustByName        = db.prepare('SELECT id FROM customers WHERE name = ? LIMIT 1');
  const getCustBalance        = hasBalance ? db.prepare('SELECT balance FROM customers WHERE id = ?') : null;

  // Sale INSERT variants
  const insertSaleStmt = hasNewSaleCols
    ? db.prepare(`
        INSERT INTO sales
          (invoiceNo,userId,customerId,paymentMethod,subTotal,gstTotal,
           discount,billDiscount,grandTotal,amountPaid,balanceDue,prevBalance,
           status,createdAt,updatedAt,totalItems)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'COMPLETED',?,?,?)
      `)
    : db.prepare(`
        INSERT INTO sales
          (invoiceNo,userId,customerId,paymentMethod,
           subTotal,gstTotal,discount,grandTotal,status,createdAt,updatedAt,totalItems)
        VALUES (?,?,?,?,?,?,?,?,'COMPLETED',?,?,?)
      `);

  // Sale item INSERT — 3 variants for backward compatibility:
  //   hasExtraDiscCols → 11 cols (includes extraDiscount + extraDiscountAmount)
  //   hasExtItemCols   → 10 cols (productDiscount but no extraDiscount)
  //   base             →  7 cols (old schema)
  const insertItemStmt = hasExtraDiscCols
    ? db.prepare(`
        INSERT INTO sale_items
          (saleId,productId,qty,price,productDiscount,discountAmount,
           extraDiscount,extraDiscountAmount,gstRate,gstAmount,lineTotal,packagingUnit)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `)
    : hasExtItemCols
      ? db.prepare(`
          INSERT INTO sale_items
            (saleId,productId,qty,price,productDiscount,discountAmount,gstRate,gstAmount,lineTotal,packagingUnit)
          VALUES (?,?,?,?,?,?,?,?,?,?)
        `)
      : db.prepare(`
          INSERT INTO sale_items (saleId,productId,qty,price,gstRate,gstAmount,lineTotal)
          VALUES (?,?,?,?,?,?,?)
        `);

  const updateStockStmt   = db.prepare('UPDATE products SET stockQty = stockQty - ?, updatedAt = ? WHERE id = ?');
  const updateCustBalance = hasBalance
    ? db.prepare('UPDATE customers SET balance = ?, loyaltyPoints = loyaltyPoints + ?, updatedAt = ? WHERE id = ?')
    : null;
  const updateCustPoints  = db.prepare('UPDATE customers SET loyaltyPoints = loyaltyPoints + ?, updatedAt = ? WHERE id = ?');
  const insertLedgerStmt  = hasLedger
    ? db.prepare('INSERT INTO customer_ledger (customerId,billId,type,debit,credit,balance,note,createdAt) VALUES (?,?,?,?,?,?,?,?)')
    : null;

  // ── 6. Transaction ───────────────────────────────────────────────────────
  return db.transaction(() => {
    const now       = new Date().toISOString();
    const invoiceNo = `INV-${day(now)}-${nanoid(6).toUpperCase()}`;

    // Resolve / create customer
    let resolvedId = safeCustomerId; // null or validated integer

    if (isNewCustomer && customerName) {
      let existing = null;
      if (customerPhone) existing = findCustByPhone.get(customerPhone);
      if (!existing)     existing = findCustByName.get(customerName);

      if (existing) {
        resolvedId = existing.id;
      } else {
        // Create new customer
        const info = (insertCustWithBalance || insertCustNoBalance)
          .run(customerName, customerPhone || null, now, now);
        resolvedId = toIdOrNull(info.lastInsertRowid);
      }

      // Fetch prevBalance for the just-created / found customer
      if (resolvedId && getCustBalance) {
        const c = getCustBalance.get(resolvedId);
        prevBalance = c ? Number(c.balance || 0) : 0;
      }
    }

    // resolvedId is now null or a valid customer id that definitely exists
    resolvedId = toIdOrNull(resolvedId);

    // ── Compute totals with dual-discount logic ──────────────────────────
    let subTotal = 0, gstTotal = 0, totalProdDiscAmt = 0, totalExtraDiscAmt = 0;
    const processed = items.map(it => {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(toIdOrNull(it.productId));
      if (!p || p.isActive === 0) throw new Error('Invalid product');
      const qty      = Number(it.qty || 0);
      if (qty <= 0) throw new Error('Invalid quantity');
      if (p.stockQty < qty) throw new Error(`Insufficient stock for ${p.name}`);

      const price    = Number(it.price    ?? p.price);
      const pDisc    = Math.max(0, Math.min(100, Number(it.productDiscount ?? p.productDiscount ?? 0)));
      // extraDiscount: clamp 0–100, default 0 for backward compat
      const eDisc    = Math.max(0, Math.min(100, Number(it.extraDiscount ?? 0)));
      const gstRate  = Number(it.gstRate  ?? p.gstRate ?? 0);
      const packUnit = it.packagingUnit || p.packagingUnit || 'unit';

      const lineBase     = price * qty;
      // Step 1: apply productDiscount on base price
      const discAmt      = lineBase * (pDisc / 100);
      const afterProdDisc = lineBase - discAmt;
      // Step 2: apply extraDiscount on already-discounted price
      const extraDiscAmt  = afterProdDisc * (eDisc / 100);
      const afterAllDisc  = afterProdDisc - extraDiscAmt;
      // Step 3: apply GST on final net price
      const gstAmt       = afterAllDisc * (gstRate / 100);
      const lineTotal    = afterAllDisc + gstAmt;

      subTotal          += lineBase;
      totalProdDiscAmt  += discAmt;
      totalExtraDiscAmt += extraDiscAmt;
      gstTotal          += gstAmt;

      return { productId: p.id, qty, price, pDisc, discAmt, eDisc, extraDiscAmt, gstRate, gstAmt, lineTotal, packUnit };
    });

    const totalItemDiscAmt = totalProdDiscAmt + totalExtraDiscAmt;
    const afterProdDisc = subTotal - totalItemDiscAmt + gstTotal;
    const billDiscPct   = Math.max(0, Math.min(100, Number(billDiscount || 0)));
    const billDiscAmt   = afterProdDisc * (billDiscPct / 100);
    const flatDiscount  = Math.max(0, Number(discount || 0));
    const grandTotal    = Math.max(0, afterProdDisc - billDiscAmt - flatDiscount);
    const paid          = amountPaid !== null ? Math.max(0, Number(amountPaid)) : grandTotal;
    const balanceDue    = Math.max(0, grandTotal - paid);

    // Insert sale — userId and customerId are now guaranteed valid
    const saleInfo = hasNewSaleCols
      ? insertSaleStmt.run(
          invoiceNo, safeUserId, resolvedId, paymentMethod,
          subTotal, gstTotal, totalItemDiscAmt + flatDiscount, billDiscAmt, grandTotal,
          paid, balanceDue, prevBalance,
          now, now, items.length
        )
      : insertSaleStmt.run(
          invoiceNo, safeUserId, resolvedId, paymentMethod,
          subTotal, gstTotal, totalItemDiscAmt + flatDiscount, grandTotal,
          now, now, items.length
        );

    const saleId = saleInfo.lastInsertRowid;

    // Insert items + update stock
    for (const it of processed) {
      if (hasExtraDiscCols) {
        // Full schema: include both productDiscount and extraDiscount
        insertItemStmt.run(saleId, it.productId, it.qty, it.price, it.pDisc, it.discAmt, it.eDisc, it.extraDiscAmt, it.gstRate, it.gstAmt, it.lineTotal, it.packUnit);
      } else if (hasExtItemCols) {
        // Partial schema: productDiscount only (no extraDiscount column yet)
        insertItemStmt.run(saleId, it.productId, it.qty, it.price, it.pDisc, it.discAmt, it.gstRate, it.gstAmt, it.lineTotal, it.packUnit);
      } else {
        // Legacy schema
        insertItemStmt.run(saleId, it.productId, it.qty, it.price, it.gstRate, it.gstAmt, it.lineTotal);
      }
      updateStockStmt.run(it.qty, now, it.productId);
    }

    // Update customer balance + ledger
    if (resolvedId) {
      const points     = Math.floor(grandTotal / 100);
      const newBalance = prevBalance + balanceDue;

      if (updateCustBalance) {
        updateCustBalance.run(newBalance, points, now, resolvedId);
      } else {
        updateCustPoints.run(points, now, resolvedId);
      }

      if (insertLedgerStmt) {
        insertLedgerStmt.run(resolvedId, saleId, 'SALE', grandTotal, paid, newBalance, `Invoice ${invoiceNo}`, now);
      }
    }

    return getById(saleId);
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// EDIT
// ─────────────────────────────────────────────────────────────────────────────
function edit(saleId, { items = [], billDiscount = 0, amountPaid = null }) {
  const db = getDb();
  const { hasNewSaleCols, hasExtItemCols, hasExtraDiscCols, hasBalance, hasLedger } = getSchemaInfo(db);

  // Prepare item INSERT matching current schema
  const insertItemStmt = hasExtraDiscCols
    ? db.prepare(`
        INSERT INTO sale_items
          (saleId,productId,qty,price,productDiscount,discountAmount,
           extraDiscount,extraDiscountAmount,gstRate,gstAmount,lineTotal,packagingUnit)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `)
    : hasExtItemCols
      ? db.prepare('INSERT INTO sale_items (saleId,productId,qty,price,productDiscount,discountAmount,gstRate,gstAmount,lineTotal,packagingUnit) VALUES (?,?,?,?,?,?,?,?,?,?)')
      : db.prepare('INSERT INTO sale_items (saleId,productId,qty,price,gstRate,gstAmount,lineTotal) VALUES (?,?,?,?,?,?,?)');

  return db.transaction(() => {
    const now  = new Date().toISOString();
    const orig = getById(saleId);
    if (!orig) throw new Error('Sale not found');
    if (orig.status === 'VOIDED') throw new Error('Cannot edit a voided sale');

    // Restore stock for original items
    for (const oi of orig.items) {
      db.prepare('UPDATE products SET stockQty = stockQty + ?, updatedAt = ? WHERE id = ?').run(oi.qty, now, oi.productId);
    }
    db.prepare('DELETE FROM sale_items WHERE saleId = ?').run(saleId);

    let subTotal = 0, gstTotal = 0, totalProdDiscAmt = 0, totalExtraDiscAmt = 0;
    const processed = items.map(it => {
      const p = db.prepare('SELECT * FROM products WHERE id = ?').get(toIdOrNull(it.productId));
      if (!p) throw new Error('Invalid product');
      const qty      = Math.max(0, Number(it.qty || 0));
      const price    = Number(it.price    ?? p.price);
      const pDisc    = Math.max(0, Math.min(100, Number(it.productDiscount ?? 0)));
      const eDisc    = Math.max(0, Math.min(100, Number(it.extraDiscount   ?? 0)));
      const gstRate  = Number(it.gstRate  ?? p.gstRate ?? 0);
      const packUnit = it.packagingUnit || 'unit';

      const lineBase      = price * qty;
      const discAmt       = lineBase * (pDisc / 100);
      const afterProdDisc = lineBase - discAmt;
      const extraDiscAmt  = afterProdDisc * (eDisc / 100);
      const afterAllDisc  = afterProdDisc - extraDiscAmt;
      const gstAmt        = afterAllDisc * (gstRate / 100);
      const lineTotal     = afterAllDisc + gstAmt;

      subTotal          += lineBase;
      totalProdDiscAmt  += discAmt;
      totalExtraDiscAmt += extraDiscAmt;
      gstTotal          += gstAmt;

      return { p, qty, price, pDisc, discAmt, eDisc, extraDiscAmt, gstRate, gstAmt, lineTotal, packUnit };
    });

    const totalItemDiscAmt = totalProdDiscAmt + totalExtraDiscAmt;
    const afterProdDisc = subTotal - totalItemDiscAmt + gstTotal;
    const billDiscPct   = Math.max(0, Math.min(100, Number(billDiscount || 0)));
    const billDiscAmt   = afterProdDisc * (billDiscPct / 100);
    const grandTotal    = Math.max(0, afterProdDisc - billDiscAmt);
    const paid          = amountPaid !== null ? Math.max(0, Number(amountPaid)) : grandTotal;
    const balanceDue    = Math.max(0, grandTotal - paid);

    let newItemCount = 0;
    for (const it of processed) {
      if (it.qty > 0) {
        if (it.p.stockQty < it.qty) throw new Error(`Insufficient stock for ${it.p.name}`);
        if (hasExtraDiscCols) {
          insertItemStmt.run(saleId, it.p.id, it.qty, it.price, it.pDisc, it.discAmt, it.eDisc, it.extraDiscAmt, it.gstRate, it.gstAmt, it.lineTotal, it.packUnit);
        } else if (hasExtItemCols) {
          insertItemStmt.run(saleId, it.p.id, it.qty, it.price, it.pDisc, it.discAmt, it.gstRate, it.gstAmt, it.lineTotal, it.packUnit);
        } else {
          insertItemStmt.run(saleId, it.p.id, it.qty, it.price, it.gstRate, it.gstAmt, it.lineTotal);
        }
        db.prepare('UPDATE products SET stockQty = stockQty - ?, updatedAt = ? WHERE id = ?').run(it.qty, now, it.p.id);
        newItemCount++;
      }
    }

    if (hasNewSaleCols) {
      db.prepare('UPDATE sales SET subTotal=?,gstTotal=?,discount=?,billDiscount=?,grandTotal=?,amountPaid=?,balanceDue=?,totalItems=?,updatedAt=? WHERE id=?')
        .run(subTotal, gstTotal, totalItemDiscAmt, billDiscAmt, grandTotal, paid, balanceDue, newItemCount, now, saleId);
    } else {
      db.prepare('UPDATE sales SET subTotal=?,gstTotal=?,discount=?,grandTotal=?,totalItems=?,updatedAt=? WHERE id=?')
        .run(subTotal, gstTotal, totalItemDiscAmt, grandTotal, newItemCount, now, saleId);
    }

    if (orig.customerId && hasNewSaleCols && hasBalance) {
      const oldBal = Number(orig.balanceDue || 0);
      const delta  = balanceDue - oldBal;
      if (delta !== 0) {
        const cust   = db.prepare('SELECT balance FROM customers WHERE id = ?').get(orig.customerId);
        const newBal = Math.max(0, Number(cust ? cust.balance : 0) + delta);
        db.prepare('UPDATE customers SET balance = ?, updatedAt = ? WHERE id = ?').run(newBal, now, orig.customerId);
        if (hasLedger) {
          db.prepare('INSERT INTO customer_ledger (customerId,billId,type,debit,credit,balance,note,createdAt) VALUES (?,?,?,?,?,?,?,?)')
            .run(orig.customerId, saleId, 'ADJUSTMENT',
                 delta > 0 ? delta : 0, delta < 0 ? Math.abs(delta) : 0,
                 newBal, `Bill edit – ${orig.invoiceNo}`, now);
        }
      }
    }

    return getById(saleId);
  })();
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER
// ─────────────────────────────────────────────────────────────────────────────
function getCustomerLedger(customerId) {
  const db = getDb();
  const { hasLedger } = getSchemaInfo(db);
  if (!hasLedger) return [];
  return db.prepare(`
    SELECT cl.*, s.invoiceNo FROM customer_ledger cl
    LEFT JOIN sales s ON s.id = cl.billId
    WHERE cl.customerId = ? ORDER BY cl.createdAt DESC LIMIT 100
  `).all(customerId);
}

function recordPayment({ customerId, amount, note = '' }) {
  const db = getDb();
  if (!customerId || amount <= 0) throw new Error('Invalid payment');
  const { hasBalance, hasLedger } = getSchemaInfo(db);
  return db.transaction(() => {
    const now  = new Date().toISOString();
    const cust = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!cust) throw new Error('Customer not found');
    if (hasBalance) {
      const newBal = Math.max(0, Number(cust.balance || 0) - amount);
      db.prepare('UPDATE customers SET balance = ?, updatedAt = ? WHERE id = ?').run(newBal, now, customerId);
      if (hasLedger) {
        db.prepare('INSERT INTO customer_ledger (customerId,billId,type,debit,credit,balance,note,createdAt) VALUES (?,NULL,?,0,?,?,?,?)')
          .run(customerId, 'PAYMENT', amount, newBal, note || 'Manual payment', now);
      }
      return { balance: newBal };
    }
    return { balance: 0 };
  })();
}

function day(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

module.exports = { list, getById, create, edit, getCustomerLedger, recordPayment };