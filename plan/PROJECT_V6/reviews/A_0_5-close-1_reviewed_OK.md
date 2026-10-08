# Review A_0_5-close-1 — OK (feature-branch closure evidence only)

**Task:** plan/PROJECT_V6/A/0/05.md
**Trial:** close-1 (closure evidence for the trial-4 candidate)
**Branch:** feat/V6-A-0-05-local-recovery
**Commit:** none — candidate is the uncommitted trial-4 tree on `6317df1` (`test(gate): record A05 trial 3 failure (PROJECT_V6 A/0/05)`)
**Reviewer:** Claude reviewer agent (claude-opus-5-5), independent of the coder
**Date:** 2026-10-08

## Summary

The full feature-tree gate and the operator-run live Codex restart/reattach
evidence hold up under independent checking. They meet the two remaining
A/0/05 feature-sheet criteria, the full gate and the operator live check, for
this feature branch with the `.1` runtime. OK applies only to that scope. It is
not integration, promotion or release, and it does not cover A/0/04 automatic
prompt submission.

I did not run any provider, tmux, cleanup or gate command. Every check below
was a read-only hash, parse or static check.

## Checks

- [x] Candidate binding: all 606 files in `v6-a05-cp27-manifest.json` match the
      current tree. The one difference is `reviews/README.md`, which changed
      only to add the trial-4 verdict index row. HEAD is `6317df1481ef…`.
- [x] Wrong-pin RED preserved: `v6-a05-trial4-wrong-pin-gate.txt.gz`
      SHA-256 `a9ecc3b9…2cd4da2ce` and decompressed `7b05f1b2…c3cae` match.
      The raw log has 11 `not ok` lines, as recorded. It stays failed evidence.
- [x] Feature gate: `v6-a05-trial4-correct-feature-gate.txt.gz` SHA-256
      `4091f4e4…5c7cad42` and decompressed `3f979a0b…c275a88` match.
      The final aggregate is 2,825 tests: 2,813 passed, 0 failed, 12 skipped.
      There are 0 `not ok` lines. Fixtures report `tmux 3.6a-agents.1` and never `.3`.
      `test.redis-live` passed 22/22. `public.hygiene` found 0 issues and
      `policy.registry` passed. The 12 skips are 9 PostgreSQL skips in
      `test.gateway`, each in `ci/suites.json` `allowedSkips`, plus 3
      gateway-integration/Temporal skips in `test.langgraph`. All are
      classified `infrastructure_unavailable`, so they are within the budget.
      The optional `test.real-agents` lane did not run.
- [x] Private live run `workspace/a05-live-acceptance/run-56bff9322b95/` is
      git-ignored (`.gitignore:62`). These hashes match the acceptance record:
      `recovery-cleanup.json` `e6e617c0…4e13`, `evidence.jsonl`
      `572af2fc…9000` and `operator-interventions.jsonl` `957f7e9e…4bbe`.
      `protected-before.json` and `protected-after.json` are byte-identical,
      both `6676ae56…4691`.
- [x] Live sequence, checked in `evidence.jsonl` (149 rows):
  - Versions are tmux `3.6a-agents.1`, Node v22.22.1 and codex-cli 0.160.1.
    The selection is `gpt-6.1-sol`/medium/priority. The real Codex binary
    hash `f34a4d23…` was checked at 4 runtime points.
  - `orchestration.create`, `task.assign` and `agent.spawn` ran on Gateway PID
    1791427. The first nonce `238388f5…d218` was answered with
    `ACK:812df77b…3832`, which I checked is the correct reversal. The answer
    was seen through `agent.view`.
  - `restart-signal` sent SIGTERM to the exact Gateway identity only. The
    pane (pid 1791463), the tmux server and the Codex process (pid 1791606,
    the same start token in all four runtime checks) survived. The second
    Gateway is PID 1797319, with the same UID, machine digest and state path.
  - Discovery: the argument-less `orchestration.view` listed only the trace and
    did not claim it. The owner stayed null at revision 3. Protected
    `orchestration.view` and `agent.view` returned `REQUEST_CONTEXT_DENIED`,
    and stderr logged `context.trace_reattachable`.
  - The explicit `orchestration.reattach` returned
    `reattachedTaskIds:[ts-e7c95234…]` and
    `reattachedSessionIds:[a05-live-tr-a05-live-c5d8ddb1-c6b-codex-coder]`,
    with `skippedSessions:[]`. These are the original IDs. The owner moved
    to PID 1797319 at revision 4. `expires_at 2026-10-09T10:41:40.586Z`
    did not change across revisions 2, 3 and 4.
  - After reattach, `agent.ask` sent the second nonce `2217b29a…1cdf`, and
    `agent.view` showed `ACK:fdc1bb94…7122`, the correct reversal. The final
    pane observation of the same `%0` contains the same ACK.
  - Cleanup ended at `EXACT_OWNED_IDENTITIES_ABSENT` and the guard was
    `UNCHANGED`.
- [x] Interventions: the operator sent exactly 2 Enter keys, each scoped to the
      private pane `%0`, with no permission choice. The ready-after
      confirmation was also recorded through `session.intervention_note`.
      I accept this as a supervised feature-branch limitation. It is not
      evidence of automatic submission.
- [x] Static checks I ran myself: `python3 scripts/ci_gate.py --validate-only`
      exited 0. `scripts/check_public_hygiene.py` found 0 issues.
      `git diff --check`, excluding review evidence, exited 0. Nothing under
      `policies/` changed. Nothing was pushed, committed or tagged.

## Acceptance-criteria mapping (feature scope)

- Operator-run live check: met on this feature branch. A real Codex child
  survived a Gateway restart on the same account, machine and state. It was
  explicitly reattached to the same task and session, and ask/view reached the
  same tmux pane. The transcript and the identity, backend, provider and
  runtime versions are recorded privately with bound hashes. The two manual
  Enters are covered under residual limit 1.
- Full gate `bash scripts/ci.sh` green with skips within budget: met for the
  feature tree with the `.1` runtime.
- The earlier criteria (RED/GREEN, migrations, refusal and no-steal) rest on
  the trial 1–4 candidate-scope verdicts. This review did not re-adjudicate them.

## Residual limits (must stay visible)

1. Prompt submission is not automatic here. This branch predates A/0/04, so
   `agent.ask` left the prompt as a draft and the operator pressed Enter. The
   integrated tree must repeat the live run with tmux `.3` and no manual Enter.
2. No commit exists. The candidate is an uncommitted working tree, so no
   integrated, promoted or released claim can name a SHA yet. Root owns the
   commit, A/0/04 reconciliation, the integrated `.3` gate and any 1.1.0
   release proof.
3. Supported recovery covers Linux local stdio with SQLite only. The gate did
   not run live PostgreSQL, Temporal or gateway-integration, or the optional
   real-agent lane.
4. The live harness itself is ignored local code, and the first run failed on
   its case-sensitive banner check. That is a harness defect, not a product
   defect. The harness is not covered by repository review.
5. A stale socket file `tmux.sock` remains in the private run directory. The
   cleanup record reports all owned identities absent. I did not probe the
   socket because I was told to run no cleanup or tmux commands.
6. The sheet's status and acceptance checkboxes are still unticked. Updating
   them is a root or plan action, and this verdict does not perform it.

## Next step

- Root commits the reviewed candidate with explicit pathspecs, then
  reconciles it with A/0/04. On the integrated tree, root reruns
  `bash scripts/ci.sh` with tmux `.3` and repeats the live restart/reattach
  run with no manual Enter. Only then may A/0/05 be called integrated.
