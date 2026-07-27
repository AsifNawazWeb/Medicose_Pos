const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('./env');

let db;

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function getDb() {
  if (!db) {
    ensureDir(config.dbPath);
    db = new Database(config.dbPath, { fileMustExist: false });
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Close the current database connection and clear the cached instance.
 * Must be called before overwriting the database file (e.g., during restore).
 */
function closeDb() {
  if (db) {
    try { db.close(); } catch (_) {}
    db = null;
  }
}

/**
 * Close and reopen the database connection.
 * Used after restoring a backup to ensure the app reads from the restored file.
 */
function reopenDb() {
  closeDb();
  return getDb();
}

module.exports = { getDb, closeDb, reopenDb };
