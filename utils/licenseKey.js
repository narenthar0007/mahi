// Shared secret — must match key-generator/index.html
export const LICENSE_SECRET = 'RIYE_POS_SECRET_2026';
export const LICENSE_KEY_LENGTH = 20;
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

export function generateLicenseKey(expiryDate, secret = LICENSE_SECRET) {
  const issuedDay = toDayNumber(Date.now());
  const expiryDay = toDayNumber(expiryDate);

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

  const sig = computeSignature(`${secret}:${issuedDay}:${expiryDay}`, SIG_LEN_V2);
  return (issuePart + expiryPart + sig).slice(0, LICENSE_KEY_LENGTH);
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
    const expectedSigV2 = computeSignature(`${secret}:${issuedDay}:${expiryDay}`, SIG_LEN_V2);
    if (sigPartV2 === expectedSigV2) {
      const nowDay = toDayNumber(Date.now());
      const issuedMs = issuedDay * 86400000;
      const expiryMs = endOfDayMsFromDayNumber(expiryDay);

      if (nowDay < issuedDay) {
        return { valid: false, reason: 'not_active_yet', issuedMs, expiryMs };
      }
      if (Date.now() > expiryMs) {
        return { valid: false, reason: 'expired', issuedMs, expiryMs };
      }
      return { valid: true, issuedMs, expiryMs };
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

export function formatExpiryDate(expiryMs) {
  return new Date(expiryMs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
