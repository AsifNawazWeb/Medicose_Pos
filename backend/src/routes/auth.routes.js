const router = require('express').Router();
const Auth = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rate-limit.middleware');

// Rate limit login attempts: max 5 per 15 minutes per email/username
router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), Auth.login);
router.get('/me', auth(true), Auth.me);
router.post('/change-password', auth(true), Auth.changePassword);

module.exports = router;