const router = require('express').Router();
const Ctrl = require('../controllers/returns.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth(true), Ctrl.list);
router.post('/', auth(true), Ctrl.create);

module.exports = router;
