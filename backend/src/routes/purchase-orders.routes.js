const router = require('express').Router();
const Ctrl = require('../controllers/purchase-orders.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// View routes — all authenticated users
router.get('/', auth(true), Ctrl.list);
router.get('/:id', auth(true), Ctrl.get);

// Write routes — admin, manager only
router.post('/', auth(true), requireRole('admin', 'manager'), Ctrl.create);
router.post('/:id/receive', auth(true), requireRole('admin', 'manager'), Ctrl.receive);

module.exports = router;