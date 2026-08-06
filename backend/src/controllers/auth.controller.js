const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');
const User = require('../models/user.model');
const Audit = require('../models/audit.model');

const loginSchema = z.object({
  login:    z.string().min(3),   // can be email OR username
  password: z.string().min(6),
});

const changeSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(8).max(128),
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN  (email OR username)
// ─────────────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const body = loginSchema.parse(req.body);
    const login = body.login.trim().toLowerCase();

    // Step 1: Find user by email OR username
    const u = User.findByLogin(login);
    if (!u) {
      Audit.log('LOGIN_FAILED', null, `Login attempt for "${login}" — user not found`);
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // Step 2: Verify password
    const ok = await bcrypt.compare(body.password, u.passwordHash);
    if (!ok) {
      Audit.log('LOGIN_FAILED', u.id, `Login attempt for "${login}" — wrong password`);
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // Step 3: Check if account is active
    if (!u.isActive) {
      Audit.log('LOGIN_FAILED', u.id, `Login attempt for "${login}" — account disabled`);
      return res.status(403).json({ ok: false, message: 'Your account has been disabled. Please contact the administrator.' });
    }

    // Step 4: Update last login + audit
    User.updateLastLogin(u.id);
    Audit.log('LOGIN_SUCCESS', u.id, `User "${u.username}" logged in`);

    // Step 5: Issue JWT — 1 day expiry
    const token = jwt.sign(
      { id: u.id, email: u.email, username: u.username, role: u.role, name: u.name },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: u.id,
        email: u.email,
        username: u.username,
        name: u.name,
        role: u.role,
        phone: u.phone,
        mustChangePassword: !!u.mustChangePassword,
      },
    });

  } catch (error) {
    res.status(error.statusCode || 500).json({
      ok:      false,
      message: error.message || 'Server Error',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ME
// ─────────────────────────────────────────────────────────────────────────────
function me(req, res) {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ ok: false, message: 'User not found' });
  res.json({ ok: true, user });
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
async function changePassword(req, res) {
  const body = changeSchema.parse(req.body);
  const u    = User.findById(req.user.id);
  if (!u) throw new AppError('User not found', 404, 'NOT_FOUND');

  const currentHash = User.findPasswordHash(u.id);
  const ok = await bcrypt.compare(body.currentPassword, currentHash);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'BAD_PASSWORD');

  const newHash = await bcrypt.hash(body.newPassword, 10);
  User.updatePassword(u.id, newHash);
  Audit.log('CHANGE_PASSWORD', u.id, `User "${u.username}" changed their password`);

  res.json({ ok: true });
}

module.exports = { login, me, changePassword };