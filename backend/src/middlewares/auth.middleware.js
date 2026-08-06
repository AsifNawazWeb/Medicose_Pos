const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const User = require('../models/user.model');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret);

      // Check if user still exists and is active
      const user = User.findById(payload.id);
      if (!user) {
        return res.status(401).json({ ok: false, error: { message: 'User no longer exists' } });
      }
      if (!user.isActive) {
        return res.status(403).json({ ok: false, error: { message: 'Your account has been disabled. Please contact the administrator.' } });
      }

      req.user = { ...payload, ...user };
      return next();
    } catch {
      return res.status(401).json({ ok: false, error: { message: 'Invalid token' } });
    }
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ ok: false, error: { message: 'Forbidden' } });
    }
    next();
  };
}

module.exports = { auth, requireRole };