/**
 * Fast Windows share pack (no electron-builder dependency walk).
 * Creates a zip on the Desktop that other Windows users can download and run.
 */
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const appName = 'NAM bill';
const exeName = 'NAM bill.exe';
const zipName = 'NAM-bill-Windows.zip';

const desktopCandidates = [
  path.join(process.env.USERPROFILE || '', 'OneDrive', 'Desktop'),
  path.join(process.env.USERPROFILE || '', 'Desktop'),
];
const desktop = desktopCandidates.find((p) => fs.existsSync(p)) || desktopCandidates[0];

const outRoot =
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'POSBilling', 'share')
    : path.join(projectRoot, 'release', 'share');
const appDir = path.join(outRoot, 'NAM-bill-Windows');
const zipPath = path.join(desktop, zipName);

function rm(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function main() {
  const distIndex = path.join(projectRoot, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    console.log('Exporting web bundle to dist...');
    execSync('npx expo export --platform web --output-dir dist', {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, EXPO_NO_DEPENDENCY_VALIDATION: '1' },
    });
  }

  const electronDist = path.join(projectRoot, 'node_modules', 'electron', 'dist');
  const electronExe = path.join(electronDist, 'electron.exe');
  if (!fs.existsSync(electronExe)) {
    throw new Error('Electron runtime missing. Run: npm install');
  }

  const wsPkg = path.join(projectRoot, 'node_modules', 'ws');
  if (!fs.existsSync(wsPkg)) {
    throw new Error('Missing dependency "ws". Run: npm install');
  }

  console.log('Packing shareable Windows app...');
  rm(outRoot);
  ensureDir(appDir);

  // Electron runtime
  copyDir(electronDist, appDir);
  const runtimeExe = path.join(appDir, 'electron.exe');
  const namedExe = path.join(appDir, exeName);
  if (fs.existsSync(runtimeExe)) {
    fs.renameSync(runtimeExe, namedExe);
  }

  // App files (unpacked under resources/app)
  const resourcesApp = path.join(appDir, 'resources', 'app');
  ensureDir(resourcesApp);

  copyDir(path.join(projectRoot, 'electron'), path.join(resourcesApp, 'electron'));
  copyDir(path.join(projectRoot, 'dist'), path.join(resourcesApp, 'dist'));
  if (fs.existsSync(path.join(projectRoot, 'assets'))) {
    copyDir(path.join(projectRoot, 'assets'), path.join(resourcesApp, 'assets'));
  }

  // Only runtime deps needed by Electron main process
  copyDir(wsPkg, path.join(resourcesApp, 'node_modules', 'ws'));
  // ws may need optional deps; copy package-level peers if present
  for (const optional of ['bufferutil', 'utf-8-validate']) {
    const optionalPath = path.join(projectRoot, 'node_modules', optional);
    if (fs.existsSync(optionalPath)) {
      copyDir(optionalPath, path.join(resourcesApp, 'node_modules', optional));
    }
  }

  const packagedPackageJson = {
    name: 'nam-bill-desktop',
    version: '1.0.0',
    private: true,
    main: 'electron/main.js',
    productName: appName,
  };
  fs.writeFileSync(
    path.join(resourcesApp, 'package.json'),
    `${JSON.stringify(packagedPackageJson, null, 2)}\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(appDir, 'HOW-TO-RUN.txt'),
    [
      `${appName} — Windows`,
      '',
      '1. Unzip this folder anywhere (Downloads, Desktop, etc.).',
      `2. Double-click "${exeName}" to open the app.`,
      '3. Windows may show SmartScreen the first time: More info → Run anyway.',
      '',
      'No install required. You can delete the folder to remove the app.',
      '',
    ].join('\r\n'),
    'utf8'
  );

  console.log('Creating zip on Desktop...');
  rm(zipPath);

  const ps = `
$ErrorActionPreference = 'Stop'
Compress-Archive -Path '${appDir.replace(/'/g, "''")}' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force
`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error('Failed to create zip on Desktop');
  }

  const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
  console.log('');
  console.log('Done.');
  console.log(`Folder: ${appDir}`);
  console.log(`Share this file: ${zipPath} (${sizeMb} MB)`);
  console.log('Other Windows users: download → unzip → run "NAM bill.exe"');
}

main();
