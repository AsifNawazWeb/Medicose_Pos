/* eslint-disable no-console */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = !app.isPackaged;

const userDataPath = app.getPath('userData');
const dbPath       = path.join(userDataPath, 'medical_pos.sqlite');
const backupDir    = path.join(userDataPath, 'backups');

[userDataPath, backupDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Copy seed DB on first launch
if (!isDev && !fs.existsSync(dbPath)) {
  const seedDb = path.join(process.resourcesPath, 'medical_pos.sqlite');
  if (fs.existsSync(seedDb)) {
    try { fs.copyFileSync(seedDb, dbPath); }
    catch (err) { console.error('[main] seed DB copy failed:', err); }
  }
}

let mainWindow;
let httpServer;

function startBackend() {
  if (isDev) return Promise.resolve();

  return new Promise((resolve, reject) => {
    try {
      const appRoot = app.getAppPath();

      process.env.DB_PATH    = dbPath;
      process.env.BACKUP_DIR = backupDir;
      process.env.NODE_ENV   = 'production';
      process.env.PORT       = '3001';

      const { createApp } = require(path.join(appRoot, 'backend', 'src', 'app.js'));
      const http = require('http');

      const expressApp = createApp();
      httpServer = http.createServer(expressApp);

      // ✅ FIXED: listen on all interfaces (no host arg)
      // '127.0.0.1' only binds IPv4 but Windows resolves 'localhost' → ::1 (IPv6)
      // Omitting the host binds BOTH IPv4 and IPv6 — works with localhost always
      httpServer.listen(3001, () => {
        console.log('[backend] Express listening on http://localhost:3001');
        resolve();
      });

      httpServer.on('error', (err) => {
        console.error('[backend] Failed to start:', err);
        reject(err);
      });

    } catch (err) {
      console.error('[backend] require() failed:', err);
      reject(err);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(process.env.RENDERER_URL || 'http://localhost:4200');
  } else {
    const indexHtml = path.join(
      app.getAppPath(), 'dist', 'renderer', 'browser', 'index.html'
    );
    console.log('[main] loading:', indexHtml, '| exists:', fs.existsSync(indexHtml));
    mainWindow.loadFile(indexHtml);
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    try { await startBackend(); }
    catch (e) { console.error('[main] backend failed to start:', e); }
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (httpServer) httpServer.close();
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPath',    () => userDataPath);
ipcMain.handle('app:openExternal', async (_evt, url) => {
  if (typeof url !== 'string') return false;
  await shell.openExternal(url);
  return true;
});
ipcMain.handle('print:receipt', async (_evt, html) => {
  const tmpHtml = path.join(os.tmpdir(), `receipt_${Date.now()}.html`);
  try { fs.writeFileSync(tmpHtml, html, 'utf-8'); }
  catch { return { success: false, failureReason: 'Failed to write temp file' }; }
  await shell.openPath(tmpHtml);
  return { success: true, failureReason: null };
});