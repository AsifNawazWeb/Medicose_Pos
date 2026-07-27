const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Flush WAL (Write-Ahead Log) data into the main database file
 * and truncate the WAL file. This ensures the .sqlite file contains
 * all committed data and can be safely copied as a standalone backup.
 */
function checkpointDatabase(dbPath) {
  // Only attempt checkpoint if the database file exists
  if (!fs.existsSync(dbPath)) return;

  const Database = require('better-sqlite3');
  let db;
  try {
    db = new Database(dbPath, { fileMustExist: true, readonly: false });
    // TRUNCATE mode: checkpoint and then delete the WAL file
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.error('WAL checkpoint warning:', err.message);
  } finally {
    if (db) {
      try { db.close(); } catch (_) {}
    }
  }
}

/**
 * Remove WAL and SHM companion files for a given database path.
 * These files are recreated automatically by SQLite on next connection.
 */
function cleanupWalFiles(dbPath) {
  const walFile = dbPath + '-wal';
  const shmFile = dbPath + '-shm';
  try { if (fs.existsSync(walFile)) fs.unlinkSync(walFile); } catch (_) {}
  try { if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile); } catch (_) {}
}

function copyDb(dbPath, backupDir) {
  ensureDir(backupDir);

  // 1. Flush all pending WAL transactions into the main database file
  checkpointDatabase(dbPath);

  // 2. Remove stale WAL/SHM files so they aren't accidentally included
  cleanupWalFiles(dbPath);

  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `medical_pos_${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.sqlite`;
  const dest = path.join(backupDir, name);

  // 3. Copy the clean, checkpointed database file
  fs.copyFileSync(dbPath, dest);

  // 4. Verify the backup file has content
  const backupStat = fs.statSync(dest);
  if (backupStat.size === 0) {
    throw new Error('Backup file is empty — database may have no data');
  }

  return dest;
}

function restoreDb(sourceFile, dbPath) {
  // Verify source exists and is a valid file
  if (!fs.existsSync(sourceFile)) {
    throw new Error('Backup file not found');
  }
  const stat = fs.statSync(sourceFile);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error('Invalid backup file');
  }

  // Ensure target directory exists
  ensureDir(path.dirname(dbPath));

  // Keep a safety backup of current DB before overwriting
  const safetyBackup = dbPath + '.before_restore_' + Date.now() + '.bak';
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, safetyBackup);
  }

  // Remove stale WAL/SHM files from the target location before restoring
  cleanupWalFiles(dbPath);

  // Overwrite current DB with backup
  fs.copyFileSync(sourceFile, dbPath);

  // After restore, clean up any WAL/SHM that may have been created
  // (the restored DB may have been in WAL mode when backed up)
  cleanupWalFiles(dbPath);

  return { restored: true, safetyBackup };
}

module.exports = { copyDb, restoreDb };
