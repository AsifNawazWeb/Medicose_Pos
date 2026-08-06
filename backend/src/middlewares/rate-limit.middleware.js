/**
 * Simple in-memory rate limiter for login attempts.
 * Prevents brute-force attacks without external dependencies.
 *
 * Usage:
 *   router.post('/login', rateLimit({ windowMs: 15*60*1000, max: 5 }), Auth.login);
 */

const attempts = new Map();

/**
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max attempts per window (default: 5)
 * @param {string} options.keyFn - Function to extract the rate-limit key from req (default: req.body.email || req.ip)
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 5, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : (req.body?.email || req.body?.username || req.ip || 'unknown');

    const now = Date.now();
    const record = attempts.get(key);

    if (!record || record.resetAt < now) {
      // First attempt or window expired — reset
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      const minsLeft = Math.ceil((record.resetAt - now) / 60000);
      return res.status(429).json({
        ok: false,
        error: {
          message: `Too many login attempts. Please try again in ${minsLeft} minute(s).`,
          code: 'RATE_LIMITED',
        },
      });
    }

    record.count += 1;
    next();
  };
}

// Clean up expired entries periodically to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (record.resetAt < now) attempts.delete(key);
  }
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit };