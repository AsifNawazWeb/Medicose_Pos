/* eslint-disable no-console */
const http = require('http');
const { createApp } = require('./app');
const { config } = require('./config/env');
const { startBackupCron } = require('./cron/backup.cron');
const { logger } = require('./utils/logger');

const app = createApp();
const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'API started');
  startBackupCron();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});
