# Independent Re-review Result — Project V5 D/0/07a, Trial 2

## Verdict

`reviewed_KO`

Candidate reviewed:

- request: `56332d14410c9360004a5c2f61f2c2aa1f43604a`
- RED extension: `32a0d87382989503a44ba8f1b67d8bbbb0d1431e`
  (tree `5964ec12e2ff6a5d4829688078dcc44b5aa5f603`)
- GREEN: `e89f7e6b9822294b64c649221fb92a2a6a9517b4`
  (tree `c14ca1b9ddcac8062d4d35734a934c8d6b4e579a`)

The technical files at the request commit are identical to GREEN. This is an
implementation re-review verdict only. It makes no integration, promotion,
release, or downstream-leaf claim.

## Severity summary

| Severity | Count | Disposition |
|---|---:|---|
| P0 | 0 | none |
| P1 | 1 | D007A-R1 remains open, so the candidate is not eligible for an OK verdict |
| P2 | 0 | none |

## Per-finding adjudication

| Trial 1 finding | Result | Adjudication |
|---|---|---|
| D007A-R1 — authenticated errors are operation/source-unbound | **NOT CLOSED — P1** | The submitted write/snapshot cross and parent-only examples are fixed, but the new source allowlist still authenticates two helper error sources that cannot produce a snapshot result. |
| D007A-R2 — helper `WRITE_OK` encoder is declared but unbounded/unobserved | **CLOSED** | The real encoder now requires a bounded request count equal to the encoded accepted count, and the suite invokes it directly. |

## P1 finding

### D007A-R1 — the sideband source allowlist remains too broad for snapshots

`SESSION_PORT_SIDEBAND_ERROR_SOURCES` marks both
`ERROR(0x0005,0x06)` (`SESSION_PORT_CANCELLED`) and
`ERROR(0x0008,0x03)` (`SESSION_PORT_NOT_FOREGROUND`) as valid for
`"snapshot"` operations
(`gateway/src/adapters/process_supervisor.js:141-151`). The decoder therefore
returns those supplied public errors after authenticating the tag and sequence
(`gateway/src/adapters/process_supervisor.js:1156-1171`) instead of rejecting
the inconsistent response and taking the snapshot-specific failure path
(`gateway/src/adapters/process_supervisor.js:1213-1216,1447-1458`).

Those sources are not valid helper-produced snapshot results in the frozen
contract:

- Snapshot cancellation commits locally and needs no helper proof
  (`plan/PROJECT_V5/D/0/07.md:242,668-680`). The authenticated
  `ERROR(0x0005,0x06)` response is expressly the post-dispatch **write**
  cancellation proof (`plan/PROJECT_V5/D/0/07.md:736`).
- `SESSION_PORT_NOT_FOREGROUND` is the pre-write foreground disposition
  (`plan/PROJECT_V5/D/0/07.md:719,734`). The exhaustive snapshot rows use
  identity, terminal-changed, terminal-closed, snapshot-failed, or local
  cancellation dispositions; they contain no helper-produced
  `NOT_FOREGROUND` snapshot result (`plan/PROJECT_V5/D/0/07.md:740-746`).

I reproduced both survivors in an isolated archive of GREEN. Each response
used the active snapshot request's exact sequence and the harness-derived
32-byte binding tag. No framing or authentication mutation was involved.

```text
snapshot + ERROR(0x0005,0x06)
actual:   SESSION_PORT_CANCELLED
expected: SESSION_PORT_SNAPSHOT_FAILED
tests 1
pass 0
fail 1
```

```text
snapshot + ERROR(0x0008,0x03)
actual:   SESSION_PORT_NOT_FOREGROUND
expected: SESSION_PORT_SNAPSHOT_FAILED
tests 1
pass 0
fail 1
```

This is the same authenticated-then-unbound defect class as Trial 1, not a
new framing concern. The allowlist must encode the frozen sideband source per
operation, including the write-only cancellation-proof and foreground
sources, and the committed test must cover those negative snapshot pairings.

The committed test currently sends `0x0005` and `0x0008` only through
`writePrompt` (`tests/gateway/process_supervisor_session_port_codec.test.js:
1193-1205`) and its negative matrix covers only the `0x000b`/`0x000c` success
class cross plus globally parent-only ids/phases
(`tests/gateway/process_supervisor_session_port_codec.test.js:1242-1287`).

## D007A-R1 evidence that did close

The submitted named test independently passed on GREEN and confirms that:

- authenticated `ERROR(0x000c,0x05)` on `WRITE_PROMPT` becomes
  `SESSION_PORT_WRITE_ABORTED`;
- authenticated `ERROR(0x000b,0x04)` on `SNAPSHOT` becomes
  `SESSION_PORT_SNAPSHOT_FAILED`;
- parent-only `0x0002`, parent-only `0x0006`, and claim-source
  `ERROR(0x0003,0x01)` are rejected from the sideband;
- all cases use one actual transport request, the exact active sequence and
  binding tag, and retire the channel;
- the fixed mapping test no longer sends every id through `writePrompt`.

I also deleted only the
`!source.operations.has(operationType)` guard in an isolated GREEN archive and
ran the named binding test. It turned red on the first write-to-snapshot cross:

```text
actual:   SESSION_PORT_SNAPSHOT_FAILED
expected: SESSION_PORT_WRITE_ABORTED
tests 1
pass 0
fail 1
```

The submitted test is mutation-sensitive to the guard it covers, but the
remaining source rows above keep D007A-R1 open.

## D007A-R2 closure evidence

`encode_asp1_response` now requires `request_prompt_bytes` for `WRITE_OK`,
rejects booleans and non-integers, enforces `1..65,536`, and requires the
uint32-BE payload value to equal that request count
(`gateway/src/adapters/process_supervisor_helper.py:120-138`).

The focused suite imports and invokes the real helper encoder, rather than
testing only the decoder
(`tests/gateway/process_supervisor_session_port_codec.test.js:647-684,
1577-1601`). The independently reproduced RED extension failed because the
old helper encoded count `6` without a bound request; GREEN passes.

An additional direct probe of the real GREEN helper returned:

```text
valid 1 / request 1                 encoded, 52 bytes, payload 1
valid 65,536 / request 65,536       encoded, 52 bytes, payload 65,536
missing request count               rejected
0 / request 0                       rejected
65,537 / request 65,537             rejected
0xffffffff / request 0xffffffff     rejected
6 / request 5                       rejected
request count true                  rejected
```

D007A-R2 is closed.

## Independent RED reproduction

I archived exact RED-extension commit `32a0d87`, attached only the existing
integration `gateway/node_modules` symlink, and ran:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

Result:

```text
1..26
tests 26
pass 24
fail 2
cancelled 0
skipped 0
todo 0
```

The two failures were the intended D007A-R1 cross
(`SESSION_PORT_SNAPSHOT_FAILED` returned where
`SESSION_PORT_WRITE_ABORTED` was required) and D007A-R2
(`WRITE_OK` count `6` encoded without a request count). The RED commit changes
only the focused test; GREEN changes only the two supervisor source files.

## Exact local gate

Run at request commit `56332d1`, whose technical files are identical to GREEN:

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

```text
git diff --check
```

Result: exit `0`, no output.

The gate ran with host Node `v22.22.1`. The focused suite selected host
`/home/carase/miniconda3/bin/python3.13` through `CONDA_PREFIX`; the additional
encoder probe used host `/usr/bin/python3` (`3.14.4`). The supervisor
regression's process-level fixtures also ran on the host. No gate lane was
skipped.

## Scope, audits, and coverage boundaries

- Lineage and path scope were verified independently. The Trial 2 technical
  range changes exactly
  `gateway/src/adapters/process_supervisor.js`,
  `gateway/src/adapters/process_supervisor_helper.py`, and
  `tests/gateway/process_supervisor_session_port_codec.test.js`.
- Authenticated-then-unbound: the submitted examples close, but the two
  correctly authenticated snapshot-source survivors above keep R1 open.
- Declared-not-observed: closed for R2 because the suite executes the real
  encoder and the direct probe independently exercises its bounds/equality.
- Minimal-boundary fixtures: RED, the guard mutant, and the extra adversarial
  probes used exact commit archives in isolated `/tmp` directories with only
  the pre-existing dependency symlink. No candidate source or test file was
  changed.
- Trial 1's other confirmed criteria were checked for regression by reviewing
  the narrow source diff and rerunning both exact local test files. No
  unrelated implementation path changed.
- I did not run `bash scripts/ci.sh`, as prohibited. I did not run a live
  provider, Redis, MCP, PTY, tmux, relay, adapter/service splice, release,
  integration, promotion, or downstream-leaf lane.

## Stop condition

`reviewed_KO`

D007A-R2 is closed. D007A-R1 remains open because authenticated snapshot
responses are still accepted from write-only helper sources.
