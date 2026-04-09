const router = require('express').Router();
const Ctrl = require('../controllers/suppliers.controller');
const { auth } = require('../middlewares/auth.middleware');

router.get('/', auth(true), Ctrl.list);
router.get('/:id', auth(true), Ctrl.get);
router.post('/', auth(true), Ctrl.create);
router.put('/:id', auth(true), Ctrl.update);
router.delete('/:id', auth(true), Ctrl.remove);

module.exports = router;
