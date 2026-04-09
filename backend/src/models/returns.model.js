const { getDb } = require('../config/db');

function list({ limit = 50, offset = 0 }) {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, s.invoiceNo
    FROM returns r
    JOIN sales s ON s.id = r.saleId
    ORDER BY r.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

function create({ userId, saleId, reason = '', items = [] }) {
  const db = getDb();
  const now = new Date().toISOString();

  return db.transaction(() => {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    if (!sale) throw new Error('Sale not found');

    let refundTotal = 0;

    const retInfo = db.prepare(`
      INSERT INTO returns (saleId, userId, reason, refundTotal, createdAt)
      VALUES (?, ?, ?, 0, ?)
    `).run(saleId, userId, reason, now);

    const returnId = retInfo.lastInsertRowid;

    const itemStmt = db.prepare(`
      INSERT INTO return_items (returnId, productId, qty, refundAmount)
      VALUES (?, ?, ?, ?)
    `);
    const stockStmt = db.prepare('UPDATE products SET stockQty = stockQty + ?, updatedAt = ? WHERE id = ?');

    for (const it of items) {
      const qty = Number(it.qty || 0);
      if (qty <= 0) continue;
      const saleItem = db.prepare('SELECT * FROM sale_items WHERE saleId = ? AND productId = ?').get(saleId, it.productId);
      if (!saleItem) throw new Error('Invalid return item');
      const maxQty = saleItem.qty;
      if (qty > maxQty) throw new Error('Return qty exceeds sold qty');

      const refund = (saleItem.lineTotal / saleItem.qty) * qty;
      refundTotal += refund;

      itemStmt.run(returnId, it.productId, qty, refund);
      stockStmt.run(qty, now, it.productId);
    }

    db.prepare('UPDATE returns SET refundTotal = ? WHERE id = ?').run(refundTotal, returnId);

    return db.prepare('SELECT * FROM returns WHERE id = ?').get(returnId);
  })();
}

module.exports = { list, create };
