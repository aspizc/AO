# Review Submission - Project V5 D/0/07c (Trial 1)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
the candidate against `plan/PROJECT_V5/D/0/07c.md` and the frozen shared
contract `plan/PROJECT_V5/D/0/07.md`. This request makes no self-verdict,
integration, promotion, release, `07d`, or public-splice claim.

## Candidate lineage

Reviewed `D/0/07b` baseline:

```text
2fa0d030d06898d2862abd541181f90e94ab27a2
docs(v5): mark D/0/07b reviewed-OK/integrated; 07c unblocked
```

Trial 1 RED:

```text
89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
tree b5bc6b8dc505c1bc33cc377a44c0da2f1d97ffb2
parent 2fa0d030d06898d2862abd541181f90e94ab27a2
test(session-port): define relay snapshot RED (V5 D/0/07c Trial 1)
```

Trial 1 GREEN:

```text
481ecb088514f1f5dfc8a652e3fca28f6f5a4f81
tree 9b5bd8a51843f320acafc845d679bb55650c9f26
parent 89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5
feat(session-port): authenticate relay and canonicalize snapshots (V5 D/0/07c Trial 1)
```

## TDD RED

The test-only RED commit contained the focused relay/snapshot suite and its
fixture, with no production change. The required first positive test failed
before GREEN as follows:

```text
✖ authenticates the exact relay instance and returns the canonical 24-byte pane snapshot
tests 1
pass 0
fail 1
Error: fixture probe relay-auth-probe failed (1)
AttributeError: module 'process_supervisor_helper' has no attribute 'derive_relay_key'
```

The first complete focused RED inventory had 24 tests, 0 pass, 24 fail, and no
skip. Subsequent test-only strengthening added direct guard seams before the
production commit; the required first failure remained the missing
`derive_relay_key`.

## Implementation boundary

- `process_supervisor_helper.py` now owns the private ASR1 relay, single-use key
  material, kernel peer checks, exact live pane identity, bounded post-handshake
  framing, direct tmux launch/capture operations, flush barrier, streaming
  normalization, and canonical snapshot construction.
- `process_supervisor.js` adds only bounded validation of the private helper
  snapshot payload: a nonempty snapshot must end in LF and may not contain NUL.
- The helper uses only the Python standard library.
- No service, catalog, public adapter, capability, codec, manifest, schema,
  migration, provider launch, or public attach surface changed. Composition
  remains owned by `D/0/07d`.

## Acceptance-criteria evidence map

| # | Frozen criterion | Candidate evidence |
|---|---|---|
| 1 | Required exact-relay/24-byte transaction is RED then GREEN | Exact RED above; focused test `authenticates the exact relay instance and returns the canonical 24-byte pane snapshot` is GREEN and asserts sequence 1, exact 24-byte text, and inert observation metadata. |
| 2 | Linux/Darwin peer evidence, live identity, nonce derivation/frames, constant-time proof, timeout, and rejects match the parent | Deterministic Linux and Darwin accept seams plus named unavailable-peer, uid/gid, PID, identity, malformed proof, bad proof, timeout, replay, and duplicate rejects. Real Linux host proof uses `SO_PEERCRED`; proof comparison uses `hmac.compare_digest`. Related guards are all mutation-killed below. |
| 3 | No fd 0/operator byte before `ACCEPT`; every reject tears down | `RelayBrokerInputQueue` remains gated until authenticated acceptance. Every reject fixture asserts zero queued operator bytes and teardown; relay protocol tests reject pre-accept/out-of-order data. |
| 4 | Same-user wrong peer PID and right-PID wrong proof cannot authenticate | Named focused tests `rejects same-user relay with the wrong kernel peer pid` and `rejects relay with the wrong nonce proof`; `relay_peer_pid`, `proof_pid`, and `proof_digest` mutants are killed. |
| 5 | Provider remains direct helper `execve`; tmux runs only direct-argv relay; no shell or `send-keys` | Inherited PTY gate remains GREEN. Relay launch is a fixed multi-argument tmux command. Focused direct-argv test asserts no `send-keys`, shell, `capture-pane -e`, or `-J`; source audit found none. |
| 6 | Barrier, metadata, exact capture argv, dimensions/history, row selection, whitespace, LF, zero/24-byte results, cap, and truncation are exact | Focused canonicalization tests cover each boundary. Real tmux 3.6 evidence records 40→0, 61→24, and 50→12 bytes with exact `-p -N -T -t ... -S -400`. Every marked capture/canonicalization guard is killed. |
| 7 | ANSI/control and UTF-8 normalization expose only the current pane; failures return no partial snapshot | Named split-UTF-8/ANSI test and host ANSI case return normalized bytes only. Metadata, capture, resize, UTF-8, NUL, final-LF, exit, stderr, and barrier failures reject without a partial snapshot. |
| 8 | Exact public tmux identity/attach metadata remains inert | Positive test preserves `sessionId === tmuxTarget === "ag-red-port-codex-coder"` and literal `tmux attach -t ag-red-port-codex-coder`; no attach endpoint or execution path was added. |
| 9 | Relay/pane/tmux loss or replacement revokes and leaves no artifacts | Failure probes cover peer/live identity, tmux identity/exit/stderr, capture/barrier, socket, replay, and duplicate paths. Host cleanup left no relay/fixture process or server; the exact stale ephemeral socket inode was verified as serverless and removed. |

## Surviving-mutant proof

The mutation harness copied only the two production files and focused
test/fixture into a fresh disposable directory per run. For each marked guard,
it first required the unmodified targeted test to pass, deleted only that
guard, syntax-checked the mutant, and required the targeted test to fail.
Final result: **53/53 killed, 0 survivors**.

| Guard | Targeted focused test | Result |
|---|---|---|
| `operator_queue_accept` | rejects relay when Linux peer evidence is unavailable | **KILLED** |
| `relay_duplicate` | rejects a duplicate relay connection | **KILLED** |
| `relay_replay` | rejects replayed relay proof | **KILLED** |
| `relay_peer_shape` | rejects relay when Linux peer evidence is unavailable | **KILLED** |
| `relay_peer_uid` | rejects relay with a different kernel uid or gid | **KILLED** |
| `relay_peer_gid` | rejects relay with a different kernel uid or gid | **KILLED** |
| `relay_peer_pid` | rejects same-user relay with the wrong kernel peer pid | **KILLED** |
| `relay_live_identity` | rejects relay whose live pane identity changed | **KILLED** |
| `relay_timeout` | rejects relay handshake timeout before operator input | **KILLED** |
| `proof_size` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_magic` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_version` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_type` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_reserved` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_payload_size` | rejects malformed or out-of-order relay proof before operator input | **KILLED** |
| `proof_pid` | rejects relay with the wrong nonce proof | **KILLED** |
| `proof_digest` | rejects relay with the wrong nonce proof | **KILLED** |
| `key_nofollow` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `key_regular` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `key_owner` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `key_mode` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `key_size` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `key_read_size` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `relay_data_send_cap` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `relay_data_header` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `relay_data_receive_cap` | accepts the exact Linux relay peer and nonce proof before operator input | **KILLED** |
| `tmux_identity_shape` | uses only fixed direct tmux argv for relay barrier and capture | **KILLED** |
| `tmux_identity_values` | uses only fixed direct tmux argv for relay barrier and capture | **KILLED** |
| `tmux_launch_exit` | uses only fixed direct tmux argv for relay barrier and capture | **KILLED** |
| `tmux_launch_stderr` | uses only fixed direct tmux argv for relay barrier and capture | **KILLED** |
| `tmux_columns` | rejects resize before capture and returns no partial snapshot | **KILLED** |
| `tmux_rows` | rejects resize before capture and returns no partial snapshot | **KILLED** |
| `tmux_history` | rejects resize before capture and returns no partial snapshot | **KILLED** |
| `metadata_final_lf` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_fields` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_digits` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_overflow` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_height` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_cursor` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_final_lf` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_nul` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_utf8` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_rows` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `visible_emitted_extent` | preserves blank history and nonempty content below the cursor | **KILLED** |
| `snapshot_cap` | caps snapshots and truncates only the oldest prefix | **KILLED** |
| `truncation_scalar_boundary` | caps snapshots and truncates only the oldest prefix | **KILLED** |
| `capture_barrier` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_exit` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `metadata_stderr` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_exit` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `capture_stderr` | rejects capture metadata or physical-row-count drift instead of guessing | **KILLED** |
| `snapshot_final_lf` | rejects noncanonical helper snapshot payloads without returning partial data | **KILLED** |
| `snapshot_nul` | rejects noncanonical helper snapshot payloads without returning partial data | **KILLED** |

## Real-host tmux evidence

The host proof used tmux `3.6`, Node `v22.22.1`, configured runtime
`/usr/bin/python3.14` (`Python 3.14.4`), and the unique socket:

```text
d007c-264983-1785175735891138083
```

It created only targets `d007c-host-264983-0` through
`d007c-host-264983-3`; it did not query or modify the default tmux socket or
any `ag-*` session. The row-end-space case launched the configured-runtime
relay in the pane, read the live tmux pane identity, authenticated that exact
pane PID through the real Linux kernel peer path plus fresh nonce proof, and
captured that same pane after its barrier.

Every case used this exact capture vector, with its listed target substituted:

```json
["capture-pane","-p","-N","-T","-t","<d007c-host target>","-S","-400"]
```

| Host case | Target | Raw capture | Canonical result |
|---|---|---:|---:|
| untouched | `d007c-host-264983-0` | 40 bytes | 0 bytes |
| exact three rows | `d007c-host-264983-1` | 61 bytes | 24 bytes |
| emitted row-end spaces | `d007c-host-264983-2` | 50 bytes | 12 bytes |
| ANSI rendering | `d007c-host-264983-3` | 43 bytes | 4 bytes |

Exact canonical values:

```text
untouched = ""
exact     = "ready\nstatus\nack:status\n"
spaces    = "edge  \nnext\n"
ANSI      = "ABC\n"
```

The host TAP gate passed `1/1` with no skip. A post-gate query of that exact
socket reported `no server running`; the stale socket inode was then removed.
The final exact-path absence check exited `0`, and the relay/fixture process
scan exited `1` with no matches.

## Verification

### Exact focused gate

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js
```

```text
tests 27
pass 27
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 523.59354
```

### Exact inherited PTY/Darwin gate

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js
```

```text
tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 923.567494
```

### Syntax, lint, and whitespace

- Python helper compilation exited `0`.
- `node --check` exited `0` for the changed JS adapter and focused suite.
- ESLint reported zero errors for the changed production JS file. The
  repository ESLint base ignores the root-level focused test by configuration;
  `node --check` covers its syntax.
- `git diff --check` exited `0` with no output.

The full `scripts/ci.sh` gate was intentionally not run, as required by the
Trial 1 brief.

## Changed-path allowlist

Technical candidate from `2fa0d03` through `481ecb0`:

```text
M gateway/src/adapters/process_supervisor.js                      +5 /   -0
M gateway/src/adapters/process_supervisor_helper.py             +966 /  -1
M tests/gateway/process_supervisor_session_port_fixture.py      +1185 / -0
A tests/gateway/process_supervisor_session_port_relay.test.js   +831 /  -0
```

This review request is the only additional path:

```text
A plan/reviews/PROJECT_V5/D_0_7C-1_to_review.md
```

The pre-existing untracked `gateway/node_modules` integration symlink remains
unstaged. No `policies/`, changelog, CI gate, project/stage README, frozen
`D/0/07.md`, or `D/0/07c.md` path was changed. No unrelated user change was
staged or committed.

## Commits

- `89a8bc6ca2661e8d69e8714b64feeeb2d9949fa5` -
  `test(session-port): define relay snapshot RED (V5 D/0/07c Trial 1)`
- `481ecb088514f1f5dfc8a652e3fca28f6f5a4f81` -
  `feat(session-port): authenticate relay and canonicalize snapshots (V5 D/0/07c Trial 1)`

## Stop condition

Independent review should adjudicate only `D/0/07c` Trial 1. No self-review,
downstream authorization, integration, or `D/0/07d` claim is asserted.
