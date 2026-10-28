import {
  assertHttpsUrl,
  decryptCustomerRow,
} from './secureCrypto';

export const APP_VERSION = '1.0.0';

export const DEFAULT_SHEET_ID = '1Gr7vHrtQZ_wRrFsv3y_mCJ6qdNeSB7x_TkQhUCY3ato';
export const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Gr7vHrtQZ_wRrFsv3y_mCJ6qdNeSB7x_TkQhUCY3ato/edit?gid=0#gid=0';
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxjLrd4XB11GwxmntVLpOAWPENBDmmaq9L01OH7ek28yd-sbM8eP1-asZ3PdcgDhQuQeQ/exec';
export const CONTROL_SHOP_NAME = '__NAM_BILL_CONTROL__';
export const LICENSE_CONTROL_JSON_URL =
  'https://raw.githubusercontent.com/narenthar0007/mahi/master/website/license-control.json';

export const SHEET_COLUMNS = {
  name: 'Name',
  mobile: 'Mobile Number',
  email: 'Email ID',
  paymentDate: 'Date of payment',
  loginDate: 'Date of login',
  expireDate: 'Expire date',
  paymentMode: 'Payment mode',
  amount: 'Amount',
  loginKey: 'Login key',
  shop: 'Shop name',
  userCode: 'User Code',
  isLogin: 'Is Login',
  status: 'Status',
  loginSession: 'Login session',
  remarks: 'Remarks',
};

/** Live sheet order (Status / Login session / Remarks may be appended by Apps Script). */
export const SHEET_HEADER_ORDER = [
  SHEET_COLUMNS.name,
  SHEET_COLUMNS.mobile,
  SHEET_COLUMNS.email,
  SHEET_COLUMNS.paymentDate,
  SHEET_COLUMNS.loginDate,
  SHEET_COLUMNS.expireDate,
  SHEET_COLUMNS.paymentMode,
  SHEET_COLUMNS.amount,
  SHEET_COLUMNS.loginKey,
  SHEET_COLUMNS.shop,
  SHEET_COLUMNS.userCode,
  SHEET_COLUMNS.isLogin,
  SHEET_COLUMNS.status,
  SHEET_COLUMNS.loginSession,
  SHEET_COLUMNS.remarks,
];

export const REQUIRED_SHEET_FIELDS = [
  SHEET_COLUMNS.name,
  SHEET_COLUMNS.mobile,
  SHEET_COLUMNS.shop,
  SHEET_COLUMNS.paymentDate,
  SHEET_COLUMNS.loginDate,
  SHEET_COLUMNS.expireDate,
  SHEET_COLUMNS.paymentMode,
  SHEET_COLUMNS.amount,
  SHEET_COLUMNS.loginKey,
  // Status is optional on older rows — missing means Active
];

const FETCH_TIMEOUT_MS = 8000;

function withTimeout(promise, ms = FETCH_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function compareVersions(a, b) {
  const pa = String(a || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function extractSheetId(urlOrId) {
  const raw = String(urlOrId || '').trim();
  if (!raw) return '';
  const fromPath = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromPath) return fromPath[1];
  const fromParam = raw.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (fromParam) return fromParam[1];
  if (/^[a-zA-Z0-9-_]{30,}$/.test(raw)) return raw;
  return '';
}

export function parseSheetDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const end = new Date(value);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }

  const text = String(value).trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 23, 59, 59, 999);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 23, 59, 59, 999);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }

  return null;
}

export function normalizeStatus(value) {
  const status = String(value || 'Active').trim().toLowerCase();
  if (status === 'disabled' || status === 'blocked' || status === 'revoked') return 'Disabled';
  if (status === 'inactive' || status === 'expired') return 'Inactive';
  if (status === 'forceupdate' || status === 'force update') return 'ForceUpdate';
  return 'Active';
}

export function rowField(row, ...keys) {
  if (!row || typeof row !== 'object') return '';
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key]).trim();
  }
  const lower = {};
  Object.keys(row).forEach((k) => {
    lower[k.trim().toLowerCase()] = row[k];
  });
  for (const key of keys) {
    const found = lower[String(key).trim().toLowerCase()];
    if (found != null && String(found).trim() !== '') return String(found).trim();
  }
  return '';
}

export function isControlRow(row) {
  const shop = rowField(row, SHEET_COLUMNS.shop, 'shop', 'shopName');
  return shop === CONTROL_SHOP_NAME;
}

export function parseControlRow(row) {
  if (!row) return null;
  const status = normalizeStatus(rowField(row, SHEET_COLUMNS.status, 'status'));
  return {
    minAppVersion: rowField(row, SHEET_COLUMNS.loginKey, 'Login Key', 'minAppVersion') || '1.0.0',
    latestAppVersion: rowField(row, SHEET_COLUMNS.amount, 'latestAppVersion') || '',
    forceUpdate: status === 'ForceUpdate' || status === 'Disabled',
    downloadUrl: rowField(row, SHEET_COLUMNS.email, 'downloadUrl'),
    updateMessage: rowField(row, SHEET_COLUMNS.remarks, 'Remarks', 'updateMessage'),
    requireSheetRecord: /strict|require|yes|true/i.test(
      rowField(row, SHEET_COLUMNS.paymentMode, 'requireSheetRecord') || 'Strict'
    ),
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const input = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h || '').trim());
  return rows.slice(1).filter((r) => r.some((c) => String(c || '').trim() !== '')).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] == null ? '' : String(r[idx]).trim();
    });
    return obj;
  });
}

async function fetchText(url) {
  const res = await withTimeout(fetch(url, { headers: { Accept: 'text/csv,application/json' } }));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchLicenseControlJson(url = LICENSE_CONTROL_JSON_URL) {
  try {
    const data = await fetchJson(url);
    if (!data || typeof data !== 'object') return null;
    return {
      minAppVersion: String(data.minAppVersion || '1.0.0'),
      latestAppVersion: String(data.latestAppVersion || data.minAppVersion || '1.0.0'),
      forceUpdate: Boolean(data.forceUpdate),
      downloadUrl: String(data.downloadUrl || ''),
      updateMessage: String(data.updateMessage || ''),
      googleSheetId: extractSheetId(data.googleSheetId || data.googleSheetUrl) || DEFAULT_SHEET_ID,
      googleSheetUrl: String(data.googleSheetUrl || DEFAULT_SHEET_URL),
      appsScriptUrl: String(data.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL).trim(),
      requireSheetRecord: data.requireSheetRecord !== false,
      blockDisabledAccounts: data.blockDisabledAccounts !== false,
    };
  } catch {
    return null;
  }
}

export async function fetchCustomersFromSheetdb() {
  // SheetDB removed — kept as empty stub so older callers do not crash.
  return [];
}

export function parseIsLogin(row) {
  const raw = rowField(
    row,
    SHEET_COLUMNS.isLogin,
    'Is Login id',
    'Is login',
    'isLogin',
  );
  if (typeof raw === 'boolean') return raw;
  const text = String(raw ?? '').trim();
  if (!text) return false;
  // Sheets may return TRUE/FALSE, true/false, or checkbox 1/0
  return /^(true|yes|1|y)$/i.test(text);
}

export function parseLoginSession(row) {
  return rowField(row, SHEET_COLUMNS.loginSession, 'Login Session', 'loginSession');
}

function loginFlagPayload(isLogin, sessionId = '') {
  const flag = isLogin ? 'TRUE' : 'FALSE';
  return {
    [SHEET_COLUMNS.isLogin]: flag,
    'Is Login id': flag,
    [SHEET_COLUMNS.loginSession]: isLogin ? String(sessionId || '') : '',
  };
}

async function patchSheetdbRow() {
  throw new Error('SheetDB is disabled. Configure Google Apps Script for sheet writes.');
}

export async function setAccountLoginState({
  shopName,
  licenseKey,
  isLogin,
  sessionId = '',
  row = null,
} = {}) {
  const jsonControl = await fetchLicenseControlJson();
  const control = mergeControl(jsonControl, null);
  const payload = loginFlagPayload(isLogin, sessionId);
  const shop = String(shopName || rowField(row, SHEET_COLUMNS.shop) || '').trim();
  const key = String(licenseKey || rowField(row, SHEET_COLUMNS.loginKey) || '').trim();
  const appsScriptUrl = String(control.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();

  if (!appsScriptUrl) {
    return false;
  }
  if (!shop) {
    throw new Error('Shop name is required to update Is Login.');
  }

  assertHttpsUrl(appsScriptUrl);
  const res = await withTimeout(
    fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'loginState',
        data: {
          ...payload,
          [SHEET_COLUMNS.shop]: shop,
          [SHEET_COLUMNS.loginKey]: key,
        },
      }),
      redirect: 'follow',
    }),
    15000
  );

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Apps Script request failed (${res.status}) ${text.slice(0, 120)}`);
  }
  if (/accounts\.google\.com|Sign in/i.test(text)) {
    throw new Error('Apps Script is not public. Redeploy with Who has access = Anyone.');
  }
  try {
    const json = JSON.parse(text);
    if (json && json.ok === false) {
      throw new Error(json.error || 'Could not update Is Login on the sheet.');
    }
  } catch (err) {
    if (err && err.message && !/JSON/.test(err.message)) throw err;
    // Non-JSON success bodies are treated as ok when HTTP status is fine.
  }
  return true;
}

export async function searchSheetColumn() {
  return [];
}

export async function fetchCustomersFromCsv(sheetId) {
  const id = extractSheetId(sheetId) || DEFAULT_SHEET_ID;
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=0`;
  const text = await fetchText(url);
  return parseCsv(text);
}

export async function fetchCustomersFromAppsScript(appsScriptUrl, shopName) {
  const base = String(appsScriptUrl || '').trim();
  if (!base) return [];
  assertHttpsUrl(base);
  const params = new URLSearchParams({ action: shopName ? 'check' : 'list' });
  if (shopName) params.set('shop', shopName);
  const joiner = base.includes('?') ? '&' : '?';
  const data = await fetchJson(`${base}${joiner}${params.toString()}`);
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data)) return data;
  if (data?.row) return [data.row];
  return [];
}

function mergeControl(jsonControl, sheetControl) {
  return {
    minAppVersion: jsonControl?.minAppVersion || sheetControl?.minAppVersion || '1.0.0',
    latestAppVersion:
      jsonControl?.latestAppVersion || sheetControl?.latestAppVersion || jsonControl?.minAppVersion || '',
    forceUpdate: Boolean(jsonControl?.forceUpdate || sheetControl?.forceUpdate),
    downloadUrl: jsonControl?.downloadUrl || sheetControl?.downloadUrl || '',
    updateMessage:
      jsonControl?.updateMessage ||
      sheetControl?.updateMessage ||
      'A new version of NAM bill is available. Please download the latest app to continue.',
    requireSheetRecord:
      jsonControl?.requireSheetRecord !== false && sheetControl?.requireSheetRecord !== false,
    blockDisabledAccounts: jsonControl?.blockDisabledAccounts !== false,
    googleSheetId: jsonControl?.googleSheetId || DEFAULT_SHEET_ID,
    googleSheetUrl: jsonControl?.googleSheetUrl || DEFAULT_SHEET_URL,
    appsScriptUrl: jsonControl?.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL,
  };
}

function customerRows(rows) {
  return (rows || []).filter((row) => !isControlRow(row));
}

function rowShopName(row) {
  return rowField(row, SHEET_COLUMNS.shop, 'shop', 'shopName').trim().toLowerCase();
}

function rowLoginKey(row) {
  return rowField(row, SHEET_COLUMNS.loginKey, 'Login Key', 'licenseKey').trim().toUpperCase();
}

function findCustomerRow(rows, shopName, licenseKey) {
  const shop = String(shopName || '').trim().toLowerCase();
  const key = String(licenseKey || '').trim().toUpperCase();
  if (!shop || !key) return null;

  return (
    customerRows(rows).find((row) => rowShopName(row) === shop && rowLoginKey(row) === key) ||
    null
  );
}

function findCustomerRowByKey(rows, licenseKey) {
  const key = String(licenseKey || '').trim().toUpperCase();
  if (!key) return null;
  return customerRows(rows).find((row) => rowLoginKey(row) === key) || null;
}

async function loadRows(control, shopName, licenseKey) {
  const errors = [];

  // 1) Direct Google Sheet CSV (no SheetDB) — works when sheet is shared as Anyone with the link.
  try {
    const rows = await fetchCustomersFromCsv(control.googleSheetId || DEFAULT_SHEET_ID);
    if (rows.length) return rows.map((row) => decryptCustomerRow(row));
  } catch (err) {
    errors.push(err);
  }

  // 2) Optional Apps Script read (same spreadsheet, useful if CSV export is blocked).
  if (control.appsScriptUrl) {
    try {
      const rows = await fetchCustomersFromAppsScript(control.appsScriptUrl, shopName);
      if (rows.length) return rows.map((row) => decryptCustomerRow(row));
      // If shop filter returned empty, still try full list for control row + key checks.
      if (shopName) {
        const all = await fetchCustomersFromAppsScript(control.appsScriptUrl);
        if (all.length) return all.map((row) => decryptCustomerRow(row));
      }
    } catch (err) {
      errors.push(err);
    }
  }

  if (errors.length) throw errors[errors.length - 1];
  return [];
}

/**
 * Online license / account / app-update check.
 * Network failure returns { offline: true } so POS can still open on local key.
 */
export async function verifyAccountAccess({
  shopName,
  licenseKey,
  appVersion = APP_VERSION,
  sessionId = '',
  allowTakeover = false,
} = {}) {
  const jsonControl = await fetchLicenseControlJson();
  const fallback = mergeControl(jsonControl, null);

  let rows = [];
  let offline = false;
  try {
    rows = await loadRows(fallback, shopName, licenseKey);
  } catch {
    offline = true;
  }

  const sheetControlRow = rows.find((row) => isControlRow(row));
  const control = mergeControl(jsonControl, parseControlRow(sheetControlRow));

  const update = {
    minAppVersion: control.minAppVersion,
    latestAppVersion: control.latestAppVersion || control.minAppVersion,
    downloadUrl: control.downloadUrl,
    message: control.updateMessage,
  };

  const needsUpdate = compareVersions(control.minAppVersion, appVersion) > 0;

  if (offline) {
    return {
      ok: true,
      blocked: false,
      offline: true,
      updateAvailable: needsUpdate,
      update,
    };
  }

  if (control.forceUpdate && needsUpdate) {
    return {
      ok: false,
      blocked: true,
      forceUpdate: true,
      reason: 'force_update',
      error: update.message,
      update,
      offline,
    };
  }

  const shop = String(shopName || '').trim();
  const key = String(licenseKey || '').trim();
  if (!shop || !key) {
    return {
      ok: false,
      blocked: true,
      reason: 'shop_key_required',
      error: 'Shop name and license key must both match the Google Sheet.',
      updateAvailable: needsUpdate,
      update,
    };
  }

  const row = findCustomerRow(rows, shop, key);
  if (!row) {
    const keyOnly = findCustomerRowByKey(rows, key);
    if (keyOnly) {
      return {
        ok: false,
        blocked: true,
        reason: 'shop_mismatch',
        error:
          'Shop name does not match this license key. Enter the exact shop name from the Google Sheet.',
        updateAvailable: needsUpdate,
        update,
      };
    }
    if (control.requireSheetRecord) {
      return {
        ok: false,
        blocked: true,
        reason: 'not_registered',
        error:
          'This shop and license key are not registered together on the license sheet. Both must match the Google Sheet.',
        updateAvailable: needsUpdate,
        update,
      };
    }
    return {
      ok: true,
      blocked: false,
      updateAvailable: needsUpdate,
      update,
    };
  }

  const status = normalizeStatus(rowField(row, SHEET_COLUMNS.status, 'status'));
  if (control.blockDisabledAccounts && (status === 'Disabled' || status === 'Inactive')) {
    return {
      ok: false,
      blocked: true,
      reason: status === 'Disabled' ? 'disabled' : 'inactive',
      error:
        status === 'Disabled'
          ? 'This account has been disabled. Contact your NAM bill provider.'
          : 'This account is inactive. Contact your NAM bill provider to reactivate.',
      updateAvailable: needsUpdate,
      update,
      row,
    };
  }

  const expiryMs = parseSheetDate(rowField(row, SHEET_COLUMNS.expireDate, 'Expire Date', 'expiry'));
  if (expiryMs && Date.now() > expiryMs) {
    return {
      ok: false,
      blocked: true,
      reason: 'expired',
      error:
        'This license key has expired. Generate a 10-digit renewal code below and send it to your provider.',
      expiryMs,
      updateAvailable: needsUpdate,
      update,
      row,
    };
  }

  const currentSession = String(sessionId || '').trim();
  const activeLogin = parseIsLogin(row);
  const sheetSession = parseLoginSession(row);

  if (currentSession) {
    // Re-check while already authenticated in the app
    if (!activeLogin) {
      return {
        ok: false,
        blocked: true,
        reason: 'logged_out_remotely',
        error: 'This account was logged out. Please log in again.',
        updateAvailable: needsUpdate,
        update,
        row,
      };
    }
    if (sheetSession && sheetSession !== currentSession) {
      return {
        ok: false,
        blocked: true,
        reason: 'session_replaced',
        error: 'This license key was logged in on another device. Please log in again.',
        updateAvailable: needsUpdate,
        update,
        row,
      };
    }
  } else if (activeLogin && sheetSession && !allowTakeover) {
    // Only block when another device has a real session id.
    // Manual TRUE with empty Login session is treated as reclaimable.
    return {
      ok: false,
      blocked: true,
      reason: 'already_logged_in',
      alreadyLoggedIn: true,
      error:
        'This license key is already logged in on another device. Tap “Logout other devices” to continue here.',
      updateAvailable: needsUpdate,
      update,
      row,
    };
  }

  return {
    ok: true,
    blocked: false,
    expiryMs,
    status,
    row,
    alreadyLoggedIn: Boolean(activeLogin && sheetSession),
    updateAvailable: needsUpdate,
    update,
  };
}
