/**
 * expiry.middleware.js
 *
 * Route-level middleware that blocks any protected API call when the
 * subscription licence has expired. Attach it AFTER auth() middleware
 * on any route group you want to protect.
 *
 * Usage example in routes file:
 *   const { auth }           = require('../middlewares/auth.middleware');
 *   const { checkExpiry }    = require('../middlewares/expiry.middleware');
 *
 *   router.use(auth());          // verifies JWT
 *   router.use(checkExpiry());   // verifies licence expiry
 *   router.get('/sales', ...)
 *
 * Admin-only exception: users with role 'admin' are allowed through even
 * after expiry so they can still log in and manage the system.
 * Remove that exception if you want to block everyone including admin.
 */
const { getDb } = require('../config/db');

function checkExpiry() {
  return (req, res, next) => {
    try {
      // Allow admin to always pass — so they can fix things even after expiry
      if (req.user?.role === 'admin') return next();

      const db = getDb();

      // If the licence table doesn't exist yet, allow all traffic
      const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='license_expiry'"
      ).get();
      if (!tableExists) return next();

      // Fetch active licence
      const licence = db.prepare(
        "SELECT expiry_date, status FROM license_expiry WHERE status = 'active' ORDER BY id DESC LIMIT 1"
      ).get();

      if (!licence) {
        // No active row — block with a clear message
        console.warn(`[EXPIRY] Request blocked — no active licence found. Path: ${req.path}`);
        return res.status(403).json({
          ok:      false,
          message: 'Your subscription has expired. Please contact admin.',
          code:    'LICENCE_EXPIRED',
        });
      }

      const today      = new Date().toISOString().slice(0, 10);
      const expiryDate = String(licence.expiry_date).slice(0, 10);

      if (today > expiryDate) {
        console.warn(
          `[EXPIRY] Request blocked — licence expired on ${expiryDate}. ` +
          `User: ${req.user?.email || 'unknown'}, Path: ${req.path}`
        );
        return res.status(403).json({
          ok:      false,
          message: 'Your subscription has expired. Please contact admin.',
          code:    'LICENCE_EXPIRED',
        });
      }

      next();
    } catch (err) {
      // On any unexpected error, fail open (allow) — don't lock out users
      // due to a DB connectivity issue. Adjust this to fail closed if preferred.
      console.error('[EXPIRY] Middleware error:', err.message);
      next();
    }
  };
}

module.exports = { checkExpiry };
