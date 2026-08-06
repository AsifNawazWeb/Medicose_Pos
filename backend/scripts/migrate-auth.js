/* eslint-disable no-console */
/**
 * Migration script for the new role-based login system.
 * Safe to run multiple times (idempotent).
 *
 * Changes:
 *  1. Recreates `users` table with:
 *     - `username` column (unique, for login)
 *     - `phone` column
 *     - `isActive` flag
 *     - `mustChangePassword` flag
 *     - `lastLoginAt` timestamp
 *     - `createdBy` FK
 *     - Relaxed role CHECK: admin, manager, cashier, viewer
 *  2. Drops the `license_expiry` table (replaced by product key activation later)
 *  3. Creates `audit_log` table
 */

const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'medical_pos.sqlite');

function run() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('\n📦 Running auth migration...\n');

  // ── 1. Recreate users table ────────────────────────────────────────────────
  const userCols = db.prepare("PRAGMA table_info('users')").all().map(r => r.name);
  const hasUsername = userCols.includes('username');
  const hasIsActive = userCols.includes('isActive');

  if (!hasUsername || !hasIsActive) {
    console.log('  → Recreating users table with new schema...');

    // Check if users_new already exists (from a previous partial run)
    const hasNew = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users_new'").get();
    if (hasNew) {
      db.exec('DROP TABLE users_new;');
    }

    // Create new table
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier'
             CHECK (role IN ('admin','manager','cashier','viewer')),
        passwordHash TEXT NOT NULL,
        phone TEXT,
        isActive INTEGER NOT NULL DEFAULT 1,
        mustChangePassword INTEGER NOT NULL DEFAULT 0,
        lastLoginAt TEXT,
        createdBy INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Copy existing data — generate username from email if missing
    const existingUsers = db.prepare('SELECT * FROM users').all();
    const insertStmt = db.prepare(`
      INSERT INTO users_new (id, email, username, name, role, passwordHash, phone, isActive, mustChangePassword, lastLoginAt, createdBy, createdAt, updatedAt)
      VALUES (@id, @email, @username, @name, @role, @passwordHash, @phone, @isActive, @mustChangePassword, @lastLoginAt, @createdBy, @createdAt, @updatedAt)
    `);

    const tx = db.transaction((users) => {
      for (const u of users) {
        // Generate a username from email if not present
        const username = u.username || u.email.split('@')[0] || `user_${u.id}`;
        insertStmt.run({
          id: u.id,
          email: u.email,
          username,
          name: u.name,
          role: u.role,
          passwordHash: u.passwordHash,
          phone: u.phone || null,
          isActive: u.isActive !== undefined ? u.isActive : 1,
          mustChangePassword: u.mustChangePassword !== undefined ? u.mustChangePassword : 0,
          lastLoginAt: u.lastLoginAt || null,
          createdBy: u.createdBy || null,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        });
      }
    });

    tx(existingUsers);
    console.log(`  ✓ Copied ${existingUsers.length} existing user(s)`);

    // Drop old table and rename
    db.exec('DROP TABLE users;');
    db.exec('ALTER TABLE users_new RENAME TO users;');
    console.log('  ✓ users table recreated');
  } else {
    console.log('  ✓ users table already up-to-date');
  }

  // ── 2. Drop license_expiry table ───────────────────────────────────────────
  const hasLicense = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='license_expiry'").get();
  if (hasLicense) {
    db.exec('DROP TABLE IF EXISTS license_expiry;');
    console.log('  ✓ license_expiry table dropped');
  } else {
    console.log('  ✓ license_expiry table already removed');
  }

  // ── 3. Create audit_log table ──────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_createdAt ON audit_log(createdAt);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_audit_log_userId ON audit_log(userId);');
  console.log('  ✓ audit_log table ready');

  db.close();
  console.log('\n✅ Auth migration complete.\n');
}

run();