const router = require('express').Router();
const Ctrl = require('../controllers/dashboard.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/stats', auth(true), Ctrl.stats);
router.get('/top-products', auth(true), Ctrl.topProducts);

module.exports = router;
