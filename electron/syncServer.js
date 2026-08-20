const os = require('os');
const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Map();
let nextId = 1;
let expectedToken = '';
let eventHandler = null;

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function startServer(port, token, onEvent) {
  stopServer();
  expectedToken = String(token || '');
  eventHandler = onEvent;
  wss = new WebSocketServer({ host: '0.0.0.0', port: Number(port) });

  wss.on('connection', (socket) => {
    const clientId = `e${nextId++}`;
    const client = {
      id: clientId,
      send(obj) {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(obj));
        }
      },
    };
    clients.set(clientId, client);
    eventHandler?.({ type: 'connect', clientId });

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        eventHandler?.({ type: 'message', clientId, message: msg, token: expectedToken });
      } catch {
        // ignore
      }
    });

    socket.on('close', () => {
      clients.delete(clientId);
      eventHandler?.({ type: 'disconnect', clientId });
    });
  });

  return { port: Number(port), host: getLocalIp() };
}

function stopServer() {
  if (wss) {
    try {
      clients.forEach((client) => {
        try {
          // no direct socket access; close via wss
        } catch {
          // ignore
        }
      });
      wss.close();
    } catch {
      // ignore
    }
  }
  wss = null;
  clients.clear();
  eventHandler = null;
}

function broadcast(message, exceptId = null) {
  const raw = JSON.stringify(message);
  clients.forEach((client, id) => {
    if (exceptId && id === exceptId) return;
    try {
      client.send(message);
    } catch {
      // ignore
    }
  });
  return clients.size;
}

function send(clientId, message) {
  clients.get(clientId)?.send(message);
}

function getClientCount() {
  return clients.size;
}

module.exports = {
  getLocalIp,
  startServer,
  stopServer,
  broadcast,
  send,
  getClientCount,
};
