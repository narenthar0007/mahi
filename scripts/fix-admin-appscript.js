const fs = require('fs');
const path = 'website/admin/admin.js';
let s = fs.readFileSync(path, 'utf8');
const start = s.indexOf('const APPS_SCRIPT = ');
if (start < 0) throw new Error('APPS_SCRIPT missing');
let i = start + 'const APPS_SCRIPT = '.length;
if (s[i] !== '"' && s[i] !== "'") throw new Error('APPS_SCRIPT not a string literal');
const quote = s[i];
i += 1;
while (i < s.length) {
  if (s[i] === '\\') {
    i += 2;
    continue;
  }
  if (s[i] === quote) break;
  i += 1;
}
if (i >= s.length) throw new Error('unterminated APPS_SCRIPT');
i += 1;
if (s[i] === ';') i += 1;
const code = fs.readFileSync('website/apps-script/Code.gs', 'utf8');
const rebuilt = s.slice(0, start) + 'const APPS_SCRIPT = ' + JSON.stringify(code) + ';' + s.slice(i);
fs.writeFileSync(path, rebuilt);
console.log('APPS_SCRIPT updated');
