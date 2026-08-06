const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const Ctrl = require('../controllers/settings.controller');
const { auth, requireRole } = require('../middlewares/auth.middleware');

// Configure multer for file uploads (restore)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    // Accept .sqlite, .db, .bak files
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.sqlite', '.db', '.bak', '.sqlite3'].includes(ext) || !ext) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a database backup file (.sqlite, .db, .bak)'));
    }
  },
});

// View settings — all authenticated users
router.get('/', auth(true), Ctrl.get);

// Update settings — admin only
router.put('/', auth(true), requireRole('admin'), Ctrl.update);

// Backup/Restore — admin only
router.get('/backup', auth(true), requireRole('admin'), Ctrl.backup);
router.post('/restore', auth(true), requireRole('admin'), upload.single('backupFile'), Ctrl.restore);

module.exports = router;