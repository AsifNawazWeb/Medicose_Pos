const { getDb } = require('../config/db');

function list({ q = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const like = `%${q}%`;
  return db.prepare(`
    SELECT * FROM suppliers
    WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
    ORDER BY updatedAt DESC
    LIMIT ? OFFSET ?
  `).all(like, like, like, limit, offset);
}

function getById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
}

function create(data) {
  const db = getDb();
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO suppliers (name, phone, email, address, notes, createdAt, updatedAt)
    VALUES (@name, @phone, @email, @address, @notes, @createdAt, @updatedAt)
  `).run({ ...data, createdAt: now, updatedAt: now });
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE suppliers SET
      name=@name, phone=@phone, email=@email, address=@address, notes=@notes, updatedAt=@updatedAt
    WHERE id=@id
  `).run({ ...data, id, updatedAt: now });
  return getById(id);
}

function remove(id) {
  const db = getDb();
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  return true;
}

module.exports = { list, getById, create, update, remove };
