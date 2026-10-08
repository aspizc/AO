# Review A_0_5-status-2 — OK (status surfaces corrected)

**Task:** plan/PROJECT_V6/A/0/05.md (integration status and live acceptance record)
**Trial:** status-2
**Request:** [A_0_5-status-2_to_review.md](A_0_5-status-2_to_review.md)
**Correction contract:** [A_0_5-status-1_reviewed_KO.md](A_0_5-status-1_reviewed_KO.md)
**Reviewer:** independent Claude Opus 5.5 (medium) reviewer session. Not the
coder, the root author or the status-1 reviewer session. No subagents.
**Trace:** `tr-v6-a05-status-r2-2c84c87f-8866-4526-84a5-186458fa89dd`
**Task id:** `ts-1dbffbda-74eb-4739-aa3b-acebcaa8bd67`
**Date:** 2026-10-08

## Verdict

OK. Both status-1 KO findings are fixed exactly. Every public V6 status
surface now says five sheets integrated (A/0/00, A/0/01, A/0/02, A/0/04,
A/0/05) and two unfinished (A/0/06, A/0/03). Every new recovery claim is
bounded to Linux local stdio/SQLite under the same principal, machine and
state. The candidate is documentation only. This verdict accepts the status
claim "integrated on `release/1.1.0` at `7982e42`". It grants no promotion,
release or tag authority.

## Candidate identity

- `HEAD` = `be320891cb9b35d168a058eb0f6e451e870f6e83`. `git diff 7982e42 be32089`
  touches only the status-1 request, the status-1 KO verdict and one line in
  `reviews/README.md`. No file under `gateway/`, `cli/`, `scripts/`, `tests/`,
  `ci/`, `orchestrator-langgraph/` or `policies/` differs from `7982e42`, so
  the gated code tree is unchanged.
- `git status`: 7 modified docs (`README.md`, `docs/project-status.md`,
  `plan/PROJECT_V6/A/0/05.md`, `A/README.md`, `PROJECT_V6/README.md`,
  `SHEETS.md`, `plan/README.md`) and 2 untracked files
  (`A_0_5-integrated-acceptance.md`, `A_0_5-status-2_to_review.md`).
- SHA-256 of `git diff HEAD` (7 files, +59/−26):
  `8355640607005c633614992d3d12d8d130096f5da9e7b0bd526711a5b062641f`.
- `A_0_5-integrated-acceptance.md` SHA-256
  `0392963ecdb533f9a64349b513a3104c579e475e15292d11f45f4283114dbf73`. This
  equals the status-1 value, so the acceptance record is byte-identical to the
  one already reviewed.
- `A_0_5-status-2_to_review.md` SHA-256
  `c46a300ed00da4c1ea5e4e442e146339685f729090c490ac90ef4bcecd14a28a`.

## Checks

- [x] **KO 1 fixed.**
  - `docs/project-status.md:168-170` now reads "A/0/00, A/0/01, A/0/02,
    A/0/04 and A/0/05 are reviewed and integrated … A/0/06 and A/0/03 remain
    unfinished."
  - `plan/README.md:16-17` says the same.
  - I grepped `README.md`, `docs/`, `plan/README.md`, the V6 READMEs,
    `SHEETS.md` and the sheets for `three sheets`, `other three`,
    `4 integrated`, `3 unfinished` and the old four-sheet list. The only hit
    is `plan/README.md:28`, see the V7 check below.
- [x] **Five integrated and two unfinished on every public V6 surface.** These
      surfaces now agree:
  - root `README.md:29-33`;
  - `docs/project-status.md` (V6 section `:89-107` and boundary `:168-170`);
  - `plan/README.md:16-17`;
  - `PROJECT_V6/README.md:9-11` ("Two sheets remain unfinished");
  - `SHEETS.md` status line, A/0/05 row `integrated`, inventory
    `5 integrated + 2 unfinished`;
  - stage `A/README.md` status line and A/0/05 row `integrated`;
  - sheet `A/0/05.md` Status field.

  No other public doc (`gateway/README.md`, `docs/tmux-runtime.md`,
  `HUMAN_DECISIONS.md`, the V7 plan files) states a V6 count or calls A/0/05
  planned.
- [x] **V7 count kept distinct.** `plan/README.md:27-28` ("A/0/00 and A/0/01
      are reviewed and integrated; the remaining three sheets …") is in the
      "Generic execution planning" section about Project V7. It matches
      `PROJECT_V7/SHEETS.md:3` (two integrated, three planned) and is not a
      stale V6 count. The candidate does not change it.
- [x] **KO 2 fixed: the recovery claim is bounded.**
  - `README.md:29-31` now says "explicit Linux local stdio/SQLite recovery of
    supervised sessions for the same OS principal, machine and state".
  - `docs/project-status.md:97-98` and the capabilities table row name the
    same boundary. The table row adds that unsupported backends fail closed.
  - The acceptance record's Boundary section excludes physical reboot and
    live PostgreSQL/Temporal flows.
  - Sheet acceptance box 3 is therefore satisfied on all surfaces.
- [x] **Historical note is clear.**
  - `A/0/05.md:13-22` keeps the original refinement sentence. It is followed
    directly by "This historical refinement note is superseded by the
    integrated acceptance linked above".
  - The Verification section now uses past tense ("At the historical
    plan-only refinement stage … had not yet run") and points to the
    acceptance record for later results.
  - Nothing that was historical is rewritten as current, and the ticked boxes
    are now unambiguous.
- [x] **The seven acceptance boxes.** These are unchanged from status-1, which
      found each one supported:
  - RED/GREEN and the guard boxes rest on the A/0/05 trial 1, 3 and 4 OK
    verdicts and on integration-1.
  - The operator-decision box was already ticked.
  - The boundary box is now supported on every surface.
  - The live box and the full-gate box rest on the evidence below.

  I did not re-adjudicate the underlying trials.
- [x] **Reused gate and live evidence, with its limits.**
  - The status-1 reviewer reproduced the gate log (3,265 passed, 0 failed,
    12 allowlisted skips, 3,277 total) and the private live run. I reuse that
    result because the code tree is unchanged.
  - I spot-checked that the private files still match the record:
    - `evidence.jsonl` starts `fabae1eed6f37f6f1dc4…`.
    - `recovery-cleanup.json` starts `608ce0fe07483ef83631…`.
    - The candidate `gateway/src/adapters/base_adapter.js` starts
      `bc039cb5fbdbb29d…`, the probe adapter hash.
  - I did not reopen the gate log or re-parse the live events.
- [x] **Links.** 184 relative links across the 7 changed files and 2
      untracked files. None is broken.
- [x] **Privacy and hygiene.**
  - `scripts/check_public_hygiene.py` exited 0 with 0 findings.
  - `git diff --check` exited 0.
  - A grep of the added lines found no home paths, email addresses, numeric
    principal IDs or nonces.
  - The only private pointer is the existing `/tmp/…/run-<id>/` reference in
    the unchanged acceptance record, which status-1 accepted.
  - All text is in English.
- [x] **No promotion or release claim.** Each new status sentence says the
      work is integrated on the release branch, or says "not promotion or
      release".
- [x] **Policies.** `policies/` has no tracked or untracked changes.

## Non-blocking observations

- `plan/PROJECT_V7/README.md:98` says "Five executable sheets:
  `1 integrated + 4 planned`". Its own line 3 and `PROJECT_V7/SHEETS.md:3`
  say two are integrated and three planned. This V7 inconsistency is older
  than this candidate, is outside the V6 scope and is not edited here. I flag
  it for a separate V7 status cleanup.
- `docs/project-status.md:82-83` still says the Codex warning-only draft
  branch "was later observed" live. Status-1 found that the evidence shows the
  `⚠ 2 warnings` footer during both asks, but not which internal draft branch
  ran. A future wording pass could say "the warning footer state was later
  observed".

## Limitations

- I did not run `bash scripts/ci.sh`, any test suite, tmux, provider or cleanup
  command. The gate and live conclusions are reused from the status-1 review,
  with all of its limitations, including:
  - the commit binding and exit code of the gate log are root-attested;
  - the operator attests that no manual Enter was pressed on a challenge
    prompt;
  - the probe source was compared after the run;
  - the coverage is Linux local stdio/SQLite only, with no live PostgreSQL,
    Temporal or real-agent lanes.
- My checks were read-only hash, grep, link and diff checks on the current
  worktree at `be32089`.
- I did not edit the candidate, the review index, prior trail files, code or
  policies, and I did not commit or push.

## Next step

Root may commit the seven status docs, the acceptance record and the status-2
request together with this verdict, using explicit pathspecs, and index this
verdict in `reviews/README.md`. Promotion and release remain separate gated
states (A/0/06 and A/0/03 still unfinished).
