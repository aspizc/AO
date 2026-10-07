# V7 A/0/00 Trial 1: independent review notes (gate pending, no verdict)

Reviewer: separately assigned Claude Opus 5.5, medium effort, 2026-10-07.
Scope: `A_0_0-1_to_review.md` plus the root registration/inventory supplement.
This is an **interim note, not a verdict**. No production or policy edits,
commits, subagents or test runs. Per the brief, tests are withheld until the
full gate marker exists.

## Candidate binding (verified)

- Base `b1e4fed5181431ec3c4769a078d016f0318c5b6a`. The working tree diff
  against base touches only `ci/suites.json`, `cli/src/agents_cli/main.py` and
  `gateway/src/core/request_context.js`; everything else is new and untracked.
- `A_0_0-1_candidate_manifest.json` has SHA-256
  `1561a9175f12bdceec24bdbe4213f8c5caf2c4a875d8610b4a87ba4ad28c8a2e`, which
  matches the handoff. All 46 listed files are present and match their
  SHA-256 hashes (0 mismatches).
- Root supplement: `cli/src/agents_cli/main.py` is `6bb869b6…b134d8` and
  `ci/suites.json` is `f90e5dc7…bbbbb9`. Both match
  `workspace/root-registration-manifest.json`.

## Source review findings

1. **Registration: OK.** It is two additive lines (an import and
   `app.add_typer(project_app, name="project")`), exactly as specified in the
   handoff follow-up step 1.
2. **`ci/suites.json`: only the three `inventorySha256` values changed.**
   There are no include, exclude or skip changes. I did not recompute the
   inventories, so whether the hashes match the emitted selection depends on the
   gate. `ci/suites-contract.json` is unchanged; the gate must confirm that this
   is acceptable.
3. **`request_context.js`: additive, read-only export.**
   `resolveRegisteredRepositoryCwd` composes the existing
   `normalizeRepositoryBindings`, `configuredRepositoryBindings` and
   `repositoryFor(required: true)`. It creates no context, trace or session, and
   the existing exports are unchanged. **Conflict risk:** A05 edits this file in
   another worktree, so root must serialize the merge and re-run the Node
   request_context suites after merging.
4. **Containment: sound on reading.** `_read` uses `O_NOFOLLOW`, accepts only
   regular files and bounds reads at limit+1. `_relative` rejects absolute
   paths, `..`, backslashes and control characters, then resolves with
   `strict=True`. When a write leaf is absent and is not a symlink, it resolves
   the parent. A dangling symlink therefore fails, consistent with the RED test
   for that case. The resolved path must sit under the root, an allowed root and
   the task cwd. Write paths that overlap the runtime root are rejected in both
   directions.
5. **No-launch: sound on reading.** The CLI calls the Node helper with an argv
   list (`shell=False`), a 10 s timeout, stderr discarded and stdout capped at
   16 KiB. It also checks the response's key set, status and selection count.
   The helper's `executable()` only uses `accessSync`/`statSync` and never execs
   anything.
6. **Low (not blocking):** the helper's stdout goes to an unbounded temp file
   before the 16 KiB read. That limits memory, but disk use is bounded only by
   the 10 s timeout. The helper is first-party code, so the risk is accepted
   with this note.
7. **Unverified (needs a probe after the gate):** `relativePath` allows `"."`
   (minLength 1). A write path of `"."` resolves to the project root. The
   runtime-overlap check rejects it only when the runtime root sits inside the
   project root. A probe should run after the gate.

## Gate status

`workspace/root-v7-a00-gate-attempt1.json` shows the gate was **cancelled
(exit 143)** because of a tmux runtime-path error. It was not counted as
passing. `workspace/root-v7-a00-gate-finished.json` is **absent**. The gate is
**pending**, so no implementation OK can be issued.

## Remaining before a verdict

The finished marker with exact pass/fail/skip/deferred totals and a bound tree;
the independent re-run of the scoped test commands; the probe in item 7.
