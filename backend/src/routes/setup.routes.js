const router = require('express').Router();
const Setup = require('../controllers/setup.controller');

router.get('/status', Setup.status);
router.post('/admin', Setup.createAdmin);

module.exports = router;