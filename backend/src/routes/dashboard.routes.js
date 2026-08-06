const router = require('express').Router();
const Ctrl = require('../controllers/dashboard.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// Dashboard — admin, manager, viewer (cashier has no access)
router.get('/stats', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.stats);
router.get('/top-products', auth(true), requireRole('admin', 'manager', 'viewer'), Ctrl.topProducts);

module.exports = router;