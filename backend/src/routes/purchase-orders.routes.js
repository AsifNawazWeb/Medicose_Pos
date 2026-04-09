const router = require('express').Router();
const Ctrl = require('../controllers/purchase-orders.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth(true), Ctrl.list);
router.get('/:id', auth(true), Ctrl.get);
router.post('/', auth(true), Ctrl.create);
router.post('/:id/receive', auth(true), Ctrl.receive);

module.exports = router;
