const { getDb } = require('../config/db');

/**
 * Log an audit event.
 * @param {string} action - e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'CREATE_USER', etc.
 * @param {number|null} userId - The user who performed the action (null for anonymous)
 * @param {string|null} details - Optional details (e.g. email attempted, reason)
 */
function log(action, userId = null, details = null) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_log (userId, action, details, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(userId, action, details, now);
}

/**
 * List recent audit log entries.
 * @param {number} limit - Max entries to return
 */
function list(limit = 100) {
  const db = getDb();
  return db.prepare(`
    SELECT a.*, u.name AS userName, u.email AS userEmail
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.userId
    ORDER BY a.createdAt DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { log, list };