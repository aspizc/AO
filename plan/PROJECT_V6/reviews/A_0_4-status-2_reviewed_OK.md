# Review A_0_4-status-2 — OK

Date: 2026-10-08.
Reviewer: independent Claude Opus 5.5 session. I did not write the feature,
the merge, the gate record or this status candidate.
Scope: documentation-only status candidate, uncommitted on `release/1.1.0`
over `HEAD` = `343222e869e02b1860a384e52788378e7bb74734`. This is not a full
gate, a commit, promotion or release.
Request: [A_0_4-status-2_to_review.md](A_0_4-status-2_to_review.md), after
[trial 1 KO](A_0_4-status-1_reviewed_KO.md).

## Integration identity

- `HEAD` is `343222e869e02b1860a384e52788378e7bb74734`. Its parents are
  `c4bc008b1acf…` and `7195cf1af5d7…`, and its tree is `ff85e677d7ad…`. These
  match the [integration verdict](A_0_4-integration-1_reviewed_OK.md).
- Every surface names A/0/04 at `343222e` and keeps A/0/02 at `7df29bd`.

## Trial-1 KO findings

1. **Fixed.** `plan/PROJECT_V6/README.md:3-7` binds A/0/02 to `7df29bda…`
   and A/0/04 to `343222e869e0…`, each with its full SHA. It says five sheets
   remain and nothing is promoted or released. It links the A/0/04
   integration verdict and the merge gate.
2. **Fixed.** `plan/PROJECT_V6/SHEETS.md:21` reads `2 integrated + 5
   unfinished`, and the status line and table agree.
3. **Fixed.** `plan/README.md:16-17` says A/0/02 and A/0/04 are integrated
   and five sheets remain. `README.md`, `docs/project-status.md` and
   `A/README.md` agree.
4. **Fixed.** [`HUMAN_DECISIONS.md:12-19`](../HUMAN_DECISIONS.md) records
   the lift of the restriction. It gives the date (2026-10-08), quotes the
   operator ("claude ya funciona") and names the scope (Claude Opus 5.5,
   medium effort). It also says that earlier Codex-only review exceptions
   remain historical. In `A/0/04.md:128-150`, the deferral paragraph is
   gone. Each of the six criteria is checked and links its evidence:
   - **RED/GREEN:** the trial-17 verdict reproduced 5 RED failures (131
     tests, 126 pass) and 261/261 focused GREEN.
   - **Live Codex and Claude:** the
     [operator pane record](A_0_4-live-profile-17-operator-live.md) shows
     `claude-opus-5-5` and `gpt-6.1-sol` pane grids with no manual Enter. The
     [bound JSON](evidence/A_0_4-live-profile-17-bound-live.json) records one
     guarded Enter and 0 plain Enters for each provider.
   - **No adapter `send-keys`:** I checked the source (see note 1).
   - **Negative paths:** covered by trial-17 tests 125-131.
   - **Versions:** Codex 0.160.1, Claude Code 2.1.294 and tmux
     3.6a-agents.3. The caveat that the warning-only draft branch is covered
     by fixtures but was not observed stable live is kept.
   - **Full gate:** see below.
5. **Fixed (non-blocking in trial 1).** `docs/project-status.md:58-59` and
   `A/0/04.md:148-150` both say the live source hash predates the
   syntax-only regex correction that the trial-18 verdict reviewed as
   equivalent. Both still call the warning-only branch an intermittent
   fail-closed limitation.
6. **Fixed (non-blocking in trial 1).** The
   [gate record](A_0_4-integration-1-root-gate.md) gives the aggregate
   status `infrastructure_unavailable` and links the archive. See
   "Gate log" below.

## Gate log

- `gzip -t` passes on `A_0_4-integration-1-root-gate.log.gz`. Its SHA-256
  is `9fc0c9af…f152`, as recorded.
- The decompressed log's SHA-256 is `b970c5b9…a9c9`. This matches the
  recorded raw-log hash and the `/tmp/a04-integrated-gate.log` file
  (369,531 bytes, mtime 11:05, after the 11:01 merge).
- The final JSON shows 2,949 passed, 0 failed, 12 skipped, 2,961 tests, with
  status `infrastructure_unavailable`. The per-suite counts are: structure
  456, Gateway 1,832 (+9 PostgreSQL skips), E2E 25, CLI 442, LangGraph 165
  (+2 gateway-integration skips and 1 Temporal skip) and Redis live 22.
  public.hygiene passed. `test.real-agents` is optional and ran 0 tests.
- I did not rerun the gate. Its binding to `343222e` still rests on the root
  session's attestation and the timing, because the log embeds no SHA. The
  gate record says it covers the merge, not a later status commit.

## Scope and hygiene

- `git diff --name-only 343222e` against `policies/`, `gateway/`, `cli/`,
  `tests/`, `scripts/`, `ci/` and `orchestrator-langgraph/` is empty. The
  index is empty. The untracked files are only the gate record, the log
  archive and the status-1/2 review files. The trial-1 KO is intact.
- `git diff --check` exits 0.
- `python3 -I scripts/check_public_hygiene.py` finds 0 issues and exits 0.
- `python3 -I scripts/ci_gate.py --validate-only` returns `status: passed`
  with no errors and exits 0. This validates the inventory only and runs no
  suites.
- Every relative link in the nine changed docs and the gate record resolves.

## Non-blocking notes

1. Criterion 3 now reads "no *executable* adapter", where it used to say "no
   adapter". `gateway/src/adapters/gemini_adapter.js:280,318` still calls
   raw `send-keys`. This narrowing is consistent with what the sheet already
   says (requirement 5: `gemini-cli` stays registry-only). The plan-2 OK
   accepted it, and the trial-5 KO (F6) confirmed with a refusal test that
   Gemini is refused before the adapter. A later sheet that makes Gemini
   executable must remove this residue.
2. `HUMAN_DECISIONS.md:14` gives a reason for the restriction ("while tokens
   were unavailable") that no other repository record contains. I cannot
   verify it, and it does not affect the recorded lift or its scope.
3. `plan/PROJECT_V6/BASELINE.md:66` still says the no-Claude instruction
   defers live Claude checks. The file is the dated 2026-10-07 preparation
   baseline, so this is historical context, not a current claim. It does not
   block this trial.

## Verdict

**OK** for the documentation-only status candidate. Trial-1 findings 1-6
are corrected, the identity and counts are exact, the operator's lift is
recorded, and all six acceptance criteria carry evidence and caveats. This
verdict covers documentation consistency only. The candidate is still
uncommitted, and this verdict grants no commit, promotion or release
authority. A/0/00, 01, 03, 05 and 06 remain open.
