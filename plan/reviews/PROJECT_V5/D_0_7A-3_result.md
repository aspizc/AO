# Independent Re-review Result — Project V5 D/0/07a, Trial 3

## Verdict

`reviewed_OK`

Candidate reviewed:

- request: `4a5c16e901758ee3ffa7e01a4a6fcb143da91efd`
- RED extension: `1d4cb02780c411dfbac3191140baeae1fd461402`
  (tree `379e4e6580511e465add508f7f7addc81a44fae7`)
- GREEN: `46c0f8c44504a716e1e6fc32ad47e1d3312d14f9`
  (tree `80632e97f9732f7a7e4c5fa9698bcf13bab5bba0`)

The technical files at the request commit are identical to GREEN. This is an
implementation re-review verdict only. It makes no integration, promotion,
release, or downstream-leaf claim.

## Severity summary

| Severity | Count | Disposition |
|---|---:|---|
| P0 | 0 | none |
| P1 | 0 | D007A-R1 is closed |
| P2 | 0 | none |

## D007A-R1 adjudication

**CLOSED.**

`SESSION_PORT_SIDEBAND_ERROR_SOURCES` now permits
`ERROR(0x0005,0x06)` and `ERROR(0x0008,0x03)` only for `"write"`
(`gateway/src/adapters/process_supervisor.js:141-151`). This matches the
frozen contract: the authenticated `0x0005` response is the post-dispatch
write cancellation proof, snapshot cancellation commits locally, and
`NOT_FOREGROUND` is a pre-write disposition
(`plan/PROJECT_V5/D/0/07.md:242,668-680,734-746`).

The complete sideband operation/source set is now exact:

| Permitted operation(s) | Error ids |
|---|---|
| write and snapshot | `0x0001`, `0x0003` at phase `0x03`, `0x0004`, `0x0007`, `0x0009`, `0x000a` |
| write only | `0x0005`, `0x0008`, `0x000b` |
| snapshot only | `0x000c` |
| parent-only / excluded from sideband | `0x0002`, `0x0006`, and claim-phase `0x0003` |

The decoder still validates the complete header, payload length, 32-byte tag
with `timingSafeEqual`, and the exact in-flight sequence before it consults
the operation/source map
(`gateway/src/adapters/process_supervisor.js:1137-1171`). A disallowed source
therefore returns no decoded public error and follows the existing
operation-specific failure path
(`gateway/src/adapters/process_supervisor.js:1213-1216`).

### Reproduced authenticated pairings

I ran only the named binding test independently on GREEN:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='binds authenticated ASP1 errors to write snapshot and sideband-permitted sources' \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

```text
tests 1
pass 1
fail 0
cancelled 0
skipped 0
todo 0
```

Its separately enumerated fixtures produced these passed assertions:

| Authenticated in-sequence response | Observed public result |
|---|---|
| `snapshot + ERROR(0x0005,0x06)` | `SESSION_PORT_SNAPSHOT_FAILED`, phase `snapshot` |
| `snapshot + ERROR(0x0008,0x03)` | `SESSION_PORT_SNAPSHOT_FAILED`, phase `snapshot` |

For each fixture, the fake asserts that the active request tag equals the
channel-derived tag, returns that exact tag and request sequence, and the test
requires exactly one transport request and one channel retirement
(`tests/gateway/process_supervisor_session_port_codec.test.js:1266-1328`).
These are authenticated semantic-source mismatches, not framing, tag, or
sequence failures.

The exact RED-extension commit `1d4cb02` failed the same named test in an
isolated archive:

```text
actual:   SESSION_PORT_CANCELLED
expected: SESSION_PORT_SNAPSHOT_FAILED
tests 1
pass 0
fail 1
```

### Surviving-mutant evidence

I made each mutation separately in an isolated GREEN archive and reran the
named binding test:

```text
mutant: add "snapshot" back to ERROR(0x0005,0x06)
actual:   SESSION_PORT_CANCELLED
expected: SESSION_PORT_SNAPSHOT_FAILED
tests 1
pass 0
fail 1
```

```text
mutant: add "snapshot" back to ERROR(0x0008,0x03)
actual:   SESSION_PORT_NOT_FOREGROUND
expected: SESSION_PORT_SNAPSHOT_FAILED
tests 1
pass 0
fail 1
```

The committed test is independently mutation-sensitive to both narrowed rows.
No candidate source or test file was changed for these probes.

## Write-side preservation

The legitimate write sources remain permitted. I independently ran:

```text
node --test --test-concurrency=1 \
  --test-name-pattern='maps sideband-applicable ASP1 error ids to exact provider-free public errors' \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

```text
tests 1
pass 1
fail 0
cancelled 0
skipped 0
todo 0
```

That test continues to send both `ERROR(0x0005,0x06)` and
`ERROR(0x0008,0x03)` through `writePrompt` and requires their exact fixed
public errors
(`tests/gateway/process_supervisor_session_port_codec.test.js:1192-1238`).
The GREEN production diff changes only the operation sets on those two rows;
it does not alter their ids, phases, decoding, retirement, or dispositions.

## No-regression adjudication

The complete Trial 3 technical range changes only:

```text
M gateway/src/adapters/process_supervisor.js
M tests/gateway/process_supervisor_session_port_codec.test.js
```

The production delta is two operation-set removals; the test delta is the two
negative snapshot pairings. No helper encoder, framing, HMAC construction,
FIFO/retirement, authority, lifecycle JSON boundary, ordinary supervisor
surface, dependency, manifest, schema, policy, adapter, service, or
composition path changed.

The focused suite passed all 26 tests, including the previously closed
D007A-R2 real helper `WRITE_OK` encoder bound, exact ASP1 framing and payloads,
HMAC tag derivation and mutation guards, FIFO/sequence retirement, private
`WeakMap` authority, provider-data boundary, and ordinary seven-key execution
scope. The supervisor regression also passed all 26 tests. Nothing confirmed
across Trials 1-2 regressed.

## Exact local gate

Run at request head `4a5c16e`, whose technical files are identical to GREEN,
through the pre-existing `gateway/node_modules` integration symlink:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
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
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor.test.js
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

The supervisor file passed twice in consecutive standalone reruns. For
transparency, an earlier invocation in a chained host run exited once at the
file wrapper with no inner failing assertion or diagnostic; the two immediate
identical standalone reruns above both passed 26/26, so that file-wrapper
event was not reproducible.

```text
git diff --check
```

Result: exit `0`, no output.

The gate used host Node `v22.22.1`. The focused suite used host Python for its
real helper-codec fixtures, and the supervisor regression used its
process-level host fixtures. No gate lane was skipped.

## What was and was not verified

- Verified the frozen lineage, trees, parentage, technical/request pathsets,
  exact two-row production delta, closure fixtures, both independent
  re-broadening mutants, write-side preservation, and the exact local gate.
- Reused the prior independent Trial 1-2 evidence only for unchanged areas;
  the narrow diff plus the complete focused and supervisor regressions were
  checked for regression.
- The brief-named root `AGENTS.md` is absent from this candidate tree and
  worktree, so there was no root file to read or apply.
- Did not run `bash scripts/ci.sh`, as prohibited. Did not run a live provider,
  Redis, MCP, PTY, tmux, relay, adapter/service splice, release, integration,
  promotion, or downstream-leaf lane.
- All additional RED and mutation probes were confined to isolated `/tmp`
  archives. The pre-existing untracked `gateway/node_modules` symlink remained
  unstaged.

## Stop condition

`reviewed_OK`

D007A-R1 is closed. D007A-R2 remains closed, and the D/0/07a implementation
candidate satisfies this final Trial 3 re-review without broadening the claim
beyond the leaf.
