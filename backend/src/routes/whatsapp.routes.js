const router = require('express').Router();
const Ctrl = require('../controllers/whatsapp.controller');
const { auth } = require('../middlewares/auth.middleware');

router.post('/invoice-link', auth(true), Ctrl.invoiceLink);

module.exports = router;
