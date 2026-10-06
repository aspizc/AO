# Independent Review Result — Project V5 D/0/07a, Trial 1

## Verdict

`reviewed_KO`

Candidate reviewed:

- request: `8d66330444421f7e2597b765cb0f2df2a14e0248`
- RED: `6f75049962146a09b5369994d0aaea21061339a6`
  (tree `889a3af63ee14b14826757fc89bd52177dcb83bc`)
- GREEN: `61012f2390367209edb65ec90d0fdc5e1010bad3`
  (tree `316aec11e0b5a852fbe0471723d93a3148856b07`)
- frozen-core RED baseline:
  `a7c09b0f4e88b06c7c07d3415b0db964599a172f`

This is an implementation-review verdict only. It makes no integration,
promotion, release, or downstream-leaf claim.

## Severity summary

| Severity | Count | Disposition |
|---|---:|---|
| P0 | 0 | none |
| P1 | 2 | candidate is not eligible for an OK verdict |
| P2 | 0 | none |

## Findings

| ID | Severity | Finding |
|---|---|---|
| D007A-R1 | P1 | Authenticated `ERROR` responses are not bound to the in-flight request opcode/source. |
| D007A-R2 | P1 | The helper response encoder emits invalid `WRITE_OK` counts and therefore is not the exact bounded encoder required by the sheet. |

### D007A-R1 — authenticated error responses are operation-unbound

The parent contract assigns sources to error ids
(`plan/PROJECT_V5/D/0/07.md:303-316`) and requires a response payload
inconsistent with its request to map a dispatched write only to
`SESSION_PORT_WRITE_ABORTED`, or a snapshot only to
`SESSION_PORT_SNAPSHOT_FAILED` (`plan/PROJECT_V5/D/0/07.md:329`).

The implementation authenticates the tag and sequence, but then accepts every
known id/phase pair before it checks `operation.type`
(`gateway/src/adapters/process_supervisor.js:1132-1154`). Consequently a
snapshot-only `ERROR(0x000c,0x05)` is accepted as the public result of
`WRITE_PROMPT`; parent-only ids such as `0x0002` and `0x0006` are likewise
accepted from the sideband. The committed test reinforces the wrong behavior
by sending every error id through `writePrompt`
(`tests/gateway/process_supervisor_session_port_codec.test.js:1143-1170`).

I added only an isolated `/tmp` review probe, leaving the review worktree
unchanged. It returned:

```text
# Subtest: review probe binds authenticated error responses to the in-flight opcode
not ok 1 - review probe binds authenticated error responses to the in-flight opcode
error: |-
  Expected values to be strictly equal:
  + actual - expected

  + 'SESSION_PORT_SNAPSHOT_FAILED'
  - 'SESSION_PORT_WRITE_ABORTED'
tests 1
pass 0
fail 1
```

The response was byte-valid, correctly tagged, and carried the exact in-flight
sequence. This is therefore the required authenticated-then-unbound audit, not
a malformed-frame case. The decoder must reject error ids whose frozen source
cannot apply to the active request, reject parent-only errors received from
the sideband, and use the operation-specific failure disposition. Tests need
both write-to-snapshot, snapshot-to-write, and parent-only response cases.

### D007A-R2 — helper `WRITE_OK` encoder accepts impossible counts

The frozen `WRITE_OK` payload is one uint32-BE count that must equal the
request prompt length excluding CR
(`plan/PROJECT_V5/D/0/07.md:286-298`). Valid prompt counts are
`1..65,536`. The leaf explicitly requires the corresponding bounded helper
response encoder (`plan/PROJECT_V5/D/0/07a.md:105-110`) and byte-exact payload
shapes/caps (`plan/PROJECT_V5/D/0/07a.md:122-123`).

`encode_asp1_response` checks only that a `WRITE_OK` payload has four bytes
(`gateway/src/adapters/process_supervisor_helper.py:120-131`). It has neither
the request length nor a value-bound check. An independent direct probe
produced a 52-byte frame for every value below:

```text
[(0, 52), (65536, 52), (65537, 52), (4294967295, 52)]
```

Only `65536` can be valid among those values, and even that value is valid only
for a matching 65,536-byte prompt. The JS decoder later fails a mismatched
count safely, but that does not make the helper encoder byte/key exact. The
encoder should accept the bound request/prompt count (or an equivalently
unambiguous typed value), enforce `1..65,536`, and reject any count unequal to
the request. The focused suite currently invokes the helper decoder but never
invokes `encode_asp1_response`, so this declared encoder path is unobserved.

## Acceptance-criterion adjudication

| Criterion | Result | Evidence |
|---|---|---|
| Positive RED is real and counted correctly | PASS | Independently reproduced on `a7c09b0` with the test blob from `6f75049`: the factory assertion alone failed; all 23 mutation guards skipped. |
| Factory, issuer, claim, port, observation, argument, result, and public-error shapes | PASS | Static field/descriptor audit plus the focused suite. Results and observations are frozen plain objects; the port/issuer use null-prototype frozen receivers and module-private `WeakMap` authority. |
| Exact header, opcodes, ids, integers, payloads, caps, and sequence rules | FAIL | D007A-R1 and D007A-R2. Header/request decoding and success-result validation otherwise matched the frozen tables. |
| Exact HMAC-SHA-256 tag and fail-before-dispatch mutations | PASS | Independently checked `D || L || H || N`, decoded-key lease digest, lower-case hex validation, raw 32-byte tag, Node `timingSafeEqual`, and Python `hmac.compare_digest`; focused mutations passed. |
| Exact malformed/unknown/duplicate/out-of-order disposition | FAIL | Structural/tag/sequence cases pass, but a semantically request-inconsistent authenticated error receives the wrong public disposition (D007A-R1). |
| Forged/copied/proxy/stale/cross-factory/one-shot attempts make zero transport calls | PASS | Focused cases passed. A separate recursive own-property/prototype traversal from the supervisor, ordinary execution, `utilityIdentity`, completion, and cancel surfaces found no issuer, port, fake transport, or transport method. |
| Raw prompt/snapshot bytes stay off provider-free surfaces | PASS | Actual lifecycle frames/commands, execution, observation, fixed errors, and sideband bytes were inspected. The production files have no log/audit call path; the submitted log/audit arrays are inert, so that part was confirmed statically rather than credited solely from the empty arrays. |
| Existing factory and exact seven-key execution remain unchanged | PASS | Regression gate passed; ordinary execution keys remain `mode,bindingDigest,supervisor,reaper,utilityIdentity,completion,cancel`; helper spawn remains `shell:false`. |
| No PTY/tmux/relay or adapter/service splice | PASS | Technical range changes only the two supervisor files and the focused test. No PTY, relay, socket, terminal write, `send-keys`, adapter, service, dependency, manifest, or lockfile behavior entered the leaf. The observation retains only the frozen attach metadata required by the contract. |

## Independent RED reproduction

I created an isolated archive of `a7c09b0`, overlaid only
`tests/gateway/process_supervisor_session_port_codec.test.js` from `6f75049`,
and used the same integration `gateway/node_modules` symlink. Command:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

Relevant output:

```text
# Subtest: separately issues a persistent session port and round-trips one authenticated ASP1 request
not ok 1 - separately issues a persistent session port and round-trips one authenticated ASP1 request
error: |-
  Expected values to be strictly equal:
  + actual - expected

  + 'undefined'
  - 'function'
expected: 'function'
actual: 'undefined'
1..24
tests 24
pass 0
fail 1
skipped 23
```

This validates the submission's RED lineage. The production files at
`a7c09b0` and `6f75049` also had no diff.

## Exact local gate

Run from request commit `8d66330`, whose technical files are identical to
GREEN `61012f2`:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_codec.test.js
```

```text
1..24
tests 24
pass 24
fail 0
skipped 0
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
skipped 0
```

```text
git diff --check
```

Result: exit `0`, no output.

The focused helper probes ran through the host `/usr/bin/python3`. The
supervisor regression's process-level fixtures ran on the host. No focused
gate lane was skipped.

## Adversarial and scope evidence

- Declared-not-observed: the committed suite never calls the Python response
  encoder; direct review probing exposed D007A-R2.
- Authenticated-then-unbound: a valid HMAC/sequence response crossed the
  snapshot error into a write result; D007A-R1 reproduced it.
- Recorded-without-running: request bytes, tag, lifecycle frames, returned
  errors/results, and transport counts were observed at executing boundaries.
  Empty log/audit arrays were not treated as standalone dynamic proof.
- Minimal-boundary fixtures: the RED archive contained baseline production
  plus the tests-only blob; GREEN used the construction-only fake sideband and
  real configured Python helper import.
- Authority mutation: in an isolated candidate archive I deleted the
  `SESSION_PORT_RECEIVERS.get(this)` rejection in `sessionPortWritePrompt`.
  The named forged/copied/proxy/stale receiver test turned red with
  `TypeError: Cannot read properties of undefined (reading 'state')`
  (`tests 1`, `pass 0`, `fail 1`). The authority guard is therefore
  mutation-sensitive.
- Changed-path audit from `cb323e9..61012f2`: exactly
  `gateway/src/adapters/process_supervisor.js`,
  `gateway/src/adapters/process_supervisor_helper.py`, and
  `tests/gateway/process_supervisor_session_port_codec.test.js`.
- The pre-existing untracked `gateway/node_modules` integration symlink was
  used for the gate and was not staged.

## Coverage boundaries

I did not run `bash scripts/ci.sh`, as prohibited by the review brief. I did
not run a live provider, Redis, MCP, PTY, tmux, relay, adapter/service splice,
or release/integration lane; those are outside this leaf. All mutation and
extra adversarial probes were confined to isolated `/tmp` archives. No
production or test file in the review worktree was changed.

## Stop condition

`reviewed_KO`

The exact codec/error contract is not satisfied. D/0/07b remains blocked by
this result.
