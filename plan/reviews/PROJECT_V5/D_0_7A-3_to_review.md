# Review Submission - Project V5 D/0/07a (Trial 3)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the frozen commits below and write the verdict only to:

```text
plan/reviews/PROJECT_V5/D_0_7A-3_result.md
```

This trial closes only the remaining D007A-R1 P1 in
`plan/reviews/PROJECT_V5/D_0_7A-2_result.md`. D007A-R2 and every other
criterion confirmed across Trials 1-2 remain unchanged. An implementation OK
would not imply integration, promotion, release, or a downstream-leaf result.

## Candidate lineage

Trial 2 KO result baseline:

```text
dda4bc287d7adc131c80d631db005274c576936b
review(v5): record D_0_7A trial 2 result
```

RED extension:

```text
1d4cb02780c411dfbac3191140baeae1fd461402
tree 379e4e6580511e465add508f7f7addc81a44fae7
parent dda4bc287d7adc131c80d631db005274c576936b
test(process-supervisor): narrow snapshot error sources (V5 D/0/07a Trial 3)
```

GREEN:

```text
46c0f8c44504a716e1e6fc32ad47e1d3312d14f9
tree 80632e97f9732f7a7e4c5fa9698bcf13bab5bba0
parent 1d4cb02780c411dfbac3191140baeae1fd461402
fix(process-supervisor): narrow snapshot error sources (V5 D/0/07a Trial 3)
```

## D007A-R1 closure map

| Required closure | Test evidence | Production closure |
|---|---|---|
| Reject snapshot plus authenticated `ERROR(0x0005,0x06)` | The binding matrix now sends the active snapshot request's exact sequence and 32-byte binding tag with this response and requires `SESSION_PORT_SNAPSHOT_FAILED`. | The `0x0005` sideband source permits only `"write"`; snapshot therefore follows the existing operation-specific malformed-response path. |
| Reject snapshot plus authenticated `ERROR(0x0008,0x03)` | The same matrix includes a separately enumerated, correctly tagged, in-sequence snapshot case and requires `SESSION_PORT_SNAPSHOT_FAILED`. | The `0x0008` sideband source permits only `"write"`; snapshot therefore follows the existing operation-specific malformed-response path. |
| Preserve legitimate write behavior | `maps sideband-applicable ASP1 error ids to exact provider-free public errors` still passes `0x0005` and `0x0008` through `writePrompt` and requires their exact fixed public errors. | Both source rows retain `"write"`; no other phase, source, operation, decoder, or disposition changed. |

Each negative fixture asserts the request binding tag equals the channel tag,
uses that tag in the response, echoes the active request sequence, performs one
transport request, and retires the channel. These are authenticated semantic
source mismatches, not framing failures. Re-adding `"snapshot"` to either
changed operation set makes its corresponding negative case receive the
supplied error instead of `SESSION_PORT_SNAPSHOT_FAILED`.

## RED-to-GREEN evidence

The RED-extension commit changes only:

```text
M tests/gateway/process_supervisor_session_port_codec.test.js
```

Run on `1d4cb02780c411dfbac3191140baeae1fd461402` before the
production change:

```text
node --test --test-concurrency=1 tests/gateway/process_supervisor_session_port_codec.test.js
```

Relevant failure:

```text
# Subtest: binds authenticated ASP1 errors to write snapshot and sideband-permitted sources
not ok 13 - binds authenticated ASP1 errors to write snapshot and sideband-permitted sources
error: |-
  Expected values to be strictly equal:
  + actual - expected

  + 'SESSION_PORT_CANCELLED'
  - 'SESSION_PORT_SNAPSHOT_FAILED'

1..26
tests 26
pass 25
fail 1
cancelled 0
skipped 0
todo 0
duration_ms 747.987619
```

The sequential matrix stopped at the first newly added negative pairing on
RED. Its next entry is the independent authenticated
`snapshot + ERROR(0x0008,0x03)` pairing; both entries execute and pass on
GREEN.

After applying only the two-row GREEN allowlist change, the same command
passed:

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
`46c0f8c44504a716e1e6fc32ad47e1d3312d14f9`:

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
duration_ms 754.575406
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
duration_ms 1046.060315
```

```text
git diff --check
```

Result: exit `0`, no output.

## Changed-path allowlist

The complete Trial 3 technical candidate from `dda4bc2` through `46c0f8c` is:

```text
M gateway/src/adapters/process_supervisor.js
M tests/gateway/process_supervisor_session_port_codec.test.js
```

Numeric pathset:

```text
gateway/src/adapters/process_supervisor.js                   +2 /  -2
tests/gateway/process_supervisor_session_port_codec.test.js +14 /  -0
```

No Python helper, other implementation, test, plan, policy, dependency,
manifest, lockfile, schema, migration, adapter, service, catalog, or workflow
path is part of the technical candidate. This review-request file is committed
separately as evidence. The pre-existing untracked `gateway/node_modules`
integration symlink was used by the gate and remains unstaged.

## Stop condition

Independent review should adjudicate only the remaining D007A-R1 snapshot
source precision against the Trial 2 KO contract. No self-verdict is asserted
here.
