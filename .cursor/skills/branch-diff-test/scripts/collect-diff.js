#!/usr/bin/env node
/**
 * Collect branch-to-branch diff metadata for branch-diff-test skill.
 * Usage: node collect-diff.js <old-ref> <new-ref>
 */
const { execFileSync } = require('child_process');

const oldRef = process.argv[2];
const newRef = process.argv[3];

if (!oldRef || !newRef) {
  console.error('Usage: node collect-diff.js <old-ref> <new-ref>');
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch (error) {
    const stderr = error.stderr ? String(error.stderr).trim() : '';
    const stdout = error.stdout ? String(error.stdout).trim() : '';
    return stderr || stdout || error.message;
  }
}

try {
  const oldSha = git(['rev-parse', '--verify', oldRef]);
  const newSha = git(['rev-parse', '--verify', newRef]);
  const mergeBase = tryGit(['merge-base', oldSha, newSha]);
  const commits = tryGit(['log', '--oneline', `${oldSha}..${newSha}`]);
  const nameStatus = tryGit(['diff', '--name-status', `${oldSha}...${newSha}`]);
  const stat = tryGit(['diff', '--stat', `${oldSha}...${newSha}`]);
  const status = tryGit(['status', '-sb']);

  const files = nameStatus
    ? nameStatus.split(/\r?\n/).filter(Boolean)
    : [];

  const payload = {
    oldRef,
    newRef,
    oldSha,
    newSha,
    mergeBase,
    commitCount: commits ? commits.split(/\r?\n/).filter(Boolean).length : 0,
    commits: commits || '(none)',
    fileCount: files.length,
    nameStatus: files,
    stat: stat || '(no diff)',
    workingTree: status,
  };

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(error.stderr ? String(error.stderr).trim() : error.message || String(error));
  process.exit(1);
}
