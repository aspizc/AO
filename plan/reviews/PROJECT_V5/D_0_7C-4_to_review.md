# Review Submission - Project V5 D/0/07c (Trial 4)

## Requested reviewer

Please assign a fresh independent reviewer that did not implement this trial.
Review the complete Trial 4 candidate, not only the final production hunk,
against:

- `plan/PROJECT_V5/D/0/07c.md`;
- the frozen parent contract `plan/PROJECT_V5/D/0/07.md`;
- the independently approved post-`ACCEPT` design at
  `95185e0175e7b0619628488c3024ba2d1615418c`;
- the operator ratification at
  `ac92d51afc329449e31be7bfa91b77b255ae8fa4`;
- `D_0_7C-3_to_review.md` at
  `c38762a379a3d060fcf5e6ed21a58b95ecec27a2`; and
- the independent Trial 3 `reviewed_KO` verdict in
  `D_0_7C-3_result.md` at
  `1d8c952048b0950049eecacf27a4fff5eb72d785`.

This submission is evidence, not a self-verdict. Trial 4 is **unreviewed**.
It makes no integration, promotion, merge, tag, release, support,
default-runtime deployment, public splice, or `D/0/07d` claim.

## Trial 3 finding addressed

Trial 3 was KO for one blocking P1. A `WRITE_PROMPT` rejected before `F` by a
relay/tmux diagnostic mismatch revoked the accepted generation before its
authenticated fd-5 `ERROR(0x0009, 0x03)` could be written. The parent then
observed response-channel loss and surfaced `SESSION_PORT_WRITE_ABORTED`
instead of the required `SESSION_PORT_TERMINAL_CHANGED` / `identity`.

Trial 4 is deliberately bounded to that finding:

1. a composed regression sends the exact ASP1 `WRITE_PROMPT` through the real
   `_run_session_port`;
2. only `_binding_tmux_identity_reader` drifts `paneWidth` from 120 to 121 at
   FIFO-head verification;
3. the response-present case requires authenticated `ERROR(0x0009, 0x03)`,
   public `SESSION_PORT_TERMINAL_CHANGED` / `identity`, zero PTY bytes, then
   revocation and cleanup;
4. the response-reader-closed control remains
   `SESSION_PORT_WRITE_ABORTED` / `write`, with zero PTY bytes and the same
   cleanup; and
5. the helper defers relay-binding revocation around the write operation,
   settles a rejection while deferral is armed, unconditionally flushes in
   `finally`, and emits `WRITE_OK` only after deferral has cleared.

The parent, `settle_rejection`, `AcceptedRelayBinding`, and snapshot path are
unchanged.

## Complete lineage disclosure

### Pre-ratification technical ancestors

These two in-tree technical commits were omitted from the Trial 3 request and
recorded as Trial 3 P2-1. They are disclosed here:

```text
834d0b5b61c1981c1eebf81cf610d3ec02000e0c
tree 4bbcde8a1e24d33b2cfa591fcc2e9ac0b0e578e8
parent 8a6e5f6efb97914630696a2be7028c1f3bf56bc4
test(v5): expose D007c output binding gap (V5 D/0/07c Trial 3)

590e053fd4b9476df8618809eb9ae81d9c713e2b
tree 264b71a25f02ecbce914491a90791ad6f1bade4d
parent 834d0b5b61c1981c1eebf81cf610d3ec02000e0c
fix(v5): bind D007c output forwarding (V5 D/0/07c Trial 3)
```

The later design and operator authorization remain:

```text
95185e0175e7b0619628488c3024ba2d1615418c
tree 7f2a27697fc9cf06062bce23253a8913ce1e983c
parent f056236ea3f9cb48f7bb0ff448e07fcf04f587db
design(v5): classify same-holder relay and tmux-binding drift for D/0/07c

ac92d51afc329449e31be7bfa91b77b255ae8fa4
tree 974963e12fb39b74826fc55449584fb3b3d81ba5
parent 0db688bda8b5a85599ef61c94cb54dd0302d205d
docs(review): record D/0/07c five-amendment ratification (V5 D/0/07c)
```

### Trial 3 technical candidate

```text
f84825a51c565586071e142c76767039438a1330
tree 6b894154e75a0d94854eb5bc467f64184d832d2a
parent ac92d51afc329449e31be7bfa91b77b255ae8fa4
test(session-port): bind accepted generation effects (V5 D/0/07c Trial 3)

0941b2db9ccad5b18a9e1e4375677937cb3c1333
tree ccf2ecbbefc8937836e5943d57a366c0d2d9dd99
parent f84825a51c565586071e142c76767039438a1330
feat(session-port): enforce retained tmux and bounded cleanup

357de4583531519eabd959969b3cee94e7799e04
tree b5253a7bc4c90014f144998c3d8016ea1d79f80a
parent 0941b2db9ccad5b18a9e1e4375677937cb3c1333
test(session-port): add production authority gate RED

017c49daeee23b701b43e564c7737eb031af6fbe
tree fb163658fa7b700f9904e8b3ba1e706853cf2029
parent 357de4583531519eabd959969b3cee94e7799e04
test(session-port): split authority gate RED evidence

8f848b3f9ee8a72a6b4872f0fe64b445bd10ba98
tree 0cb8e279ccf0e32522275d4adc1d01647800f822
parent 017c49daeee23b701b43e564c7737eb031af6fbe
test(session-port): restore isolated retained-channel probe

d7873eba1a9405fec92875020854ed67f16a03b1
tree 1db04ff47b71b1f6d04ecf453a53b96dc0e83dba
parent 8f848b3f9ee8a72a6b4872f0fe64b445bd10ba98
feat(session-port): close retained tmux runtime gaps (V5 D/0/07c Trial 3)
```

The immutable intermediate-subject deviation recorded by Trial 3 remains
visible and is not rewritten.

### Trial 3 review evidence

```text
c38762a379a3d060fcf5e6ed21a58b95ecec27a2
tree 447fef5ad5b3981326b6f02ca52d907832986b70
parent d7873eba1a9405fec92875020854ed67f16a03b1
docs(review): request D_0_7C trial 3 review (V5 D/0/07c Trial 3)

1d8c952048b0950049eecacf27a4fff5eb72d785
tree 57cc8d4e16240a829bda929106038c7f11638522
parent c38762a379a3d060fcf5e6ed21a58b95ecec27a2
docs(review): record D/0/07c Trial 3 verdict (V5 D/0/07c)
```

Trial 4 was intentionally recorded directly on the frozen technical candidate
`d7873eb`, rather than on the request/verdict documentation branch. The
Trial 3 review commits are therefore authenticated review inputs but are not
ancestors of the Trial 4 commits. This non-append-only review-document
lineage is disclosed for independent adjudication; neither review commit was
rewritten or represented as an ancestor.

### Trial 4 RED

```text
18beef749a00f69e8c5f3230b267671ceed89cb7
tree 5e0e96315f935ff57cd9abec9e842fdbfcc74a68
parent d7873eba1a9405fec92875020854ed67f16a03b1
test(session-port): preserve pre-F write rejection response (V5 D/0/07c Trial 4)
```

The orchestrator authenticated and durably recorded this exact test-only RED.
Artifact `art-991ad90b-4d39-46f8-b052-616ebe4c81e2` records one expected
failure and one passing fd5-loss control. The failing response-present case
observed `SESSION_PORT_WRITE_ABORTED` where
`SESSION_PORT_TERMINAL_CHANGED` was required; the loss control remained
`SESSION_PORT_WRITE_ABORTED`.

### Trial 4 GREEN

```text
5ffdf510709f9c2230510bf85116b93e1f70ff66
tree bd626e0f9bea2520b7cdfd179c1258a7b3a339df
parent 18beef749a00f69e8c5f3230b267671ceed89cb7
fix(session-port): defer pre-F write rejection revocation (V5 D/0/07c Trial 4)
```

The RED commit was not amended.

## Test-harness correction disclosed

After the production correction made fd5 delivery succeed, the
response-present test waited for `fixtureResult` before `t.after` could close
fd4. The RED fixture's `FixtureChannel.pop()` always returned `None`, so that
successful path could not observe parent retirement and finish.

The GREEN commit contains exactly one bounded fixture correction:

- `FixtureChannel.pop` is now an instance method;
- once `state["responseDelivered"]` is true, its first call records
  `parent-request-channel-retired` and returns exactly
  `{protocol: helper.PROTOCOL, type: "terminate", reason: "cancelled"}`;
- later calls return `None`; and
- the fd5-loss control never sets `responseDelivered`, so its behavior is
  unchanged.

This is a test-lifecycle correction, not production authority. No debug edit
remains. The only production path changed by Trial 4 is
`gateway/src/adapters/process_supervisor_helper.py`.

## Production correction

At the `WRITE_PROMPT` branch in `_run_session_port`:

1. `relay_binding.defer_revocation()` is armed before
   `verified_pty_write`, including its FIFO-head `verify`;
2. the existing outcome and authenticated error construction remain inside
   the deferral;
3. the existing `settle_rejection(response)` is called while deferral is
   armed;
4. `relay_binding.flush_deferred_revocation()` runs in an unconditional
   `finally`; and
5. the successful `respond(WRITE_OK)` remains after the `finally`.

This preserves the existing `settle_rejection` ordering: an authenticated
error is written while the generation can still authorize that workload
effect, pending revocation is then flushed, and the helper waits for parent
request-channel retirement. Response-write loss still returns
`supervisor_lost`, which the parent maps to the existing write-aborted
contract.

## Gates and evidence

### Focused Trial 4 pair

```text
node --test-name-pattern='^(preserves the authenticated pre-F write rejection before generation cleanup|keeps post-dispatch fd 5 loss mapped to write aborted)$' \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 2
pass 2
fail 0
skipped 0
duration_ms 204.020094
```

The response-present case proves:

- public `SESSION_PORT_TERMINAL_CHANGED` / `identity`;
- authenticated ASP1 `ERROR`, error id `0x0009`, phase id `0x03`;
- zero PTY bytes;
- response delivery before generation revocation;
- parent request-channel retirement after revocation; and
- runtime, PTY, and utility cleanup after parent retirement.

The response-reader-closed case proves:

- public `SESSION_PORT_WRITE_ABORTED` / `write`;
- no fd5 frame;
- zero PTY bytes; and
- revoked generation with the same teardown.

### Preserved deterministic gates

```text
node --test --test-concurrency=1 --test-name-pattern='^gate RED:' \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 5
pass 5
fail 0
skipped 0
```

The maximal deterministic relay selection, excluding only the custom-runtime
and opt-in live lanes, passed:

```text
tests 49
pass 49
fail 0
skipped 0
duration_ms 1807.92
```

Static checks passed:

- `node --check tests/gateway/process_supervisor_session_port_relay.test.js`;
- Python parse/compile checks for the helper and fixture;
- `git diff --check`;
- `git diff --check d7873eb`;
- no `DEBUG` occurrence in the helper, fixture, or focused JS suite; and
- the focused JS suite has no post-RED uncommitted or GREEN change.

### Runtime-limited gates

The host provides stock `tmux 3.6`, not the required custom
`tmux 3.6a-agents.1`.

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 14
fail 2
skipped 0
```

Both failures are the real-runtime PTY lanes failing closed for the missing
custom runtime. All deterministic and Darwin-seam tests passed.

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 58
pass 49
fail 8
skipped 1
```

All eight failures require the unavailable custom runtime: three composed
real-helper transactions fail closed at the version handshake and five host
probes report `required tmux 3.6a-agents.1, observed tmux 3.6`. The one skip
is the opt-in live retained-channel probe. Both new Trial 4 tests pass inside
this run.

The repository Gateway gate was attempted once:

```text
npm --prefix gateway test

tests 129
pass 61
fail 68
skipped 0
duration_ms 34244.365026
```

`gateway/node_modules` is unavailable. The failures are dominated by missing
packages including `better-sqlite3`, `zod`, `redis`, and
`@modelcontextprotocol/sdk`; the process-supervisor real-runtime lanes also
have the custom-tmux limitation above. No dependency or lockfile was changed.
A temporary dangling integration symlink used to attempt this gate was
removed without touching its target.

The dependency-free manifest validation was also attempted:

```text
python3 scripts/ci_gate.py --validate-only

status invalid_manifest
failed test count 0
```

It reports stale inventory SHA-256 values for `lint.python`, `lint.gateway`,
`test.structure`, `test.gateway`, `policy.registry`, `test.cli`, and
`test.redis-live`. Updating CI inventories is outside this bounded
helper-plus-regression correction and was not performed.

The full `bash scripts/ci.sh` integration seal was not run. Missing Gateway
dependencies and the custom runtime already make its relevant host lanes
unavailable here. No focused passing evidence is represented as a substitute
for that seal.

## Scope and changed-path allowlist

RED range `d7873eb..18beef7`:

```text
M tests/gateway/process_supervisor_session_port_fixture.py      +340 / -0
M tests/gateway/process_supervisor_session_port_relay.test.js   +265 / -0

2 paths
605 insertions
0 deletions
```

GREEN range `18beef7..5ffdf51`:

```text
M gateway/src/adapters/process_supervisor_helper.py              +43 / -39
M tests/gateway/process_supervisor_session_port_fixture.py       +14 /  -8

2 paths
57 insertions
47 deletions
```

Complete Trial 4 technical range `d7873eb..5ffdf51`:

```text
M gateway/src/adapters/process_supervisor_helper.py              +43 / -39
M tests/gateway/process_supervisor_session_port_fixture.py      +346 /  -0
M tests/gateway/process_supervisor_session_port_relay.test.js   +265 /  -0

3 paths
654 insertions
39 deletions
```

No parent JS, binding-class definition, `settle_rejection`, snapshot branch,
vendor, manifest, package, lockfile, plan sheet, policy, service, catalog,
schema, migration, or deployment path changed in the technical range.

This request commit adds only:

```text
A plan/reviews/PROJECT_V5/D_0_7C-4_to_review.md
```

## Required adversarial review

At minimum, the independent reviewer should:

1. authenticate the full lineage, including `834d0b5`/`590e053`, the external
   Trial 3 request/verdict commits, and the direct `d7873eb` Trial 4 parent;
2. replay the test-only RED and verify its one expected product failure plus
   passing fd5-loss control;
3. adjudicate the disclosed post-RED `FixtureChannel.pop` lifecycle
   correction and verify it cannot alter the lost-fd5 result;
4. inspect the exact ASP1 request and authenticated response bytes;
5. verify pane-width drift occurs only at FIFO-head revalidation and no PTY
   byte is accepted;
6. challenge response-sideband loss before, during, and after validation;
7. prove rejection response delivery precedes revocation and cleanup, while
   successful `WRITE_OK` is sent only after deferral clears;
8. verify all early returns and exceptions unconditionally flush deferred
   revocation;
9. confirm the parent mapping, `settle_rejection`, binding class, and snapshot
   path are unchanged; and
10. rerun the custom-runtime and repository integration lanes in a complete
    environment before any integration decision.

## State boundary

`D/0/07c` Trial 4 is implementation-complete and review-pending only.
`D/0/07d` remains blocked on an independent `reviewed_OK` and subsequent
operator integration decision. No promotion or release action is authorized
by this request.
