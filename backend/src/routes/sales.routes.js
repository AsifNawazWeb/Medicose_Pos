const router = require('express').Router();
const Ctrl   = require('../controllers/sales.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// View routes — all authenticated users
router.get('/',                              auth(true), Ctrl.list);
router.get('/:id',                           auth(true), Ctrl.get);
router.get('/ledger/:customerId',            auth(true), Ctrl.getLedger);

// Create sales — admin, manager, cashier
router.post('/',                             auth(true), requireRole('admin', 'manager', 'cashier'), Ctrl.create);
router.post('/payment/:customerId',          auth(true), requireRole('admin', 'manager', 'cashier'), Ctrl.recordPayment);

// Edit/delete — admin, manager only
router.put('/:id',                           auth(true), requireRole('admin', 'manager'), Ctrl.edit);
router.post('/delete-batch',                 auth(true), requireRole('admin', 'manager'), Ctrl.removeBatch);
router.post('/restore-batch',                auth(true), requireRole('admin', 'manager'), Ctrl.restoreBatch);

module.exports = router;