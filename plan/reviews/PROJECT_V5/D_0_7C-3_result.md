# Independent Review Result — Project V5 D/0/07c Trial 3

## Verdict

**reviewed_KO**

The Trial 3 candidate is a substantial, mostly conforming implementation of
the ratified five-amendment contract. The accepted-generation `E`/`V` ordering,
retained-socket and read-time retained-PTY authorities, field-exact
`agents-capture-v1` atomic capture on one retained control connection,
Decision 4C namespace preservation, Decision 3B anchored/anchor-lost bounded
process cleanup, pane-first/session-second owned-tmux retirement, and the
repaired five-gate production/packaging RED lineage all independently verify.
Every prior Trial 1 and Trial 2 finding is closed or correctly re-scoped by
the operator ratification.

The verdict is nevertheless KO for one blocking P1: an in-flight
`WRITE_PROMPT` rejected before `F` by a relay/tmux-facet diagnostic mismatch
never delivers its authenticated `ERROR(0x0009, 0x03)` response. The
revalidation helper revokes the accepted generation before the fd-5 response
write, the response write is itself gated on the live generation, and the
helper exits instead. The parent then classifies the dispatched write as
transport loss and returns `SESSION_PORT_WRITE_ABORTED` where the frozen
parent table and the ratified design both require
`SESSION_PORT_TERMINAL_CHANGED`. This is exactly the class the review request
told the reviewer to challenge: a silently lost rejection followed by an
unrelated public error. The snapshot path defers revocation to avoid this;
the write path does not.

This verdict is limited to D/0/07c Trial 3 review. It makes no integration,
promotion, merge, tagging, support, release, `D/0/07d`, splice, or
default-runtime deployment claim, and an eventual OK would not imply any of
those states.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None. |
| P1 | 1 | A pre-`F` write rejection caused by any `revalidate_accepted_relay_binding` facet loses its authenticated fd-5 error and surfaces as `SESSION_PORT_WRITE_ABORTED` instead of `SESSION_PORT_TERMINAL_CHANGED`. |
| P2 | 2 | The request's technical lineage omits the in-tree pre-ratification pair `834d0b5`/`590e053`; four intermediate commit subjects omit the required `(V5 D/0/07c Trial 3)` suffix (disclosed). |

## Reviewed lineage and authentication

Reviewed in worktree
`workspace/clones/wt-d007c-review-t3e`, branch `review/V5-D-0-07c-3e`, HEAD:

```text
c38762a379a3d060fcf5e6ed21a58b95ecec27a2
tree 447fef5ad5b3981326b6f02ca52d907832986b70
docs(review): request D_0_7C trial 3 review (V5 D/0/07c Trial 3)
```

Technical candidate and complete range, each commit's SHA/tree/parent
independently verified against the request:

```text
f84825a tree 6b894154 parent ac92d51   test(session-port): bind accepted generation effects (V5 D/0/07c Trial 3)
0941b2d tree ccf2ecbb parent f84825a   feat(session-port): enforce retained tmux and bounded cleanup
357de45 tree b5253a7b parent 0941b2d   test(session-port): add production authority gate RED
017c49d tree fb163658 parent 357de45   test(session-port): split authority gate RED evidence
8f848b3 tree 0cb8e279 parent 017c49d   test(session-port): restore isolated retained-channel probe
d7873eb tree 1db04ff4 parent 8f848b3   feat(session-port): close retained tmux runtime gaps (V5 D/0/07c Trial 3)
```

Candidate under verdict: `d7873eba1a9405fec92875020854ed67f16a03b1`, tree
`1db04ff47b71b1f6d04ecf453a53b96dc0e83dba`. Range `ac92d51..d7873eb` is
exactly the 11 disclosed paths (+3629/−241 by `git diff --numstat`); the final
correction `8f848b3..d7873eb` is exactly the 9 disclosed paths (+554/−158).
The request commit adds only `plan/reviews/PROJECT_V5/D_0_7C-3_to_review.md`.
No plan sheet, policy, registry, CI manifest, service, catalog, schema,
`package.json`, or lockfile changed. The design at
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` in this tree is
byte-identical (blob `2643ddc0`) to the independently approved design commit
`95185e0175e7b0619628488c3024ba2d1615418c` (tree `7f2a2769`), whose two
zero-finding Design Trial 9 verdicts (`e230faf`, `83252f6`) and operator
ratification (`ac92d51`, all five amendments 1B/2A/3B/4C/5B) I read in full.

I did not implement this candidate, used no subagent, and treated no
coder-owned output as independent evidence.

## Blocking finding

### P1-1 — a write rejected pre-`F` by relay/tmux drift loses its authenticated response and returns the wrong public error

The frozen parent requires, for a readable pre-`F` mismatch with ranks 1–3
false: "PTY/pane/relay identity or dimension classification … write `[D,F)`;
helper proves zero terminal bytes → `SESSION_PORT_TERMINAL_CHANGED`"
(`plan/PROJECT_V5/D/0/07.md:719`, `:733`). The ratified design preserves this:
"A diagnostic mismatch observed before `F` retains its exact frozen
disposition" (`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md:169-177`,
`:287-289`, `:786-792`). The review request itself states the intended result
is "one authenticated response or the exact supervisor-loss outcome, never a
silently lost rejection followed by an unrelated public error."

The candidate violates this on the `WRITE_PROMPT` (opcode `0x01`) path:

1. `verify()` calls `revalidate_relay()` at the FIFO head
   (`gateway/src/adapters/process_supervisor_helper.py:4921-4924`).
2. On any mismatch — accepted-socket peer evidence, relay process identity,
   retained tmux identity, or history limit —
   `revalidate_accepted_relay_binding` calls `binding.revoke()` and raises
   (`process_supervisor_helper.py:3037-3039`).
3. `defer_revocation()` is armed only in the snapshot branch
   (`process_supervisor_helper.py:5131`). On the write path
   `AcceptedRelayBinding.revoke()` therefore immediately commits
   `generation.revoke(...)` (`process_supervisor_helper.py:2811-2819`),
   moving `G` to `REVOKING`.
4. `verified_pty_write` correctly returns `(error, 0, 0x0009, 0x03)` with
   zero bytes (`process_supervisor_helper.py:389-395`, `:434-459`), and the
   loop calls `settle_rejection(response)`
   (`process_supervisor_helper.py:5234-5235`).
5. `respond()` writes fd 5 only under `generation.workload(...)`
   (`process_supervisor_helper.py:4978-4990`). `G` is `REVOKING`, so it
   raises `GenerationRevokedError`, `respond` returns `False`, and
   `settle_rejection` returns `"supervisor_lost"` without ever writing the
   authenticated error (`process_supervisor_helper.py:4992-4998`). The helper
   tears down and exits.
6. The parent holds a dispatched in-flight write; response-channel loss maps
   it through `operationTransportFailure` → `operationFailure` to
   `SESSION_PORT_WRITE_ABORTED`
   (`gateway/src/adapters/process_supervisor.js:1327-1341`, `:1786`).

Public result: `SESSION_PORT_WRITE_ABORTED`. Required public result:
`SESSION_PORT_TERMINAL_CHANGED` via authenticated `ERROR(0x0009, 0x03)`. The
helper is alive and has already classified the mismatch, so this is not a
loss rank; it is a misdelivered rank-4 rejection. The same drift observed on
the snapshot path settles correctly because `defer_revocation()` keeps `G`
workload-open for the response write and flushes revocation afterwards — the
exact correction the convergence table describes, applied to only one of the
two dispatch paths.

Reachability is ordinary: an outer tmux client pane/geometry/history change,
owned-pane removal, or relay-facet drift between activation and the next
prompt is the same external event class Trial 2 reviewer B produced with a
real outside client. The non-relay pre-`F` dispositions (utility identity,
foreground, retained-PTY identity) do not revoke inside `verify()` and settle
correctly; only the relay/tmux-facet variant is broken. After `F` the same
loss coincidentally yields the correct `WRITE_ABORTED` code, so the defect
window is exactly `[D,F)`.

Reproduction (bounded, read-only, against the candidate helper): a probe
built an accepted binding over a `socketpair` with the fixture's identity
readers, drifted only `paneWidth` in the tmux reader, ran the same
`revalidate_accepted_relay_binding` call `verify()` makes, then attempted the
same workload-gated fd-5 write `respond()` makes:

```json
{
  "write_path": {
    "disposition": "terminal_changed",
    "generationStateAfterDrift": "REVOKING",
    "response": {"delivered": false, "payload": ""}
  },
  "snapshot_path": {
    "disposition": "terminal_changed",
    "generationStateAfterDrift": "ACTIVE",
    "response": {"delivered": true, "payload": "ASP1-ERROR-0x0009"},
    "generationStateAfterFlush": "REVOKING"
  }
}
```

No committed test covers the composed case: the PTY suite's write-probe
exercises `verified_pty_write` with a synthetic `verify` that never revokes
the generation, and every committed relay-drift test rejects on the input,
readiness, or snapshot path.

Required bounded correction:

1. Make the `0x01` dispatch path settle rejections through the same deferred
   mechanism as `0x02`: arm `defer_revocation()` before the FIFO-head
   verification (or make revalidation-driven revocation deferred while any
   ASP1 operation is in flight), write the authenticated
   `ERROR(0x0009/0x0007/0x0008/0x000a, …)` response while `G` is
   workload-open, then flush pending revocation and enter the existing
   settle/teardown wait — preserving the response-before-`V` order the
   snapshot path already proves.
2. Add one composed regression test that dispatches a `WRITE_PROMPT`, injects
   a relay/tmux-facet drift observed at the FIFO-head revalidation, and
   requires: zero PTY bytes, the authenticated `ERROR(0x0009, 0x03)` frame on
   fd 5, the public result `SESSION_PORT_TERMINAL_CHANGED` (not
   `WRITE_ABORTED`), and revocation/cleanup afterwards. A variant that loses
   fd 5 before validation must still map to `SESSION_PORT_WRITE_ABORTED`.
3. Do not weaken the correct non-relay pre-`F` dispositions, the post-`F`
   abort mapping, or the snapshot path while making this change.

## Non-blocking findings

### P2-1 — the effective candidate includes the undisclosed pre-ratification pair `834d0b5`/`590e053`

The candidate tree builds on branch history that already contains
`834d0b5` (`test(v5): expose D007c output binding gap (V5 D/0/07c Trial 3)`)
and `590e053` (`fix(v5): bind D007c output forwarding (V5 D/0/07c Trial 3)`),
committed after the Trial 2 KOs and before the design series. The operator
decision (`D_0_7C_DESIGN_human_decision.md`) states `590e053` "remains
unsealed evidence, not a candidate" and that salvage requires its own RED
evidence, path allowlist, technical commit, and independent review. The
request's "Complete Trial 3 technical lineage" begins at `f84825a` and never
names this pair, yet their content (output-forwarding revalidation, reworked
by this range into the diagnostic-plus-retained model) is inside the reviewed
tree.

Adjudication: accepted for this trial. The pair is RED-first (`834d0b5` is a
failing-test commit), sits inside the 07c path footprint, and is covered by
this review, which satisfies the decision's substantive conditions. The
disclosure gap is recorded as a process deviation: future requests must name
every unreviewed technical commit that distinguishes the candidate tree from
the last independently reviewed state, not only the post-ratification range.

### P2-2 — four intermediate commit subjects omit the required trial suffix (disclosed)

`0941b2d`, `357de45`, `017c49d`, and `8f848b3` omit the repository's
`(V5 D/0/07c Trial 3)` suffix. The request discloses this and did not rewrite
history, which conforms to the immutable-lineage rule. Adjudication: tolerated
for this trial as disclosed immutable history; the range endpoints carry the
marker and the git graph makes ownership unambiguous. Future trials must
carry the full suffix on every technical commit at commit time.

## Prior-finding closure adjudication

| Prior finding | Trial 3 disposition |
|---|---|
| Trial 1 P1 (authenticated-then-unbound post-`ACCEPT` operations) | **Closed.** Every post-`ACCEPT` transfer runs under the accepted generation's workload lock on retained objects only: `send_bound_relay_data`/`receive_bound_relay_data`/`offer_retained_relay_input` (`helper.py:3541-3663`), `RetainedPtyAuthority.read/write` (`helper.py:2368-2456`), and queue entries tagged with `(generationId, acceptedSocketIdentity)` (`helper.py:2905-3010`). Deterministic tests for replacement-endpoint rejection and post-revoke rejection pass here. |
| Trial 1 P2 / second reviewer P1-2 (test-owned tmux socket inode leak; simulated reject cleanup) | **Closed at harness level.** `cleanIsolatedTestWorkspace` kills the private isolated server and removes the whole workspace, asserting kill status; real reject transactions retire real resources. Product-side socket/directory preservation is now the ratified Decision 4C baseline, asserted by `assertAcceptedNamespacePreserved` before any harness removal. |
| Trial 1 second reviewer P0 (relay/snapshot path unreachable from the default helper) | **Closed structurally; execution verified only in the request's authenticated run.** `_run_session_port` unconditionally opens the retained connection (`_open_session_relay` → `_open_retained_tmux_connection`, `helper.py:4441-4553`, `:3914-3968`) with no `sessionPortOps` fallback and no stock-tmux capture fallback (`helper.py:4335-4433` raises when the retained connection is absent). On this host the composed transactions hard-fail for runtime absence (below), which is the specified fail-closed behavior, so the positive 24-byte transaction could not be independently re-executed here. |
| Trial 1 second reviewer P1 (121×40 / history-401 accepted) | **Closed.** The custom server command compares width/height/history (`cmd-agents-capture.c:176-186`), the helper re-compares every record field including `120`/`40`/`400` before accepting capture state (`helper.py:4380-4404`), and drift/history tests exist; their real-runtime lanes passed in the request's authenticated run. |
| Trial 2 reviewer A P0 (manufactured first positive) | **Closed structurally.** The exact named first positive drives `createFrozenPositiveRealHarness` (no `sessionPortOps`, real helper/PTY/relay/tmux chain, `relay.test.js:379-455`, `:529-576`); the manufactured harness remains only in honestly-scoped codec tests. Its execution here fails hard on runtime absence, so the passing result is the request's authenticated run, not an independent rerun. |
| Trial 2 reviewer A P1 (provider output forwarded after same-socket CWD drift) | **Closed within the ratified boundary.** Under 1B/5B live relay facets are diagnostic; `_forward_pty_to_relay` still runs the diagnostic before each forward and annotates it as non-authorizing (`helper.py:4684-4689`), transfer itself is retained-socket workload, and the candidate claims no stronger guarantee. |
| Trial 2 reviewer B P1-1 (drift between preflight and capture returned a snapshot) | **Closed.** Capture is one `agents-capture-v1` server-event-loop operation comparing generation, server PID, session, pane, pane PID, geometry, and history before returning bytes; stock separate metadata/`capture-pane` authority is gone from the bound path, and the revocation-race probe proves a capture linearized against revocation cannot settle. |
| Trial 2 reviewer B P1-2 (pathname replacement unlink during cleanup) | **Closed by 4C conformance.** Post-accept product cleanup performs no `unlink`/`rmdir` (`RelayRuntime.close(preserve_namespace=True)`, `helper.py:2700-2742`); `remove_owned_tmux_socket` is no longer reachable from any production path (fixture-only). Pre-`ACCEPT` reject teardown still removes the runtime by pathname, which the frozen parent reject rule itself mandates and Decision 4C does not amend. |

## Ratified-amendment conformance

- **1B retained socket/read-range:** all relay sends/receives/barriers use the
  original accepted socket object under the workload lock with exact counts;
  no reconnect or re-resolution exists; live-facet checks are
  diagnostic-revoke only. Conforms (subject to P1-1's settlement defect).
- **2A custom shared-server tmux:** one retained `-C new-session` control
  client per generation; requires reported version `3.6a-agents.1` and
  `agents-capture-v1`; `no-detach-on-destroy`, manual 120×40, history 400;
  owned `%pane`/`$session` retired pane-first/session-second on the same
  retained connection with "can't find" treated as authoritative absence;
  `kill-server` absent from the production path; the vendored patch keeps the
  shared server alive when its last session closes (disclosed `exit-empty`
  default flip), preserving the shared-server survival oracle. Conforms.
- **3B bounded process preservation:** `cleanup_sealed_utility_group` signals
  only the sealed `pid==pgid==sid` group TERM→grace→KILL before leader reap,
  treats `ESRCH` as already absent, never re-resolves (a diagnostic reader
  returning a different PID cannot redirect the signal — probe-verified), and
  preserves with zero signals when the anchor is lost; no numeric targeting
  of outside-group descendants or the relay exists. Conforms.
- **4C namespace preservation:** accepted-generation cleanup closes
  descriptors, records key `RETIRED` (normal pre-`ACCEPT` consumption) and
  socket/directory `PRESERVED`, performs no pathname removal, and never
  touches the shared tmux socket; tests assert the preserved state before any
  external harness removal. Conforms.
- **5B read-time retained PTY:** one nonblocking retained-master read assigns
  the returned range to `G` including pre-accept and mixed-producer bytes
  (probe-verified with two slave holders); writes are per-attempt workload
  effects with exact counts; no producer/foreground/time provenance is
  invented. Conforms.

## Gates run (exact totals) and attribution

Environment: Node `v22.22.1`, `/usr/bin/python3` (3.14), stock `tmux 3.6`,
Linux x86_64. The custom runtime `3.6a-agents.1` was not available (see
limits), so every custom-runtime lane hard-fails here by design.

| Gate | Result | Attribution |
|---|---|---|
| `node --test --test-concurrency=1 tests/gateway/process_supervisor_session_port_relay.test.js` | tests 56, pass 47, fail 8, skipped 1 (opt-in live probe), cancelled 0 | All 8 failures are runtime-absence hard failures: 3 composed real-helper transactions fail `SESSION_PORT_REVOKED` after the helper's version handshake rejects stock tmux; 5 host probes raise `RuntimeError: required tmux 3.6a-agents.1, observed tmux 3.6`. No silent skip; no other defect surfaced. |
| `node --test --test-concurrency=1 tests/gateway/process_supervisor_session_port_pty.test.js tests/gateway/process_supervisor_darwin.test.js` | tests 16, pass 14, fail 2, skipped 0 | Both failures are the two real-execution PTY tests failing `SESSION_PORT_REVOKED` for the same runtime absence; all deterministic and Darwin-seam lanes pass. |
| Five `gate RED:` tests on the candidate | tests 5, pass 5, fail 0 | Matches the request. |
| `git diff --check`, `git diff --check ac92d51..d7873eb`, `git diff --check f84825a` | clean | — |
| Static: `node --check` both suites; Python AST parse of helper+fixture; `sh -n` both builders; `manifest.json` parse | all pass | — |
| Vendored digests | `tmux-3.6a-agents.1.patch` = `2526659c…`, `cmd-agents-capture.c` = `4d80a861…` | Both match `manifest.json` and both builders exactly. |

TDD lineage independently replayed in disposable archive trees under
`/tmp/d007c-t3e-review.8DfBYq` (candidate bytes untouched):

| Replay | Result | Matches request |
|---|---|---|
| Six ratification oracles at `f84825a` (initial RED) | 6 tests, 0 pass, 6 fail | yes (RED recorded before implementation) |
| Same six at `0941b2d` (partial GREEN) | 6 tests, 6 pass, 0 fail | yes |
| `017c49d` five gates vs `0941b2d` implementation | 5 tests, 3 pass, 2 fail (patch whitespace; missing Darwin builder) | yes — exactly the disclosed `pass 3 / fail 2` |
| `8f848b3` five gates vs `0941b2d` implementation | 5 tests, 2 pass, 3 fail (whitespace; `-CC` vs required `-C`; Darwin builder) | yes — exactly the disclosed `pass 2 / fail 3` |
| Candidate `d7873eb` five gates | 5/5 pass | yes |

Bounded reviewer probes (unique private paths; no default socket, no shared
`ag-*` target, no network, no provider): the write/snapshot
rejection-settlement probe quoted under P1-1, run with the fixture-style
loader against the candidate helper over `socketpair` objects. The suite's
own runs used only per-test private `TMUX_TMPDIR` workspaces; post-run
inspection found no leaked fixture process, no new socket under
`/tmp/tmux-1000/` (only the pre-existing `default`), and a clean worktree.

## Verification limits

- **Custom runtime not independently reproduced.** The pinned source archive
  `tmux-3.6a.tar.gz` is not present anywhere on this host and the review
  forbids network, so `build-offline.sh` could not be run (the pinned
  builder image is cached; the archive is the missing input). The
  `/tmp/d007c-final-*` build/runtime evidence directories named by the
  request no longer exist (tmpfs), so the reported source digest, duplicate
  byte-identical builds, and binary digest remain request-authenticated
  claims, verified here only for internal consistency (patch/extension
  digests, builder pinning, and manifest cross-checks).
- **Live retained-channel probe not run** (opt-in lane skipped; requires the
  custom runtime). The moved-pane/sibling/shared-server survival oracle was
  reviewed at source level only.
- **Composed positive 24-byte transaction, real drift lanes, and real reject
  transaction** hard-failed here for runtime absence (the specified
  fail-closed behavior) and were not independently re-executed.
- **Native Darwin build/execution UNVERIFIED** (as disclosed); Linux-side
  Darwin seams pass.
- **`bash scripts/ci.sh` not run** (as disclosed by the request); it remains
  the required host/integration seal and nothing here substitutes for it.
- No deployment migration, default shared-server rollout, or long-duration
  residue measurement was performed or claimed.

## Process-deviation adjudication

The canonical `agents-gateway` spawn for this reviewer returned `TOOL_ERROR`
(Gateway rooted to another repository), so this review ran as the documented
supervised direct-tmux fallback under orchestration trace
`tr-d007c-t3-review-edb26804-e91f-44c2-955c-9452451a7ed1`, task
`ts-6051d62c-5e74-46a5-b373-ef7233f3ac0c`. The coder-side deviation (direct
orchestrator-driven Codex worktree, no Claude reviewer available during
implementation, no coder-owned output treated as review) is disclosed in the
request and is consistent with the orchestration profile's documented
exception; this verdict is the missing independent gate, and the disclosed
commit-subject and lineage-disclosure deviations are adjudicated under P2-1
and P2-2 above. Trial 3 remains within the 15-trial budget.

## Scope ruling

The 11 technical paths match the request exactly; the vendored
`gateway/vendor/tmux-agents/` package is the Decision 2A-ratified maintained
delta (source, patch, builders, manifest, license — no built binary, no npm
dependency, no lockfile change). Provider launch remains literal direct
`os.execve(launch["argv"][0], launch["argv"], launch["env"])`; tmux runs only
the direct-argv configured-runtime relay pane; the port path contains no
shell, no `send-keys`, no `capture-pane -e`/`-J`, no resize or history API,
no public attach endpoint, and no adapter/service/catalog splice. The 07b PTY
test edit adds only isolated-tmux environment and cleanup and removes no
accepted assertion. Control-mode command words are quote-escaped with
NUL/newline rejection and every interpolated value is format-validated. The
only worktree residue is the pre-existing untracked `gateway/node_modules`
symlink, untouched.

## Disposition

KO on P1-1. The correction is bounded to the `0x01` rejection-settlement path
plus one composed regression test; no design change, no new authority, and no
reopening of the ratified amendments is required. Trial 4 should submit the
corrected candidate with its RED/GREEN evidence and a complete lineage
disclosure per P2-1.
