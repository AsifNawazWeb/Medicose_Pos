const router = require('express').Router();
const Ctrl = require('../controllers/returns.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// View routes — all authenticated users
router.get('/', auth(true), Ctrl.list);

// Create returns — admin, manager, cashier
router.post('/', auth(true), requireRole('admin', 'manager', 'cashier'), Ctrl.create);

module.exports = router;