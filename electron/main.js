const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const syncServer = require('./syncServer');

const isProd = app.isPackaged || process.argv.includes('--prod');
const APP_NAME = 'NAM bill';
const WEB_PORT = process.env.WEB_PORT || 8085;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
const DIST_DIR = path.join(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

let mainWindow;
let staticServer;

app.setName(APP_NAME);

function showStartupError(title, message) {
  dialog.showErrorBox(title, message);
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const relativePath = urlPath === '/' ? '/index.html' : urlPath;
      const filePath = path.join(rootDir, relativePath);

      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    staticServer.listen(0, '127.0.0.1', () => {
      const address = staticServer.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });

    staticServer.on('error', reject);
  });
}

function registerSyncIpc() {
  ipcMain.handle('sync:get-local-ip', async () => syncServer.getLocalIp());

  ipcMain.handle('sync:start-server', async (_event, { port, token }) => {
    const info = syncServer.startServer(port, token, (payload) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:client-event', payload);
      }
    });
    return { ok: true, ...info };
  });

  ipcMain.handle('sync:stop-server', async () => {
    syncServer.stopServer();
    return { ok: true };
  });

  ipcMain.handle('sync:broadcast', async (_event, { message, exceptId }) => {
    syncServer.broadcast(message, exceptId || null);
    return { ok: true, count: syncServer.getClientCount() };
  });

  ipcMain.handle('sync:send', async (_event, { clientId, message }) => {
    syncServer.send(clientId, message);
    return { ok: true };
  });

  ipcMain.handle('sync:client-count', async () => syncServer.getClientCount());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: APP_NAME,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isProd) {
    startProdApp();
  } else {
    loadDevServer();
  }
}

async function startProdApp() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    showStartupError(
      `${APP_NAME} could not start`,
      'App files are missing. Reinstall NAM bill from the latest installer, or rebuild with: npm run desktop:installer'
    );
    app.quit();
    return;
  }

  try {
    const url = await startStaticServer(DIST_DIR);
    await mainWindow.loadURL(url);
  } catch (error) {
    console.error('Failed to start desktop app:', error);
    showStartupError(
      `${APP_NAME} could not start`,
      `Failed to load the app: ${error.message || error}`
    );
    app.quit();
  }
}

async function loadDevServer() {
  const maxAttempts = 40;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mainWindow.loadURL(WEB_URL);
      return;
    } catch (error) {
      console.log(`Waiting for web server (${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.error('Could not connect to Expo web server at', WEB_URL);
  console.error('Run in another terminal: npm run web');

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
  showStartupError(
    `${APP_NAME} could not connect`,
    `Could not reach the development server at ${WEB_URL}.\n\nOpen a terminal in the project folder and run:\n  npm run web\n\nThen start the desktop app again with:\n  npm run desktop`
  );
}

app.whenReady().then(() => {
  registerSyncIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    staticServer.close();
  }
  try {
    syncServer.stopServer();
  } catch {
    // ignore
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
