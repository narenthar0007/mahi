const { app, BrowserWindow, shell } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const isProd = process.argv.includes('--prod');
const APP_NAME = 'GEET app';
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
    console.error('Build not found. Run: npm run desktop:build');
    app.quit();
    return;
  }

  try {
    const url = await startStaticServer(DIST_DIR);
    await mainWindow.loadURL(url);
  } catch (error) {
    console.error('Failed to start desktop app:', error);
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
}

app.whenReady().then(() => {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
