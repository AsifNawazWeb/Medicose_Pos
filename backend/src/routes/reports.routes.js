const router = require('express').Router();
const Ctrl = require('../controllers/reports.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// Reports — admin, manager, viewer (cashier has no access)
router.get('/summary', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.summary);
router.get('/revenue-trend', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.revenueTrend);
router.get('/sales-by-category', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.salesByCategory);
router.get('/top-products', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.topProducts);
router.get('/gst', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.gst);

// 15+ endpoints (placeholders included)
router.get('/inventory-valuation', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.inventoryValuation);
router.get('/sales-by-day', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.salesByDay);
router.get('/sales-by-cashier', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.salesByCashier);
router.get('/profit', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.profitReport);
router.get('/low-stock', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.lowStockReport);
router.get('/expiry', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.expiryReport);
router.get('/customer-loyalty', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.customerLoyaltyReport);
router.get('/returns', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.returnsReport);
router.get('/purchase-orders', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.purchaseOrdersReport);
router.get('/gstr1', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.gstGstr1);
router.get('/gstr3b', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.gstGstr3b);
router.get('/supplier-ledger', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.supplierLedger);
router.get('/stock-movement', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.stockMovementReport);

module.exports = router;