const { getDb } = require('../config/db');

function summary({ from, to }) {
  const db = getDb();
  const params = [];
  let where = '';
  if (from && to) {
    where = 'WHERE createdAt BETWEEN ? AND ?';
    params.push(from, to);
  }
  const sales = db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(grandTotal),0) AS revenue FROM sales ${where}`).get(...params);
  const lowStock = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE isActive=1 AND stockQty <= reorderLevel`).get();
  const expiring = db.prepare(`SELECT COUNT(*) AS count FROM products WHERE isActive=1 AND expiryDate IS NOT NULL AND date(expiryDate) <= date('now','+30 day')`).get();
  const outOfStock = db.prepare(`
  SELECT COUNT(*) AS count
  FROM products
  WHERE isActive = 1 AND stockQty = 0
`).get();
  const activeProducts = db.prepare(`
  SELECT COUNT(*) AS count
  FROM products
  WHERE isActive = 1
`).get();
  return { sales, lowStock, expiring, outOfStock, activeProducts };
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
