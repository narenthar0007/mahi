const fs = require('fs');
const path = require('path');

function safeRm(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (_e) {
    // Best-effort cleanup; if Windows/AV locks a file,
    // electron-builder will surface the real error.
  }
}

const projectRoot = path.join(__dirname, '..');
const releaseDir = path.join(projectRoot, 'release');

safeRm(path.join(releaseDir, 'win-unpacked'));
safeRm(path.join(releaseDir, 'win-unpacked.tmp'));

const localAppData = process.env.LOCALAPPDATA;
if (localAppData) {
  const localReleaseDir = path.join(localAppData, 'POSBilling', 'release');
  safeRm(path.join(localReleaseDir, 'win-unpacked'));
  safeRm(path.join(localReleaseDir, 'win-unpacked.tmp'));
}
