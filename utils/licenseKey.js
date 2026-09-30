// Shared secret — must match key-generator/index.html
export const LICENSE_SECRET = 'RIYE_POS_SECRET_2026';
// Binds renewal codes to this app only (must match key-generator/index.html)
export const APP_LICENSE_ID = 'com.riye.posbilling';
export const LICENSE_KEY_LENGTH = 20;
export const RENEWAL_CODE_LENGTH = 10;
export const RENEWAL_CODE_VALID_MS = 45 * 60 * 1000;
// New format (v2): [ISSUE(4)][EXPIRY(4)][SIG(12)] = 20 chars
const ISSUE_LEN_V2 = 4;
const EXPIRY_LEN_V2 = 4;
const SIG_LEN_V2 = 12;

// Legacy format (v1): [EXPIRY_MS(9)][SIG(11)] = 20 chars
const EXPIRY_LEN_V1 = 9;
const SIG_LEN_V1 = 11;
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function computeSignature(input, sigLen) {
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    state = (state * 31 + input.charCodeAt(i)) >>> 0;
  }
  let sig = '';
  for (let i = 0; i < sigLen; i++) {
    state = (state * 1103515245 + 12345 + input.charCodeAt(i % input.length)) >>> 0;
    sig += CHARS[state % 36];
  }
  return sig;
}

function toDayNumber(dateOrMs) {
  const ms = typeof dateOrMs === 'number' ? dateOrMs : dateOrMs.getTime();
  return Math.floor(ms / 86400000);
}

function endOfDayMsFromDayNumber(dayNumber) {
  return dayNumber * 86400000 + 86399999;
}

function buildLicenseKeyParts(issuedDay, expiryDay, sigInput, sigLen = SIG_LEN_V2) {
  const issuePart = issuedDay
    .toString(36)
    .toUpperCase()
    .padStart(ISSUE_LEN_V2, '0')
    .slice(-ISSUE_LEN_V2);
  const expiryPart = expiryDay
    .toString(36)
    .toUpperCase()
    .padStart(EXPIRY_LEN_V2, '0')
    .slice(-EXPIRY_LEN_V2);
  const sig = computeSignature(sigInput, sigLen);
  return (issuePart + expiryPart + sig).slice(0, LICENSE_KEY_LENGTH);
}

export function generateLicenseKey(
  expiryDate,
  secret = LICENSE_SECRET,
  appId = APP_LICENSE_ID
) {
  const issuedDay = toDayNumber(Date.now());
  const expiryDay = toDayNumber(expiryDate);
  return buildLicenseKeyParts(
    issuedDay,
    expiryDay,
    `${secret}:${appId}:${issuedDay}:${expiryDay}`
  );
}

export function generateLicenseKeyFromRenewal(
  renewalCode,
  shopName,
  expiryDate,
  secret = LICENSE_SECRET,
  appId = APP_LICENSE_ID,
  nowMs = Date.now()
) {
  const renewal = validateRenewalCode(renewalCode, shopName, secret, nowMs);
  if (!renewal.valid) {
    if (renewal.reason === 'expired') {
      return { success: false, error: 'Renewal code has expired. Generate a new one in the app.' };
    }
    if (renewal.reason === 'missing_shop') {
      return { success: false, error: 'Shop name is required to validate the renewal code.' };
    }
    return { success: false, error: 'Invalid renewal code for this shop or app.' };
  }

  const key = generateLicenseKey(expiryDate, secret, appId);

  return {
    success: true,
    key,
    renewalIssuedMs: renewal.issuedMs,
    renewalExpiresAt: renewal.expiresAt,
  };
}

export function validateLicenseKey(key, secret = LICENSE_SECRET) {
  const normalized = key.trim().toUpperCase();
  if (!/^[A-Z0-9]{20}$/.test(normalized)) {
    return { valid: false, reason: 'invalid_format' };
  }

  // Try v2 first.
  const issuePartV2 = normalized.slice(0, ISSUE_LEN_V2);
  const expiryPartV2 = normalized.slice(ISSUE_LEN_V2, ISSUE_LEN_V2 + EXPIRY_LEN_V2);
  const sigPartV2 = normalized.slice(ISSUE_LEN_V2 + EXPIRY_LEN_V2, LICENSE_KEY_LENGTH);

  const issuedDay = parseInt(issuePartV2, 36);
  const expiryDay = parseInt(expiryPartV2, 36);

  if (!Number.isNaN(issuedDay) && !Number.isNaN(expiryDay)) {
    const nowDay = toDayNumber(Date.now());
    const issuedMs = issuedDay * 86400000;
    const expiryMs = endOfDayMsFromDayNumber(expiryDay);

    const expectedSigV3 = computeSignature(
      `${secret}:${APP_LICENSE_ID}:${issuedDay}:${expiryDay}`,
      SIG_LEN_V2
    );
    if (sigPartV2 === expectedSigV3) {
      if (nowDay < issuedDay) {
        return { valid: false, reason: 'not_active_yet', issuedMs, expiryMs };
      }
      if (Date.now() > expiryMs) {
        return { valid: false, reason: 'expired', issuedMs, expiryMs };
      }
      return { valid: true, issuedMs, expiryMs, format: 'v3' };
    }

    const expectedSigV2 = computeSignature(`${secret}:${issuedDay}:${expiryDay}`, SIG_LEN_V2);
    if (sigPartV2 === expectedSigV2) {
      if (nowDay < issuedDay) {
        return { valid: false, reason: 'not_active_yet', issuedMs, expiryMs };
      }
      if (Date.now() > expiryMs) {
        return { valid: false, reason: 'expired', issuedMs, expiryMs };
      }
      return { valid: true, issuedMs, expiryMs, format: 'v2' };
    }
  }

  // Fallback to legacy v1 for backwards compatibility.
  const expiryPartV1 = normalized.slice(0, EXPIRY_LEN_V1);
  const sigPartV1 = normalized.slice(EXPIRY_LEN_V1, LICENSE_KEY_LENGTH);
  const expiryMsV1 = parseInt(expiryPartV1, 36);

  if (Number.isNaN(expiryMsV1)) {
    return { valid: false, reason: 'invalid_format' };
  }

  const expectedSigV1 = computeSignature(`${secret}:${expiryMsV1}`, SIG_LEN_V1);
  if (sigPartV1 !== expectedSigV1) {
    return { valid: false, reason: 'invalid_key' };
  }

  if (Date.now() > expiryMsV1) {
    return { valid: false, reason: 'expired', expiryMs: expiryMsV1 };
  }

  return { valid: true, expiryMs: expiryMsV1 };
}

export function getLicenseAccess(key, nowMs = Date.now()) {
  const result = validateLicenseKey(String(key || ''));
  const expiryMs = result.expiryMs || null;
  if (!result.valid) {
    return {
      allowed: false,
      reason: result.reason || 'invalid_key',
      expiryMs,
    };
  }
  if (expiryMs && nowMs > expiryMs) {
    return { allowed: false, reason: 'expired', expiryMs };
  }
  return { allowed: true, reason: null, expiryMs, format: result.format };
}

export function formatExpiryDate(expiryMs) {
  return new Date(expiryMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function computeRenewalChecksum(dateTimePart, shopName, secret, appId) {
  const input = `${secret}:${appId}:${shopName.trim().toLowerCase()}:${dateTimePart}`;
  let state = 0;
  for (let i = 0; i < input.length; i++) {
    state = (state * 31 + input.charCodeAt(i)) >>> 0;
  }
  return String(state % 100).padStart(2, '0');
}

function buildDateTimePart(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${mm}${dd}${hh}${mi}`;
}

function resolveDateTimePart(dateTimePart, referenceMs = Date.now()) {
  const mm = parseInt(dateTimePart.slice(0, 2), 10);
  const dd = parseInt(dateTimePart.slice(2, 4), 10);
  const hh = parseInt(dateTimePart.slice(4, 6), 10);
  const mi = parseInt(dateTimePart.slice(6, 8), 10);

  if (
    Number.isNaN(mm) ||
    Number.isNaN(dd) ||
    Number.isNaN(hh) ||
    Number.isNaN(mi) ||
    mm < 1 ||
    mm > 12 ||
    dd < 1 ||
    dd > 31 ||
    hh > 23 ||
    mi > 59
  ) {
    return null;
  }

  const refYear = new Date(referenceMs).getFullYear();
  const candidates = [refYear - 1, refYear, refYear + 1]
    .map((year) => new Date(year, mm - 1, dd, hh, mi, 0, 0))
    .filter((date) => date.getMonth() === mm - 1 && date.getDate() === dd);

  if (!candidates.length) return null;

  candidates.sort(
    (a, b) => Math.abs(referenceMs - a.getTime()) - Math.abs(referenceMs - b.getTime())
  );
  return candidates[0];
}

export function generateRenewalCode(shopName, secret = LICENSE_SECRET, nowMs = Date.now()) {
  const trimmedShop = shopName.trim();
  if (!trimmedShop) {
    return { success: false, error: 'Shop name is required to generate a renewal code.' };
  }

  const issuedAt = new Date(nowMs);
  const dateTimePart = buildDateTimePart(issuedAt);
  const checksum = computeRenewalChecksum(dateTimePart, trimmedShop, secret, APP_LICENSE_ID);
  const code = `${dateTimePart}${checksum}`;

  return {
    success: true,
    code,
    issuedAt: issuedAt.getTime(),
    expiresAt: issuedAt.getTime() + RENEWAL_CODE_VALID_MS,
  };
}

export function validateRenewalCode(
  code,
  shopName,
  secret = LICENSE_SECRET,
  nowMs = Date.now()
) {
  const trimmedShop = shopName.trim();
  if (!trimmedShop) {
    return { valid: false, reason: 'missing_shop' };
  }

  const normalized = String(code).replace(/\D/g, '');
  if (normalized.length !== RENEWAL_CODE_LENGTH) {
    return { valid: false, reason: 'invalid_format' };
  }

  const dateTimePart = normalized.slice(0, 8);
  const checksum = normalized.slice(8, RENEWAL_CODE_LENGTH);
  const expectedChecksum = computeRenewalChecksum(
    dateTimePart,
    trimmedShop,
    secret,
    APP_LICENSE_ID
  );

  if (checksum !== expectedChecksum) {
    return { valid: false, reason: 'invalid_code' };
  }

  const issuedAt = resolveDateTimePart(dateTimePart, nowMs);
  if (!issuedAt) {
    return { valid: false, reason: 'invalid_date' };
  }

  const issuedMs = issuedAt.getTime();
  const expiresAt = issuedMs + RENEWAL_CODE_VALID_MS;
  const age = nowMs - issuedMs;

  if (age < 0) {
    return { valid: false, reason: 'not_active_yet', issuedMs, expiresAt };
  }
  if (age > RENEWAL_CODE_VALID_MS) {
    return { valid: false, reason: 'expired', issuedMs, expiresAt };
  }

  return { valid: true, issuedMs, expiresAt };
}

export function formatRenewalCodeExpiry(expiresAtMs) {
  return new Date(expiresAtMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRenewalCodeDateTime(code, referenceMs = Date.now()) {
  const normalized = String(code).replace(/\D/g, '');
  if (normalized.length !== RENEWAL_CODE_LENGTH) return '';
  const dateTimePart = normalized.slice(0, 8);
  const issuedAt = resolveDateTimePart(dateTimePart, referenceMs);
  if (!issuedAt) return '';
  return issuedAt.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
