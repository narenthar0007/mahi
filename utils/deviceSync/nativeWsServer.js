import { Platform } from 'react-native';
import { sha1Base64 } from './sha1';
import { SYNC_PORT } from './constants';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function encodeTextFrame(text) {
  const payload = Uint8Array.from(
    Array.from(unescape(encodeURIComponent(text))).map((ch) => ch.charCodeAt(0))
  );
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Uint8Array.from([0x81, len]);
  } else if (len < 65536) {
    header = Uint8Array.from([0x81, 126, (len >> 8) & 0xff, len & 0xff]);
  } else {
    header = Uint8Array.from([
      0x81,
      127,
      0,
      0,
      0,
      0,
      (len >> 24) & 0xff,
      (len >> 16) & 0xff,
      (len >> 8) & 0xff,
      len & 0xff,
    ]);
  }
  const out = new Uint8Array(header.length + payload.length);
  out.set(header, 0);
  out.set(payload, header.length);
  return out;
}

function decodeFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let headerLen = 2;
    if (len === 126) {
      if (offset + 4 > buffer.length) break;
      len = (buffer[offset + 2] << 8) | buffer[offset + 3];
      headerLen = 4;
    } else if (len === 127) {
      if (offset + 10 > buffer.length) break;
      len =
        (buffer[offset + 6] << 24) |
        (buffer[offset + 7] << 16) |
        (buffer[offset + 8] << 8) |
        buffer[offset + 9];
      headerLen = 10;
    }
    const maskLen = masked ? 4 : 0;
    const total = headerLen + maskLen + len;
    if (offset + total > buffer.length) break;

    let payload = buffer.slice(offset + headerLen + maskLen, offset + total);
    if (masked) {
      const mask = buffer.slice(offset + headerLen, offset + headerLen + 4);
      payload = payload.map((byte, i) => byte ^ mask[i % 4]);
    }

    if (opcode === 0x8) {
      messages.push({ type: 'close' });
    } else if (opcode === 0x9) {
      messages.push({ type: 'ping', payload });
    } else if (opcode === 0x1 || opcode === 0x2) {
      const text = decodeURIComponent(
        escape(String.fromCharCode.apply(null, Array.from(payload)))
      );
      messages.push({ type: 'text', text });
    }

    offset += total;
    buffer = buffer.slice(offset);
    offset = 0;
  }
  return { messages, rest: buffer };
}

/**
 * Minimal WebSocket server for React Native (LAN only).
 * Uses react-native-tcp-socket under the hood.
 */
export async function createNativeWsServer({ port = SYNC_PORT, onMessage, onConnect, onDisconnect }) {
  if (Platform.OS === 'web') {
    throw new Error('native_server_unavailable');
  }

  let TcpSocket;
  try {
    TcpSocket = require('react-native-tcp-socket');
  } catch (error) {
    throw new Error('tcp_socket_missing');
  }

  const clients = new Map();
  let nextId = 1;

  const server = TcpSocket.createServer((socket) => {
    const clientId = `c${nextId++}`;
    let handshakeDone = false;
    let buffer = new Uint8Array(0);

    const sendRaw = (bytes) => {
      try {
        const data =
          typeof Buffer !== 'undefined' ? Buffer.from(bytes) : Uint8Array.from(bytes);
        socket.write(data);
      } catch {
        // ignore write failures on closing sockets
      }
    };

    const sendJson = (obj) => {
      if (!handshakeDone) return;
      sendRaw(encodeTextFrame(JSON.stringify(obj)));
    };

    const client = { id: clientId, send: sendJson, socket };
    clients.set(clientId, client);

    socket.on('data', (data) => {
      const chunk = data instanceof Uint8Array ? data : Uint8Array.from(data);
      const merged = new Uint8Array(buffer.length + chunk.length);
      merged.set(buffer, 0);
      merged.set(chunk, buffer.length);
      buffer = merged;

      if (!handshakeDone) {
        const asText = String.fromCharCode.apply(null, Array.from(buffer));
        const end = asText.indexOf('\r\n\r\n');
        if (end === -1) return;
        const headerText = asText.slice(0, end);
        const keyMatch = headerText.match(/Sec-WebSocket-Key:\s*(.+)\r?/i);
        if (!keyMatch) {
          socket.destroy();
          return;
        }
        const accept = sha1Base64(`${keyMatch[1].trim()}${WS_GUID}`);
        const response = [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${accept}`,
          '\r\n',
        ].join('\r\n');
        socket.write(response);
        handshakeDone = true;
        buffer = buffer.slice(end + 4);
        onConnect?.(client);
      }

      if (!handshakeDone || buffer.length === 0) return;
      const decoded = decodeFrames(buffer);
      buffer = decoded.rest;
      decoded.messages.forEach((msg) => {
        if (msg.type === 'close') {
          socket.destroy();
        } else if (msg.type === 'ping') {
          // pong
          const frame = Uint8Array.from([0x8a, msg.payload?.length || 0, ...(msg.payload || [])]);
          sendRaw(frame);
        } else if (msg.type === 'text') {
          try {
            onMessage?.(client, JSON.parse(msg.text));
          } catch {
            // ignore bad json
          }
        }
      });
    });

    const cleanup = () => {
      if (clients.has(clientId)) {
        clients.delete(clientId);
        onDisconnect?.(client);
      }
    };
    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });

  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once('error', onError);
    server.listen({ port, host: '0.0.0.0', reuseAddress: true }, () => {
      server.removeListener('error', onError);
      resolve();
    });
  });

  return {
    port,
    broadcast(obj, exceptId = null) {
      const payload = obj;
      clients.forEach((client) => {
        if (exceptId && client.id === exceptId) return;
        client.send(payload);
      });
    },
    send(clientId, obj) {
      clients.get(clientId)?.send(obj);
    },
    getClientCount() {
      return clients.size;
    },
    async stop() {
      clients.forEach((client) => {
        try {
          client.socket.destroy();
        } catch {
          // ignore
        }
      });
      clients.clear();
      await new Promise((resolve) => {
        try {
          server.close(resolve);
        } catch {
          resolve();
        }
      });
    },
  };
}
