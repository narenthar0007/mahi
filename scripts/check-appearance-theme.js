/**
 * Audit: screens/components that paint chrome colors must follow Settings appearance.
 *
 * Fail if a file still bakes static LIGHT `UI.bg|surface|textPrimary|...` into
 * StyleSheet.create (those values won't update when Appearance toggles).
 *
 * Allowed:
 * - utils/uiTheme.js (palette definitions)
 * - createStyles(ui) factories that use `ui.*`
 * - UI.radius* / UI.space (same in light & dark)
 *
 * Run: node scripts/check-appearance-theme.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['screens', 'components', 'navigation'];
const SKIP_FILES = new Set([
  path.join('utils', 'uiTheme.js'),
  path.join('utils', 'tableBookerTheme.js'),
]);

const STATIC_UI_COLOR_KEYS = [
  'bg',
  'surface',
  'surfaceMuted',
  'border',
  'borderLight',
  'textPrimary',
  'textSecondary',
  'textMuted',
  'overlay',
  'menuSheet',
  'successBg',
  'dangerBg',
  'info',
  'success',
  'danger',
];

const HARDCODED_LIGHT = [
  /backgroundColor:\s*['"]#fff(?:fff)?['"]/i,
  /backgroundColor:\s*['"]#f7f8fa['"]/i,
  /backgroundColor:\s*['"]#f8f9fa['"]/i,
  /backgroundColor:\s*['"]#ffffff['"]/i,
  /color:\s*['"]#111827['"]/i,
  /color:\s*['"]#1a1a2e['"]/i,
];

function walk(dir, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function extractStyleSheetBlocks(source) {
  const blocks = [];
  const marker = 'StyleSheet.create(';
  let from = 0;
  while (true) {
    const start = source.indexOf(marker, from);
    if (start < 0) break;
    let i = start + marker.length;
    let depth = 0;
    let began = false;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '(' || ch === '{' || ch === '[') {
        depth += 1;
        began = true;
      } else if (ch === ')' || ch === '}' || ch === ']') {
        depth -= 1;
        if (began && depth === 0) {
          i += 1;
          break;
        }
      }
    }
    blocks.push({ start, end: i, text: source.slice(start, i) });
    from = i;
  }
  return blocks;
}

function isCreateStylesFactory(source, blockStart) {
  const before = source.slice(Math.max(0, blockStart - 120), blockStart);
  return /function\s+createStyles\s*\(\s*ui\s*\)/.test(before) || /createStyles\s*\(\s*ui\s*\)\s*\{/.test(before);
}

function usesThemedStyles(source) {
  return (
    source.includes('useThemedStyles(') ||
    source.includes('useUI(') ||
    source.includes('getUI(') ||
    source.includes('appearanceMode')
  );
}

const issues = [];
const okFiles = [];

for (const rel of walk('')) {
  // limit to scan dirs
}

const files = SCAN_DIRS.flatMap((d) => walk(d));

for (const rel of files) {
  if (SKIP_FILES.has(rel.replace(/\\/g, '/'))) continue;
  const source = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const norm = rel.replace(/\\/g, '/');

  // Static UI.color in StyleSheet.create that is NOT a createStyles(ui) factory
  const blocks = extractStyleSheetBlocks(source);
  for (const block of blocks) {
    if (isCreateStylesFactory(source, block.start)) continue;
    for (const key of STATIC_UI_COLOR_KEYS) {
      const re = new RegExp(`UI\\.${key}\\b`);
      if (re.test(block.text)) {
        issues.push({
          file: norm,
          kind: 'static-UI-in-StyleSheet',
          detail: `StyleSheet.create uses UI.${key} (won't follow Settings appearance). Use createStyles(ui) + useThemedStyles.`,
        });
      }
    }
  }

  // JSX / runtime still referencing UI.textMuted etc outside factory (common miss)
  const runtimeUiColor = /(?<![\w.])UI\.(bg|surface|surfaceMuted|border|borderLight|textPrimary|textSecondary|textMuted|overlay|menuSheet)\b/g;
  let m;
  while ((m = runtimeUiColor.exec(source))) {
    // allow if only in comments
    const lineStart = source.lastIndexOf('\n', m.index) + 1;
    const line = source.slice(lineStart, source.indexOf('\n', m.index));
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // allow UI.radius* already excluded by regex
    issues.push({
      file: norm,
      kind: 'runtime-UI-color',
      detail: `Uses UI.${m[1]} at runtime — prefer ui from useUI()/useThemedStyles so Settings appearance applies.`,
    });
  }

  // Hardcoded light page chrome — ignore login branding, theme picker, and nav splash/header icons
  const skipHardcode =
    /LoginScreen\.js$/.test(norm) ||
    /ThemeColorField\.js$/.test(norm) ||
    /AppNavigator\.js$/.test(norm) ||
    /OfflineBanner\.js$/.test(norm);

  if (!skipHardcode && (usesThemedStyles(source) || /Screen\.js$/.test(norm) || /Modal\.js$/.test(norm))) {
    for (const re of HARDCODED_LIGHT) {
      const match = source.match(re);
      if (!match) continue;
      // Allow white text/icons on accent buttons: color: '#fff'
      if (/^color:/i.test(match[0]) && /#fff/i.test(match[0])) continue;
      issues.push({
        file: norm,
        kind: 'hardcoded-light-chrome',
        detail: `Hardcoded light color ${match[0]} — should use ui.* from appearance mode.`,
      });
    }
  }

  if (usesThemedStyles(source) || /AppNavigator\.js$/.test(norm)) {
    okFiles.push(norm);
  }
}

// Deduplicate
const seen = new Set();
const unique = [];
for (const issue of issues) {
  const key = `${issue.file}|${issue.kind}|${issue.detail}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(issue);
}

console.log('Appearance theme audit');
console.log('======================');
console.log(`Themed entrypoints: ${okFiles.length}`);
okFiles.sort().forEach((f) => console.log(`  OK  ${f}`));
console.log('');

if (unique.length === 0) {
  console.log('PASS: No static UI chrome colors found outside themed factories.');
  process.exit(0);
}

console.log(`FAIL: ${unique.length} issue(s)`);
unique.forEach((issue, idx) => {
  console.log(`\n${idx + 1}. [${issue.kind}] ${issue.file}`);
  console.log(`   ${issue.detail}`);
});
process.exit(1);
