/**
 * API credentials for NAM bill.
 * 1) Customer generates App Unique Key (10) in Settings and sends it to support.
 * 2) Support enters that key in key-generator/index.html → API Credentials.
 * 3) Support returns App Key (20), Secret Token (25), Client Token (10).
 * 4) Customer pastes those three into Settings; app validates they match the unique key.
 */

export const API_SECRET = 'RIYE_POS_SECRET_2026';
export const APP_LICENSE_ID = 'com.riye.posbilling';

export const APP_UNIQUE_KEY_LENGTH = 10;
export const APP_KEY_LENGTH = 20;
export const SECRET_TOKEN_LENGTH = 25;
export const CLIENT_TOKEN_LENGTH = 10;

const ALPHA_NUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

function computeSignature(input, charset, length) {
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    state = (state * 31 + input.charCodeAt(i)) >>> 0;
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345 + input.charCodeAt(i % input.length)) >>> 0;
    out += charset[state % charset.length];
  }
  return out;
}

export function normalizeAppUniqueKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, APP_UNIQUE_KEY_LENGTH);
}

export function normalizeAppKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, APP_KEY_LENGTH);
}

export function normalizeSecretToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, SECRET_TOKEN_LENGTH);
}

export function normalizeClientToken(value) {
  return String(value || '')
    .trim()
    .replace(/\D/g, '')
    .slice(0, CLIENT_TOKEN_LENGTH);
}

/** Random 10-char unique app code (shown in Settings, sent to support). */
export function generateAppUniqueKey() {
  let key = '';
  for (let i = 0; i < APP_UNIQUE_KEY_LENGTH; i++) {
    const n =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 0xffffffff);
    key += ALPHA_NUM[n % ALPHA_NUM.length];
  }
  return key;
}

/**
 * Support-side: derive the three API credentials from an App Unique Key.
 * Must stay in sync with key-generator/index.html.
 */
export function generateApiCredentials(
  appUniqueKey,
  secret = API_SECRET,
  appId = APP_LICENSE_ID
) {
  const unique = normalizeAppUniqueKey(appUniqueKey);
  if (unique.length !== APP_UNIQUE_KEY_LENGTH) {
    return {
      success: false,
      error: `App Unique Key must be exactly ${APP_UNIQUE_KEY_LENGTH} alphanumeric characters.`,
    };
  }

  const base = `${secret}:${appId}:${unique}`;
  return {
    success: true,
    appUniqueKey: unique,
    appKey: computeSignature(`${base}:APP_KEY`, ALPHA_NUM, APP_KEY_LENGTH),
    secretToken: computeSignature(`${base}:SECRET`, ALPHA_NUM, SECRET_TOKEN_LENGTH),
    clientToken: computeSignature(`${base}:CLIENT`, DIGITS, CLIENT_TOKEN_LENGTH),
  };
}

export function validateApiCredentials(
  { appUniqueKey, appKey, secretToken, clientToken },
  secret = API_SECRET,
  appId = APP_LICENSE_ID
) {
  const unique = normalizeAppUniqueKey(appUniqueKey);
  const key = normalizeAppKey(appKey);
  const tok = normalizeSecretToken(secretToken);
  const client = normalizeClientToken(clientToken);

  if (!unique && !key && !tok && !client) {
    return { valid: false, reason: 'empty', configured: false };
  }

  if (unique.length !== APP_UNIQUE_KEY_LENGTH) {
    return { valid: false, reason: 'bad_unique', configured: false };
  }
  if (key.length !== APP_KEY_LENGTH) {
    return { valid: false, reason: 'bad_app_key', configured: false };
  }
  if (tok.length !== SECRET_TOKEN_LENGTH) {
    return { valid: false, reason: 'bad_secret', configured: false };
  }
  if (client.length !== CLIENT_TOKEN_LENGTH) {
    return { valid: false, reason: 'bad_client', configured: false };
  }

  const expected = generateApiCredentials(unique, secret, appId);
  if (!expected.success) {
    return { valid: false, reason: 'bad_unique', configured: false };
  }

  const match =
    key === expected.appKey &&
    tok === expected.secretToken &&
    client === expected.clientToken;

  return {
    valid: match,
    reason: match ? 'ok' : 'mismatch',
    configured: match,
    normalized: {
      appUniqueKey: unique,
      appKey: key,
      secretToken: tok,
      clientToken: client,
    },
  };
}

export function apiCredentialsConfigured(state) {
  return Boolean(
    state?.apiUniqueKey &&
      state?.apiAppKey &&
      state?.apiSecretToken &&
      state?.apiClientToken &&
      validateApiCredentials({
        appUniqueKey: state.apiUniqueKey,
        appKey: state.apiAppKey,
        secretToken: state.apiSecretToken,
        clientToken: state.apiClientToken,
      }).valid
  );
}

/** Headers for HTTP / Postman / curl. */
export function buildApiAuthHeaders({ appUniqueKey, appKey, secretToken, clientToken }) {
  return {
    'X-App-Unique-Key': normalizeAppUniqueKey(appUniqueKey),
    'X-App-Key': normalizeAppKey(appKey),
    'X-Secret-Token': normalizeSecretToken(secretToken),
    'X-Client-Token': normalizeClientToken(clientToken),
  };
}

/**
 * Merge appUniqueKey into an API JSON body so the server can find the correct app.
 * Tokens stay in headers; unique key is required in the body for app lookup.
 */
export function withAppAuthBody(payload, { appUniqueKey } = {}) {
  const unique = normalizeAppUniqueKey(appUniqueKey);
  const base =
    payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload } : {};
  return {
    appUniqueKey: unique,
    ...base,
  };
}

/**
 * Server-side style check: body.appUniqueKey identifies the app; headers must match
 * the credentials derived from that unique key.
 */
export function verifyApiRequestAuth({ headers = {}, body = {} } = {}) {
  const fromBody = normalizeAppUniqueKey(body?.appUniqueKey);
  const fromHeader = normalizeAppUniqueKey(
    headers['X-App-Unique-Key'] || headers['x-app-unique-key']
  );
  const appUniqueKey = fromBody || fromHeader;

  if (!fromBody) {
    return { valid: false, reason: 'missing_body_unique_key', appUniqueKey: '' };
  }
  if (fromHeader && fromHeader !== fromBody) {
    return { valid: false, reason: 'unique_key_mismatch', appUniqueKey: fromBody };
  }

  const check = validateApiCredentials({
    appUniqueKey,
    appKey: headers['X-App-Key'] || headers['x-app-key'],
    secretToken: headers['X-Secret-Token'] || headers['x-secret-token'],
    clientToken: headers['X-Client-Token'] || headers['x-client-token'],
  });

  return {
    ...check,
    appUniqueKey,
    reason: check.valid ? 'ok' : check.reason || 'invalid_credentials',
  };
}
