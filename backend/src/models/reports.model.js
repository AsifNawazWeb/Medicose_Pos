const { getDb } = require('../config/db');

function getTodayLocalRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function summary({ from, to } = {}) {
  const db = getDb();
  let fromDate = from;
  let toDate = to;

  if (!fromDate || !toDate) {
    const todayRange = getTodayLocalRange();
    fromDate = fromDate || todayRange.from;
    toDate = toDate || todayRange.to;
  } else {
    if (!fromDate.includes('T')) fromDate = `${fromDate}T00:00:00.000Z`;
    if (!toDate.includes('T')) toDate = `${toDate}T23:59:59.999Z`;
  }

  // 1. Today's Total Sales Count (Invoices)
  const salesCountRow = db.prepare(`
    SELECT COUNT(DISTINCT id) AS count
    FROM sales
    WHERE createdAt >= ? AND createdAt <= ? AND status != 'VOIDED'
  `).get(fromDate, toDate);

  // 2. Today's Revenue: SUM(selling_price * quantity)
  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(si.price * si.qty), 0) AS revenue
    FROM sales s
    JOIN sale_items si ON si.saleId = s.id
    WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != 'VOIDED'
  `).get(fromDate, toDate);

  // 3. Today's Profit: SUM((selling_price - cost_price) * quantity) using snapshot costPrice & price
  const profitRow = db.prepare(`
    SELECT COALESCE(SUM((si.price - si.costPrice) * si.qty), 0) AS profit
    FROM sales s
    JOIN sale_items si ON si.saleId = s.id
    WHERE s.createdAt >= ? AND s.createdAt <= ? AND s.status != 'VOIDED'
  `).get(fromDate, toDate);

  // 4. Expiring Soon: Continuous count of medicines in inventory expiring within 180 days (from today)
  const expiring = db.prepare(`
    SELECT COUNT(*) AS count
    FROM products
    WHERE isActive = 1
      AND expiryDate IS NOT NULL
      AND date(expiryDate) >= date('now', 'localtime')
      AND date(expiryDate) <= date('now', 'localtime', '+180 days')
  `).get();

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
    sales: {
      count: salesCountRow ? salesCountRow.count : 0,
      revenue: revenueRow ? revenueRow.revenue : 0,
    },
    profit: {
      profit: profitRow ? profitRow.profit : 0,
    },
    expiring: {
      count: expiring ? expiring.count : 0,
    },
    lowStock: {
      count: lowStock ? lowStock.count : 0,
    },
    outOfStock: {
      count: outOfStock ? outOfStock.count : 0,
    },
  };
}

function topProducts({ limit = 10 }) {
  const db = getDb();
  return db.prepare(`
    SELECT p.id, p.name, SUM(si.qty) AS qtySold
    FROM sale_items si
    JOIN products p ON p.id = si.productId
    GROUP BY p.id
    ORDER BY qtySold DESC
    LIMIT ?
  `).all(limit);
}

function gstReport({ from, to }) {
  const db = getDb();
  const params = [];
  let where = '';
  if (from && to) {
    where = 'WHERE s.createdAt BETWEEN ? AND ?';
    params.push(from, to);
  }
  return db.prepare(`
    SELECT date(s.createdAt) AS day, COALESCE(SUM(s.gstTotal),0) AS gstCollected, COALESCE(SUM(s.subTotal),0) AS taxableValue
    FROM sales s
    ${where}
    GROUP BY date(s.createdAt)
    ORDER BY day ASC
  `).all(...params);
}

// Additional report placeholders (return consistent shapes so UI works)
function emptyList() { return []; }

module.exports = {
  summary,
  topProducts,
  gstReport,
  // placeholders for the 15+ report types mentioned in the spec
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
