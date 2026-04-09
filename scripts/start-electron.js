/* eslint-disable no-console */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const DIST_INDEX = path.join(ROOT, 'dist', 'renderer', 'index.html');
const SERVER_ENTRY = path.join(ROOT, 'backend', 'src', 'server.js');

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => srv.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
}

(async () => {
  // 1) Ensure production build exists (Electron loads from dist/)
  if (!fs.existsSync(DIST_INDEX)) {
    console.log('[start] dist/ not found. Building Angular (this happens only once)...');
    const b = run('npm', ['run', 'build'], { cwd: ROOT, env: { ...process.env, NODE_ENV: 'production' } });
    b.on('exit', (code) => {
      if (code !== 0) process.exit(code);
      startApp();
    });
    return;
  }
  startApp();

  async function startApp() {
    const port = Number(process.env.PORT || 3001);

    // 2) Start API only if port is free (so `npm start` works even if server already running)
    let serverProc = null;
    const free = await isPortFree(port);
    if (free) {
      serverProc = run('node', [SERVER_ENTRY], {
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: 'production' },
      });
    } else {
      console.log(`[start] API already running on port ${port}.`);
    }

    // 3) Start Electron (loads dist/)
    const electronProc = run('electron', ['.', '--no-sandbox'], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production' },
    });

    electronProc.on('exit', (code) => {
      if (serverProc) serverProc.kill();
      process.exit(code ?? 0);
    });

    process.on('SIGINT', () => {
      if (serverProc) serverProc.kill();
      electronProc.kill();
      process.exit(0);
    });
  }
})();
