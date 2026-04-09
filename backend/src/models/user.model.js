const { getDb } = require('../config/db');

function findByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findById(id) {
  const db = getDb();
  return db.prepare('SELECT id, email, name, role, createdAt, updatedAt FROM users WHERE id = ?').get(id);
}

function createUser({ email, name, role, passwordHash }) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO users (email, name, role, passwordHash, createdAt, updatedAt)
                           VALUES (?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(email, name, role, passwordHash, now, now);
  return findById(info.lastInsertRowid);
}

function updatePassword(userId, passwordHash) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?').run(passwordHash, now, userId);
}

module.exports = { findByEmail, findById, createUser, updatePassword };
