const router = require('express').Router();
const Ctrl = require('../controllers/suppliers.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// View routes — all authenticated users
router.get('/', auth(true), Ctrl.list);
router.get('/:id', auth(true), Ctrl.get);

// Write routes — admin, manager only
router.post('/', auth(true), requireRole('admin', 'manager'), Ctrl.create);
router.put('/:id', auth(true), requireRole('admin', 'manager'), Ctrl.update);
router.delete('/:id', auth(true), requireRole('admin', 'manager'), Ctrl.remove);

module.exports = router;