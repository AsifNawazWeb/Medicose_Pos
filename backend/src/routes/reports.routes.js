const router = require('express').Router();
const Ctrl = require('../controllers/reports.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/summary', auth(true), Ctrl.summary);
router.get('/top-products', auth(true), Ctrl.topProducts);
router.get('/gst', auth(true), Ctrl.gst);

// 15+ endpoints (placeholders included)
router.get('/inventory-valuation', auth(true), Ctrl.inventoryValuation);
router.get('/sales-by-day', auth(true), Ctrl.salesByDay);
router.get('/sales-by-cashier', auth(true), Ctrl.salesByCashier);
router.get('/profit', auth(true), Ctrl.profitReport);
router.get('/low-stock', auth(true), Ctrl.lowStockReport);
router.get('/expiry', auth(true), Ctrl.expiryReport);
router.get('/customer-loyalty', auth(true), Ctrl.customerLoyaltyReport);
router.get('/returns', auth(true), Ctrl.returnsReport);
router.get('/purchase-orders', auth(true), Ctrl.purchaseOrdersReport);
router.get('/gstr1', auth(true), Ctrl.gstGstr1);
router.get('/gstr3b', auth(true), Ctrl.gstGstr3b);
router.get('/supplier-ledger', auth(true), Ctrl.supplierLedger);
router.get('/stock-movement', auth(true), Ctrl.stockMovementReport);

module.exports = router;
