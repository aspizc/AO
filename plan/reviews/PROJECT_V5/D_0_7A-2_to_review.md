# Review Submission - Project V5 D/0/07a (Trial 2)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the frozen commits below and write the verdict only to:

```text
plan/reviews/PROJECT_V5/D_0_7A-2_result.md
```

This trial closes only the two P1 findings in
`plan/reviews/PROJECT_V5/D_0_7A-1_result.md`. It does not reopen the Trial 1
criteria that the independent reviewer confirmed, and an implementation OK
would not imply integration, promotion, release, or a downstream-leaf result.

## Candidate lineage

KO result baseline:

```text
ea4945842f0e4e65b4b4047e90af40e5a24c375e
review(v5): record D_0_7A trial 1 result
```

RED extension:

```text
32a0d87382989503a44ba8f1b67d8bbbb0d1431e
tree 5964ec12e2ff6a5d4829688078dcc44b5aa5f603
parent ea4945842f0e4e65b4b4047e90af40e5a24c375e
test(process-supervisor): bind codec responses to requests (V5 D/0/07a Trial 2)
```

GREEN:

```text
e89f7e6b9822294b64c649221fb92a2a6a9517b4
tree c14ca1b9ddcac8062d4d35734a934c8d6b4e579a
parent 32a0d87382989503a44ba8f1b67d8bbbb0d1431e
fix(process-supervisor): bind codec responses to requests (V5 D/0/07a Trial 2)
```

## Per-finding closure map

| Finding | RED evidence | GREEN closure |
|---|---|---|
| D007A-R1 | `binds authenticated ASP1 errors to write snapshot and sideband-permitted sources` sends correctly tagged, exact-sequence write-to-snapshot, snapshot-to-write, parent-only `0x0002`/`0x0006`, and parent-only claim-source cases. The first case failed by returning `SESSION_PORT_SNAPSHOT_FAILED` for a write instead of `SESSION_PORT_WRITE_ABORTED`. | `SESSION_PORT_SIDEBAND_ERROR_SOURCES` now binds each sideband-permitted id to its permitted phase and operation types. Parent-only ids/sources have no sideband entry. `sessionPortFrameError` checks that source after tag/sequence authentication; an inconsistency returns the existing operation-specific generic write/snapshot failure disposition. |
| D007A-R2 | `helper WRITE_OK encoder binds one bounded accepted count to its request` directly imports and invokes the real helper encoder. Without a bound request count, the old encoder emitted a 52-byte `WRITE_OK` for count `6` instead of rejecting it. The test also covers `0`, `65,537`, `0xffffffff`, a count mismatch, and valid `6`/`65,536` round trips. | `encode_asp1_response` now requires `request_prompt_bytes` for `WRITE_OK`, rejects non-integer/boolean or out-of-range request counts, and emits only when the uint32-BE accepted count equals that bounded `1..65,536` request count. Other response opcodes retain their existing behavior. |

The R1 fixtures construct each response with the active request's exact
sequence and the channel's exact 32-byte binding tag. Their failures therefore
exercise authenticated semantic binding rather than malformed-frame handling.

## RED-to-GREEN evidence

The RED-extension commit changed only:

```text
M tests/gateway/process_supervisor_session_port_codec.test.js
```

Run on `32a0d87382989503a44ba8f1b67d8bbbb0d1431e` before any production change:

```text
node --test --test-concurrency=1 tests/gateway/process_supervisor_session_port_codec.test.js
```

Relevant failing evidence:

```text
# Subtest: binds authenticated ASP1 errors to write snapshot and sideband-permitted sources
not ok 13 - binds authenticated ASP1 errors to write snapshot and sideband-permitted sources
actual:   SESSION_PORT_SNAPSHOT_FAILED
expected: SESSION_PORT_WRITE_ABORTED

# Subtest: helper WRITE_OK encoder binds one bounded accepted count to its request
not ok 20 - helper WRITE_OK encoder binds one bounded accepted count to its request
actual status:   encoded
expected status: rejected

1..26
tests 26
pass 24
fail 2
cancelled 0
skipped 0
todo 0
```

After applying only the GREEN source commit, the exact focused command passed:

```text
1..26
tests 26
pass 26
fail 0
cancelled 0
skipped 0
todo 0
```

## Exact local gate

Run from committed GREEN
`e89f7e6b9822294b64c649221fb92a2a6a9517b4`:

```text
node --test --test-concurrency=1 tests/gateway/process_supervisor_session_port_codec.test.js
```

```text
1..26
tests 26
pass 26
fail 0
cancelled 0
skipped 0
todo 0
```

```text
node --test --test-concurrency=1 tests/gateway/process_supervisor.test.js
```

```text
1..26
tests 26
pass 26
fail 0
cancelled 0
skipped 0
todo 0
```

```text
git diff --check
```

Result: exit `0`, no output.

## Changed-path allowlist

The complete Trial 2 technical candidate from `ea49458` through `e89f7e6` is:

```text
M gateway/src/adapters/process_supervisor.js
M gateway/src/adapters/process_supervisor_helper.py
M tests/gateway/process_supervisor_session_port_codec.test.js
```

Numeric pathset:

```text
gateway/src/adapters/process_supervisor.js                   +22 /  -2
gateway/src/adapters/process_supervisor_helper.py             +9 /  -1
tests/gateway/process_supervisor_session_port_codec.test.js +180 /  -3
```

No other implementation, test, plan, policy, dependency, manifest, lockfile,
schema, migration, adapter, service, catalog, or workflow path is part of the
technical candidate. This Trial 2 review-request file is committed separately
as evidence. The pre-existing untracked `gateway/node_modules` integration
symlink was used by the gate and remains unstaged.

## Stop condition

Independent review should adjudicate only D007A-R1 and D007A-R2 against the
Trial 1 KO contract. No self-verdict is asserted here.
