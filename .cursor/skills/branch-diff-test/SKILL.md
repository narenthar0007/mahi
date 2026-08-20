---
name: branch-diff-test
description: >-
  Compares an old git branch to a new branch, reviews every changed file,
  runs static/runtime checks for new errors, and produces a QA test report.
  Use when the user asks to test branch changes, compare old vs new branch,
  regression-test a feature branch, verify a PR diff, or check for new errors
  between branches.
---

# Branch Diff Test Agent

Test **all changes from an old branch to a new branch** and report **new errors / regressions**.

## When invoked

1. Resolve **base (old)** and **head (new)** refs.
2. Collect the full diff (committed + clarify uncommitted if on head).
3. Review every changed file for bugs and regressions.
4. Run available static checks for **new** errors.
5. Return a structured pass/fail report. Do **not** commit, push, or “fix” unless asked.

## Resolve branches

Ask only if missing. Defaults for this repo:

| Role | Default |
|------|---------|
| Old / base | `master` (or `main` if that is the default) |
| New / head | Current checked-out branch, or the branch the user named |

Accept: branch names, tags, commit SHAs, `origin/...`, or “current vs master”.

If head is not checked out and the user wants runtime checks on that branch, say so and ask before switching. Prefer analyzing with `git diff` / `git show` without switching when possible.

## Step 1 — Collect diff (required)

Run the helper (PowerShell-safe; pass refs as args):

```bash
node .cursor/skills/branch-diff-test/scripts/collect-diff.js <old> <new>
```

If the script fails, fall back to:

```bash
git rev-parse --verify <old>
git rev-parse --verify <new>
git log --oneline <old>..<new>
git diff --stat <old>...<new>
git diff --name-status <old>...<new>
git diff <old>...<new>
```

Use three-dot `A...B` (merge-base) unless the user asks for two-dot.

**Also check working tree** when head is the current branch:

```bash
git status -sb
git diff
git diff --cached
```

Include uncommitted files that belong to the feature under test in the review.

## Step 2 — Map changes to test areas

Group files and derive checks:

| Area | Typical paths | Must verify |
|------|---------------|-------------|
| Order History / stats | `screens/HistoryScreen.js`, `components/SalesStatsModal.js`, `utils/salesStats.js` | Stats button, Daily/Weekly/Monthly, bars, empty state, i18n |
| Billing / cart | `screens/BillingScreen.js`, `components/ItemConfigModal.js` | Checkout, cart line pricing |
| Inventory | `screens/InventoryScreen.js` | Add/edit/hide items |
| Store / persistence | `store/store.js`, `utils/dataBackup.js` | Normalize, persist, backup import |
| i18n | `utils/i18n/translations.js` | Keys exist in `en`, `ta`, `kn` |
| Navigation / theme | `navigation/`, `utils/theme.js`, `utils/uiTheme.js` | Tabs still load |
| Export | `utils/orderExport.js`, `utils/invoiceExport.js` | Export still works |

Skip noise unless asked: `website/`, `release/`, `*.pptx`, large binaries, `node_modules`.

## Step 3 — Static error checks (find NEW errors)

Run what exists; skip missing tools without failing the whole run.

1. **Syntax / load of changed JS modules** (helper):

```bash
node .cursor/skills/branch-diff-test/scripts/syntax-check.js <old> <new>
```

2. **Linter diagnostics** on changed files via the IDE linter tool (`ReadLints`) when available.

3. **Import / translation integrity** (manual in review):
   - New `t('key')` / `translate(..., 'key')` → key present in `en`, `ta`, `kn`
   - New components imported where used
   - No broken relative imports

4. **Package / Expo** (only if `package.json` or lockfile changed):

```bash
npm install
npx expo-doctor
```

Do not treat pre-existing doctor warnings as new unless the diff introduced them.

5. **Optional deeper review**: if the user asks for Bugbot or security review, launch those subagents on the same branch/diff after the static pass.

## Step 4 — Logical / regression review

For each changed file in the diff:

- Read the full file (or large hunks), not only the patch.
- Flag: crashes, wrong date ranges, empty-state bugs, stale closures, store shape breaks, missing i18n, UI that never opens.
- Compare behavior to the old branch when unclear: `git show <old>:path`.

For **sales stats** specifically (if those files changed):

- Daily = today hourly; Weekly = last 7 days; Monthly = last 30 days
- Item bars use qty + revenue; trend uses order `totalAmount`
- Modal opens from History; period tabs refresh charts

## Step 5 — Manual QA checklist (output for humans)

Emit a checklist the team can execute on device/simulator. Mark items **Required** when the diff touches that area; otherwise **N/A**.

## Report format (always)

```markdown
# Branch Diff Test Report

| Field | Value |
|-------|-------|
| Old (base) | … |
| New (head) | … |
| Merge-base | … |
| Commits | N |
| Files changed | N |
| Verdict | PASS / PASS WITH NOTES / FAIL |

## Change summary
- …

## New errors found
| Severity | Location | Issue | Evidence |
|----------|----------|-------|----------|
| Critical/Major/Minor | file:line | … | command or code |

If none: "No new errors detected in static checks."

## Regressions / risks
- …

## Checks run
- [x] Diff collected
- [ ] Syntax check
- [ ] Lints
- [ ] i18n key audit
- [ ] expo-doctor (if applicable)
- [ ] Logic review

## Manual QA checklist
- [ ] …

## Recommended next steps
1. …
```

**Verdict rules**

- **FAIL** — any Critical (crash, data loss, broken navigation, missing required import)
- **PASS WITH NOTES** — Minor/Major non-blocking issues or unverified manual QA
- **PASS** — no new static errors and logic review clean for the diff scope

## Hard rules

- Never modify git config; never force-push; never commit unless the user asks.
- Do not mark PASS if syntax-check or lints show **new** errors on changed files.
- Prefer evidence (command output, file:line) over opinions.
- Keep the report concise; link paths with backticks.
- If old/new refs are invalid, stop and ask for correct branch names.
