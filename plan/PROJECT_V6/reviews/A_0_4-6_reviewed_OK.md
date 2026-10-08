# A/0/04 implementation trial 6 — independent review verdict

Review task: `ts-25018ff6-3497-456e-b143-71540a37fb19`.
Handoff: [A_0_4-6_to_review.md](A_0_4-6_to_review.md), HEAD `f4c70f7`,
branch `feat/V6-A-0-04-safe-submit`.
Reviewer: Claude reviewer session, separate from the coder. No candidate
file, test, policy, prior review or manifest was edited. No provider or
corporate account was used. Nothing was staged, committed or pushed.
No subagents were used. Any earlier interrupted subagent output is void
and is not used here. Every result below comes from this session's own
commands.

## Candidate identity

- `sha256sum evidence/A_0_4-trial6-candidate-files.json` gives
  `5073269f…efbcc5`, which matches the handoff.
- All 73 bound paths match on disk, with 0 mismatches. The `null` entry
  `tmux-3.6a-agents.1.patch` is absent.
- Compared with the trial-4 manifest, the key set is identical. The only
  changed value is `tests/gateway/fixtures/claude_2_1_292_composer.json`:
  `62a599ba…4a2d` became `7a638924…0e18`.
- The only dirty paths outside the manifest are this trial's
  `A_0_4-6_to_review.md` and the trial-6 manifest itself.

## Covered in this trial

1. **F2 — framing and PID isolation, controls and mutation proof: PASS.**
   - In `cmd-agents-submit.c` (`.3` patch), each predicate is a separate
     refusal term. These include `pane_pid != wp->pid` and
     `!(wp->screen->mode & MODE_BRACKETPASTE)`. The command consumes the
     evidence buffer before any check.
   - The `guarded_submit.test.js:95-119` tests isolate one predicate each:
     - Each test builds fresh evidence after the mode change or respawn.
     - The PID test asserts that only the PID changed.
     - Each refusal is followed by a positive `success()` control in the
       same flow.
     - Each test runs in a `first` variant and a `retry` variant, where
       `retry` means after one prior successful CR.
   - The mutation proof was reproduced:
     - The source baseline extracted from the `.3` patch hashes to
       `789491bc…98`, which matches the proof JSON.
     - Each mutant source differs from the baseline by exactly the stated
       one-line replacement.
     - The mutant source hashes (`92d237b9…`, `f35bbbd6…`) match the proof
       JSON. So do the mutant binary hashes (`69f2661c…`, `b64ea6ba…`)
       and the candidate binary hash (`6487f795…`).
   - The tests were rerun this session:
     - The PID mutant fails 2/2 on `refusal delivers zero CR`.
     - The framing mutant fails 2/2 on the same assertion.
     - The candidate binary passes `guarded_submit.test.js` with 11/11 pass,
       0 fail and 0 skipped.
   - Mode-file publication is atomic: the test writes `mode-next`, then
     `renameSync`s it over `mode` (`guarded_submit.test.js:30-31`). The
     fixture only ever reads `mode` whole. Initial files are written before
     the pane spawns.
2. **F3 — wording, workflow and handshake: PASS** (source and docs).
   - **Vendor README.** Its `-G` refusal list matches the
     `cmd-paste-buffer.c` hunk. Its `agents-submit-v1` description matches
     the C source:
     - UUIDv4 name check;
     - grid, PID, size and cursor checks;
     - unparsed or `FIONREAD` pending output refuses;
     - the CR is written directly with `bufferevent_write`;
     - fixed refusal text.
     The claim that the capture extension is unchanged also holds: the
     manifest's `extensionSource` SHA is unchanged and the file is not in
     the diff.
   - **`gateway/README.md`.** Its claims match `base_adapter.js:158-292`:
     - `capability()` probes for exact `3.6a-agents.3`, `agents-submit-v1`
       and `paste-buffer [-G]` before any buffer is created, and refuses
       with `paste_unavailable`;
     - the default delay is 150 ms, bounded to 1000 ms (`config.js:202`);
     - the ask delay is 1500 ms, at most two attempts, and the prompt is
       never replayed;
     - nondiagnostic failures become `acceptance_uncertain`;
     - `concurrent_ask`;
     - single-line launch with a separate Enter.
   - **`docs/tmux-runtime.md`.** Its claims map to the six
     `guarded_paste.test.js` tests, which give 6/6 pass on the candidate
     binary.
   - **Workflow and inventory.**
     - `ci.yml` parses as YAML (`.venv` PyYAML), and its only change links
       the `.3` binary.
     - `ci/suites.json` is valid JSON.
     - The inventory content is **not** gate-ready; see Gate readiness
       below.
   - **Handshake and error codes.**
     - The complete diff of `process_supervisor_helper.py` is one line:
       `3.6a-agents.1` became `3.6a-agents.3`.
     - No handshake field or error code changed.
     - The relay tests assert the `.3` version strings and the patch's
       7 diffs / 12 hunks, and both counts match the patch.
     - `process_supervisor_session_port_relay.test.js` gives 61 pass,
       1 skipped. The skip is the env-gated real probe.
     - The real probe was then run with `D007C_RUN_REAL_TMUX_PROBE=1` and
       the `.3` binary on `PATH`: 1/1 pass.
3. **RED logs and `.3` binary provenance: PASS.**
   - The RED logs fail on behaviour assertions, not on setup errors:
     - `f1-build5-runtime-red-host` shows 7 fail and 1 pass; the upstream
       fan-out control passes.
     - `f1-build5-adapter-red-host` shows 5/5 fail.
     - `trial3-f1-red-host` shows the three cleanup and post-CR cases
       failing on `not confirmed`.
     - `trial4-red(-final)-host` shows 2 of 6 failing; those are the
       cleanup-failure cases, and the other 4 are passing controls.
     - The trial-3 F2 RED `-final` logs differ from the earlier RED logs
       only by a 2-line location shift, which comes from the atomic-publish
       edit.
   - Observation: `trial3-f1-red.log` and `trial4-red.log` (the in-container
     runs) show only a file-level failure. The detail is in the `-host`
     variants.
   - Provenance was checked by rebuilding the binary:
     - The command was `build-offline.sh` with the pinned archive
       (`b6d8d9c7…3759`, verified) and the pinned image (present; no pull,
       `--network none`).
     - It printed `OK` for the archive, patch and extension digests.
     - `patch --fuzz=0` applied cleanly, with no fuzz or offset lines.
     - The result is `tmux 3.6a-agents.3` with SHA-256 `6487f795…c386`.
       That is **bit-identical** to `/tmp/ao-a04-f1-impl/build2/…`, the
       binary used for all GREEN and mutation runs.
     - Patch SHA `e8139a40…955d` equals `manifest.json` and the builder
       constant.
4. **Fixture hygiene: PASS.**
   - `claude_2_1_292_composer.json` contains no `/home/`, `/Users/`,
     username or `/tmp/` path.
   - `binarySha256` and the anchors are retained.
   - The test reads only `pointer`, `separator`, `placeholder`, `width`,
     `height`, `idleFooter` and `busyFooter`. The removed path field was
     never consumed, so no assertion was weakened.
   - `node --test tests/gateway/prompt_submission.test.js` gives 54/54 pass,
     0 fail and 0 skipped.
   - Bound: the hash and anchors are documentary only. No test checks them.

Trials 4–6 together cover every source-review surface listed for trial 5's
"Not examined" items.

## Gate readiness (not source; root-owned and disclosed open)

The CI inventory is **stale**. The `test.gateway` `inventorySha256` in
`ci/suites.json` (`e811a7f9…`) equals the digest of the current inventory
*without* `guarded_submit.test.js` and `prompt_submission_capture.test.js`.
Both of those files are in the candidate manifest.

- `scripts/ci_gate.py` `validate_manifest` reports:
  `test.gateway: stale inventorySha256; expected sha256:404c273b299560d51ef72aa6d1278ecd84397aa37576a99c28d7750f720ce638`.
- `.venv/bin/python -m pytest tests/structure/test_ci_suite_manifest.py`
  gives 1 failed, 78 passed. The failure is
  `test_repository_manifest_is_authoritative_and_complete`.
- The gate will be red until root refreshes this value. The likely command
  is `python3 scripts/ci_gate.py --refresh-inventory`, then a re-run of the
  manifest validation.

This is part of the CI inventory item the handoff already lists as open. It
blocks gate readiness and integration. It is not a defect in the reviewed
source.

## Still open regardless of this verdict

- the stale CI inventory above, and the CI inventory item in general;
- the root solo full gate (not run here);
- the three pending-output scenarios (SOURCE-REVIEWED / NOT EXECUTED); no
  provider-decision atomicity is claimed;
- positive Antigravity evidence;
- live provider markers, versions and timing;
- native Darwin (only the Linux build was reproduced);
- sheet closure.

The `gateway/README.md` sentence "independent source review is pending" will
need a wording update once the open items close. That is non-blocking.

## Verdict

**OK — source review only.**

- All four assigned trial-6 areas pass. Combined with trials 4–5, this
  closes the source-review portion of A/0/04.
- **The candidate is not gate-ready** because of the stale
  `inventorySha256`.
- This verdict is not implementation completeness, integration, promotion or
  release evidence, and it does not close A/0/04.
