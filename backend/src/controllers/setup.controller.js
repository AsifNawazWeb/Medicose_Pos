const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { AppError } = require('../utils/errors');
const User = require('../models/user.model');
const Audit = require('../models/audit.model');

const setupSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes and underscores'),
  password: z.string().min(8).max(128),
  phone:    z.string().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS — Check if setup is needed (no admin exists)
// ─────────────────────────────────────────────────────────────────────────────
function status(req, res) {
  const adminCount = User.countAdmins();
  res.json({ ok: true, data: { needsSetup: adminCount === 0 } });
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE FIRST ADMIN
// ─────────────────────────────────────────────────────────────────────────────
async function createAdmin(req, res) {
  const body = setupSchema.parse(req.body);

  // Only allow if no admin exists
  if (User.countAdmins() > 0) {
    throw new AppError('Setup already completed. An admin account already exists.', 403, 'SETUP_DONE');
  }

  const email = body.email.toLowerCase();
  const username = body.username.toLowerCase();

  // Check for conflicts
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
    role: 'admin',
    passwordHash,
    phone: body.phone || null,
    createdBy: null,
  });

  // First admin just set their own password — no need to force a change
  User.setMustChangePassword(user.id, 0);

  Audit.log('CREATE_ADMIN', user.id, `First admin "${username}" created`);

  res.status(201).json({ ok: true, user });
}

module.exports = { status, createAdmin };