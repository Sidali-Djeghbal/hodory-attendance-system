/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const teacherRoot = path.resolve(__dirname, '../../Hodory-teacher');
const electronRoot = path.resolve(__dirname, '..');

const standaloneDir = path.join(teacherRoot, '.next', 'standalone');
const staticDir = path.join(teacherRoot, '.next', 'static');
const publicDir = path.join(teacherRoot, 'public');

const outNextDir = path.join(electronRoot, 'next');
const outStaticDir = path.join(outNextDir, '.next', 'static');
const outPublicDir = path.join(outNextDir, 'public');

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyDir(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(from);
      fs.symlinkSync(link, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.error('Missing standalone build. Run: npm --prefix ../Hodory-teacher run build');
  process.exit(1);
}

rmrf(outNextDir);
mkdirp(outNextDir);

// Copy Next standalone server (server.js + minimal node_modules tree)
copyDir(standaloneDir, outNextDir);

// Next standalone requires `.next/static` + `public` to be copied next to server.js
mkdirp(path.dirname(outStaticDir));
copyDir(staticDir, outStaticDir);

if (fs.existsSync(publicDir)) {
  copyDir(publicDir, outPublicDir);
}

console.log('✅ Prepared Next standalone for Electron:', outNextDir);

