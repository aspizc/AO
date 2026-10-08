# Review A_0_5-status-1 — KO (status surfaces disagree)

**Task:** plan/PROJECT_V6/A/0/05.md (integration status and live acceptance record)
**Trial:** status-1
**Request:** [A_0_5-status-1_to_review.md](A_0_5-status-1_to_review.md)
**Reviewer:** independent Claude Opus 5.5 (medium) reviewer session. Not the
coder or the root author. No subagents.
**Trace:** `tr-v6-a05-status-r1-1854618b-a8c1-4cea-97f4-febbb4b49520`
**Task id:** `ts-29dc02e0-4b2f-44c4-a0f1-0fc59680bf9f`
**Date:** 2026-10-08

## Summary

The evidence behind the claim holds up:
- The committed-tree gate reproduces from the hash-bound private log.
- The private live run shows two successful automatic asks with correct
  replies, on the same child across a Gateway restart and explicit reattach,
  with unchanged bindings and clean teardown.
- The seven acceptance boxes are supported by the reviewed trail.

The candidate fails one of the request's own checks. Not every public status
surface says five integrated and two unfinished. Two surfaces still say A/0/04
was the last integration and three sheets remain unfinished. The README also
makes an unbounded recovery claim. Both problems are documentation fixes. No
re-run of the gate or the live run is needed.

## Candidate identity

- `HEAD` = `7982e422577ad6dfb37ef0c7b1e3c8433735430a` (tree `bfd9e66d…`). Its
  parents are `fa6da7c` and `097f2e2`. Source code is unchanged, and
  `git status` lists only the 6 modified docs and 2 untracked review files.
- SHA-256 of `git diff HEAD` (6 files, +46/−19) is
  `f4f75b6315c7a2c5b158f4520e943a14b4940296448331d5f740e05866861dea`.
- Worktree blob IDs:

  | File | Blob |
  |---|---|
  | `README.md` | `b50af35` |
  | `docs/project-status.md` | `1b71f9d` |
  | `A/0/05.md` | `715b4d4` |
  | `A/README.md` | `d43ff73` |
  | `PROJECT_V6/README.md` | `610907b` |
  | `SHEETS.md` | `538be9c` |

- Untracked file SHA-256:
  - `A_0_5-integrated-acceptance.md`: `0392963e…dbf73`
  - `A_0_5-status-1_to_review.md`: `057dd9a7…0d1`

## Checks

- [x] **Gate log, reproduced.** The private log has SHA-256 `c7091f1c…d600`,
      which equals the recorded value. I parsed the final JSON aggregate and
      summed the per-suite counts. Both give 3,277 tests: 3,265 passed,
      0 failed, 12 skipped, and `errors: []`.
  - Exactly 0 `not ok` lines.
  - `test.redis-live` passed 22/22.
  - `public.hygiene` found 0 issues.
  - Fixtures report `tmux 3.6a-agents.3`.
  - The 12 skips are 9 PostgreSQL skips in `test.gateway` plus 2
    gateway-integration skips and 1 Temporal skip in `test.langgraph`. All 12
    (suite, id) pairs are in `ci/suites.json` `allowedSkips`, which has exactly
    12 entries, so the run is within the skip budget.
  - `test.real-agents` ran 0 tests.
- [x] **Private live run** (read-only, nothing copied).
  - These hashes equal the acceptance record:
    - `evidence.jsonl`: `fabae1ee…779c`, 88 rows
    - `recovery-cleanup.json`: `608ce0fe…4954`
    - `protected-before.json` and `protected-after.json`: byte-identical, both
      `efe33b21…82b0`
  - Versions are tmux `3.6a-agents.3`, Node v22.22.1 and codex-cli 0.160.1.
    The SQLite reader is 3.51.2.
  - **Two asks.** Both `agent.ask` calls returned non-error results. For each
    challenge, `expected == "ACK:" + reverse(nonce)` and the observed ACK
    equals `expected`. I checked these as booleans only.
    - The first ACK appears in a pre-restart `agent.view` snapshot.
    - The second ACK appears in the post-reattach `agent.ask` and `agent.view`
      snapshots.
  - **Same session.** The two Gateway processes have different PIDs. The
    following stayed constant across all four runtime snapshots:
    - the pane identity, `%0` with the same pid and start token;
    - the Codex process identity;
    - the Codex binary hash.

    `orchestration.reattach` returned the original task ID and session ID,
    with `skippedSessions: []`.
  - **Restart sequence.**
    1. SIGTERM was sent to the first Gateway identity only.
    2. The pane and server survived.
    3. Argument-less discovery listed the trace without claiming it.
    4. The protected `orchestration.view` and `agent.view` calls returned
       `REQUEST_CONTEXT_DENIED` (`context.trace_reattachable`) before
       reattach.
    5. The owner moved from null at revision 3 to the new Gateway at
       revision 4.
  - **Same principal and repository binding.** In all four lineage snapshots,
    these values are identical, and the task/session payload JSON is equal:
    - `principal_id` (`linux-uid:<n>`)
    - `machine_digest`
    - `state_path`
    - `audience`
    - the original `expires_at`, never renewed

    The payload binds one task to repository `sample-apps`, codex/coder,
    `code.read`, and one session to that task.
  - **Cleanup.** `cleanupStatus` is `EXACT_OWNED_IDENTITIES_ABSENT` and
    `guardStatus` is `UNCHANGED`.
  - **Code bound to the run.**
    - The probe's `base_adapter.js` has SHA-256 `bc039cb5…99e7`, the same as
      the candidate's.
    - `diff -rq` shows the probe's whole `gateway/src` and `gateway/migrations`
      are byte-identical to the candidate. The only extra path is a local
      `__pycache__` in the checkout.
- [x] **The seven checkboxes.**
  - RED/GREEN, refusal/no-steal and the migration boxes rest on the A/0/05
    trial 1, 3 and 4 OK verdicts, which close-1 did not re-adjudicate, and on
    the integration-1 reproduced RED and 633/633 focused GREEN.
  - The operator-decision box was already ticked.
  - The boundary box is supported by the sheet scope and the acceptance
    record.
  - The live box is supported by the run above, with versions and identity
    recorded privately under hashes.
  - The full-gate box is supported by the reproduced log.
- [x] **Links.** I checked 161 relative links across the 8 changed or new
      files. None is broken.
- [x] **No promotion or release claim.** Every new status line says the work
      is integrated on the release branch, not promoted or released.
- [x] **Policies and hygiene.**
  - Nothing under `policies/` changed.
  - `scripts/check_public_hygiene.py` exited 0 with 0 findings.
  - `git diff --check` exited 0.
  - The text is in English.
  - The only private reference is the `/tmp/…/run-<id>/` pointer. It follows
    the existing review-trail practice, and no raw nonces, PIDs or transcripts
    were copied.
- [ ] **Five integrated and two unfinished on every public surface.** This
      check fails. See KO 1.
- [ ] **Every supported recovery claim names the boundary.** This check fails
      on one surface. See KO 2.

## KO findings (actionable, next trial)

1. **Two status surfaces still give the old count.**
   - `docs/project-status.md:168-170`, under "Planning and release boundary",
     says "A/0/00, A/0/01, A/0/02 and A/0/04 are reviewed and integrated …
     and the other three sheets remain unfinished". This is in a file the
     candidate edits.
   - `plan/README.md:16-17` says the same.

   Both contradict `SHEETS.md` (`5 integrated + 2 unfinished`), the stage
   README, `PROJECT_V6/README.md` and the root `README.md`. Fix both to name
   A/0/05 as integrated and say two sheets (A/0/06 and A/0/03) remain
   unfinished. Then grep for `three sheets`, `other three` and the old
   four-sheet lists again across `README.md`, `docs/` and `plan/`.
2. **The README states recovery without its boundary.** `README.md:29-32`
   says A/0/05 "explicit recovery of supervised sessions" is integrated, with
   "a real two-ask, restart and reattach check". It does not name Linux local
   stdio/SQLite or the same principal, machine and state binding. Sheet
   acceptance box 3 requires every supported recovery claim to name that
   boundary. `docs/project-status.md` and the acceptance record already do.
   Add the qualifier to the README sentence, or link it to the boundary.

## Non-blocking observations

- The `A/0/05.md` text still says the refinement "does not … claim the
  original acceptance criteria have been achieved". Its Verification section
  still says live acceptance and the full gate are "unrun at this refinement
  stage". These read as historical refinement notes. A one-line "superseded
  by the integrated acceptance" pointer would make the now-ticked boxes
  unambiguous.
- `docs/project-status.md` now says the Codex warning-only draft branch "was
  later observed" live. The private panes show the `⚠ 2 warnings` footer
  during both successful asks, which supports the claim. However, the
  internal draft frame of the ask is not in the evidence, so I confirmed the
  footer state, not the branch taken.

## Limitations

- I did not run `bash scripts/ci.sh`, any test suite, tmux, provider or cleanup
  command. The checks were read-only hash, parse and diff checks.
- The gate log does not record its commit SHA or the process exit code. The
  binding to `7982e42` and "exit 0" are root-attested. Two things are
  consistent with that attestation:
  - the log mtime (15:20) is after the commit time (15:16);
  - `scripts/ci_gate.py` treats an allowlisted `infrastructure_unavailable`
    aggregate as passing.
- The live evidence records operator confirmations ("handling any menus"). It
  cannot prove that no manual Enter was pressed on a challenge prompt, or that
  the only menus were the update skip and the folder trust. That rests on the
  operator.
- The probe source was compared after the run. It is not proof of its content
  during the run, although the adapter mtime is before the run start.
- The live harness is ignored local code that is not under repository review.
  It also left a stale socket file in the run directory, which I did not
  probe.
- The run covers Linux local stdio/SQLite only. The gate did not run live
  PostgreSQL, Temporal or real-agent lanes.
- This verdict grants no promotion, release or tag authority. I did not edit
  the candidate, the index, policies or prior reviews, and I did not commit or
  push.

## Next step

Root corrects KO 1 and 2 in a status-2 trial, with a new request file, and
requests a fresh independent review. The gate and live evidence above can be
reused unchanged if the code tree stays at `7982e42`.
