const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { config } = require('../config/env');
const { AppError } = require('../utils/errors');
const User = require('../models/user.model');
const { getDb } = require('../config/db');

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name:     z.string().min(2).max(80),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
});

// ─────────────────────────────────────────────────────────────────────────────
// License / Subscription Expiry Helper
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Checks the license_expiry table. Returns true if a valid active licence
 * exists whose expiry_date is >= today. Throws AppError otherwise.
 *
 * The check is intentionally backend-only — the JWT is never issued when
 * the licence is expired, so no frontend trick can bypass it.
 */
function checkLicenseExpiry() {
  const db = getDb();

  // If the table doesn't exist yet (fresh install before migration), allow login
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='license_expiry'"
  ).get();
  if (!tableExists) return; // table not yet created — allow login
  
  // Fetch the active licence row
  const licence = db.prepare(
    "SELECT expiry_date, status FROM license_expiry WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  ).get();

  if (!licence) {
    // No active licence row found — block login
    throw new AppError(
      'Your subscription has expired. Please contact admin.',
      403,
      'LICENCE_EXPIRED'
    );
  }

  // Compare dates as ISO strings (YYYY-MM-DD). 
  // toISOString() gives 'YYYY-MM-DDTHH:mm:ssZ'; slice(0,10) gives the date part.
  const today      = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const expiryDate = String(licence.expiry_date).slice(0, 10);

  if (today > expiryDate) {
    // Subscription has lapsed — log for audit, then block
    console.warn(`[AUTH] Login blocked — licence expired on ${expiryDate} (today: ${today})`);
    throw new AppError(
      'Your subscription has expired. Please contact admin.',
      403,
      'LICENCE_EXPIRED'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const body = loginSchema.parse(req.body);

    // Step 1: Validate credentials
    const u = await User.findByEmail(body.email.toLowerCase());
    if (!u) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(body.password, u.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // Step 2: Check subscription expiry AFTER credentials pass
    // (checking after cred validation avoids leaking whether an email exists)
    checkLicenseExpiry();

    // Step 3: Issue JWT — only reached if both checks pass
    const token = jwt.sign(
      { id: u.id, email: u.email, role: u.role, name: u.name },
      config.jwtSecret,
      { expiresIn: '12h' }
    );

    res.json({
      ok: true,
      token,
      user: { id: u.id, email: u.email, role: u.role, name: u.name },
    });

  } catch (error) {
    // Re-throw AppError with its own status code; anything else → 500
    res.status(error.statusCode || 500).json({
      ok:      false,
      message: error.message || 'Server Error',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────────────────────
async function register(req, res) {
  const body  = registerSchema.parse(req.body);
  const email = body.email.toLowerCase();
  if (User.findByEmail(email)) throw new AppError('Email already exists', 409, 'AUTH_EXISTS');

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = User.createUser({ email, name: body.name, role: 'cashier', passwordHash });

  res.status(201).json({ ok: true, user });
}

// ─────────────────────────────────────────────────────────────────────────────
// ME
// ─────────────────────────────────────────────────────────────────────────────
function me(req, res) {
  const user = User.findById(req.user.id);
  res.json({ ok: true, user });
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
const changeSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword:     z.string().min(8).max(128),
});

async function changePassword(req, res) {
  const body = changeSchema.parse(req.body);
  const u    = User.findByEmail(req.user.email);
  if (!u) throw new AppError('User not found', 404, 'NOT_FOUND');

  const ok = await bcrypt.compare(body.currentPassword, u.passwordHash);
  if (!ok) throw new AppError('Current password is incorrect', 400, 'BAD_PASSWORD');

  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  User.updatePassword(u.id, passwordHash);

  res.json({ ok: true });
}

module.exports = { login, register, me, changePassword };