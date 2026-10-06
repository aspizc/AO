# Review Submission — Project V5 D/0/01 CORE (Trial 2)

## Requested reviewer

- Model profile: **GPT-5.6 Sol**
- Reasoning profile: **ultra**
- Service profile: **Priority/Fast**
- Review mode: independent, evidence-based review of the frozen technical
  commit below; no implementation changes

## What was corrected

- Replaced the output `pipe()` settlement with an explicit backpressured
  transfer which:
  - treats source error/close and destination error/close as terminal;
  - locks `PROCESS_STREAM_FAILED` once;
  - automatically starts authenticated cleanup;
  - aborts and drains sibling/local sources without ending or destroying a
    caller-owned destination; and
  - rejects public completion only after output abort, transcript terminal, and
    supervisor exit confirm cleanup.
- Kept the one-shot absolute deadline armed through output write callbacks and
  public settlement. A deadline can now abort a stuck local transfer and return
  `timed_out` even after the utility/helper has exited.
- Added first-observed-wins settlement across stream failure, cancel, deadline,
  transcript failure, control failure, and helper terminal reasons. A normal
  `exited` transcript remains provisional until output completes.
- Closed the control framing contract:
  - caller and helper both use `MAX_CONTROL_BYTES = 1024 * 1024`;
  - a complete UTF-8 JSON-line frame reaching or exceeding that bound is
    invalid;
  - argv/runtime-argv counts, environment counts, individual encoded
    arguments/keys/values, paths, session IDs, and aggregate runtime/launch
    frames have deterministic pre-spawn limits; and
  - the 1.1 MiB and aggregate multibyte fixtures create zero supervisor
    processes.
- Added a serialized whole-frame control writer which waits for write callback
  and `drain`, contains synchronous/asynchronous failures and callback `EPIPE`,
  closes the owned stdin channel, and activates only the authenticated
  PID/start-token/PGID/SID fallback after readiness.
- Made transcript error/end/close a single idempotent terminal transition.
  Error-plus-close, close-before-error, partial final JSON, duplicate close,
  and child-exit ordering no longer wait for an impossible `end`.
- Reconciled the task-owned ADR with framing, failure precedence, output
  ownership, deadline, and three-gate settlement semantics.

The S/R/U topology, configured-runtime-only launch, direct `execve`, Linux
subreaper, exact fallback identity, Darwin limitation, FIFO exclusion, and
provider-data-free errors remain unchanged.

## TDD evidence

### RED

Initial Trial 2 reviewer regressions:

`node --test --test-concurrency=1
--test-name-pattern='encoded launch limits|stream source|deadline remains|transcript error'
tests/gateway/process_supervisor.test.js`

- **0 passed / 4 failed**
- oversized input: `Missing expected rejection`
- persistent sink failure: completion observed as `timeout`
- post-exit delayed sink callback: completion observed as `timeout`
- transcript error/close plus child exit: completion observed as `timeout`

Additional runtime-plan aggregate bound:

`node --test --test-concurrency=1
--test-name-pattern='encoded launch limits'
tests/gateway/process_supervisor.test.js`

- **0 passed / 1 failed**
- aggregate runtime environment was accepted and reached `spawn`

### GREEN

Focused reviewer regressions:

`node --test --test-concurrency=1
--test-name-pattern='encoded launch limits|stream source|deadline remains|transcript error'
tests/gateway/process_supervisor.test.js`

- **4 passed / 0 failed**

Live persistent stream cleanup and output-deadline slice:

`PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3
node --test --test-concurrency=1
--test-name-pattern='persistent (sink-error|sink-close|source-error)|one-shot deadline includes'
tests/gateway/process_supervisor_live.test.js`

- **4 passed / 0 failed**
- each persistent probe registered S/R/U identities and used an exact
  `t.after` cancellation fallback
- all exact S/R/U identities were absent before each probe completed

Final focal pass 1:

`PROCESS_SUPERVISOR_TEST_PYTHON=/home/carase/miniconda3/bin/python3
node --test --test-concurrency=1
tests/gateway/process_supervisor.test.js
tests/gateway/process_supervisor_darwin.test.js
tests/gateway/process_supervisor_live.test.js`

- **30 passed / 0 failed / 0 skipped**
- exact task process inventory: **0**
- exact `/tmp/agents-process-supervisor-*` inventory: **0**

Final focal pass 2: same command and result:

- **30 passed / 0 failed / 0 skipped**
- exact task process inventory: **0**
- exact `/tmp/agents-process-supervisor-*` inventory: **0**

## Other verification

- Directed ESLint over the supervisor and all dedicated JavaScript
  tests/fixtures — passed.
- Python source compilation with `compile()` and no bytecode writes over the
  helper and caller harness — **2 passed**.
- Ruff over the helper and caller harness — passed.
- `pytest -q tests/structure/test_project_layout.py
  tests/structure/test_node_runtime_contract.py` — **16 passed**.
- `git diff --check` — passed.
- Exact binary technical diff piped to
  `gitleaks detect --pipe --redact --no-banner` — no leaks found.
- No aggregate Gateway suite, `scripts/ci.sh`, MCP, Redis, KYA, tmux, live
  provider, agent, network service, integration, or promotion was run.

## Incidents and cleanup

- No live probe or test left a task-owned PID or temporary directory.
- No manual signal, fallback intervention, pattern kill, broad group signal,
  or external cleanup was required.
- The one interim live test failure was a test-only double invocation of its
  delayed writable callback. It created no process/tmp residue and was
  corrected by a once-only callback release helper before the final runs.

## Frozen identity and scope

- Trial 2 base/result-only KO:
  `60f7060d072f51d5648dbb59452dcb204168bdab`
- Trial 1 technical commit:
  `2fa9311e5ba68f608727b21639fe9e8c1d965ff0`
- Trial 1 request-only commit:
  `96939231e2ed6059915d3dab597cbc5427608ad9`
- Trial 2 technical commit:
  `c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
- Trial 2 technical tree:
  `9a177059fc0cb156d60b8193f451ddfd06c746cc`
- Trial 2 technical range:
  `60f7060d072f51d5648dbb59452dcb204168bdab..c3ad8d98852198b1afe1538fb30d6850c68b5ac7`
- Parentage: the Trial 2 technical commit is a direct child of the exact Trial
  1 result-only KO.
- Range size: **6 files / 1,122 insertions / 149 deletions**
- Branch: `feat/V5-D-0-01-core`

The technical range modifies only the task-owned process supervisor, helper,
dedicated tests/fixture, and ADR. It does not modify the D sheet, shared
indexes/manifests/CI, `agent_service`, provider adapters, profiles, policies,
catalogs, packages/locks, lifecycle composition, tmux, MCP, Redis, KYA,
coordination/message streams, or shared documentation.

## Commit

- `c3ad8d98852198b1afe1538fb30d6850c68b5ac7` —
  `V5 D/0/01 CORE Trial 2`

Independent review is requested. This submission makes no OK, splice,
integration, promotion, native-macOS, or release claim.
