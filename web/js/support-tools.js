(function () {
  'use strict';

  const LICENSE_SECRET_DEFAULT = 'RIYE_POS_SECRET_2026';
  const APP_LICENSE_ID = 'com.riye.posbilling';
  const RENEWAL_CODE_LENGTH = 10;
  const RENEWAL_CODE_VALID_MS = 45 * 60 * 1000;
  const APP_UNIQUE_KEY_LENGTH = 10;
  const APP_KEY_LENGTH = 20;
  const SECRET_TOKEN_LENGTH = 25;
  const CLIENT_TOKEN_LENGTH = 10;
  const ALPHA_NUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const DIGITS = '0123456789';
  const ISSUE_LEN_V2 = 4;
  const EXPIRY_LEN_V2 = 4;
  const SIG_LEN_V2 = 12;
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/y019wjypdybot';
  const PLAN_DAYS = { Starter: 365, Shop: 365, Business: 365 };
  const PLAN_AMOUNTS = { Starter: '2999', Shop: '4999', Business: '' };

  const authForm = document.getElementById('authForm');
  const authCard = document.getElementById('authCard');
  const protectedTools = document.getElementById('protectedTools');
  const authError = document.getElementById('authError');

  if (!authForm) return;

  let selectedDays = 90;
  let useCustom = false;
  let customerFormReady = false;
  let existingCustomerRecord = null;
  let credentialsShownFor = '';

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

  function computeCharsetSignature(input, charset, length) {
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

  function normalizeAppUniqueKey(value) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .slice(0, APP_UNIQUE_KEY_LENGTH);
  }

  function generateApiCredentials(appUniqueKey, secret = LICENSE_SECRET_DEFAULT, appId = APP_LICENSE_ID) {
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
      appKey: computeCharsetSignature(`${base}:APP_KEY`, ALPHA_NUM, APP_KEY_LENGTH),
      secretToken: computeCharsetSignature(`${base}:SECRET`, ALPHA_NUM, SECRET_TOKEN_LENGTH),
      clientToken: computeCharsetSignature(`${base}:CLIENT`, DIGITS, CLIENT_TOKEN_LENGTH),
    };
  }

  function generateLicenseKey(expiryDate, secret, appId = APP_LICENSE_ID) {
    const issuedDay = Math.floor(Date.now() / 86400000);
    const expiryDay = Math.floor(expiryDate.getTime() / 86400000);
    const issuePart = issuedDay.toString(36).toUpperCase().padStart(ISSUE_LEN_V2, '0').slice(-ISSUE_LEN_V2);
    const expiryPart = expiryDay.toString(36).toUpperCase().padStart(EXPIRY_LEN_V2, '0').slice(-EXPIRY_LEN_V2);
    const sig = computeSignature(`${secret}:${appId}:${issuedDay}:${expiryDay}`, SIG_LEN_V2);
    return (issuePart + expiryPart + sig).slice(0, 20);
  }

  function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function addDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return endOfDay(d);
  }

  function formatDateInput(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function computeExpireDate(plan, paymentDateStr) {
    const days = PLAN_DAYS[plan] || 365;
    const base = paymentDateStr ? new Date(paymentDateStr) : new Date();
    const expiry = new Date(base);
    expiry.setDate(expiry.getDate() + days);
    return formatDateInput(expiry);
  }

  function computeRenewalChecksum(dateTimePart, shopName, secret, appId) {
    const input = `${secret}:${appId}:${shopName.trim().toLowerCase()}:${dateTimePart}`;
    let state = 0;
    for (let i = 0; i < input.length; i++) {
      state = (state * 31 + input.charCodeAt(i)) >>> 0;
    }
    return String(state % 100).padStart(2, '0');
  }

  function resolveDateTimePart(dateTimePart, referenceMs = Date.now()) {
    const mm = parseInt(dateTimePart.slice(0, 2), 10);
    const dd = parseInt(dateTimePart.slice(2, 4), 10);
    const hh = parseInt(dateTimePart.slice(4, 6), 10);
    const mi = parseInt(dateTimePart.slice(6, 8), 10);
    if (
      Number.isNaN(mm) || Number.isNaN(dd) || Number.isNaN(hh) || Number.isNaN(mi) ||
      mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59
    ) {
      return null;
    }
    const refYear = new Date(referenceMs).getFullYear();
    const candidates = [refYear - 1, refYear, refYear + 1]
      .map((year) => new Date(year, mm - 1, dd, hh, mi, 0, 0))
      .filter((date) => date.getMonth() === mm - 1 && date.getDate() === dd);
    if (!candidates.length) return null;
    candidates.sort((a, b) => Math.abs(referenceMs - a.getTime()) - Math.abs(referenceMs - b.getTime()));
    return candidates[0];
  }

  function validateRenewalCode(code, shopName, secret = LICENSE_SECRET_DEFAULT, nowMs = Date.now()) {
    const trimmedShop = shopName.trim();
    if (!trimmedShop) return { valid: false, reason: 'missing_shop' };
    const normalized = String(code).replace(/\D/g, '');
    if (normalized.length !== RENEWAL_CODE_LENGTH) return { valid: false, reason: 'invalid_format' };
    const dateTimePart = normalized.slice(0, 8);
    const checksum = normalized.slice(8, RENEWAL_CODE_LENGTH);
    const expectedChecksum = computeRenewalChecksum(dateTimePart, trimmedShop, secret, APP_LICENSE_ID);
    if (checksum !== expectedChecksum) return { valid: false, reason: 'invalid_code' };
    const issuedAt = resolveDateTimePart(dateTimePart, nowMs);
    if (!issuedAt) return { valid: false, reason: 'invalid_date' };
    const issuedMs = issuedAt.getTime();
    const expiresAt = issuedMs + RENEWAL_CODE_VALID_MS;
    const age = nowMs - issuedMs;
    if (age < 0) return { valid: false, reason: 'not_active_yet', issuedMs, expiresAt };
    if (age > RENEWAL_CODE_VALID_MS) return { valid: false, reason: 'expired', issuedMs, expiresAt };
    return { valid: true, issuedMs, expiresAt };
  }

  function renewalReasonText(reason) {
    const map = {
      missing_shop: 'Enter the shop name that matches the customer app.',
      invalid_format: 'Renewal code must be exactly 10 digits.',
      invalid_code: 'Invalid renewal code for this shop or app.',
      invalid_date: 'The date/time in this code is not valid.',
      not_active_yet: 'This renewal code is not active yet.',
      expired: 'This renewal code has expired (45 minute limit). Ask the customer for a new one.',
    };
    return map[reason] || 'Invalid renewal code.';
  }

  function formatRenewalExpiry(expiresAtMs) {
    return new Date(expiresAtMs).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function getRenewalValidation() {
    const shopName = document.getElementById('renewalShopName').value.trim()
      || document.getElementById('shopName').value.trim();
    const secret = document.getElementById('adminSecret').value.trim() || LICENSE_SECRET_DEFAULT;
    const code = document.getElementById('renewalCode').value;
    return validateRenewalCode(code, shopName, secret);
  }

  function updateRenewalStatus() {
    const renewalStatus = document.getElementById('renewalStatus');
    const code = document.getElementById('renewalCode').value.replace(/\D/g, '');
    if (!code) {
      renewalStatus.className = 'renewal-status';
      renewalStatus.textContent = '';
      return null;
    }
    const result = getRenewalValidation();
    renewalStatus.className = `renewal-status show ${result.valid ? 'valid' : 'invalid'}`;
    if (result.valid) {
      renewalStatus.innerHTML = `
        <strong>Renewal code accepted.</strong><br>
        Issued: ${new Date(result.issuedMs).toLocaleString()}<br>
        Expires: ${formatRenewalExpiry(result.expiresAt)}
      `;
    } else {
      renewalStatus.innerHTML = `<strong>Renewal code rejected.</strong> ${renewalReasonText(result.reason)}`;
    }
    return result;
  }

  const periodGrid = document.getElementById('periodGrid');
  const customDateWrap = document.getElementById('customDateWrap');
  const customDate = document.getElementById('customDate');
  const generateBtn = document.getElementById('generateBtn');
  const result = document.getElementById('result');
  const keyOutput = document.getElementById('keyOutput');
  const metaOutput = document.getElementById('metaOutput');
  const copyBtn = document.getElementById('copyBtn');
  const copyIconBtn = document.getElementById('copyIconBtn');
  const renewalCodeInput = document.getElementById('renewalCode');
  const renewalShopNameInput = document.getElementById('renewalShopName');
  const generateError = document.getElementById('generateError');

  function showGenerateError(message) {
    generateError.textContent = message;
    generateError.classList.add('show');
    result.classList.remove('show');
  }

  function clearGenerateError() {
    generateError.textContent = '';
    generateError.classList.remove('show');
  }

  function resetCopyState() {
    copyBtn.textContent = 'Copy Key';
    copyBtn.classList.remove('copied');
    copyIconBtn.classList.remove('copied');
    copyIconBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    `;
  }

  function showCopiedState() {
    copyBtn.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    copyIconBtn.classList.add('copied');
    copyIconBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    `;
  }

  async function copyGeneratedKey() {
    const key = keyOutput.textContent;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      showCopiedState();
    } catch {
      prompt('Copy this key:', key);
    }
  }

  function lookupFingerprint() {
    const shop = (document.getElementById('custShopName')?.value || document.getElementById('shopName')?.value || '').trim().toLowerCase();
    const code = (document.getElementById('custUserCode')?.value || '').replace(/\D/g, '');
    const mobile = (document.getElementById('custMobile')?.value || '').replace(/\D/g, '');
    return `${shop}|${code}|${mobile}`;
  }

  function fillCustomerFormFromRow(row) {
    if (!row) return;
    const set = (id, keys) => {
      const el = document.getElementById(id);
      if (!el) return;
      for (const key of keys) {
        if (row[key] != null && String(row[key]).trim() !== '') {
          el.value = row[key];
          break;
        }
      }
    };
    set('custName', ['Name']);
    set('custMobile', ['Mobile Number']);
    set('custEmail', ['Email ID']);
    set('custShopName', ['Shop name']);
    set('custUserCode', ['User Code']);
    set('custPaymentDate', ['Date of payment']);
    set('custLoginDate', ['Date of login']);
    set('custExpireDate', ['Expire date']);
    set('custPaymentMode', ['Payment mode']);
    set('custAmount', ['Amount']);
    set('custLoginKey', ['Login key']);
    const planEl = document.getElementById('custPlan');
    if (planEl && row.Plan) planEl.value = row.Plan;
    const mainShop = document.getElementById('shopName');
    if (mainShop && row['Shop name']) mainShop.value = row['Shop name'];
  }

  function showExistingCustomerBox(row, options = {}) {
    const box = document.getElementById('existingCustomerBox');
    const body = document.getElementById('existingCustomerBody');
    if (!box || !body) return;
    const loginKey = row['Login key'] || row['Login Key'] || '';
    body.innerHTML = `
      <p><strong>${row.Name || 'Customer'}</strong> · ${row['Shop name'] || '—'}</p>
      <p>Mobile: ${row['Mobile Number'] || '—'} · User code: ${row['User Code'] || '—'}</p>
      <p>Payment: ${row['Date of payment'] || '—'} · Expires: ${row['Expire date'] || '—'}</p>
      ${loginKey ? `<p><strong>Login key</strong></p><div class="existing-cred-key">${loginKey}</div>` : '<p>No login key saved yet.</p>'}
    `;
    box.classList.add('show');
    if (options.scroll) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    credentialsShownFor = lookupFingerprint();
  }

  function hideExistingCustomerBox() {
    document.getElementById('existingCustomerBox')?.classList.remove('show');
    credentialsShownFor = '';
  }

  function showExistingLicenseResult(row) {
    const loginKey = row['Login key'] || row['Login Key'] || '';
    if (!loginKey) return false;
    keyOutput.textContent = loginKey;
    metaOutput.innerHTML = `
      <strong>Existing customer</strong> — key loaded from sheet (not regenerated).<br>
      <strong>Shop:</strong> ${row['Shop name'] || '—'}<br>
      <strong>Expires:</strong> ${row['Expire date'] || '—'}
    `;
    result.classList.add('show');
    resetCopyState();
    return true;
  }

  async function sheetSearch(column, value) {
    const q = encodeURIComponent(String(value).trim());
    if (!q) return [];
    const res = await fetch(`${SHEETDB_API_URL}/search?${column}=${q}`);
    if (!res.ok) throw new Error(`Sheet lookup failed (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function lookupExistingCustomer(options = {}) {
    const shop = (document.getElementById('custShopName')?.value || '').trim();
    const code = (document.getElementById('custUserCode')?.value || '').replace(/\D/g, '');
    const mobile = (document.getElementById('custMobile')?.value || '').replace(/\D/g, '');
    const status = document.getElementById('sheetStatus');

    if (!shop && !code && !mobile) {
      if (options.showError && status) {
        status.textContent = 'Enter shop name, user code, or mobile to check.';
        status.className = 'sheet-status show error';
      }
      return null;
    }

    try {
      let matches = [];
      if (shop && code) {
        const byShop = await sheetSearch('Shop name', shop);
        matches = byShop.filter((r) => String(r['User Code'] || '').replace(/\D/g, '') === code);
      }
      if (!matches.length && mobile) matches = await sheetSearch('Mobile Number', mobile);
      if (!matches.length && shop) matches = await sheetSearch('Shop name', shop);
      if (!matches.length && code) {
        const byCode = await sheetSearch('User Code', code);
        matches = byCode;
      }

      if (!matches.length) {
        existingCustomerRecord = null;
        hideExistingCustomerBox();
        if (options.showError && status) {
          status.textContent = 'No existing customer found — you can register a new one.';
          status.className = 'sheet-status show success';
        }
        return null;
      }

      existingCustomerRecord = matches[0];
      fillCustomerFormFromRow(existingCustomerRecord);
      const fp = lookupFingerprint();
      if (fp !== credentialsShownFor) {
        showExistingCustomerBox(existingCustomerRecord, { scroll: options.scroll });
      }
      if (status && options.showError) {
        status.textContent = 'Existing customer found — credentials shown below.';
        status.className = 'sheet-status show success';
      }
      return existingCustomerRecord;
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Could not check sheet.';
        status.className = 'sheet-status show error';
      }
      return null;
    }
  }

  function buildSheetPayload(loginKeyOverride) {
    const plan = document.getElementById('custPlan').value;
    const paymentDate = document.getElementById('custPaymentDate').value;
    const expireDate = document.getElementById('custExpireDate').value || computeExpireDate(plan, paymentDate);
    const loginKey = loginKeyOverride || document.getElementById('custLoginKey').value.trim() || keyOutput.textContent.trim();
    return {
      Name: document.getElementById('custName').value.trim(),
      'Mobile Number': document.getElementById('custMobile').value.trim(),
      'Email ID': document.getElementById('custEmail').value.trim(),
      'Shop name': document.getElementById('custShopName').value.trim() || document.getElementById('shopName').value.trim(),
      'User Code': document.getElementById('custUserCode').value.replace(/\D/g, '').slice(0, 10),
      'Date of payment': paymentDate,
      'Date of login': document.getElementById('custLoginDate').value,
      'Expire date': expireDate,
      'Payment mode': document.getElementById('custPaymentMode').value,
      Amount: document.getElementById('custAmount').value.trim(),
      'Login key': loginKey,
    };
  }

  async function saveCustomerToSheet() {
    const status = document.getElementById('sheetStatus');
    const existing = existingCustomerRecord || await lookupExistingCustomer({ showError: false });
    if (existing) {
      if (status) {
        status.textContent = 'Customer already exists in the sheet — not duplicated.';
        status.className = 'sheet-status show error';
      }
      showExistingCustomerBox(existing, { scroll: true });
      return;
    }

    const payload = buildSheetPayload();
    if (!payload.Name || !payload['Mobile Number'] || !payload['Shop name']) {
      if (status) {
        status.textContent = 'Fill name, mobile, and shop name before saving.';
        status.className = 'sheet-status show error';
      }
      return;
    }

    try {
      const res = await fetch(SHEETDB_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      if (status) {
        status.textContent = 'Customer saved to Google Sheet successfully.';
        status.className = 'sheet-status show success';
      }
      existingCustomerRecord = payload;
      credentialsShownFor = lookupFingerprint();
    } catch (err) {
      if (status) {
        status.textContent = err.message || 'Could not save to sheet.';
        status.className = 'sheet-status show error';
      }
    }
  }

  function initCustomerRecordForm() {
    if (customerFormReady) return;
    customerFormReady = true;

    const custPlanSelect = document.getElementById('custPlan');
    const custPaymentDateInput = document.getElementById('custPaymentDate');
    const custLoginDateInput = document.getElementById('custLoginDate');
    const custExpireDateInput = document.getElementById('custExpireDate');
    const custAmountInput = document.getElementById('custAmount');
    const custUserCodeInput = document.getElementById('custUserCode');
    const sheetdbForm = document.getElementById('sheetdb-form');
    const lookupBtn = document.getElementById('lookupCustomerBtn');
    const saveBtn = document.getElementById('saveCustomerBtn');
    const dismissBtn = document.getElementById('dismissExistingBtn');

    const today = formatDateInput(new Date());
    custPaymentDateInput.value = today;
    custLoginDateInput.value = today;

    function syncPlanFields() {
      const plan = custPlanSelect.value;
      custAmountInput.value = PLAN_AMOUNTS[plan] || '';
      custExpireDateInput.value = computeExpireDate(plan, custPaymentDateInput.value);
    }

    custPlanSelect.addEventListener('change', syncPlanFields);
    custPaymentDateInput.addEventListener('change', syncPlanFields);
    syncPlanFields();

    custUserCodeInput.addEventListener('input', () => {
      custUserCodeInput.value = custUserCodeInput.value.replace(/\D/g, '').slice(0, 10);
      credentialsShownFor = '';
    });

    ['custShopName', 'custMobile'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', () => {
        credentialsShownFor = '';
      });
      document.getElementById(id)?.addEventListener('blur', () => {
        lookupExistingCustomer({ showError: false });
      });
    });

    custUserCodeInput.addEventListener('blur', () => {
      lookupExistingCustomer({ showError: false });
    });

    lookupBtn?.addEventListener('click', () => {
      lookupExistingCustomer({ showError: true, scroll: true });
    });

    saveBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      saveCustomerToSheet();
    });

    sheetdbForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCustomerToSheet();
    });

    dismissBtn?.addEventListener('click', hideExistingCustomerBox);
  }

  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('authUser').value.trim();
    const pass = document.getElementById('authPass').value.trim();
    if (user === 'admin' && pass === 'Bv@admin#123') {
      authCard.style.display = 'none';
      protectedTools.style.display = 'block';
      authError.style.display = 'none';
      initCustomerRecordForm();
    } else {
      authError.style.display = 'block';
    }
  });

  renewalCodeInput?.addEventListener('input', () => {
    renewalCodeInput.value = renewalCodeInput.value.replace(/\D/g, '').slice(0, RENEWAL_CODE_LENGTH);
    updateRenewalStatus();
  });
  renewalShopNameInput?.addEventListener('input', updateRenewalStatus);
  document.getElementById('shopName')?.addEventListener('input', updateRenewalStatus);

  const today = new Date();
  if (customDate) {
    customDate.min = today.toISOString().split('T')[0];
    customDate.value = new Date(today.getTime() + 90 * 86400000).toISOString().split('T')[0];
  }

  periodGrid?.addEventListener('click', (e) => {
    const btn = e.target.closest('.period-btn');
    if (!btn) return;
    document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (btn.dataset.custom) {
      useCustom = true;
      customDateWrap.style.display = 'block';
    } else {
      useCustom = false;
      customDateWrap.style.display = 'none';
      selectedDays = parseInt(btn.dataset.days, 10);
    }
  });

  generateBtn?.addEventListener('click', async () => {
    clearGenerateError();

    const shopName = document.getElementById('shopName').value.trim();
    const secret = document.getElementById('adminSecret').value.trim() || LICENSE_SECRET_DEFAULT;
    const renewalCode = document.getElementById('renewalCode').value.replace(/\D/g, '');
    const issuedAt = new Date();
    const custName = document.getElementById('custName')?.value.trim();

    if (custName) {
      const existing = await lookupExistingCustomer({ showError: false });
      if (existing && showExistingLicenseResult(existing)) return;
    }

    if (renewalCode) {
      const renewalResult = getRenewalValidation();
      if (!renewalResult.valid) {
        showGenerateError(renewalReasonText(renewalResult.reason));
        updateRenewalStatus();
        return;
      }
    }

    let expiryDate;
    if (useCustom) {
      if (!customDate.value) {
        showGenerateError('Please select a custom expiry date.');
        return;
      }
      expiryDate = endOfDay(new Date(customDate.value));
    } else {
      expiryDate = addDays(selectedDays);
    }

    if (expiryDate.getTime() <= Date.now()) {
      showGenerateError('Expiry date must be in the future.');
      return;
    }

    const key = generateLicenseKey(expiryDate, secret, APP_LICENSE_ID);
    keyOutput.textContent = key;
    metaOutput.innerHTML = `
      <strong>Shop:</strong> ${shopName || '(not set — user enters at login)'}<br>
      <strong>App lock:</strong> ${APP_LICENSE_ID}<br>
      <strong>Issued on:</strong> ${issuedAt.toLocaleString()}<br>
      <strong>Valid until:</strong> ${expiryDate.toLocaleString()}<br>
      <strong>Key length:</strong> ${key.length} characters
      ${renewalCode ? `<br><strong>Renewal code used:</strong> ${renewalCode}` : ''}
    `;
    result.classList.add('show');
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    resetCopyState();

    const loginKeyInput = document.getElementById('custLoginKey');
    if (loginKeyInput) loginKeyInput.value = key;
    const custShop = document.getElementById('custShopName');
    if (custShop && shopName && !custShop.value.trim()) custShop.value = shopName;
    if (custName && !existingCustomerRecord) {
      saveCustomerToSheet();
    }
  });

  copyBtn?.addEventListener('click', copyGeneratedKey);
  copyIconBtn?.addEventListener('click', copyGeneratedKey);

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.panel)?.classList.add('active');
    });
  });

  const apiUniqueKeyInput = document.getElementById('apiUniqueKeyInput');
  const generateApiBtn = document.getElementById('generateApiBtn');
  const apiGenerateError = document.getElementById('apiGenerateError');
  const apiResult = document.getElementById('apiResult');
  const copyAllApiBtn = document.getElementById('copyAllApiBtn');

  apiUniqueKeyInput?.addEventListener('input', () => {
    apiUniqueKeyInput.value = normalizeAppUniqueKey(apiUniqueKeyInput.value);
  });

  function showApiError(message) {
    apiGenerateError.textContent = message;
    apiGenerateError.classList.add('show');
    apiResult.classList.remove('show');
  }

  function clearApiError() {
    apiGenerateError.textContent = '';
    apiGenerateError.classList.remove('show');
  }

  generateApiBtn?.addEventListener('click', () => {
    clearApiError();
    const secret = document.getElementById('apiAdminSecret').value.trim() || LICENSE_SECRET_DEFAULT;
    const shop = document.getElementById('apiShopName').value.trim();
    const apiResultData = generateApiCredentials(apiUniqueKeyInput.value, secret, APP_LICENSE_ID);
    if (!apiResultData.success) {
      showApiError(apiResultData.error);
      return;
    }
    document.getElementById('outUniqueKey').textContent = apiResultData.appUniqueKey;
    document.getElementById('outAppKey').textContent = apiResultData.appKey;
    document.getElementById('outSecretToken').textContent = apiResultData.secretToken;
    document.getElementById('outClientToken').textContent = apiResultData.clientToken;
    document.getElementById('apiMetaOutput').innerHTML = `
      <strong>Shop:</strong> ${shop || '(not set)'}<br>
      <strong>App lock:</strong> ${APP_LICENSE_ID}<br>
      <strong>Send to customer:</strong> App Key + Secret Token + Client Token<br>
      <strong>Customer keeps:</strong> App Unique Key (already in their Settings)
    `;
    apiResult.classList.add('show');
    apiResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    copyAllApiBtn.textContent = 'Copy All for Customer';
    copyAllApiBtn.classList.remove('copied');
  });

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copy);
      const text = el?.textContent || '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1200);
      } catch {
        prompt('Copy:', text);
      }
    });
  });

  copyAllApiBtn?.addEventListener('click', async () => {
    const unique = document.getElementById('outUniqueKey').textContent;
    const appKey = document.getElementById('outAppKey').textContent;
    const secret = document.getElementById('outSecretToken').textContent;
    const client = document.getElementById('outClientToken').textContent;
    if (!appKey) return;
    const blob = [
      'NAM bill API credentials',
      `App Unique Key: ${unique}`,
      `App Key: ${appKey}`,
      `Secret Token: ${secret}`,
      `Client Token: ${client}`,
      '',
      'Postman / curl headers:',
      `X-App-Unique-Key: ${unique}`,
      `X-App-Key: ${appKey}`,
      `X-Secret-Token: ${secret}`,
      `X-Client-Token: ${client}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(blob);
      copyAllApiBtn.textContent = 'Copied!';
      copyAllApiBtn.classList.add('copied');
    } catch {
      prompt('Copy credentials:', blob);
    }
  });
})();
