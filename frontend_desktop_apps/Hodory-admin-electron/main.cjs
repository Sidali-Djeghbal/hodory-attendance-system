const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

const NEXT_PORT = Number(process.env.HODORY_PORT || 3000);
const NEXT_HOST = '127.0.0.1';

function waitForPort({ host, port, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const tryOnce = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket
        .once('connect', () => {
          socket.destroy();
          resolve();
        })
        .once('timeout', () => {
          socket.destroy();
          retry();
        })
        .once('error', () => {
          socket.destroy();
          retry();
        })
        .connect(port, host);
    };

    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for ${host}:${port}`));
        return;
      }
      setTimeout(tryOnce, 250);
    };

    tryOnce();
  });
}

function getPackagedNextDir() {
  // Copied via electron-builder "extraResources".
  return path.join(process.resourcesPath, 'next');
}

async function startNextServerIfPackaged() {
  if (!app.isPackaged) return;

  const nextDir = getPackagedNextDir();
  process.env.NODE_ENV = 'production';
  process.env.PORT = String(NEXT_PORT);
  process.env.HOSTNAME = NEXT_HOST;

  process.chdir(nextDir);
  // Next standalone server is a self-starting script.
  // It must live alongside `public/` and `.next/static/` under this same folder.
  require(path.join(nextDir, 'server.js'));

  await waitForPort({ host: NEXT_HOST, port: NEXT_PORT, timeoutMs: 30_000 });
}

async function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.once('ready-to-show', () => win.show());

  const url = `http://${NEXT_HOST}:${NEXT_PORT}`;
  await win.loadURL(url);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      app.quit();
    });
  }
});

app.whenReady()
  .then(startNextServerIfPackaged)
  .then(createMainWindow)
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    app.quit();
  });

