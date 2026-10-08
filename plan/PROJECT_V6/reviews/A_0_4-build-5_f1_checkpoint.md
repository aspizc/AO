# A/0/04 F1 implementation — bounded coder checkpoint 5

2026-10-08. Uncommitted implementation candidate; no independent verdict,
review request, sheet closure, integration, promotion or release is claimed.
This is the requested bounded-task checkpoint; exact harness token usage is
not exposed to this coder. Continue under a fresh bounded task if required.

## Assignment and scope

- Task `ts-5cf58ff7-0f4a-4eda-9268-4ca2b877632c`, trace
  `tr-tr-a04-f1-impl-91cd9dfe-7074-4fcc-834e-c72a123517a9`.
  Read assigned TASK_CREATED brief from the local audit log (stored brief is
  truncated to 500 characters), the operator prompt, AGENTS.md, orchestration
  profile, plan/stage/sheet, transport contract, trial-1 KO, correction
  checkpoint, trial-6 request/verdict and owning source/callers/utilities.
- Authorization: operator's explicit F1 implementation instruction and CP3
  trial-6 plan OK committed at current HEAD
  `50daaadc270a38428ec59facf2e5007f1d5afdbd`.
- Contract SHA-256 `4fc93db0fdb96662ae5d5e6f380e07539818099bd1e4d35038593d070859e4e1`.
- No subagents, self-review verdict, policy changes, provider inference or
  provider launches, staging, commit, push, serving Gateway restart or user
  tmux server changes. Native fixtures use owned foreground private servers
  and assert pane/server retirement and reaping.

## Implemented candidate

The active `.3` patch adds `cmd-agents-submit.c`, its command table/build
registration, and `agents-submit-v1`. Existing server-owned evidence is copied
and consumed at exec entry. The command checks UUIDv4 buffer naming, exact
canonical pane target, bounded numeric metadata, server/pane PID, dimensions,
cursor, pane liveness/event/input/modes/synchronization/bracketed framing,
visible grid bytes with one LF per row, unparsed input and FIONREAD. It writes
one CR directly to the target event, bypassing ordinary key/sibling dispatch.
All exec refusals emit the fixed diagnostic with status 1. Parser/target
resolution failures still require adapter cleanup.

The shared helper probes exact `.3` and both command usages anew before its
first buffer. All operation commands use the same injected tmux invocation
path. Observations capture metadata before classification, server-owned
`capture-pane -b ... -N -T` evidence, and raw `save-buffer` bytes with fatal
UTF-8 decoding. First submit and the single retry use fresh owned evidence.
Exact command refusals map first/retry to unknown_state/acceptance_uncertain;
spawn/signal/other failures are uncertain and never replayed. Successful
transport still requires positive provider acceptance. Cleanup attempts every
owned buffer and tolerates only status 1 with the exact upstream
`unknown buffer: <owned-name>` diagnostic. Other cleanup errors surface.
Launch-command literal text plus ordinary Enter remains separate.

Pins updated from `.2` to `.3`: manifest, both offline builders, vendor README,
workflow binary name, retained supervisor handshake, retained exact-version
fixtures/tests, runtime docs and Gateway README. Shared CI inventory was not
changed by this coder; root must reconcile the new test path. The submit source
is embedded in the single active patch; retained capture remains separately
hash-pinned. No new manifest schema or package dependencies were added.

## RED and GREEN evidence

Native `.2` RED, before runtime/source edits:

```bash
A04_TEST_TMUX=/tmp/ao-a04-runtime-build-vl_1pgz1/bin/tmux \
node --test tests/gateway/guarded_submit.test.js
```

Exit 1: **8 tests, 1 passed, 7 failed, 0 skipped**. Seven named guard regressions
fail at missing `agents-submit-v1` or expected fixed refusal; zero bytes from an
unknown command are not credited as a working guard. The preservation test
`ordinary_send_keys_preserves_upstream_sibling_fanout` passes as expected.
Named new regressions: changed grid, cursor/dimension/mode/input/sync/framing
state, respawned PID, changed evidence bytes, success/refusal consumption,
reused/missing evidence, and target-only CR with sibling sync option.
The first/refusal matrix RED stops at its first failure per test; GREEN
executes the complete first/retry matrix. Cursor/dimensions/server metadata
cases change expected arguments while keeping the captured grid, providing
isolated equality-predicate checks; mode/input/sync/framing change pane state.

Adapter RED, before production helper edits:

```bash
node --test --test-name-pattern='dot2_runtime|capability_probe|submit_nondiagnostic|submit_fixed|submit_evidence' \
  tests/gateway/prompt_submission.test.js
```

Exit 1: **5 tests, 0 passed, 5 failed, 0 skipped**. These cover `.2` before
paste, missing command capability, nondiagnostic uncertainty/no retry, emitted
first/retry public error envelopes, and raw owned evidence/cleanup. Additional
strict-ASCII, invalid UTF-8 and cleanup-failure tests were added afterward as
regressions, without a separate pre-change RED claim.

Fresh offline builder:

```bash
gateway/vendor/tmux-agents/build-offline.sh \
  /tmp/ao-a04-runtime-build-vl_1pgz1/tmux-3.6a.tar.gz \
  /tmp/ao-a04-f1-impl/build2
```

Exit 0, pinned network-disabled container, hash validation and zero-fuzz patch,
parser unchanged, exact `tmux 3.6a-agents.3`. No system installation.
Initial build in `build/` failed on an incorrect paste-buffer C API call;
corrected to `paste_buffer_data(pb, &len)` before the successful fresh build.

Final combined focused command, host, exit 0:

```bash
PATH=/tmp/ao-a04-f1-impl/build2/bin:$PATH \
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux \
node --test \
  tests/gateway/guarded_submit.test.js \
  tests/gateway/guarded_paste.test.js \
  tests/gateway/prompt_submission_capture.test.js \
  tests/gateway/prompt_submission.test.js \
  tests/gateway/tmux_client.test.js \
  tests/gateway/codex_supervised.test.js \
  tests/gateway/antigravity_adapter.test.js \
  tests/gateway/base_adapter.test.js \
  tests/gateway/claude_adapter.test.js \
  tests/gateway/codex_adapter.test.js \
  tests/gateway/pi_opencode_adapters.test.js \
  tests/gateway/tool_error_serialization.test.js \
  tests/gateway/tool_projection_contract.test.js \
  tests/gateway/tool_catalog.test.js
```

**151 passed, 0 failed/cancelled/skipped/todo**. Runtime guards assert real
target/sibling bytes; success emits exactly one CR, refusal adds none. The
F2 captured spaces/blank multiline cases assert exact framed payload plus one
CR; F3 history/draft/menu cases are retained. The earlier combined run was
67 passed/1 failed due to the cleanup diagnostic mismatch, corrected and
retained in scratch; it is not reported as GREEN. Host scoped ESLint is now
exit 0, empty output. Initial host lint's no-unsafe-finally failure was corrected
by a cleanup helper, whose error still propagates after all deletions.

Retained-control command, host, exit 0:

```bash
D007C_TEST_TMUX_PATH=/tmp/ao-a04-f1-impl/build2/bin \
D007C_RUN_REAL_TMUX_PROBE=1 node --test \
  tests/gateway/process_supervisor_session_port_relay.test.js
```

**62 passed, 0 failed/cancelled/skipped/todo**. `git diff --check`: exit 0.
Sandbox socket/stream/Docker failures were rerun on host under execution
approval; sandbox runner failures are not counted as behavioral RED evidence.

## Preservation and candidate identity

- `.3` binary SHA-256:
  `6487f795314828f9952cc5ee6fc83c6028beb54bdee28d42dc7c1329246ec386`.
- Active `.3` patch SHA-256:
  `e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d`.
- Exact historical `.2` patch preserved at
  `evidence/A_0_4-trial1-tmux-3.6a-agents.2.patch` plus adjacent SHA record:
  `c488dccadb08db45c00d7a935f9cfd00735d744d0a68286ef683869e152a74c2`.
  The `.2` binary is still in its prior volatile output directory; recorded
  historical SHA `3d37a94099286f1284373271ed7da3dac69e04fb1dba88bdb6068cfb66ed1428`.
- Comparing freshly applied preserved `.2` against `.3` source proves
  `cmd-send-keys.c` and guarded `cmd-paste-buffer.c` byte-identical. Hashes are
  `0d50b4e75fe1c30b4f02e65259c7d309294b1470717b7fa7f9c3118095170a69`
  and `c1b8bdd687cc7a4d0efee33dc831fdce6a746ae9f316c8fa33ee1b9969146af4`.
- Retained `cmd-agents-capture.c` unchanged:
  `4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2`.
- Baseline dirty copies are `/tmp/ao-a04-f1-impl/baseline/`. Twenty preexisting
  dirty/new entries are byte-identical. F2/F3 classifier functions are unchanged;
  their test stub changed only for the new metadata/capture/submit protocol.
  The F2 native capture test now counts guarded-submit commands instead of
  ordinary send-keys. F5 owned-server/terminal fixtures remain byte-identical.
  Root README, CI inventory, adapters, config, public catalog/error projection
  and original review trail are untouched by this task.
- Durable logs, baseline comparison and source proof use prefix
  `evidence/A_0_4-f1-build5-`. Candidate hash manifest
  `evidence/A_0_4-f1-build5-candidate-files.json` SHA-256:
  `554d5370cf01cdb4dad2d3a50b39a5554233f11b88c25d6a927069c3200a72e2`.
  This checkpoint itself was written after that manifest. No candidate commit
  or independent verdict exists.

## Explicit execution limits and continuation

The following CP3 named cases are **NOT EXECUTED**, without skipped-test or
fixture-pass credit:

- `guarded_submit_refuses_pending_output` (FIONREAD error/nonzero paths).
- `guarded_submit_ignores_parsed_bytes_pending_control_client_delivery`.
- `guarded_submit_refuses_unparsed_pane_input`.

Their source predicates are implemented: `window_pane_get_new_data(wp,
&wp->offset, &unparsed)` tests unparsed bytes, not total retained evbuffer size;
FIONREAD must succeed and return zero. Pinned source inspection establishes
that the normal pane-read callback parses new data before command dispatch;
there is no deterministic injection hook in this candidate. Independent
SOURCE-REVIEWED disposition is pending the separately assigned reviewer;
this coder issues no independent source-review verdict. The provider may
change internal state without emitting output even after the last check.
Terminal atomicity is not provider-internal decision atomicity.

All required live-provider acceptance/version/timing checks, F4 positive
Antigravity evidence, native Darwin builds, and root's solo full gate with
Redis 7 and unchanged skip budgets remain **NOT RUN / OPEN**. Historical
failed full-gate evidence is not superseded by focused GREEN. Root must
reconcile CI test inventory for `guarded_submit.test.js`, obtain live evidence,
and assign independent review of this uncommitted combined candidate. No
review index, shared inventory, CHANGELOG or sheet-status edit was made here.
