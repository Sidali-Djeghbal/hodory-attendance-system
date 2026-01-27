const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function writePathTxt(root, value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return;
  fs.writeFileSync(path.join(root, 'node_modules', 'electron', 'path.txt'), trimmed, 'utf8');
}

function readElectronVersion(root) {
  try {
    const pkg = require(path.join(root, 'node_modules', 'electron', 'package.json'));
    return pkg.version;
  } catch {
    return null;
  }
}

function cachedZipPath(version) {
  const arch = process.arch === 'x64' ? 'x64' : process.arch;
  return path.join(os.homedir(), '.cache', 'electron', `electron-v${version}-linux-${arch}.zip`);
}

function tryExtractFromCache(root) {
  if (process.platform !== 'linux') return false;

  const version = readElectronVersion(root);
  if (!version) return false;

  const zip = cachedZipPath(version);
  if (!fs.existsSync(zip)) return false;

  const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
  fs.mkdirSync(electronDist, { recursive: true });

  const unzip = spawnSync('unzip', ['-q', zip, '-d', electronDist], { stdio: 'inherit' });
  if ((unzip.status ?? 1) !== 0) return false;

  writePathTxt(root, 'electron');
  return true;
}

function main() {
  const root = path.join(__dirname, '..');
  const electronDist = path.join(root, 'node_modules', 'electron', 'dist');

  const exe =
    process.platform === 'win32'
      ? path.join(electronDist, 'electron.exe')
      : path.join(electronDist, 'electron');

  if (exists(exe)) {
    // Ensure `path.txt` exists and contains a clean value (no newline).
    writePathTxt(root, process.platform === 'win32' ? 'electron.exe' : 'electron');
    return;
  }

  const installer = path.join(root, 'node_modules', 'electron', 'install.js');
  if (!fs.existsSync(installer)) {
    // eslint-disable-next-line no-console
    console.error('Electron package is missing. Run `npm install` in this folder.');
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('⚠️  Electron binary missing. Running electron install script…');

  // First, try extracting from the local cache (avoids network and is faster).
  if (tryExtractFromCache(root) && exists(exe)) return;

  const result = spawnSync(process.execPath, [installer], {
    stdio: 'inherit',
    cwd: root,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '0' }
  });

  process.exit(result.status ?? 0);
}

main();

