const router = require('express').Router();
const Ctrl = require('../controllers/products.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// View routes — all authenticated users
router.get('/', auth(true), Ctrl.list);
router.get('/scan/:barcode', auth(true), Ctrl.scan);
router.get('/:id', auth(true), Ctrl.get);

// Write routes — admin, manager, cashier (cashier can add stock but not create/delete products)
router.post('/', auth(true), requireRole('admin', 'manager'), Ctrl.create);
router.put('/:id', auth(true), requireRole('admin', 'manager'), Ctrl.update);
router.patch('/:id/stock', auth(true), requireRole('admin', 'manager', 'cashier'), Ctrl.updateStock);
router.delete('/:id', auth(true), requireRole('admin', 'manager'), Ctrl.remove);

module.exports = router;