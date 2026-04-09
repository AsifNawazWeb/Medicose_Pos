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

module.exports = { copyDb };
