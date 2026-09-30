import { Platform } from 'react-native';
import { MSG, SYNC_PORT } from './constants';
import { discoverLanIpCandidates, isUsableLanIp } from './lanIp';
import {
  buildQrPayload,
  createDeviceId,
  createSyncToken,
  extractSyncSnapshot,
  getWsUrl,
  parseQrPayload,
} from './protocol';
import { wrapSyncMessage, unwrapSyncMessage } from '../secureCrypto';

function getElectronSync() {
  if (typeof window !== 'undefined' && window.electronSync?.isElectron) {
    return window.electronSync;
  }
  return null;
}

async function getLocalIpCandidates() {
  const electron = getElectronSync();
  if (electron) {
    try {
      const ip = await electron.getLocalIp();
      if (isUsableLanIp(ip)) return [ip];
    } catch {
      // fall through
    }
  }

  return discoverLanIpCandidates();
}

class DeviceSyncManager {
  constructor() {
    this.role = 'solo'; // solo | master | child
    this.deviceId = createDeviceId();
    this.deviceName = Platform.OS === 'web' ? 'Desktop' : Platform.OS;
    this.token = '';
    this.host = '';
    this.hosts = [];
    this.shopName = '';
    this.port = SYNC_PORT;
    this.qrPayload = '';
    this.peers = [];
    this.connected = false;
    this.server = null;
    this.socket = null;
    this.electronUnsub = null;
    this.applyingRemote = false;
    this.listeners = new Set();
    this.getStore = null;
    this.unsubscribeStore = null;
    this.pushTimer = null;
  }

  protect(message) {
    if (!this.token || !message) return message;
    return wrapSyncMessage(message, this.token);
  }

  reveal(message) {
    if (!message) return message;
    if (!this.token) return message;
    return unwrapSyncMessage(message, this.token);
  }

  setStoreAccessor(getStore) {
    this.getStore = getStore;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    const snapshot = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {
        // ignore listener errors
      }
    });
  }

  getStatus() {
    return {
      role: this.role,
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      token: this.token,
      host: this.host,
      hosts: [...(this.hosts || [])],
      port: this.port,
      qrPayload: this.qrPayload,
      peers: [...this.peers],
      connected: this.connected,
      peerCount: this.peers.length,
      canHost:
        Platform.OS !== 'web' || Boolean(getElectronSync()),
    };
  }

  rebuildQrPayload(shopName = '') {
    this.qrPayload = buildQrPayload({
      host: this.host,
      hosts: this.hosts,
      port: this.port,
      token: this.token,
      shopName,
      deviceName: this.deviceName,
    });
  }

  async startMaster({ shopName = '', deviceName = '', hostOverride = '' } = {}) {
    await this.stop();
    this.role = 'master';
    this.token = createSyncToken();
    this.deviceName = deviceName || shopName || this.deviceName;
    this.port = SYNC_PORT;
    this.peers = [];
    this.shopName = shopName || '';

    const candidates = await getLocalIpCandidates();
    const override = String(hostOverride || '').trim();
    if (override) {
      if (!isUsableLanIp(override)) {
        this.role = 'solo';
        throw new Error('invalid_lan_ip');
      }
      this.hosts = [override, ...candidates.filter((ip) => ip !== override)];
    } else {
      this.hosts = candidates;
    }
    this.host = this.hosts[0] || '';

    if (!this.host) {
      this.role = 'solo';
      throw new Error('lan_ip_unavailable');
    }

    const electron = getElectronSync();
    if (electron) {
      const result = await electron.startServer(this.port, this.token);
      if (isUsableLanIp(result?.host) && !override) {
        this.host = result.host;
        this.hosts = [result.host, ...this.hosts.filter((ip) => ip !== result.host)];
      }
      this.electronUnsub = electron.onClientEvent((payload) => {
        this.handleElectronEvent(payload);
      });
      this.server = { type: 'electron' };
    } else if (Platform.OS !== 'web') {
      const { createNativeWsServer } = require('./nativeWsServer');
      this.server = await createNativeWsServer({
        port: this.port,
        onConnect: () => {
          // wait for hello
        },
        onDisconnect: (client) => {
          this.peers = this.peers.filter((p) => p.clientId !== client.id);
          this.broadcastPeerList();
          this.emit();
        },
        onMessage: (client, message) => {
          this.handleServerMessage(client.id, this.reveal(message), (msg) => client.send(this.protect(msg)));
        },
      });
    } else {
      this.role = 'solo';
      throw new Error('master_requires_native_or_electron');
    }

    this.rebuildQrPayload(shopName);
    this.connected = true;
    this.watchStore();
    this.emit();
    return this.getStatus();
  }

  async refreshMasterHost({ shopName = '', hostOverride = '' } = {}) {
    if (this.role !== 'master' || !this.server) {
      throw new Error('not_master');
    }
    const candidates = await getLocalIpCandidates();
    const override = String(hostOverride || '').trim();
    if (override) {
      if (!isUsableLanIp(override)) throw new Error('invalid_lan_ip');
      this.hosts = [override, ...candidates.filter((ip) => ip !== override)];
    } else if (candidates.length) {
      this.hosts = candidates;
    }
    if (!this.hosts[0]) throw new Error('lan_ip_unavailable');
    this.host = this.hosts[0];
    this.rebuildQrPayload(shopName || this.shopName || '');
    this.emit();
    return this.getStatus();
  }

  handleElectronEvent(payload) {
    if (!payload) return;
    if (payload.type === 'connect') {
      // wait for hello
      this.emit();
    } else if (payload.type === 'disconnect') {
      this.peers = this.peers.filter((p) => p.clientId !== payload.clientId);
      this.broadcastPeerList();
      this.emit();
    } else if (payload.type === 'message') {
      const electron = getElectronSync();
      this.handleServerMessage(payload.clientId, this.reveal(payload.message), (msg) => {
        electron?.send(payload.clientId, this.protect(msg));
      });
    }
  }

  handleServerMessage(clientId, message, send) {
    if (!message || !message.type) return;

    if (message.type === MSG.HELLO) {
      if (message.token !== this.token) {
        send({ type: MSG.ERROR, error: 'invalid_token' });
        return;
      }
      const peer = {
        clientId,
        deviceId: message.deviceId || clientId,
        deviceName: message.deviceName || 'Child',
      };
      this.peers = [...this.peers.filter((p) => p.clientId !== clientId), peer];
      const snapshot = this.getStore ? extractSyncSnapshot(this.getStore.getState()) : null;
      send({
        type: MSG.WELCOME,
        masterDeviceId: this.deviceId,
        masterName: this.deviceName,
        snapshot,
      });
      this.broadcastPeerList();
      this.emit();
      return;
    }

    if (message.type === MSG.PUSH) {
      if (message.token !== this.token) return;
      if (message.snapshot && this.getStore) {
        this.applyRemoteSnapshot(message.snapshot);
        this.broadcastSnapshot(clientId);
      }
      return;
    }

    if (message.type === MSG.PING) {
      send({ type: MSG.PONG });
    }
  }

  broadcastPeerList() {
    const msg = {
      type: MSG.PEER_LIST,
      peers: this.peers.map((p) => ({
        deviceId: p.deviceId,
        deviceName: p.deviceName,
      })),
      master: { deviceId: this.deviceId, deviceName: this.deviceName },
    };
    this.serverBroadcast(msg);
  }

  broadcastSnapshot(exceptClientId = null) {
    if (!this.getStore || this.role !== 'master') return;
    const snapshot = extractSyncSnapshot(this.getStore.getState());
    this.serverBroadcast(
      {
        type: MSG.SNAPSHOT,
        snapshot,
        fromDeviceId: this.deviceId,
      },
      exceptClientId
    );
  }

  serverBroadcast(message, exceptClientId = null) {
    const payload = this.protect(message);
    const electron = getElectronSync();
    if (this.server?.type === 'electron' && electron) {
      electron.broadcast(payload, exceptClientId);
      return;
    }
    if (this.server?.broadcast) {
      this.server.broadcast(payload, exceptClientId);
    }
  }

  connectChildSocket(host, port) {
    const url = getWsUrl(host, port);
    return new Promise((resolve, reject) => {
      let settled = false;
      let socket;
      try {
        socket = new WebSocket(url);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('connection_failed'));
        return;
      }
      this.socket = socket;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        if (this.socket === socket) this.socket = null;
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      const ok = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      socket.onopen = () => {
        socket.send(
          JSON.stringify(this.protect({
            type: MSG.HELLO,
            token: this.token,
            deviceId: this.deviceId,
            deviceName: this.deviceName,
          }))
        );
      };

      socket.onmessage = (event) => {
        let msg;
        try {
          msg = this.reveal(JSON.parse(String(event.data)));
        } catch {
          return;
        }
        if (!msg) return;
        if (msg.type === MSG.ERROR) {
          fail(new Error(msg.error || 'sync_error'));
          return;
        }
        if (msg.type === MSG.WELCOME) {
          if (msg.snapshot) this.applyRemoteSnapshot(msg.snapshot);
          this.connected = true;
          this.watchStore();
          this.emit();
          ok();
          return;
        }
        if (msg.type === MSG.SNAPSHOT && msg.snapshot) {
          this.applyRemoteSnapshot(msg.snapshot);
          this.emit();
          return;
        }
        if (msg.type === MSG.PEER_LIST) {
          this.peers = Array.isArray(msg.peers) ? msg.peers : [];
          this.emit();
        }
      };

      socket.onerror = () => fail(new Error('connection_failed'));
      socket.onclose = () => {
        if (!settled) fail(new Error('connection_closed'));
        if (settled) {
          this.connected = false;
          this.emit();
        }
      };

      setTimeout(() => fail(new Error('connection_timeout')), 8000);
    });
  }

  async joinAsChild(qrRaw, { deviceName = '' } = {}) {
    const parsed = parseQrPayload(qrRaw);
    if (!parsed.ok) {
      throw new Error(parsed.error || 'invalid_qr');
    }

    await this.stop();
    this.role = 'child';
    this.token = parsed.payload.token;
    this.port = parsed.payload.port;
    this.deviceName = deviceName || this.deviceName;
    this.qrPayload = '';
    this.hosts = parsed.payload.hosts || [parsed.payload.host];
    this.host = this.hosts[0];

    let lastError = new Error('connection_failed');
    for (const host of this.hosts) {
      if (!host || host === '0.0.0.0' || host === '127.0.0.1') continue;
      try {
        this.host = host;
        await this.connectChildSocket(host, this.port);
        return this.getStatus();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    this.role = 'solo';
    this.connected = false;
    this.token = '';
    throw lastError;
  }

  applyRemoteSnapshot(snapshot) {
    if (!this.getStore || !snapshot) return;
    this.applyingRemote = true;
    try {
      this.getStore.getState().applySyncSnapshot?.(snapshot);
    } finally {
      setTimeout(() => {
        this.applyingRemote = false;
      }, 250);
    }
  }

  watchStore() {
    if (!this.getStore || this.unsubscribeStore) return;
    let prev = extractSyncSnapshot(this.getStore.getState());
    this.unsubscribeStore = this.getStore.subscribe((state) => {
      const next = extractSyncSnapshot(state);
      if (this.applyingRemote || this.role === 'solo' || !this.connected) {
        prev = next;
        return;
      }
      const changed =
        JSON.stringify({
          tables: prev.tables,
          history: prev.history,
          inventory: prev.inventory,
          orderSequence: prev.orderSequence,
        }) !==
        JSON.stringify({
          tables: next.tables,
          history: next.history,
          inventory: next.inventory,
          orderSequence: next.orderSequence,
        });
      if (!changed) return;
      prev = next;
      this.schedulePush(next);
    });
  }

  schedulePush(snapshot) {
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.pushSnapshot(snapshot);
    }, 120);
  }

  pushSnapshot(snapshot) {
    if (!this.connected || this.applyingRemote) return;
    const data = snapshot || (this.getStore ? extractSyncSnapshot(this.getStore.getState()) : null);
    if (!data) return;

    if (this.role === 'master') {
      this.broadcastSnapshot();
      return;
    }

    if (this.role === 'child' && this.socket?.readyState === 1) {
      this.socket.send(
        JSON.stringify(this.protect({
          type: MSG.PUSH,
          token: this.token,
          deviceId: this.deviceId,
          snapshot: data,
        }))
      );
    }
  }

  async stop() {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }
    if (this.electronUnsub) {
      this.electronUnsub();
      this.electronUnsub = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
      this.socket = null;
    }
    if (this.server?.type === 'electron') {
      try {
        await getElectronSync()?.stopServer();
      } catch {
        // ignore
      }
      this.server = null;
    } else if (this.server?.stop) {
      try {
        await this.server.stop();
      } catch {
        // ignore
      }
      this.server = null;
    }
    this.role = 'solo';
    this.connected = false;
    this.token = '';
    this.host = '';
    this.hosts = [];
    this.shopName = '';
    this.qrPayload = '';
    this.peers = [];
    this.emit();
  }
}

const deviceSync = new DeviceSyncManager();
export default deviceSync;
export { parseQrPayload, buildQrPayload, SYNC_PORT };
