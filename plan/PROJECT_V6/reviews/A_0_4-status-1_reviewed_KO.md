# Review A_0_4-status-1 — KO

Date: 2026-10-08.
Reviewer: independent Claude Opus 5.5 session. I did not write the feature,
the merge, the gate record or this status candidate.
Scope: documentation-only status candidate, uncommitted on `release/1.1.0`
over `HEAD` = `343222e869e02b1860a384e52788378e7bb74734`. This is not a full
gate, a commit, promotion or release.
Request: [A_0_4-status-1_to_review.md](A_0_4-status-1_to_review.md).

## What I verified

- **Merge identity.** `343222e` is the `HEAD` of `release/1.1.0`. Its parents
  are `c4bc008b…` and `7195cf1a…`, the pair the
  [integration verdict](A_0_4-integration-1_reviewed_OK.md) accepted. Tree:
  `ff85e677…`.
- **Candidate scope.** `git diff 343222e` touches only `README.md`,
  `docs/project-status.md` and `plan/PROJECT_V6/{README.md,SHEETS.md,A/README.md,A/0/04.md}`.
  The only untracked files are the gate record and this request. The index is
  empty. Nothing changed under `policies/`, `gateway/`, `cli/`, `tests/`,
  `scripts/`, `ci/` or `orchestrator-langgraph/`. `git diff --check` exits 0.
- **Gate log.** `/tmp/a04-integrated-gate.log` exists, and its SHA-256 is
  `b970c5b9833ca840dded971173cd919e049f7154c40a82fda4eefb6b4d82a9c9`, which
  matches the record. Its final summary reads: 2,949 passed, 0 failed,
  12 skipped, 2,961 tests. The skips are 9 PostgreSQL skips (test.gateway)
  plus 2 gateway-integration skips and 1 Temporal skip (test.langgraph). The
  per-suite counts match the record: structure 456, Gateway 1,832, E2E 25,
  CLI 442, LangGraph 165 and Redis live 22. Hygiene reported 0 findings, and
  the `test.real-agents` lane ran 0 tests. The log mtime (11:05) is later than
  the merge commit time (11:01 +0200). I did not rerun the gate, as the request
  instructed.
- **Bound live evidence.**
  [`A_0_4-live-profile-17-bound-live.json`](evidence/A_0_4-live-profile-17-bound-live.json)
  reports one guarded Enter and 0 plain Enters per provider. The providers are
  Codex 0.160.1 and Claude Code 2.1.294, on tmux 3.6a-agents.3. The JSON
  records that the warning-only branch was not observed live. Its
  `prompt_submission.test.js` and fixture hashes match the `343222e` blobs.
- **Local checks.** `python3 -I scripts/check_public_hygiene.py` reports 0
  findings, exit 0. `python3 -I scripts/ci_gate.py --validate-only` returns
  `status: passed` with no errors, exit 0. This validates the manifest only and
  ran no suites.
- **Accurate claims.** These are correct: `README.md` (A/0/04 at `343222e`,
  five sheets remaining), `docs/project-status.md`, `A/README.md` and the
  `SHEETS.md` table rows. A/0/00, 01, 03, 05 and 06 stay `planned`. Every
  surface says the work is not promoted or released.

## Blocking findings

1. **`plan/PROJECT_V6/README.md:3-5` binds A/0/04 to the wrong commit and
   miscounts.** The text now says "A/0/02 and A/0/04 are reviewed and
   integrated on `release/1.1.0` at `7df29bda…`". That is A/0/02's
   integration SHA. A/0/04 was integrated at `343222e`. The next sentence
   still says "The other six sheets remain unfinished", but five remain.
   Rule 14 requires each status claim to name the right object.
2. **`plan/PROJECT_V6/SHEETS.md:21` inventory is stale.** It still says
   "`1 integrated + 6 unfinished`", which contradicts the edited table and
   status line. It should say `2 integrated + 5 unfinished`.
3. **`plan/README.md:15-16` is stale.** The top-level plan index still says
   only A/0/02 is integrated and "the other six sheets remain unfinished".
   The candidate does not change this file. After the status commit it would
   contradict `README.md` and `docs/project-status.md`.
4. **`plan/PROJECT_V6/A/0/04.md` says `integrated`, but the sheet's own body
   says the work is not done.** This is a documentation consistency defect.
   - All six acceptance criteria (lines 128-138) are still `[ ]`. The A/0/02
     precedent checked its boxes at integration.
   - Lines 139-141 still say "The live Claude check is deferred while the
     operator's no-Claude instruction is active … it does not satisfy that
     live acceptance criterion."

   **Operator context (2026-10-08, given to this reviewer session).** The
   operator stated that, after the temporary no-Claude instruction, they told
   the root session "claude ya funciona" and "usalo opus 5.5 con esfuerzo
   medium". That authorizes Claude Opus 5.5 at medium effort and lifts the
   temporary restriction. I therefore do not treat the restriction as active.

   The repository does not record this yet.
   [`HUMAN_DECISIONS.md:14-19`](../HUMAN_DECISIONS.md) still says live Claude
   checks "remain deferred until the operator lifts the restriction". The next
   trial should record the lift, with its date and its scope (Opus 5.5,
   medium). Then it should:
   - replace the deferral paragraph in the sheet;
   - check each criterion that has evidence and link that evidence: the
     trial-17 live witness for Codex and Claude, the root gate, and the RED
     tests;
   - name any criterion that still lacks evidence as open.

## Non-blocking findings

5. **The live evidence does not bind the integrated `base_adapter.js`.** The
   live JSON and the
   [trial-17 operator witness](A_0_4-live-profile-17-operator-live.md) bind
   `base_adapter.js` hash `9c9a96b1…`, which is the `fd2c400`/`96ac6e0` blob.
   The commit `eeba514` changed one regex (three spaces to ` {3}`), so the
   integrated blob is `8ce501e1…`. The [trial-18 OK](A_0_4-live-profile-18_reviewed_OK.md)
   reviewed this as exact equivalence. `docs/project-status.md` calls this a
   "hash-bound live check" without saying so. Add a clause that the bound hash
   predates the equivalence-reviewed lint-only change.
6. **The gate record leaves out two facts.** First, the aggregate `ci_gate`
   status in the log is `infrastructure_unavailable`, which is what the
   allowed skips produce. Second, the log lives only in `/tmp` and does not
   embed the commit SHA, so its binding to `343222e` rests on root's
   attestation and timing. Name the status, and commit a compressed copy of
   the log the way `A_0_4-1-root-full-gate.txt.gz` was committed, so the
   hash stays checkable.
7. **User identity.** `343222e` and the five A04 commits before it are
   authored and committed as `Carlos Aspizc <carlos.aspizc@gmail.com>`. The
   configured `user.name`, the earlier commits (for example `5197f66`) and
   the attribution line in `docs/project-status.md` all use
   `Carlos Asensio Pizarro`. The email is the same throughout. History must
   not be rewritten on this shared branch, so this is for the operator to
   note, not to fix. The candidate's docs add no email, home path or
   personal id, and hygiene reports 0.

## Verdict

**KO.** The merge identity, gate counts, log hash, skips, live-evidence scope
and documentation-only scope all check out. The claims still contradict one
another: findings 1–3 are wrong or stale counts and SHAs, and in finding 4 the
sheet's unchecked acceptance criteria and stale deferral text deny its
`integrated` status. The operator has lifted the no-Claude restriction, but the
repository does not record the lift yet.

A corrected `A_0_4-status-2` candidate should fix findings 1–4, including the
record of the operator's lift. It should also address
5–6 or explain why it does not. This verdict does not change A/0/04's
integration state as recorded by the merge itself, and it grants no commit,
promotion or release authority.
