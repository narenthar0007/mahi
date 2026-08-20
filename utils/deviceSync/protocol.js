import uuidImport from 'react-native-uuid';
import { SYNC_PORT, SYNC_PROTOCOL_VERSION, SYNC_QR_PREFIX } from './constants';

const uuid = uuidImport?.v4 ? uuidImport : uuidImport?.default || uuidImport;

function newId() {
  if (typeof uuid?.v4 === 'function') return String(uuid.v4());
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createDeviceId() {
  return newId();
}

export function createSyncToken() {
  return newId().replace(/-/g, '').slice(0, 12);
}

export function buildQrPayload({
  host,
  hosts = [],
  port = SYNC_PORT,
  token,
  shopName = '',
  deviceName = '',
}) {
  const primary = String(host || '').trim();
  const hostList = [primary, ...(Array.isArray(hosts) ? hosts : [])]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter((entry, index, all) => all.indexOf(entry) === index);

  return JSON.stringify({
    v: SYNC_PROTOCOL_VERSION,
    app: SYNC_QR_PREFIX,
    host: hostList[0] || primary,
    hosts: hostList,
    port: Number(port) || SYNC_PORT,
    token,
    shopName: shopName || '',
    deviceName: deviceName || 'Master',
  });
}

export function parseQrPayload(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, error: 'empty' };

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // Support URL-style: nambill://sync?data=<urlencoded json>
    try {
      if (text.includes('data=')) {
        const encoded = text.split('data=')[1].split('&')[0];
        data = JSON.parse(decodeURIComponent(encoded));
      }
    } catch {
      return { ok: false, error: 'invalid_qr' };
    }
  }

  if (!data || data.app !== SYNC_QR_PREFIX) {
    return { ok: false, error: 'invalid_app' };
  }
  if (Number(data.v) !== SYNC_PROTOCOL_VERSION) {
    return { ok: false, error: 'version_mismatch' };
  }
  if (!data.host || !data.token) {
    return { ok: false, error: 'missing_fields' };
  }

  const host = String(data.host).trim();
  const hosts = [host, ...(Array.isArray(data.hosts) ? data.hosts : [])]
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .filter((entry, index, all) => all.indexOf(entry) === index);

  if (!hosts.length || hosts.every((entry) => entry === '0.0.0.0' || entry === '127.0.0.1')) {
    return { ok: false, error: 'invalid_host' };
  }

  return {
    ok: true,
    payload: {
      host: hosts[0],
      hosts,
      port: Number(data.port) || SYNC_PORT,
      token: String(data.token),
      shopName: String(data.shopName || ''),
      deviceName: String(data.deviceName || 'Master'),
    },
  };
}

export function extractSyncSnapshot(state) {
  return {
    tables: Array.isArray(state.tables) ? state.tables : [],
    history: Array.isArray(state.history) ? state.history : [],
    inventory: Array.isArray(state.inventory) ? state.inventory : [],
    orderSequence: Number(state.orderSequence) || 0,
    shopName: state.shopName || '',
    fssaiNumber: state.fssaiNumber || '',
    gstinNumber: state.gstinNumber || '',
    shopOffer: state.shopOffer || null,
    enableWeightBasedPricing: Boolean(state.enableWeightBasedPricing),
    enableVariablePriceItems: Boolean(state.enableVariablePriceItems),
    menuListView: Boolean(state.menuListView),
    showWhatsAppInvoiceButtons: state.showWhatsAppInvoiceButtons !== false,
    enableTables: state.enableTables !== false,
    ts: Date.now(),
  };
}

export function getWsUrl(host, port = SYNC_PORT) {
  return `ws://${host}:${port}`;
}
