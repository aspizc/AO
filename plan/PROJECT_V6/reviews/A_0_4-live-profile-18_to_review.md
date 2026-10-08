# A/0/04 — trial 18 surgical regex lint correction

Status: implemented; fresh independent review pending. Uncommitted one-line
source correction on HEAD `fd2c4004d6bdb008727acb6155050ca79337d9fd`, branch
`feat/V6-A-0-04-safe-submit`. Trial17 code was independently OK and committed at
fd2c400. This trial makes no integration, promotion or release claim.

Read AGENTS.md, A/0/04 and the complete trial17 OK verdict before editing.
The existing plan/stage/profile readings remain applicable. Root's full gate
reported lint.gateway failure at base_adapter.js:369:9, no-regex-spaces.
Success means equivalent regex matching, focused lint GREEN and the requested
prompt_submission regression suite GREEN. No new behavior or tests were added.

## Exact change

Only the two runs of three literal spaces in freshClaude294Response's cwd
header regex are represented with quantifiers. A literal space followed by
{3} still matches exactly three ASCII spaces. No whitespace class, capture,
anchor, allowed path character, caller or control-flow change.

```diff
diff --git a/gateway/src/adapters/base_adapter.js b/gateway/src/adapters/base_adapter.js
index c2018c5..1be3e14 100644
--- a/gateway/src/adapters/base_adapter.js
+++ b/gateway/src/adapters/base_adapter.js
@@ -366,7 +366,7 @@ function freshClaude294Response(spawn, ready, pending, guard, after, prompt, wor
   const header = prior[0].slice(0, 4);
   if (header[0] !== "" || header[1] !== " ▐▛███▛█   Claude Code v2.1.294"
     || header[2] !== "▝▜██████▀  Opus 5.5 with medium effort · Claude Max"
-    || !/^ ▝▝   ▝▝   \/[A-Za-z0-9_./-]+$/.test(header[3])
+    || !/^ ▝▝ {3}▝▝ {3}\/[A-Za-z0-9_./-]+$/.test(header[3])
     || [...prior, rows].some((lines) => lines.length !== 41 || lines[40] !== ""
       || header.some((row, index) => lines[index] !== row)
       || lines[34] !== " ".repeat(100) + "◐ medium · /effort")
```

[Exact diff artifact](evidence/A_0_4-live-profile-18-delta.patch).
Source before SHA256: `9c9a96b15e11f293c2e32d1ca73f8d7a07d43c227b40a9f5e536dc777b39b247`.
Source after SHA256: `8ce501e17198ffdad954069d038bc9a118c6578f8616f04a3d74370da827bff1`.
Unchanged prompt_submission.test.js SHA256:
`fa39402b1f64f867694d08a50b9e99b295cc42b49a31363185088c17993fe1da`.

## RED / GREEN verification

ESLint is the existing failing check for this syntax-only correction; it was
run before editing, not a newly invented behavioral test. Initial sandbox run
printed the same lint failure plus stream-fd permission diagnostics, so host
execution was used for clean evidence.

From gateway/:

```bash
node node_modules/eslint/bin/eslint.js --config eslint.config.js src/adapters/base_adapter.js
```

[Host RED](evidence/A_0_4-live-profile-18-eslint-red.log.gz): exit1,
exactly one error at 369:9, no-regex-spaces, `Spaces are hard to count. Use {3}`.
[Host GREEN](evidence/A_0_4-live-profile-18-eslint-green.log.gz): exit0,
no lint diagnostics.

From repository root:

```bash
node --test tests/gateway/prompt_submission.test.js
git diff --check
```

[Focused test GREEN](evidence/A_0_4-live-profile-18-prompt-green.log.gz): exit0,
**131/131 passed**, 0 failed/cancelled/skipped/todo. Whitespace check exit0.
[Ad hoc semantic comparison](evidence/A_0_4-live-profile-18-equivalence.log.gz):
exit0; 180 cases across both space-run lengths 0–5 and valid/invalid paths,
plus explicit accepted three-space and refused two-space boundaries agree
between before/after regexes. No test file or acceptance behavior was changed.

## Preservation and limitations

[Entry SHA map](evidence/A_0_4-live-profile-18-entry.json) binds source, unchanged
focused test and every prior A_0_4 review/evidence artifact present at entry.
All prior immutable artifacts were verified unchanged. The unrelated untracked
structure mutant file present at entry was left alone. No review index edit
is needed to record a verdict because trial18 has no independent verdict yet.
The [candidate/evidence map](evidence/A_0_4-live-profile-18-files.json) and
separate handoff seal bind this request, source, test, exact diff and logs.

No full gate was run, as explicitly instructed while A05 Gateway sessions are
active. Focused ESLint is not a claim that lint.gateway or the full gate passed.
No live provider execution, mutation of provider logic, independent self-review,
subagent, policy edit, staging, commit or push. Root owns fresh independent
review and the subsequent full-gate rerun when A05 sessions are inactive.
