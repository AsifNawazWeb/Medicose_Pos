/* eslint-disable no-console */
/**
 * Migration script — safe to run multiple times (idempotent).
 * Adds new columns and tables required for:
 *  - Customer balance / ledger system
 *  - Product-level and bill-level discounts
 *  - Product packaging (strip/unit)
 *  - Amount paid / outstanding on bills
 */

const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'medical_pos.sqlite');

function run() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const addCol = (table, name, def) => {
    const cols = db.prepare(`PRAGMA table_info('${table}')`).all().map(r => r.name);
    if (!cols.includes(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def};`);
      console.log(`  + ${table}.${name}`);
    }
  };

  console.log('\n📦 Running migrations...\n');

  // ── customers ────────────────────────────────────────────────────────────
  addCol('customers', 'balance', 'REAL NOT NULL DEFAULT 0');  // outstanding balance (debit positive)
  addCol('customers', 'notes', 'TEXT');

  // ── products ─────────────────────────────────────────────────────────────
  addCol('products', 'productDiscount', 'REAL NOT NULL DEFAULT 0');   // % discount per product
  addCol('products', 'unitsPerStrip',   'INTEGER NOT NULL DEFAULT 1'); // tablets per strip
  addCol('products', 'stripsPerBox',    'INTEGER NOT NULL DEFAULT 1'); // strips per box
  addCol('products', 'packagingUnit',   "TEXT NOT NULL DEFAULT 'unit'"); // selling unit: unit|strip|box

  // ── sales ─────────────────────────────────────────────────────────────────
  addCol('sales', 'amountPaid',    'REAL NOT NULL DEFAULT 0');   // cash actually handed over
  addCol('sales', 'balanceDue',    'REAL NOT NULL DEFAULT 0');   // grandTotal - amountPaid  (credit given)
  addCol('sales', 'billDiscount',  'REAL NOT NULL DEFAULT 0');   // extra bill-level % discount
  addCol('sales', 'prevBalance',   'REAL NOT NULL DEFAULT 0');   // customer balance BEFORE this sale

  // ── sale_items ─────────────────────────────────────────────────────────────
  addCol('sale_items', 'productDiscount', 'REAL NOT NULL DEFAULT 0'); // % discount applied on this line
  addCol('sale_items', 'discountAmount',  'REAL NOT NULL DEFAULT 0'); // absolute discount on this line
  addCol('sale_items', 'packagingUnit',   "TEXT NOT NULL DEFAULT 'unit'"); // unit|strip|box

  // ── customer_ledger (new table) ────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_ledger (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customerId  INTEGER NOT NULL,
      billId      INTEGER,
      type        TEXT NOT NULL CHECK (type IN ('SALE','PAYMENT','RETURN','ADJUSTMENT')),
      debit       REAL NOT NULL DEFAULT 0,   -- amount customer owes (sale amount)
      credit      REAL NOT NULL DEFAULT 0,   -- amount customer paid / return
      balance     REAL NOT NULL DEFAULT 0,   -- running balance after this entry
      note        TEXT,
      createdAt   TEXT NOT NULL,
      FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (billId)     REFERENCES sales(id) ON DELETE SET NULL
    );
  `);
  console.log('  ✓ customer_ledger table ready');

  db.close();
  console.log('\n✅ Migration complete.\n');
}

run();
