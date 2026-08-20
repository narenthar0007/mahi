const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronSync', {
  isElectron: true,
  getLocalIp: () => ipcRenderer.invoke('sync:get-local-ip'),
  startServer: (port, token) => ipcRenderer.invoke('sync:start-server', { port, token }),
  stopServer: () => ipcRenderer.invoke('sync:stop-server'),
  broadcast: (message, exceptId) => ipcRenderer.invoke('sync:broadcast', { message, exceptId }),
  send: (clientId, message) => ipcRenderer.invoke('sync:send', { clientId, message }),
  getClientCount: () => ipcRenderer.invoke('sync:client-count'),
  onClientEvent: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on('sync:client-event', listener);
    return () => ipcRenderer.removeListener('sync:client-event', listener);
  },
});
