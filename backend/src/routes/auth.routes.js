const router = require('express').Router();
const Auth = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth.middleware');

router.post('/login', Auth.login);
router.post('/register', Auth.register);
router.get('/me', auth(true), Auth.me);
router.post('/change-password', auth(true), Auth.changePassword);

module.exports = router;
