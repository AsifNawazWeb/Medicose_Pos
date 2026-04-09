/* eslint-disable no-console */
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DB_PATH    = process.env.DB_PATH    || path.resolve(process.cwd(), 'data', 'medical_pos.sqlite');
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function run() {
  ensureDir(path.dirname(DB_PATH));
  ensureDir(BACKUP_DIR);

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.resolve(process.cwd(), 'backend', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // ── Migrations for existing DBs ──
  const productCols = db.prepare("PRAGMA table_info('products')").all().map(r => r.name);
  const addProductCol = (name, def) => {
    if (!productCols.includes(name)) db.exec(`ALTER TABLE products ADD COLUMN ${name} ${def};`);
  };
  addProductCol('category', 'TEXT');
  addProductCol('batchNo',  'TEXT');

  const now = new Date().toISOString();

  // ── Settings row ──
  const settings = db.prepare('SELECT 1 FROM settings WHERE id=1').get();
  if (!settings) {
    db.prepare(`
      INSERT INTO settings (id, storeName, storePhone, storeAddress, receiptFooter, brandColor, logoDataUrl, gstEnabled, createdAt, updatedAt)
      VALUES (1, 'Medical POS', '', '', 'Thank you for your purchase.', '#4f46e5', NULL, 1, ?, ?)
    `).run(now, now);
  }

  // ── License expiry row ──
  // Sets expiry 1 year from today on first run. Admin can update via SQL later.
  const license = db.prepare('SELECT 1 FROM license_expiry WHERE id=1').get();
  if (!license) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const expiryDateStr = expiryDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    db.prepare(`
      INSERT INTO license_expiry (id, expiry_date, status, note, createdAt, updatedAt)
      VALUES (1, ?, 'active', 'Initial license - 1 year', ?, ?)
    `).run(expiryDateStr, now, now);

    console.log('✅ License expiry set to:', expiryDateStr);
  }

  // ── Default admin user ──
  const adminEmail = 'admin@local';
  const user = db.prepare('SELECT 1 FROM users WHERE email = ?').get(adminEmail);
  if (!user) {
    const passwordHash = bcrypt.hashSync('Admin@123', 10);
    db.prepare(`
      INSERT INTO users (email, name, role, passwordHash, createdAt, updatedAt)
      VALUES (?, 'Administrator', 'admin', ?, ?, ?)
    `).run(adminEmail, passwordHash, now, now);
  }

  // ── Seed demo products (idempotent) ──
  const hasAnyProducts = db.prepare('SELECT COUNT(*) AS c FROM products').get().c > 0;
  if (!hasAnyProducts) {
    const supInfo = db.prepare(`
      INSERT INTO suppliers (name, phone, email, address, notes, createdAt, updatedAt)
      VALUES ('Default Supplier', '', '', '', 'Seed supplier', ?, ?)
    `).run(now, now);

    const supplierId = supInfo.lastInsertRowid;

    const stmt = db.prepare(`
      INSERT INTO products (name, sku, barcode, category, batchNo, unit, price, cost, gstRate, stockQty, reorderLevel, expiryDate, supplierId, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, 'pcs', ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    stmt.run('Paracetamol 500mg', 'MED-001', '890000000001', 'Tablet', 'B-0001', 30,  20,  0, 100, 20, null, supplierId, now, now);
    stmt.run('Cough Syrup 100ml', 'MED-002', '890000000002', 'Syrup',  'B-0002', 120, 90,  0, 50,  10, null, supplierId, now, now);
    stmt.run('Vitamin C 1000mg',  'MED-003', '890000000003', 'Tablet', 'B-0003', 250, 180, 0, 40,  10, null, supplierId, now, now);
  }

  db.close();
  console.log('✅ Database initialized at:', DB_PATH);
  console.log('✅ Backups directory      :', BACKUP_DIR);
  console.log('✅ Default login          : admin@local / Admin@123');

  require('./migrate');
}

run();