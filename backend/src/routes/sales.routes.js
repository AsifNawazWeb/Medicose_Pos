const router = require('express').Router();
const Ctrl   = require('../controllers/sales.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/',                              auth(true), Ctrl.list);
router.get('/:id',                           auth(true), Ctrl.get);
router.post('/',                             auth(true), Ctrl.create);
router.put('/:id',                           auth(true), Ctrl.edit);          // NEW: edit bill
router.get('/ledger/:customerId',            auth(true), Ctrl.getLedger);     // NEW: customer ledger
router.post('/payment/:customerId',          auth(true), Ctrl.recordPayment); // NEW: record payment

module.exports = router;
