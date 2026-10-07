# A/0/04 implementation trial 4 — independent review verdict

Review task: `ts-7b2d6781-c3d3-4bda-b457-dec8b4b65095`.
Handoff: [A_0_4-4_to_review.md](A_0_4-4_to_review.md), HEAD `03d7f45`.
The reviewer is a separate session from the coder. No candidate file was
edited. No provider was used, nothing was committed or pushed.

## Verified

- Manifest `evidence/A_0_4-trial4-candidate-files.json` has SHA-256
  `c841c54e9675b4a3881bddc3fbe00f844f89fc28edb5d08178544db78670f7c0`, which
  matches the handoff. All 73 bound paths match on disk. The `null` entry
  `gateway/vendor/tmux-agents/tmux-3.6a-agents.1.patch` is absent.
  The only dirty paths outside the manifest are the handoff and the manifest
  itself, which are excluded by design.
- Trial-3 F1 is fixed in `gateway/src/adapters/base_adapter.js`, in the
  `submitPrompt` catch block. An in-flight `acceptance_uncertain` now sets
  `delivered = true` before `finally` runs. Cleanup failure therefore maps to
  `acceptance_uncertain`, not `transport_failed`. On attempt 0, the fixed
  refusal still raises `unknown_state` with `delivered` false, so a cleanup
  failure there stays pre-delivery `transport_failed`.
- `node --test tests/gateway/prompt_submission.test.js`: 54 passed, 0 failed,
  0 skipped.
- Mutation check on a scratch copy outside the tree: deleting the single fix
  line makes 3 tests fail. They are
  `first_submit_status2_cleanup_failure_preserves_uncertainty_and_one_cr`,
  `first_submit_throws_cleanup_failure_preserves_uncertainty_and_one_cr` and
  `submit_fixed_refusal_maps_first_and_retry_public_envelopes`. The new
  regressions encode the intended behaviour.

## Findings

No new P1 was found in the examined scope.

## Not examined (budget limit reached; no credit either way)

The review stopped at the 20k-token per-task budget (AGENTS.md Rule 6).
These areas are still unreviewed:

- All of the trial-3 "Not examined" list:
  - the F2 framing/PID isolation logic and the
    `A_0_4-trial3-mutation-proof.json` mutant reproduction;
  - the rename-based mode-file publication race fix;
  - the F3 documentation wording;
  - byte identity of `cmd-send-keys.c`/`cmd-paste-buffer.c` from `.2` to
    `.3`;
  - the content of the `.1` deletion and the `.2` evidence SHA record;
  - the Claude and opencode adapter diffs;
  - `tool_error_serialization` and catalog projection;
  - `docs/tmux-runtime.md` and the vendor README;
  - a company/personal content scan of new public files.
- Reruns of the six-file scoped GREEN (claimed 83/83), the host RED logs and
  lint. Gzip evidence was checked only by manifest hash.

Still open regardless: the trial-1 F4 positive Antigravity profile, live
provider acceptance/version/timing, native Darwin, the root full gate and
inventory, and sheet closure.

## Verdict

**KO (bounded).** The trial-3 F1 correction is accepted on the evidence
above. The candidate as a whole cannot receive OK because the inherited
"Not examined" areas are still unreviewed. A fresh reviewer session, with
a new trace, must cover that list. If those areas pass, no code change is
required. This verdict is not integration, promotion or release evidence.
