const { getDb } = require('../config/db');

function list({ q = '', limit = 50, offset = 0 }) {
  const db = getDb();
  const like = `%${q}%`;
  return db.prepare(`
    SELECT * FROM customers
    WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
    ORDER BY updatedAt DESC LIMIT ? OFFSET ?
  `).all(like, like, like, limit, offset);
}

function getById(id) {
  return getDb().prepare('SELECT * FROM customers WHERE id=?').get(id);
}

function create(data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('customers')").all().map(r => r.name);
  const hasBalance = cols.includes('balance');
  const hasNotes   = cols.includes('notes');

  const fields  = ['name','phone','email','address','loyaltyPoints','createdAt','updatedAt'];
  const values  = [data.name, data.phone||null, data.email||null, data.address||null, data.loyaltyPoints||0, now, now];
  if (hasBalance) { fields.push('balance');  values.push(0); }
  if (hasNotes)   { fields.push('notes');    values.push(data.notes||null); }

  const placeholders = fields.map(() => '?').join(',');
  const info = db.prepare(`INSERT INTO customers (${fields.join(',')}) VALUES (${placeholders})`).run(...values);
  return getById(info.lastInsertRowid);
}

function update(id, data) {
  const db  = getDb();
  const now = new Date().toISOString();
  const cols = db.prepare("PRAGMA table_info('customers')").all().map(r => r.name);
  const hasNotes = cols.includes('notes');

  const setParts = ['name=?','phone=?','email=?','address=?','loyaltyPoints=?','updatedAt=?'];
  const vals     = [data.name, data.phone||null, data.email||null, data.address||null, data.loyaltyPoints||0, now];
  if (hasNotes) { setParts.push('notes=?'); vals.push(data.notes||null); }
  vals.push(id);

  db.prepare(`UPDATE customers SET ${setParts.join(',')} WHERE id=?`).run(...vals);
  return getById(id);
}

function remove(id) {
  getDb().prepare('DELETE FROM customers WHERE id=?').run(id);
  return true;
}

module.exports = { list, getById, create, update, remove };
