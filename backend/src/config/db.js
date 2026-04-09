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

module.exports = { getDb };
