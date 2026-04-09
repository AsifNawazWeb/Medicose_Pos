const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

function env(name, fallback) {
  const v = process.env[name];
  return (v === undefined || v === '') ? fallback : v;
}

const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: Number(env('PORT', '3001')),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-me'),
  dbPath: env('DB_PATH', path.resolve(process.cwd(), 'data', 'medical_pos.sqlite')),
  backupDir: env('BACKUP_DIR', path.resolve(process.cwd(), 'backups')),
};

module.exports = { config };
