const { z } = require('zod');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/settings.model');
const { config } = require('../config/env');
const { copyDb, restoreDb } = require('../services/backup.service');
const { closeDb, reopenDb } = require('../config/db');

const schema = z.object({
  storeName: z.string().min(2).default('Medical POS'),
  storePhone: z.string().optional().nullable(),
  storeAddress: z.string().optional().nullable(),
  receiptFooter: z.string().optional().nullable(),
  brandColor: z.string().default('#4f46e5'),
  logoDataUrl: z.string().optional().nullable(),
  gstEnabled: z.boolean().default(true),
});

function get(req, res) {
  res.json({ ok: true, data: Settings.get() });
}

function update(req, res) {
  const data = schema.parse(req.body);
  res.json({ ok: true, data: Settings.upsert(data) });
}

function backup(req, res) {
  try {
    const backupPath = copyDb(config.dbPath, config.backupDir);
    const filename = path.basename(backupPath);

    // Verify the backup file exists and has content before sending
    if (!fs.existsSync(backupPath)) {
      return res.status(500).json({ ok: false, error: { message: 'Backup file was not created' } });
    }
    const stat = fs.statSync(backupPath);
    if (stat.size === 0) {
      // Clean up empty file
      try { fs.unlinkSync(backupPath); } catch (_) {}
      return res.status(500).json({ ok: false, error: { message: 'Backup file is empty. The database may have no data or is locked.' } });
    }

    res.download(backupPath, filename, (err) => {
      if (err) {
        console.error('Backup download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ ok: false, error: { message: 'Failed to download backup' } });
        }
      }
      // Clean up the backup file after download (optional — keeps backup dir clean)
      // try { fs.unlinkSync(backupPath); } catch (_) {}
    });
  } catch (err) {
    console.error('Backup creation error:', err);
    res.status(500).json({ ok: false, error: { message: err.message || 'Failed to create backup' } });
  }
}

function restore(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { message: 'No backup file uploaded' } });
    }
    const uploadedFile = req.file.path;

    // Close the active database connection so the file can be safely overwritten
    closeDb();

    let result;
    try {
      result = restoreDb(uploadedFile, config.dbPath);
    } finally {
      // Always reopen the database connection — even if restoreDb throws,
      // we need the app to continue functioning with the old database
      reopenDb();
    }

    // Clean up the uploaded temp file
    try { fs.unlinkSync(uploadedFile); } catch (_) {}
    res.json({ ok: true, data: { message: 'Database restored successfully.' } });
  } catch (err) {
    console.error('Restore error:', err);
    // Clean up uploaded file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ ok: false, error: { message: err.message || 'Failed to restore database' } });
  }
}

module.exports = { get, update, backup, restore };
