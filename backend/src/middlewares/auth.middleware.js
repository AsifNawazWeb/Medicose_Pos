const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) return next();
      return res.status(401).json({ ok: false, error: { message: 'Unauthorized' } });
    }

    try {
      req.user = jwt.verify(token, config.jwtSecret);
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
