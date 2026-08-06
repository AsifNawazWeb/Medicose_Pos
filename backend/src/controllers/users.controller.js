const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { AppError } = require('../utils/errors');
const User = require('../models/user.model');
const Audit = require('../models/audit.model');

const createUserSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes and underscores'),
  password: z.string().min(8).max(128),
  role:     z.enum(['admin', 'manager', 'cashier', 'viewer']),
  phone:    z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  name:     z.string().min(2).max(80).optional(),
  phone:    z.string().optional().nullable(),
  role:     z.enum(['admin', 'manager', 'cashier', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

// ─────────────────────────────────────────────────────────────────────────────
// LIST USERS
// ─────────────────────────────────────────────────────────────────────────────
function list(req, res) {
  const users = User.listUsers();
  res.json({ ok: true, data: users });
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE USER
// ─────────────────────────────────────────────────────────────────────────────
async function create(req, res) {
  const body = createUserSchema.parse(req.body);
  const email = body.email.toLowerCase();
  const username = body.username.toLowerCase();

  if (User.findByEmail(email)) {
    throw new AppError('Email already exists', 409, 'AUTH_EXISTS');
  }
  if (User.findByUsername(username)) {
    throw new AppError('Username already exists', 409, 'AUTH_EXISTS');
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = User.createUser({
    email,
    username,
    name: body.name,
    role: body.role,
    passwordHash,
    phone: body.phone || null,
    createdBy: req.user.id,
  });

  Audit.log('CREATE_USER', req.user.id, `Created user "${username}" with role ${body.role}`);

  res.status(201).json({ ok: true, user });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE USER
// ─────────────────────────────────────────────────────────────────────────────
function update(req, res) {
  const id = Number(req.params.id);
  const body = updateUserSchema.parse(req.body);

  const target = User.findById(id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  // Prevent demoting the last active admin
  if (target.role === 'admin' && body.role && body.role !== 'admin') {
    const adminCount = User.countAdmins();
    if (adminCount <= 1) {
      throw new AppError('Cannot demote the last remaining admin', 400, 'LAST_ADMIN');
    }
  }

  // Prevent disabling the last active admin
  if (target.role === 'admin' && body.isActive === false) {
    const adminCount = User.countAdmins();
    if (adminCount <= 1) {
      throw new AppError('Cannot disable the last remaining admin', 400, 'LAST_ADMIN');
    }
  }

  // Prevent admin from changing their own role or disabling themselves
  if (id === req.user.id && (body.role || body.isActive === false)) {
    throw new AppError('You cannot change your own role or disable your own account', 400, 'SELF_CHANGE');
  }

  const user = User.updateUser(id, body);
  Audit.log('UPDATE_USER', req.user.id, `Updated user "${target.username}"`);

  res.json({ ok: true, user });
}

// ─────────────────────────────────────────────────────────────────────────────
// DISABLE / ENABLE USER
// ─────────────────────────────────────────────────────────────────────────────
function setActive(req, res) {
  const id = Number(req.params.id);
  const isActive = req.body?.isActive === true;

  const target = User.findById(id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  // Prevent disabling the last active admin
  if (target.role === 'admin' && !isActive) {
    const adminCount = User.countAdmins();
    if (adminCount <= 1) {
      throw new AppError('Cannot disable the last remaining admin', 400, 'LAST_ADMIN');
    }
  }

  // Prevent disabling self
  if (id === req.user.id) {
    throw new AppError('You cannot disable your own account', 400, 'SELF_CHANGE');
  }

  User.setActive(id, isActive);
  Audit.log(isActive ? 'ENABLE_USER' : 'DISABLE_USER', req.user.id, `${isActive ? 'Enabled' : 'Disabled'} user "${target.username}"`);

  res.json({ ok: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
async function resetPassword(req, res) {
  const id = Number(req.params.id);
  const body = resetPasswordSchema.parse(req.body);

  const target = User.findById(id);
  if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  User.updatePassword(id, passwordHash);
  User.setMustChangePassword(id, 1);

  Audit.log('RESET_PASSWORD', req.user.id, `Reset password for user "${target.username}"`);

  res.json({ ok: true, message: 'Password reset. User must change it on next login.' });
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST ROLES
// ─────────────────────────────────────────────────────────────────────────────
function roles(req, res) {
  res.json({
    ok: true,
    data: [
      { value: 'admin',   label: 'Administrator' },
      { value: 'manager', label: 'Manager' },
      { value: 'cashier', label: 'Cashier' },
      { value: 'viewer',  label: 'Viewer' },
    ],
  });
}

module.exports = { list, create, update, setActive, resetPassword, roles };