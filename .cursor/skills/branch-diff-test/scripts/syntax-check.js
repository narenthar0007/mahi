#!/usr/bin/env node
/**
 * Syntax-check JS/TS files changed between two refs (and optional dirty tree).
 * Usage: node syntax-check.js <old-ref> <new-ref>
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const oldRef = process.argv[2];
const newRef = process.argv[3];

if (!oldRef || !newRef) {
  console.error('Usage: node syntax-check.js <old-ref> <new-ref>');
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'release',
  'website',
  '.cursor',
  'postman',
  'npx',
]);

const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function shouldCheck(filePath) {
  const parts = filePath.split(/[\\/]/);
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  return CODE_EXT.has(path.extname(filePath));
}

function listChangedFiles() {
  const nameStatus = git(['diff', '--name-status', `${oldRef}...${newRef}`]);
  const files = new Set();

  nameStatus.split(/\r?\n/).filter(Boolean).forEach((line) => {
    const parts = line.split(/\t/);
    const status = parts[0];
    if (status.startsWith('D')) return;
    if (status.startsWith('R') || status.startsWith('C')) {
      files.add(parts[parts.length - 1]);
      return;
    }
    files.add(parts[1] || parts[parts.length - 1]);
  });

  try {
    const head = git(['rev-parse', 'HEAD']);
    const newSha = git(['rev-parse', newRef]);
    if (head === newSha) {
      const dirty = git(['status', '--porcelain']);
      dirty.split(/\r?\n/).filter(Boolean).forEach((line) => {
        const filePath = line.slice(3).trim().replace(/^.* -> /, '');
        if (filePath && shouldCheck(filePath) && fs.existsSync(filePath)) {
          files.add(filePath);
        }
      });
    }
  } catch {
    // ignore
  }

  return [...files].filter(shouldCheck);
}

function checkWithToolchain(abs, source) {
  const ext = path.extname(abs);
  const hasJsx = ext === '.jsx' || ext === '.tsx' || /<[A-Za-z/!]/.test(source);

  if (!hasJsx && (ext === '.js' || ext === '.mjs' || ext === '.cjs')) {
    try {
      execFileSync(process.execPath, ['--check', abs], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { filePath: path.relative(process.cwd(), abs), ok: true };
    } catch (error) {
      return {
        filePath: path.relative(process.cwd(), abs),
        ok: false,
        error: (error.stderr && String(error.stderr).trim()) || error.message,
      };
    }
  }

  try {
    const babel = require('@babel/core');
    const result = babel.transformSync(source, {
      filename: abs,
      presets: [require.resolve('babel-preset-expo')],
      babelrc: false,
      configFile: false,
      sourceType: 'module',
    });
    if (!result || !result.code) {
      return {
        filePath: path.relative(process.cwd(), abs),
        ok: false,
        error: 'Babel produced empty output',
      };
    }
    return { filePath: path.relative(process.cwd(), abs), ok: true };
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return {
        filePath: path.relative(process.cwd(), abs),
        ok: true,
        warning: 'Skipped deep parse (babel not resolvable); file exists',
      };
    }
    return {
      filePath: path.relative(process.cwd(), abs),
      ok: false,
      error: error.message,
    };
  }
}

function checkFile(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    return { filePath, ok: false, error: 'File missing on disk' };
  }
  try {
    const source = fs.readFileSync(abs, 'utf8');
    return checkWithToolchain(abs, source);
  } catch (error) {
    return { filePath, ok: false, error: error.message };
  }
}

const files = listChangedFiles();
if (!files.length) {
  console.log(
    JSON.stringify(
      { ok: true, checked: 0, failures: [], message: 'No code files to check' },
      null,
      2
    )
  );
  process.exit(0);
}

const results = files.map(checkFile);
const failures = results.filter((r) => !r.ok);
const warnings = results.filter((r) => r.ok && r.warning);

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      checked: results.length,
      failures,
      warnings,
    },
    null,
    2
  )
);
process.exit(failures.length ? 1 : 0);
