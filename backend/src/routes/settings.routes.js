const router = require('express').Router();
const Ctrl = require('../controllers/settings.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth(true), Ctrl.get);
router.put('/', auth(true), Ctrl.update);

module.exports = router;
