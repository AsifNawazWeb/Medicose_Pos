const cron = require('node-cron');
const { config } = require('../config/env');
const { copyDb } = require('../services/backup.service');
const { logger } = require('../utils/logger');

// Daily at 11:00 PM local server time
function startBackupCron() {
  cron.schedule('0 23 * * *', () => {
    try {
      const out = copyDb(config.dbPath, config.backupDir);
      logger.info({ out }, 'database backup created');
    } catch (err) {
      logger.error({ err }, 'backup failed');
    }
  });
}

module.exports = { startBackupCron };
