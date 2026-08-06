const { getDb } = require('../config/db');

// ── Finders ──────────────────────────────────────────────────────────────────

function findByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findByUsername(username) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findByLogin(login) {
  const db = getDb();
  // Login can be either email or username
  return db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(login, login);
}

function findById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT id, email, username, name, role, phone, isActive, mustChangePassword, lastLoginAt, createdBy, createdAt, updatedAt
    FROM users WHERE id = ?
  `).get(id);
}

function findPasswordHash(id) {
  const db = getDb();
  return db.prepare('SELECT passwordHash FROM users WHERE id = ?').get(id)?.passwordHash;
}

// ── Create ───────────────────────────────────────────────────────────────────

function createUser({ email, username, name, role, passwordHash, phone, createdBy }) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (email, username, name, role, passwordHash, phone, isActive, mustChangePassword, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
  `);
  const info = stmt.run(email, username, name, role, passwordHash, phone || null, createdBy || null, now, now);
  return findById(info.lastInsertRowid);
}

// ── Update ───────────────────────────────────────────────────────────────────

function updateUser(id, { name, phone, role, isActive }) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      role = COALESCE(?, role),
      isActive = COALESCE(?, isActive),
      updatedAt = ?
    WHERE id = ?
  `).run(name ?? null, phone ?? null, role ?? null, isActive ?? null, now, id);
  return findById(id);
}

function updatePassword(userId, passwordHash) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = 0, updatedAt = ? WHERE id = ?')
    .run(passwordHash, now, userId);
}

function setMustChangePassword(userId, value = 1) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET mustChangePassword = ?, updatedAt = ? WHERE id = ?')
    .run(value ? 1 : 0, now, userId);
}

function updateLastLogin(userId) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET lastLoginAt = ? WHERE id = ?').run(now, userId);
}

// ── List / Count ─────────────────────────────────────────────────────────────

function listUsers() {
  const db = getDb();
  return db.prepare(`
    SELECT id, email, username, name, role, phone, isActive, mustChangePassword, lastLoginAt, createdBy, createdAt, updatedAt
    FROM users
    ORDER BY createdAt DESC
  `).all();
}

function countAdmins() {
  const db = getDb();
  return db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND isActive = 1").get().c;
}

function countUsers() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

// ── Delete / Disable ────────────────────────────────────────────────────────

function setActive(userId, isActive) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET isActive = ?, updatedAt = ? WHERE id = ?')
    .run(isActive ? 1 : 0, now, userId);
}

module.exports = {
  findByEmail,
  findByUsername,
  findByLogin,
  findById,
  findPasswordHash,
  createUser,
  updateUser,
  updatePassword,
  setMustChangePassword,
  updateLastLogin,
  listUsers,
  countAdmins,
  countUsers,
  setActive,
};