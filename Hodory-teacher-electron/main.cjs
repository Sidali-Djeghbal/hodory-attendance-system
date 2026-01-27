const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const { execFile } = require('child_process');

const NEXT_PORT = Number(process.env.HODORY_PORT || 3001);
const NEXT_HOST = '127.0.0.1';
const HOTSPOT_CONNECTION_NAME = 'hodory-hotspot';

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

function execFileAsync(file, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { timeout: 30_000, maxBuffer: 1024 * 1024, ...options },
      (error, stdout, stderr) => {
        if (error) {
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

async function nmcli(args) {
  if (process.platform !== 'linux') {
    const err = new Error('Hotspot is only supported on Linux in this build.');
    err.code = 'UNSUPPORTED_PLATFORM';
    throw err;
  }
  return execFileAsync('nmcli', args);
}

function parseNmcliTable(output) {
  return String(output || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function pickWifiDevice(preferred) {
  if (preferred) return preferred;
  const { stdout } = await nmcli(['-t', '-f', 'DEVICE,TYPE,STATE', 'dev']);
  const lines = parseNmcliTable(stdout);
  const wifi = lines
    .map((line) => line.split(':'))
    .filter((parts) => parts.length >= 3)
    .map(([device, type, state]) => ({ device, type, state }))
    .filter((row) => row.type === 'wifi');
  if (wifi.length === 0) {
    const err = new Error('No WiFi device found (nmcli reported none).');
    err.code = 'NO_WIFI_DEVICE';
    throw err;
  }
  const connected = wifi.find((row) => row.state === 'connected');
  return (connected ?? wifi[0]).device;
}

async function hotspotDeleteIfExists() {
  try {
    await nmcli(['con', 'delete', HOTSPOT_CONNECTION_NAME]);
  } catch {
    // Ignore: connection may not exist.
  }
}

async function hotspotStop() {
  try {
    await nmcli(['con', 'down', HOTSPOT_CONNECTION_NAME]);
  } catch {
    // Ignore.
  }
}

async function hotspotStart({ ssid, password, security, ifname }) {
  if (!ssid || !String(ssid).trim()) {
    const err = new Error('SSID is required.');
    err.code = 'INVALID_SSID';
    throw err;
  }

  const normalizedSecurity = security || 'WPA';
  const iface = await pickWifiDevice(ifname);

  if (normalizedSecurity !== 'nopass') {
    const p = String(password || '');
    if (p.length < 8) {
      const err = new Error('Hotspot password must be at least 8 characters.');
      err.code = 'INVALID_PASSWORD';
      throw err;
    }
  }

  await hotspotStop();
  await hotspotDeleteIfExists();

  await nmcli([
    'con',
    'add',
    'type',
    'wifi',
    'ifname',
    iface,
    'con-name',
    HOTSPOT_CONNECTION_NAME,
    'autoconnect',
    'no',
    'ssid',
    String(ssid)
  ]);

  await nmcli([
    'con',
    'modify',
    HOTSPOT_CONNECTION_NAME,
    '802-11-wireless.mode',
    'ap',
    'ipv4.method',
    'shared',
    'ipv6.method',
    'ignore'
  ]);

  if (normalizedSecurity === 'nopass') {
    await nmcli(['con', 'modify', HOTSPOT_CONNECTION_NAME, 'wifi-sec.key-mgmt', 'none']);
  } else {
    await nmcli([
      'con',
      'modify',
      HOTSPOT_CONNECTION_NAME,
      'wifi-sec.key-mgmt',
      'wpa-psk',
      'wifi-sec.psk',
      String(password || '')
    ]);
  }

  await nmcli(['con', 'up', HOTSPOT_CONNECTION_NAME]);

  return hotspotStatus({ ifname: iface });
}

async function hotspotStatus({ ifname } = {}) {
  const iface = await pickWifiDevice(ifname);
  const { stdout: conStdout } = await nmcli([
    '-t',
    '-f',
    'GENERAL.STATE,GENERAL.CONNECTION,IP4.ADDRESS',
    'dev',
    'show',
    iface
  ]);
  const lines = parseNmcliTable(conStdout);
  const info = {};
  for (const line of lines) {
    const [key, ...rest] = line.split(':');
    info[key] = rest.join(':');
  }

  const connection = info['GENERAL.CONNECTION'] || '';
  const state = info['GENERAL.STATE'] || '';
  const ip4 = info['IP4.ADDRESS'] || '';

  return {
    supported: true,
    ifname: iface,
    state,
    connection,
    isHotspotActive: connection === HOTSPOT_CONNECTION_NAME,
    ipv4Address: ip4 ? String(ip4).split('/')[0] : null
  };
}

function registerIpc() {
  ipcMain.handle('hodory:hotspot:start', async (_event, options) => {
    return hotspotStart(options || {});
  });

  ipcMain.handle('hodory:hotspot:stop', async () => {
    await hotspotStop();
    return { stopped: true };
  });

  ipcMain.handle('hodory:hotspot:status', async (_event, options) => {
    try {
      return await hotspotStatus(options || {});
    } catch (err) {
      return {
        supported: process.platform === 'linux',
        error: err?.message || 'Failed to read hotspot status'
      };
    }
  });
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

app.on('before-quit', () => {
  // Best-effort cleanup (avoid leaving the AP running).
  hotspotStop().catch(() => null);
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
  .then(() => registerIpc())
  .then(startNextServerIfPackaged)
  .then(createMainWindow)
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    app.quit();
  });
