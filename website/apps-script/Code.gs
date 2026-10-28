/**
 * NAM bill — Google Sheet write API
 *
 * Deploy as WEB APP (not Library):
 * Deploy → New deployment → Web app
 * Execute as: Me
 * Who has access: Anyone
 * Copy URL ending with /exec
 *
 * Upsert rules:
 * 1) Same Shop name (case-insensitive) → update that row
 * 2) Else → append a NEW row
 * Never match by Login key alone — keys repeat for the same day/period.
 */

var REQUIRED_HEADERS = [
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
  'Status',
  'Login session',
  'Remarks',
];

function headerIndex_(headers, names) {
  for (var i = 0; i < names.length; i++) {
    var idx = headers.indexOf(names[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

function ensureHeaders_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
  var changed = false;
  REQUIRED_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) === -1) {
      headers.push(h);
      changed = true;
    }
  });
  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return headers;
}

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var headers = ensureHeaders_(sheet);
  var action = String((e && e.parameter && e.parameter.action) || 'list').toLowerCase();
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = {};
    headers.forEach(function (h, idx) {
      row[String(h)] = values[i][idx];
    });
    var hasData = headers.some(function (h, idx) {
      return String(values[i][idx] == null ? '' : values[i][idx]).trim() !== '';
    });
    if (hasData) rows.push(row);
  }

  if (action === 'check') {
    var shop = String((e.parameter && e.parameter.shop) || '').trim().toLowerCase();
    var key = String((e.parameter && e.parameter.key) || '').trim().toUpperCase();
    var found = rows.filter(function (r) {
      var rowShop = String(r['Shop name'] || '').trim().toLowerCase();
      var rowKey = String(r['Login key'] || r['Login Key'] || '').trim().toUpperCase();
      if (shop && key) return rowShop === shop && rowKey === key;
      if (shop) return rowShop === shop;
      if (key) return rowKey === key;
      return false;
    });
    return json_({ rows: found, ok: true });
  }

  return json_({ rows: rows, ok: true });
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var headers = ensureHeaders_(sheet);
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var payload = JSON.parse(raw);
    var data = payload.data || payload;
    var action = String(payload.action || '').toLowerCase();
    if (action === 'loginstate') {
      return json_(patchLoginState_(sheet, headers, data));
    }
    return json_(upsertRow_(sheet, headers, data, action === 'create'));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function findRowIndex_(values, headers, data, forceCreate) {
  if (forceCreate) return -1;

  // License keys can repeat for the same day/period — match by Shop name only.
  var shopName = String(data['Shop name'] || '').trim().toLowerCase();
  var shopIdx = headerIndex_(headers, ['Shop name']);
  if (!shopName || shopIdx < 0) return -1;

  for (var i = 1; i < values.length; i++) {
    var rowShop = String(values[i][shopIdx] || '').trim().toLowerCase();
    if (rowShop && rowShop === shopName) return i + 1;
  }
  return -1;
}

function upsertRow_(sheet, headers, data, forceCreate) {
  var values = sheet.getDataRange().getValues();
  var rowIndex = findRowIndex_(values, headers, data, forceCreate);

  var line = headers.map(function (h, idx) {
    if (Object.prototype.hasOwnProperty.call(data, h)) return data[h];
    return rowIndex > 0 ? values[rowIndex - 1][idx] : '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([line]);
    return { ok: true, updated: true, created: false, row: rowIndex };
  }

  var nextRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(nextRow, 1, 1, headers.length).setValues([line]);
  return { ok: true, updated: false, created: true, row: nextRow };
}

function patchLoginState_(sheet, headers, data) {
  // Ensure Is Login / Login session columns exist before writing.
  headers = ensureHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var shopName = String(data['Shop name'] || '').trim().toLowerCase();
  var loginKey = String(data['Login key'] || data['Login Key'] || '').trim().toUpperCase();
  var shopIdx = headerIndex_(headers, ['Shop name']);
  var keyIdx = headerIndex_(headers, ['Login key', 'Login Key']);
  var isLoginIdx = headerIndex_(headers, ['Is Login', 'Is Login id', 'Is login']);
  var sessionIdx = headerIndex_(headers, ['Login session', 'Login Session']);
  var rowIndex = -1;

  // Prefer shop + key, then shop only (keys can collide across shops).
  for (var i = 1; i < values.length; i++) {
    var rowShop = shopIdx >= 0 ? String(values[i][shopIdx] || '').trim().toLowerCase() : '';
    var rowKey = keyIdx >= 0 ? String(values[i][keyIdx] || '').trim().toUpperCase() : '';
    if (shopName && loginKey && rowShop === shopName && rowKey === loginKey) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex < 0 && shopName) {
    for (var j = 1; j < values.length; j++) {
      var onlyShop = shopIdx >= 0 ? String(values[j][shopIdx] || '').trim().toLowerCase() : '';
      if (onlyShop && onlyShop === shopName) {
        rowIndex = j + 1;
        break;
      }
    }
  }

  if (rowIndex < 0) {
    return { ok: false, error: 'Row not found for shop: ' + shopName };
  }

  var line = values[rowIndex - 1].slice();
  while (line.length < headers.length) line.push('');

  // Write Is Login / session even if header aliases differ in payload.
  var flag = String(data['Is Login'] != null ? data['Is Login'] : data['Is Login id'] || '').trim();
  if (!flag) flag = 'FALSE';
  flag = /^(true|yes|1|y)$/i.test(flag) ? 'TRUE' : 'FALSE';
  var session = String(data['Login session'] != null ? data['Login session'] : '').trim();
  if (flag === 'FALSE') session = '';

  if (isLoginIdx >= 0) line[isLoginIdx] = flag;
  if (sessionIdx >= 0) line[sessionIdx] = session;

  headers.forEach(function (h, idx) {
    if (h === 'Is Login' || h === 'Is Login id' || h === 'Is login' || h === 'Login session' || h === 'Login Session') {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(data, h)) line[idx] = data[h];
  });

  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([line]);
  return { ok: true, row: rowIndex, isLogin: flag };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
