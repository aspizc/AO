# Review Submission - Project V5 D/0/07a (Trial 1)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the frozen commits and write the verdict only to:

```text
plan/reviews/PROJECT_V5/D_0_7A-1_result.md
```

The coder has not reviewed its own work. An implementation OK does not imply
integration, promotion, or release.

## Review boundary

This trial implements only the first session-control-port leaf:

- separately injected same-factory capability issuance;
- immutable issuer, port, observation, result, and provider-free error shapes;
- FIFO admission and `BOOTSTRAPPING -> ACTIVE -> REVOKING -> REVOKED ->
  SETTLED` retirement;
- exact 48-byte big-endian `ASP1` request/response framing;
- exact numeric request, response, error, and phase registries;
- exact HMAC-SHA-256 binding tag over decoded lease key, launch digest, decoded
  lease digest, and terminal-nonce digest;
- constant-time tag and digest comparisons;
- a construction-only private `sessionPortOps` fake transport seam; and
- bounded pure request-decoder/response-encoder functions in the existing
  Python helper.

The trial does not add a PTY, terminal write, tmux operation, relay, socket,
adapter/service splice, live provider, Redis, MCP, migration, dependency,
manifest, lockfile, or policy change. The existing helper still starts with
`shell:false`, and the ordinary execution remains the exact seven-key object.

## TDD lineage

### RED

```text
6f75049962146a09b5369994d0aaea21061339a6
tree 889a3af63ee14b14826757fc89bd52177dcb83bc
parent cb323e923d4f5169875cb2660c39cf9af7ba6b4a
test(process-supervisor): define session port codec contract (V5 D/0/07a)
```

This commit changes only:

```text
A tests/gateway/process_supervisor_session_port_codec.test.js
```

The production files in this tests-only commit are byte-identical to integrated
core baseline `a7c09b0`, verified with:

```text
git diff --exit-code a7c09b0 6f75049 -- \
  gateway/src/adapters/process_supervisor.js \
  gateway/src/adapters/process_supervisor_helper.py
```

Result: exit 0, no diff.

The final tests-only blob was archived to an isolated temporary directory and
the exact focused command was run against those unchanged production files:

```text
TAP version 13
# Subtest: separately issues a persistent session port and round-trips one authenticated ASP1 request
not ok 1 - separately issues a persistent session port and round-trips one authenticated ASP1 request
  ---
  duration_ms: 1.855362
  type: 'test'
  location: '/tmp/d007a-red-final.2MPUHb/tests/gateway/process_supervisor_session_port_codec.test.js:648:1'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:
    + actual - expected

    + 'undefined'
    - 'function'

  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 'function'
  actual: 'undefined'
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (file:///tmp/d007a-red-final.2MPUHb/tests/gateway/process_supervisor_session_port_codec.test.js:651:12)
    Test.runInAsyncScope (node:async_hooks:214:14)
    Test.run (node:internal/test_runner/test:1047:25)
    Test.start (node:internal/test_runner/test:944:17)
    startSubtestAfterBootstrap (node:internal/test_runner/harness:296:17)
  ...
# Subtest: round-trips an empty snapshot with exact ASP1 opcodes and immutable capability shapes
ok 2 - round-trips an empty snapshot with exact ASP1 opcodes and immutable capability shapes # SKIP
  ---
  duration_ms: 0.076535
  type: 'test'
  ...
# Subtest: derives the byte-exact HMAC binding tag from launch lease and terminal nonce values
ok 3 - derives the byte-exact HMAC binding tag from launch lease and terminal nonce values # SKIP
  ---
  duration_ms: 0.047011
  type: 'test'
  ...
# Subtest: waits through bootstrap and returns one idempotent capability per execution
ok 4 - waits through bootstrap and returns one idempotent capability per execution # SKIP
  ---
  duration_ms: 0.046326
  type: 'test'
  ...
# Subtest: rejects a pending bootstrap claim when cancellation wins an unresolved channel open
ok 5 - rejects a pending bootstrap claim when cancellation wins an unresolved channel open # SKIP
  ---
  duration_ms: 0.044076
  type: 'test'
  ...
# Subtest: rejects port-enabled persistent output destinations before runtime creation
ok 6 - rejects port-enabled persistent output destinations before runtime creation # SKIP
  ---
  duration_ms: 0.047839
  type: 'test'
  ...
# Subtest: rejects forged copied proxy-wrapped cross-factory and one-shot claims without transport
ok 7 - rejects forged copied proxy-wrapped cross-factory and one-shot claims without transport # SKIP
  ---
  duration_ms: 0.040329
  type: 'test'
  ...
# Subtest: rejects copied forged proxy-wrapped and stale port receivers without transport
ok 8 - rejects copied forged proxy-wrapped and stale port receivers without transport # SKIP
  ---
  duration_ms: 0.038203
  type: 'test'
  ...
# Subtest: validates exact plain claim write and snapshot arguments before transport
ok 9 - validates exact plain claim write and snapshot arguments before transport # SKIP
  ---
  duration_ms: 0.161976
  type: 'test'
  ...
# Subtest: enforces strict prompt Unicode CR and byte limits without consuming a sequence
ok 10 - enforces strict prompt Unicode CR and byte limits without consuming a sequence # SKIP
  ---
  duration_ms: 0.199523
  type: 'test'
  ...
# Subtest: admits concurrent operations in FIFO order with one monotonic sequence
ok 11 - admits concurrent operations in FIFO order with one monotonic sequence # SKIP
  ---
  duration_ms: 0.07471
  type: 'test'
  ...
# Subtest: maps every ASP1 error id to the exact provider-free public error
ok 12 - maps every ASP1 error id to the exact provider-free public error # SKIP
  ---
  duration_ms: 0.039214
  type: 'test'
  ...
# Subtest: maps malformed or unknown write response to WRITE_ABORTED
ok 13 - maps malformed or unknown write response to WRITE_ABORTED # SKIP
  ---
  duration_ms: 0.024389
  type: 'test'
  ...
# Subtest: maps malformed or unknown snapshot response to SNAPSHOT_FAILED
ok 14 - maps malformed or unknown snapshot response to SNAPSHOT_FAILED # SKIP
  ---
  duration_ms: 0.020944
  type: 'test'
  ...
# Subtest: rejects duplicate or out-of-order ASP1 response and revokes
ok 15 - rejects duplicate or out-of-order ASP1 response and revokes # SKIP
  ---
  duration_ms: 0.021407
  type: 'test'
  ...
# Subtest: rejects changed launch lease terminal nonce and tag bytes before operation dispatch
ok 16 - rejects changed launch lease terminal nonce and tag bytes before operation dispatch # SKIP
  ---
  duration_ms: 0.023546
  type: 'test'
  ...
# Subtest: keeps raw prompt and snapshot bytes off lifecycle JSON logs audit errors observation and execution state
ok 17 - keeps raw prompt and snapshot bytes off lifecycle JSON logs audit errors observation and execution state # SKIP
  ---
  duration_ms: 0.019506
  type: 'test'
  ...
# Subtest: helper codec decodes exact WRITE_PROMPT and SNAPSHOT request frames
ok 18 - helper codec decodes exact WRITE_PROMPT and SNAPSHOT request frames # SKIP
  ---
  duration_ms: 0.630981
  type: 'test'
  ...
# Subtest: rejects malformed ASP1 header and payload before terminal access
ok 19 - rejects malformed ASP1 header and payload before terminal access # SKIP
  ---
  duration_ms: 0.049936
  type: 'test'
  ...
# Subtest: rejects unknown ASP1 request opcode before terminal access
ok 20 - rejects unknown ASP1 request opcode before terminal access # SKIP
  ---
  duration_ms: 0.022027
  type: 'test'
  ...
# Subtest: rejects an ASP1 binding-tag mismatch in constant time
ok 21 - rejects an ASP1 binding-tag mismatch in constant time # SKIP
  ---
  duration_ms: 0.018315
  type: 'test'
  ...
# Subtest: rejects duplicate ASP1 request sequence and revokes
ok 22 - rejects duplicate ASP1 request sequence and revokes # SKIP
  ---
  duration_ms: 0.018695
  type: 'test'
  ...
# Subtest: rejects out-of-order ASP1 request sequence and revokes
ok 23 - rejects out-of-order ASP1 request sequence and revokes # SKIP
  ---
  duration_ms: 0.019976
  type: 'test'
  ...
# Subtest: maps an incomplete ASP1 request by closing without a guessed response
ok 24 - maps an incomplete ASP1 request by closing without a guessed response # SKIP
  ---
  duration_ms: 0.017343
  type: 'test'
  ...
1..24
# tests 24
# suites 0
# pass 0
# fail 1
# cancelled 0
# skipped 23
# todo 0
# duration_ms 103.714179
```

The sole RED is the required positive factory/authorized-transaction
assertion: actual `'undefined'`, expected `'function'`. The remaining tests are
present but explicitly skipped on the baseline, so adversarial absence is not
miscounted as independent RED evidence.

### GREEN

```text
61012f2390367209edb65ec90d0fdc5e1010bad3
tree 316aec11e0b5a852fbe0471723d93a3148856b07
parent 6f75049962146a09b5369994d0aaea21061339a6
feat(process-supervisor): add session port issuer codec (V5 D/0/07a)
```

This commit changes only:

```text
M gateway/src/adapters/process_supervisor.js
M gateway/src/adapters/process_supervisor_helper.py
```

## Decisions taken

- `sessionPortOps.open(binding)` is invoked only after both authenticated
  utility readiness and the first valid same-factory persistent claim. It
  returns private binding echoes, the terminal-nonce digest, `exchange(frame)`,
  and `retire()`. None of these values or functions is reachable from the
  supervisor, execution, issuer result, port, observation, prototypes, or
  errors.
- The frozen CORE lifecycle lease digest remains unchanged. The session-port
  binding separately computes the parent contract's exact
  `SHA-256(hexDecode(leaseNonce))` value and uses that decoded digest in the
  HMAC input.
- Port-enabled persistent starts reject caller stdout/stderr destinations
  before process creation. The unchanged `createProcessSupervisor(...)` path
  retains its existing stream behavior.
- Protocol-invalid responses revoke and retire the private channel. A
  dispatched write maps only to `SESSION_PORT_WRITE_ABORTED`; a snapshot maps
  only to `SESSION_PORT_SNAPSHOT_FAILED`.
- Python additions are pure bounded codec functions. They perform no
  descriptor, terminal, process, PTY, relay, or tmux action.

## Changed-path allowlist

The complete implementation candidate from `cb323e9` through `61012f2` is:

```text
M gateway/src/adapters/process_supervisor.js
M gateway/src/adapters/process_supervisor_helper.py
A tests/gateway/process_supervisor_session_port_codec.test.js
```

Numeric pathset:

```text
gateway/src/adapters/process_supervisor.js                   +854 /   -4
gateway/src/adapters/process_supervisor_helper.py            +260 /   -0
tests/gateway/process_supervisor_session_port_codec.test.js +1591 /   -0
```

No other implementation, test, plan, policy, dependency, manifest, lockfile,
schema, migration, adapter, service, catalog, or workflow path is part of the
candidate. This review-request file is committed separately as evidence.

## Provider-data boundary proof

The passing test
`keeps raw prompt and snapshot bytes off lifecycle JSON logs audit errors
observation and execution state` uses distinct raw sentinels:

```text
raw-provider-prompt-secret
raw-provider-snapshot-secret
```

It serializes the scripted lifecycle JSON frames, parsed lifecycle commands,
log fake, audit fake, observation DTO, and ordinary execution state, then
asserts both sentinels are absent. It also asserts that:

- the prompt exists byte-exactly only in the private binary request as
  `raw-provider-prompt-secret\r`;
- the snapshot exists only in the private response and authorized snapshot
  result;
- a validation error contains neither sentinel and has only the fixed
  enumerable `name`, `code`, `message`, and `phase` fields; and
- the ordinary execution still exposes exactly
  `mode,bindingDigest,supervisor,reaper,utilityIdentity,completion,cancel`.

The implementation also zeroes mutable prompt frames, response frames, queued
operation buffers, binding tags, and decoded lease-key buffers at operation
settlement or capability retirement.

## Verifiable local gate

Run from committed candidate `61012f2`:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

Result:

```text
24 tests, 24 passed, 0 failed, 0 skipped
```

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor.test.js
```

Result:

```text
26 tests, 26 passed, 0 failed, 0 skipped
```

```text
git diff --check
```

Result: exit 0, no output.

No full CI, live provider, Redis, MCP, PTY, tmux, relay, or host integration
lane was run or claimed; those are outside this leaf's focused gate.

## Commit summary

- `6f75049962146a09b5369994d0aaea21061339a6` -
  tests-only RED contract.
- `61012f2390367209edb65ec90d0fdc5e1010bad3` -
  GREEN issuer, state machine, codec, tag, and helper seam.
