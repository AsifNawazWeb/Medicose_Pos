const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDb(dbPath, backupDir) {
  ensureDir(backupDir);
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const name = `medical_pos_${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}.sqlite`;
  const dest = path.join(backupDir, name);
  fs.copyFileSync(dbPath, dest);
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
  // Overwrite current DB with backup
  fs.copyFileSync(sourceFile, dbPath);
  return { restored: true, safetyBackup };
}

module.exports = { copyDb, restoreDb };
