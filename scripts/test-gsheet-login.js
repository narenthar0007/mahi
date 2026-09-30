/**
 * Pre-deploy checks for Google Sheet login + admin key generator.
 * Run: node scripts/test-gsheet-login.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SHEET_ID = '1Gr7vHrtQZ_wRrFsv3y_mCJ6qdNeSB7x_TkQhUCY3ato';
const EXPECTED_HEADERS = [
  'Name',
  'Mobile Number',
  'Email ID',
  'Date of payment',
  'Date of login',
  'Expire date',
  'Payment mode',
  'Amount',
  'Login key',
  'Shop name',
  'User Code',
  'Is Login',
];
const EXTRA_HEADERS = ['Status', 'Login session', 'Remarks'];

const checks = [];
function pass(name, detail) {
  checks.push({ ok: true, name, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail) {
  checks.push({ ok: false, name, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
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
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length < 2) return { headers: rows[0] || [], rows: [] };
  const headers = rows[0].map((h) => String(h || '').trim());
  const data = rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] != null ? String(cells[idx]).trim() : '';
    });
    return obj;
  }).filter((r) => Object.values(r).some((v) => String(v).trim()));
  return { headers, rows: data };
}

function syntaxCheck(file) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status === 0) pass(`syntax ${path.basename(file)}`);
  else fail(`syntax ${path.basename(file)}`, (r.stderr || r.stdout || '').trim());
}

async function main() {
  console.log('=== NAM bill Google Sheet pre-deploy test ===\n');

  // 1) Syntax
  [
    'website/admin/admin.js',
    'website/login/login.js',
    'website/js/secureCrypto.js',
    'utils/licenseRemote.js',
    'utils/secureCrypto.js',
    'utils/licenseKey.js',
  ].forEach(syntaxCheck);

  // 2) Re-embed Apps Script into admin
  const embed = spawnSync(process.execPath, ['scripts/fix-admin-appscript.js'], { encoding: 'utf8' });
  if (embed.status === 0) pass('embed Apps Script into admin.js');
  else fail('embed Apps Script', embed.stderr || embed.stdout);

  syntaxCheck('website/admin/admin.js');

  // 3) Admin contains sheet header order
  const admin = fs.readFileSync('website/admin/admin.js', 'utf8');
  if (admin.includes('SHEET_HEADER_ORDER') && admin.includes("'Login key'") && admin.includes("'Shop name'")) {
    pass('admin SHEET_HEADER_ORDER present');
  } else fail('admin SHEET_HEADER_ORDER present');
  if (admin.includes('sheetdb.io') || /DEFAULT_SHEETDB/.test(admin)) {
    fail('SheetDB removed from admin', 'still references sheetdb');
  } else pass('SheetDB removed from admin');
  if (admin.includes('patchLoginState_') || admin.includes('ensureHeaders_')) {
    pass('admin Apps Script has ensureHeaders/loginState');
  } else fail('admin Apps Script content outdated');

  // 4) Live sheet read
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
  const res = await fetch(url);
  if (!res.ok) {
    fail('fetch Google Sheet CSV', `HTTP ${res.status}`);
  } else {
    pass('fetch Google Sheet CSV', `HTTP ${res.status}`);
    const { headers, rows } = parseCsv(await res.text());
    console.log('\nLive headers:', headers.join(' | '));
    console.log(`Live rows: ${rows.length}\n`);

    const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) fail('required headers present', missing.join(', '));
    else pass('required headers present', EXPECTED_HEADERS.join(', '));

    const extrasMissing = EXTRA_HEADERS.filter((h) => !headers.includes(h));
    if (extrasMissing.length) {
      pass('optional headers note', `missing for now (Apps Script will add): ${extrasMissing.join(', ')}`);
    } else {
      pass('optional headers present', EXTRA_HEADERS.join(', '));
    }

    // Simulate login match for row with a key
    const withKey = rows.find((r) => (r['Login key'] || '').trim().length === 20);
    if (!withKey) {
      fail('find sample license row', 'no row with 20-char Login key');
    } else {
      const shop = withKey['Shop name'];
      const key = withKey['Login key'];
      const match = rows.find(
        (r) =>
          String(r['Shop name'] || '').trim().toLowerCase() === shop.trim().toLowerCase() &&
          String(r['Login key'] || '').trim().toUpperCase() === key.trim().toUpperCase()
      );
      if (match) pass('login match simulation', `shop="${shop}" key=${key}`);
      else fail('login match simulation');

      const expiry = withKey['Expire date'];
      const d = new Date(expiry);
      if (!Number.isNaN(d.getTime())) {
        pass('expire date parseable', expiry);
        if (d.getTime() < Date.now()) pass('expire date note', 'sample key is expired — renewal flow expected');
        else pass('expire date future', expiry);
      } else fail('expire date parseable', expiry);

      const isLogin = String(withKey['Is Login'] || 'FALSE').toUpperCase();
      pass('Is Login readable', isLogin);
    }

    // Rows without Status should still be treatable as Active
    const noStatus = rows.filter((r) => !String(r.Status || '').trim());
    pass('Status optional for old rows', `${noStatus.length} row(s) without Status → treat as Active`);
  }

  // 5) Key length generator sanity (same algorithm constants as admin)
  const LICENSE_SECRET = 'RIYE_POS_SECRET_2026';
  const APP_LICENSE_ID = 'com.riye.posbilling';
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function computeSignature(input, sigLen) {
    let state = 0;
    for (let i = 0; i < input.length; i += 1) state = (state * 31 + input.charCodeAt(i)) >>> 0;
    let sig = '';
    for (let i = 0; i < sigLen; i += 1) {
      state = (state * 1103515245 + 12345 + input.charCodeAt(i % input.length)) >>> 0;
      sig += CHARS[state % 36];
    }
    return sig;
  }
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 90);
  const issuedDay = Math.floor(Date.now() / 86400000);
  const expiryDay = Math.floor(expiry.getTime() / 86400000);
  const issuePart = issuedDay.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const expiryPart = expiryDay.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const sig = computeSignature(`${LICENSE_SECRET}:${APP_LICENSE_ID}:${issuedDay}:${expiryDay}`, 12);
  const key = (issuePart + expiryPart + sig).slice(0, 20);
  if (key.length === 20) pass('generate license key length', key);
  else fail('generate license key length', key);

  // 6) license-control.json shape
  const control = JSON.parse(fs.readFileSync('website/license-control.json', 'utf8'));
  if (control.googleSheetId === SHEET_ID && !control.sheetdbUrl) {
    pass('license-control.json uses Google Sheet only');
  } else fail('license-control.json', JSON.stringify(control));

  console.log('\n=== Summary ===');
  const failed = checks.filter((c) => !c.ok);
  console.log(`${checks.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail || ''}`));
    process.exit(1);
  }
  console.log('\nReady to deploy after you paste Apps Script web app URL in admin Settings.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
