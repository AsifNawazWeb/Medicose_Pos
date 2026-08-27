/* eslint-disable no-console */
const { app, BrowserWindow, ipcMain, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { autoUpdater } = require('electron-updater');

// Disable sandbox for Linux to prevent SIGTRAP crashes on AppArmor
app.commandLine.appendSwitch('no-sandbox');

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

// ─── Auto Updater ─────────────────────────────────────────────────────────────
// Download in the background as soon as an update is available, then let the
// UI (and a native notification) prompt the user to restart and install.
autoUpdater.autoDownload = true;

// Dev/test mode: set MEDPOS_UPDATE_URL to a folder served over HTTP that contains
// latest.yml + the installer (e.g. the `release/` dir from `npm run build-win`).
// This lets you exercise the full check/download/notify flow locally without
// publishing to GitHub. See docs/UPDATE_TESTING.md.
const updateTestUrl = process.env.MEDPOS_UPDATE_URL || null;
const isUpdateEnabled = !isDev || !!updateTestUrl;

if (updateTestUrl) {
  autoUpdater.forceDevUpdateConfig = true; // allow electron-updater to run unpackaged
  autoUpdater.setFeedURL(updateTestUrl);   // generic provider pointing at the local server
}

let updateState = { status: 'idle', version: null, percent: 0, error: null };
let updateBusy  = false;

function sendUpdateStatus() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', updateState);
  }
}

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  sendUpdateStatus();
}

function notifyUpdate(body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: 'Medical POS — Update', body });
  n.on('click', () => {
    try { autoUpdater.quitAndInstall(); } catch (_) {}
  });
  n.show();
}

autoUpdater.on('checking-for-update', () => {
  setUpdateState({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  updateBusy = false;
  setUpdateState({ status: 'available', version: info?.version || null, percent: 0, error: null });
  notifyUpdate(`Version ${info?.version || ''} is available. Downloading in the background...`);
});

autoUpdater.on('update-not-available', () => {
  updateBusy = false;
  setUpdateState({ status: 'not-available', error: null });
});

autoUpdater.on('download-progress', (p) => {
  setUpdateState({ status: 'downloading', percent: Math.round(p?.percent || 0) });
});

autoUpdater.on('update-downloaded', (info) => {
  updateBusy = false;
  setUpdateState({ status: 'downloaded', version: info?.version || null, percent: 100, error: null });
  notifyUpdate(`Version ${info?.version || ''} is ready. Click to restart and install.`);
});

autoUpdater.on('error', (err) => {
  updateBusy = false;
  setUpdateState({ status: 'error', error: err?.message || 'Update check failed' });
});

function checkForUpdates() {
  if (!isUpdateEnabled || updateBusy) return Promise.resolve(updateState);
  updateBusy = true;
  setUpdateState({ status: 'checking' });
  return autoUpdater.checkForUpdates()
    .then(() => updateState)
    .catch((err) => {
      updateBusy = false;
      setUpdateState({ status: 'error', error: err?.message || 'Update check failed' });
      return updateState;
    });
}

app.whenReady().then(async () => {
  if (!isDev) {
    try { await startBackend(); }
    catch (e) { console.error('[main] backend failed to start:', e); }
  }

  // Silently check for updates in the background on startup
  // (packaged app, or dev when MEDPOS_UPDATE_URL test mode is enabled)
  if (isUpdateEnabled) checkForUpdates();

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
ipcMain.handle('update:check',    () => (!isUpdateEnabled ? { status: 'disabled' } : checkForUpdates()));
ipcMain.handle('update:getState', () => (!isUpdateEnabled ? { status: 'disabled' } : updateState));
ipcMain.handle('update:install', () => {
  if (!isUpdateEnabled) return false;
  try { autoUpdater.quitAndInstall(); return true; }
  catch (_) { return false; }
});

ipcMain.handle('print:receipt', async (_evt, html, options = {}) => {
  const silent = options?.silent !== false; // default to silent (direct print)

  const printWin = new BrowserWindow({
    show: false,
    width: 302,   // ~80mm at 96 DPI
    height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  const tmpHtml = path.join(os.tmpdir(), `receipt_${Date.now()}.html`);
  try { fs.writeFileSync(tmpHtml, html, 'utf-8'); }
  catch { return { success: false, failureReason: 'Failed to write temp file' }; }

  return new Promise((resolve) => {
    printWin.webContents.on('did-finish-load', () => {
      // Wait briefly for CSS/layout calculation before sending print job to hardware printer driver
      setTimeout(() => {
        printWin.webContents.print(
          {
            silent,
            printBackground: true,
            margins: { marginType: 'none' },
          },
          (success, failureReason) => {
            try { printWin.close(); } catch {}
            try { fs.unlinkSync(tmpHtml); } catch {}
            resolve({ success, failureReason: failureReason || null });
          }
        );
      }, 250);
    });

    printWin.loadFile(tmpHtml).catch((err) => {
      try { printWin.close(); } catch {}
      try { fs.unlinkSync(tmpHtml); } catch {}
      resolve({ success: false, failureReason: err?.message || 'Failed to load receipt HTML' });
    });
  });
});