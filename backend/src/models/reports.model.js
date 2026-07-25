const { getDb } = require('../config/db');

function parseDateRange(from, to) {
  let fromDate = from;
  let toDate = to;

  if (!fromDate || !toDate) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0); // default to start of month
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    fromDate = fromDate || start.toISOString();
    toDate = toDate || end.toISOString();
  } else {
    if (!fromDate.includes('T')) fromDate = `${fromDate}T00:00:00.000Z`;
    if (!toDate.includes('T')) toDate = `${toDate}T23:59:59.999Z`;
  }
  return { fromDate, toDate };
}

function summary({ from, to } = {}) {
  const db = getDb();
  const { fromDate, toDate } = parseDateRange(from, to);

  // 1. Total Revenue & Total Invoices in Date Range
  const salesRow = db.prepare(`
    SELECT 
      COUNT(id) AS totalInvoices,
      COALESCE(SUM(grandTotal), 0) AS totalRevenue
    FROM sales
    WHERE createdAt >= ? AND createdAt <= ? AND status != 'VOIDED'
  `).get(fromDate, toDate);

  const totalInvoices = salesRow ? Number(salesRow.totalInvoices || 0) : 0;
  const totalRevenue = salesRow ? Number(salesRow.totalRevenue || 0) : 0;

  // 2. COGS (Cost of Goods Sold) in Date Range
  const cogsRow = db.prepare(`
    SELECT COALESCE(SUM(si.costPrice * si.qty), 0) AS cogs
    FROM sales s
    JOIN sale_items si ON si.saleId = s.id
    WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != 'VOIDED'
  `).get(fromDate, toDate);

  const cogs = cogsRow ? Number(cogsRow.cogs || 0) : 0;

  // 3. Profit & Profit Margin
  const netProfit = totalRevenue - cogs;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // 4. Total Current Inventory Value (Live stock, unsold items)
  const invRow = db.prepare(`
    SELECT COALESCE(SUM(stockQty * cost), 0) AS inventoryValue
    FROM products
    WHERE isActive = 1 AND stockQty > 0
  `).get();

  const totalInventoryValue = invRow ? Number(invRow.inventoryValue || 0) : 0;

  // 5. Near-Expiry / Expired Stock Alert (within 60 days)
  const expiryRow = db.prepare(`
    SELECT 
      COALESCE(SUM(stockQty * cost), 0) AS value,
      COUNT(*) AS count
    FROM products
    WHERE isActive = 1 
      AND stockQty > 0 
      AND expiryDate IS NOT NULL 
      AND date(expiryDate) <= date('now', 'localtime', '+60 days')
  `).get();

  const nearExpiryValue = expiryRow ? Number(expiryRow.value || 0) : 0;
  const nearExpiryCount = expiryRow ? Number(expiryRow.count || 0) : 0;

  // Legacy dashboard support queries
  const lowStock = db.prepare(`
    SELECT COUNT(*) AS count
    FROM products
    WHERE isActive = 1 AND stockQty > 0 AND stockQty <= reorderLevel
  `).get();

  const outOfStock = db.prepare(`
    SELECT COUNT(*) AS count
    FROM products
    WHERE isActive = 1 AND stockQty = 0
  `).get();

  return {
    totalRevenue,
    cogs,
    netProfit,
    profitMargin: Number(profitMargin.toFixed(2)),
    totalInvoices,
    avgInvoiceValue: Number(avgInvoiceValue.toFixed(2)),
    totalInventoryValue,
    nearExpiryValue,
    nearExpiryCount,

    // Legacy fields for backward compatibility
    sales: {
      count: totalInvoices,
      revenue: totalRevenue,
    },
    profit: {
      profit: netProfit,
    },
    expiring: {
      count: nearExpiryCount,
    },
    lowStock: {
      count: lowStock ? lowStock.count : 0,
    },
    outOfStock: {
      count: outOfStock ? outOfStock.count : 0,
    },
  };
}

function revenueTrend({ from, to } = {}) {
  const db = getDb();
  const { fromDate, toDate } = parseDateRange(from, to);

  const rows = db.prepare(`
    SELECT 
      date(createdAt) AS date,
      COALESCE(SUM(grandTotal), 0) AS revenue,
      COUNT(id) AS count
    FROM sales
    WHERE createdAt >= ? AND createdAt <= ? AND status != 'VOIDED'
    GROUP BY date(createdAt)
    ORDER BY date ASC
  `).all(fromDate, toDate);

  return rows.map(r => ({
    date: r.date,
    revenue: Number(r.revenue || 0),
    count: Number(r.count || 0)
  }));
}

function salesByCategory({ from, to } = {}) {
  const db = getDb();
  const { fromDate, toDate } = parseDateRange(from, to);

  const rows = db.prepare(`
    SELECT 
      COALESCE(NULLIF(TRIM(p.category), ''), 'General') AS category,
      COALESCE(SUM(si.lineTotal), 0) AS totalRevenue,
      COALESCE(SUM(si.qty), 0) AS totalQty
    FROM sales s
    JOIN sale_items si ON si.saleId = s.id
    LEFT JOIN products p ON p.id = si.productId
    WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != 'VOIDED'
    GROUP BY category
    ORDER BY totalRevenue DESC
  `).all(fromDate, toDate);

  return rows.map(r => ({
    category: r.category,
    totalRevenue: Number(r.totalRevenue || 0),
    totalQty: Number(r.totalQty || 0)
  }));
}

function topProducts({ from, to, limit = 10 } = {}) {
  const db = getDb();
  const limitNum = Number(limit) || 10;

  if (from && to) {
    const { fromDate, toDate } = parseDateRange(from, to);
    const rows = db.prepare(`
      SELECT 
        p.id, 
        p.name, 
        COALESCE(p.category, 'General') AS category,
        COALESCE(SUM(si.qty), 0) AS qtySold,
        COALESCE(SUM(si.lineTotal), 0) AS totalRevenue
      FROM sales s
      JOIN sale_items si ON si.saleId = s.id
      JOIN products p ON p.id = si.productId
      WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != 'VOIDED'
      GROUP BY p.id, p.name
      ORDER BY qtySold DESC
      LIMIT ?
    `).all(fromDate, toDate, limitNum);

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      qtySold: Number(r.qtySold || 0),
      totalRevenue: Number(r.totalRevenue || 0)
    }));
  }

  // Fallback for calls without date parameters (e.g., dashboard)
  const rows = db.prepare(`
    SELECT p.id, p.name, SUM(si.qty) AS qtySold
    FROM sale_items si
    JOIN products p ON p.id = si.productId
    GROUP BY p.id
    ORDER BY qtySold DESC
    LIMIT ?
  `).all(limitNum);

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    qtySold: Number(r.qtySold || 0)
  }));
}

function gstReport({ from, to } = {}) {
  const db = getDb();
  const params = [];
  let where = '';
  if (from && to) {
    const { fromDate, toDate } = parseDateRange(from, to);
    where = 'WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != "VOIDED"';
    params.push(fromDate, toDate);
  }
  return db.prepare(`
    SELECT date(s.createdAt) AS day, COALESCE(SUM(s.gstTotal),0) AS gstCollected, COALESCE(SUM(s.subTotal),0) AS taxableValue
    FROM sales s
    ${where}
    GROUP BY date(s.createdAt)
    ORDER BY day ASC
  `).all(...params);
}

// Additional report placeholders
function emptyList() { return []; }

module.exports = {
  summary,
  revenueTrend,
  salesByCategory,
  topProducts,
  gstReport,
  inventoryValuation: emptyList,
  salesByDay: emptyList,
  salesByCashier: emptyList,
  profitReport: emptyList,
  lowStockReport: emptyList,
  expiryReport: emptyList,
  customerLoyaltyReport: emptyList,
  returnsReport: emptyList,
  purchaseOrdersReport: emptyList,
  gstGstr1: emptyList,
  gstGstr3b: emptyList,
  supplierLedger: emptyList,
  stockMovementReport: emptyList,
};
