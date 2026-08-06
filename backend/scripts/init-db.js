/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const DB_PATH =
  process.env.DB_PATH ||
  path.resolve(process.cwd(), "data", "medical_pos.sqlite");
const BACKUP_DIR =
  process.env.BACKUP_DIR || path.resolve(process.cwd(), "backups");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function run() {
  ensureDir(path.dirname(DB_PATH));
  ensureDir(BACKUP_DIR);

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.resolve(process.cwd(), "backend", "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.exec(schema);

  // ── Migrations for existing DBs ──
  const productCols = db
    .prepare("PRAGMA table_info('products')")
    .all()
    .map((r) => r.name);
  const addProductCol = (name, def) => {
    if (!productCols.includes(name))
      db.exec(`ALTER TABLE products ADD COLUMN ${name} ${def};`);
  };
  addProductCol("category", "TEXT");
  addProductCol("batchNo", "TEXT");

  const now = new Date().toISOString();

  // ── Settings row ──
  const settings = db.prepare("SELECT 1 FROM settings WHERE id=1").get();
  if (!settings) {
    db.prepare(
      `
      INSERT INTO settings (id, storeName, storePhone, storeAddress, receiptFooter, brandColor, logoDataUrl, gstEnabled, createdAt, updatedAt)
      VALUES (1, 'Medical POS', '', '', 'Thank you for your purchase.', '#4f46e5', NULL, 1, ?, ?)
    `,
    ).run(now, now);
  }

  // ── NOTE: No default admin user is created here.
  //    The first-time setup flow (POST /api/setup/admin) creates the admin.
  //    No license_expiry table is seeded — replaced by product key activation.

  db.close();
  console.log("✅ Database initialized at:", DB_PATH);
  console.log("✅ Backups directory      :", BACKUP_DIR);
  console.log("✅ First-time setup: create admin via the app's setup screen");

  require("./migrate");
  require("./migrate-auth");
}

run();