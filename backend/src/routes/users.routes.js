const router = require('express').Router();
const Users = require('../controllers/users.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// All user management routes require admin role
router.use(auth(true), requireRole('admin'));

router.get('/', Users.list);
router.post('/', Users.create);
router.put('/:id', Users.update);
router.patch('/:id/active', Users.setActive);
router.post('/:id/reset-password', Users.resetPassword);
router.get('/roles', Users.roles);

module.exports = router;