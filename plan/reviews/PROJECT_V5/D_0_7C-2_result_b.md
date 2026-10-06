# Second Independent Review Result — Project V5 D/0/07c Trial 2 (reviewer B)

## Verdict

**reviewed_KO**

The submitted 121x40 and `history-limit=401` cases now correctly return
`SESSION_PORT_TERMINAL_CHANGED` with `snapshot: null`; drift introduced by the
barrier is also rejected, a rejected binding is not revived by restoring
120x40, and malformed or absent history evidence fails closed. The frozen
canonicalization vector and the real tmux 3.6 figures remain exact, both
required gates pass with no skip, and the ordinary suite assertions report
complete success- and failure-path retirement for the resources they expose.

The candidate is nevertheless KO for two P1 findings in this reviewer's
assigned lens:

1. A real outside tmux client can resize the pane to 121x40 after the last
   dimension check and immediately before `capture-pane`. The candidate
   performs the capture, returns `"drift-screen\n"`, and leaves the binding
   active instead of returning terminal-changed with no snapshot.
2. Tmux socket cleanup checks one pathname entry, waits for that pathname to
   become serverless, and then unlinks the pathname without retaining or
   rechecking the originally approved inode identity. A same-user replacement
   in that interval can therefore make cleanup delete a different entry. The
   submitted point-in-time wrong-path, wrong-kind, and live-server cases pass,
   but they do not prove the claimed exact-inode removal rule.

This is a result-only verdict for D/0/07c Trial 2. It makes no integration,
promotion, release, D/0/07d, or splice claim.

## Severity table

| Severity | Count | Findings |
|---|---:|---|
| P0 | 0 | None in reviewer B's assigned lens. The default real-helper P0 closure was assigned to the other reviewer and is not adjudicated here. |
| P1 | 2 | A stable outside resize in the final preflight-to-capture window returns a snapshot; selective tmux-socket removal is pathname-based rather than bound to the exact approved inode. |
| P2 | 0 | None. |

## Reviewed lineage and independence

The reviewed branch and request commit were:

```text
review/V5-D-0-07c-2b
2dd8bd2f071640ff2bb64ba6336a4d6aa4803891
tree b26278f616b3065ab2fa13cd169cee6de0a4de94
parent aa659bda838acd3afd99637111c005429c6f518e
```

The Trial 2 technical lineage is:

```text
RED   412328fe2fc699c44ca16b3218fc54cda7d00588
base  82fd5ff379dde98f3e077e081d5929cad845d066

GREEN aa659bda838acd3afd99637111c005429c6f518e
parent 412328fe2fc699c44ca16b3218fc54cda7d00588
```

`412328f` changes only the three test paths. `aa659bd` changes only the two
production supervisor paths. I did not implement the candidate, use a
sub-agent, push, or modify candidate source, tests, or plan sheets.

## Blocking findings

### P1-1 — outer-pane drift after preflight and before capture returns a snapshot

The documented invariant is exact 120x40/400 state throughout the barriered
capture transaction. Any observed drift must return
`SESSION_PORT_TERMINAL_CHANGED`, return no payload, revoke, and cancel.

The candidate does revalidate the accepted binding before and after the relay
barrier:

- `capture_bound_tmux_snapshot` revalidates at
  `gateway/src/adapters/process_supervisor_helper.py:3224-3239`;
- `capture_tmux_snapshot` then reads current identity/history and validates
  dimensions at `:3153-3165`;
- metadata runs at `:3170-3174`;
- `capture-pane` runs at `:3175-3179`;
- no terminal-identity/history validation occurs after metadata or capture.

I added one ordinary conformance test only to a disposable copy of the
existing relay suite and fixture. It used tmux 3.6, one unique private socket,
and only `d7c2b-drift-host-*` targets. The fixture invoked a separate tmux
client after the real metadata command returned and before the real capture
command ran. That client changed the pane from 120x40 to 121x40 and left it
there.

Required and actual:

| Field | Required | Actual |
|---|---|---|
| Dimensions immediately before capture | drift must reject | `121\t40` |
| Capture calls | 0 | 1 |
| Disposition | `SESSION_PORT_TERMINAL_CHANGED` | `ACCEPTED` |
| Snapshot | `null` | `"drift-screen\n"` |
| Revoked | `true` | `false` |

The ordinary assertion was RED:

```text
tests 1
pass 0
fail 1

actual:
{
  captureCalls: 1,
  dimensionsBeforeCapture: "121\t40",
  disposition: "ACCEPTED",
  resizedByExternalTmuxClient: true,
  revoked: false,
  snapshot: "drift-screen\n"
}
```

This is not the broader D/0/07d host-race gate. It is the D/0/07c fixed-pane
capture invariant expressly assigned by this review brief.

Required correction: keep the exact frozen capture argv, but make settlement
conditional on current bound tmux identity and configured history being exact
at the capture boundary and after capture. Add a real outside-client timing
case that changes the pane after metadata and requires terminal-changed,
`snapshot: null`, revocation, and zero accepted capture result.

### P1-2 — cleanup can unlink a replacement pathname entry

`remove_owned_tmux_socket` performs:

1. pathname/name validation at
   `gateway/src/adapters/process_supervisor_helper.py:3035-3041`;
2. one `lstat` plus type/uid validation at `:3042-3050`;
3. repeated pathname connection probes at `:3051-3062`;
4. unconditional `os.unlink(socket_path)` at `:3063`.

The function accepts no expected `st_dev/st_ino`, does not retain an inode
identity established when the owned tmux server was created, and does not
re-read and compare the entry after the serverless wait. Consequently the
entry approved by `lstat` need not be the entry deleted by `unlink`.

The committed preserve oracle passes for its four point-in-time cases:

```json
{
  "path": {"disposition": "REJECTED", "preserved": true},
  "identity": {"disposition": "REJECTED", "preserved": true},
  "liveServer": {"disposition": "REJECTED", "preserved": true},
  "serverlessRemoved": true
}
```

Those are useful guards, but the "path" case supplies a mismatching basename
and the "identity" case supplies a regular file before the sole `lstat`.
Neither changes the directory entry after approval. The implementation
therefore does not establish the handoff's stronger claim that only the exact
owned socket inode can be removed.

Required correction: retain the exact identity of the socket created for this
owned server, fail closed if the entry changes before deletion, and add a
mutation-sensitive same-path replacement case. If the implementation cannot
prove the entry is still the owned inode, it must preserve/refuse rather than
unlink a possibly unrelated entry.

## Terminal-drift reproductions

All real-tmux cases used tmux 3.6, a fresh private `TMUX_TMPDIR`, a unique
socket name, and targets that did not start with `ag-`. No default tmux socket,
shared server, or `ag-*` session was addressed.

### Submitted Trial 1 regressions

The existing `bound-relay-host-probe` returned:

| Drift before capture | Disposition | Snapshot |
|---|---|---|
| pane 121x40 | `SESSION_PORT_TERMINAL_CHANGED` | `null` |
| `history-limit=401` | `SESSION_PORT_TERMINAL_CHANGED` | `null` |

The real values were `dimensions: "121\t40"` and
`historyLimit: "401"`. These two Trial 1 findings are closed.

### Additional cases

The disposable ordinary conformance test returned:

| Case | Result |
|---|---|
| Barrier callback resizes to 121x40 | PASS — terminal-changed, `snapshot:null`, revoked, zero capture calls. |
| First request observes 121x40 and rejects; pane is restored to 120x40; same binding is retried | PASS — both attempts terminal-changed with `snapshot:null`; restoration did not revive the revoked binding. |
| History reader returns non-integer `four-hundred` | PASS — terminal-changed before barrier/capture, `snapshot:null`, revoked. |
| History reader returns no value | PASS — terminal-changed before barrier/capture, `snapshot:null`, revoked. |
| Outside tmux client resizes to 121x40 after metadata and before capture | **FAIL** — one capture, accepted `"drift-screen\n"`, binding not revoked (P1-1). |

The fixture's returned cleanup value for these cases was:

```json
{
  "ownedSocketAbsent": true,
  "processes": [],
  "targets": []
}
```

## Retirement, leak, and preservation evidence

### Success path

The ordinary full relay suite passed
`default real helper returns the rendered 24-byte snapshot through the
authenticated relay`. Its cleanup assertions require:

- the provider and helper identities to be absent after cancellation;
- exactly one supervisor child to have been spawned;
- relay-runtime inventory in the fresh workspace to remain unchanged/empty;
- no non-directory tmux entry to remain in the private tmux root.

The independent real host canonicalization fixture additionally returned
`ownedSocketAbsent: true`.

### Failure paths

The ordinary full suite passed
`default real helper retires the bound port after real tmux identity drift`.
That case obtains `SESSION_PORT_TERMINAL_CHANGED` after a real resize, waits
for utility and supervisor exit, and requires empty relay-runtime and private
tmux non-directory inventories.

The authenticated real reject transaction returned:

```json
{
  "accepted": true,
  "brokerQueueHex": "",
  "changedField": "paneWidth",
  "disposition": "SESSION_PORT_TERMINAL_CHANGED",
  "keyRemoved": true,
  "observedPaneWidth": 121,
  "paneRemoved": true,
  "relayExited": true,
  "relaySocketRemoved": true,
  "revoked": true,
  "runtimeRemoved": true,
  "sameSocket": true
}
```

Its suite-returned final inventory was:

```json
{
  "ownedSocketAbsent": true,
  "processes": [],
  "runtimeDirectories": [],
  "targets": []
}
```

### Selective preserve cases

The committed ordinary assertion confirms:

- mismatching socket name/path: rejected and preserved;
- regular-file substitution present at validation: rejected and preserved;
- live Unix server: rejected and preserved;
- same-user serverless socket at the accepted path: removed.

These point-in-time cases pass. P1-2 concerns replacement after the sole
identity check and before pathname unlink, which they do not cover.

### Tooling-limited inventory coverage

**provider content filter interrupted this check**: an additional
reviewer-side direct enumeration of socket-directory and process-table
before/after state. Per operator direction, I did not retry that introspection
and did not silently treat it as coverage. The cleanup conclusions above are
limited to ordinary values and assertions returned by the existing relay
suite and fixture.

## Canonicalization regression adjudication

PASS.

The production builder and every real host case used exactly:

```json
["capture-pane","-p","-N","-T","-t","<tmuxTarget>","-S","-400"]
```

No `-e` or `-J` was present. The frozen algorithm still:

- retains every captured history row, including blank rows;
- uses `max(cursor_y, emitted_extent)` for visible-row selection;
- excludes only unused empty visible padding;
- preserves completed blank rows and content below a moved cursor;
- preserves emitted spaces and tabs within retained rows;
- appends one LF per retained row, including the final retained row;
- returns zero bytes when no row is retained;
- enforces the 65,536-byte cap;
- truncates only the oldest prefix and advances off a UTF-8 continuation byte.

The focused suite passed the untouched, exact 24-byte, completed-blank,
history/below-cursor, row-end whitespace, invalid metadata/row-count,
final-LF, cap, and Unicode scalar-boundary cases.

My real tmux 3.6 host reproduction returned:

| Host case | Raw capture bytes | Canonical value | Canonical bytes |
|---|---:|---|---:|
| Untouched pane | 40 | `""` | 0 |
| `ready`, `status`, `ack:status` | 61 | `"ready\nstatus\nack:status\n"` | 24 |
| `edge  ` and `next` | 50 | `"edge  \nnext\n"` | 12 |
| ANSI `A`, red `B`, `C` | 43 | `"ABC\n"` | 4 |

The row-end-space case authenticated and reported
`livePid === panePid`. Detailed authentication/identity binding remained the
other reviewer's assignment.

## Scope ruling

PASS for changed-path scope, with the two correctness findings above.

The technical candidate changes exactly:

```text
gateway/src/adapters/process_supervisor.js                       +6 /  -1
gateway/src/adapters/process_supervisor_helper.py              +737 / -25
tests/gateway/process_supervisor_session_port_fixture.py      +1085 /  -2
tests/gateway/process_supervisor_session_port_pty.test.js        +10 /  -2
tests/gateway/process_supervisor_session_port_relay.test.js     +443 / -12
```

The request commit adds only
`plan/reviews/PROJECT_V5/D_0_7C-2_to_review.md`.

- The JS production edit adds only private helper launch-record fields for
  target and configured runtime. It does not change the 07a public
  capability, result shapes, error table, or ASP1 codec.
- The touched 07b PTY test adds a fresh private tmux root and makes tmux
  available to the helper. It removes no accepted write assertion. Exact
  `status\r`, literal provider argv, PID/PGID/SID/foreground identity,
  120x40 PTY, terminal equivalence, provider-free boundaries, and the
  zero-byte foreground-change rejection remain asserted and passed.
- Provider launch remains literal direct
  `os.execve(launch["argv"][0], launch["argv"], launch["env"])`.
  The tmux argv at
  `gateway/src/adapters/process_supervisor_helper.py:3318-3330` contains only
  the configured runtime and `--session-port-relay`; it is not a provider
  launch.
- No service, catalog, public adapter, schema, manifest, lockfile, public
  attach endpoint, or public response surface changed.
- No port-path shell, `send-keys`, `capture-pane -e`, or `-J` was introduced.
- No `tests/gateway/process_supervisor_session_port.test.js`, full host race
  matrix, service composition, or public splice entered the candidate.
  D/0/07d's full composition/race gate was not started.

## Mutation reruns

I copied the candidate helper, JS adapter, existing relay suite, and existing
fixture into fresh disposable `/tmp` trees. The unmodified three targeted
oracles passed 3/3. Every mutant compiled before its named test ran.

| Guard removed/weakened | Existing named oracle | Mutant evidence | Result |
|---|---|---|---|
| `capture_preflight` | `rejects real history-limit drift before capture` | accepted history 401 and returned `"after-resize\n"` instead of `snapshot:null` | KILLED |
| `bound_before_capture` | `revalidates frozen tmux server session and pane identity before barrier and capture` | after-barrier replacement became `ACCEPTED`, `captureCalls:4`, `revoked:false` | KILLED |
| `owned_socket_path` | `guards owned tmux socket retirement to the exact serverless socket inode` | wrong-path case became `ACCEPTED`, `preserved:false` | KILLED |
| `owned_socket_identity` | same owned-socket oracle | regular-file substitute was deleted; fixture reddened on its now-missing preserve target | KILLED |
| `owned_socket_serverless` | same owned-socket oracle | live-server case became `ACCEPTED`, `preserved:false` | KILLED |

Result: **5/5 selected handoff mutants killed; 0 survivors**. The width half
of preflight remains independently guarded by tmux identity parsing; the
history-401 oracle is the test that kills removal of the combined explicit
preflight check.

## Gate outputs

Environment:

```text
Node v22.22.1
Python 3.14.4
tmux 3.6
```

Focused relay gate:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_relay.test.js

tests 38
pass 38
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 1406.707564
```

Inherited PTY/Darwin gate:

```text
node --test --test-concurrency=1 \
  tests/gateway/process_supervisor_session_port_pty.test.js \
  tests/gateway/process_supervisor_darwin.test.js

tests 16
pass 16
fail 0
cancelled 0
skipped 0
todo 0
duration_ms 911.906464
```

Both `git diff --check` and
`git diff --check 82fd5ff..aa659bd` exited 0 with no output. Python
compilation of the disposable mutation helpers and `node --check` of the
disposable conformance suite exited 0.

Per the brief, `bash scripts/ci.sh` was not run.

## What I did and did not verify

Verified:

- request/RED/GREEN lineage and changed-path scope;
- both exact required gates with no failure or skip;
- listed real width-121 and history-401 rejection on a private tmux socket;
- barrier-time resize, no resurrection after restoration, malformed/absent
  history, and the outside-client pre-capture resize;
- suite-returned success and failure retirement values, empty inventories,
  and the three preserve/one-delete socket cases;
- source-level exact-inode selectivity and the missing identity recheck before
  pathname unlink;
- exact capture argv, real 40->0, 61->24, and 50->12 figures;
- row selection, unused-padding exclusion, final LF, cap, and oldest-prefix
  scalar-safe truncation;
- five independently recreated drift/retirement mutation kills;
- no provider launch through tmux, no shell or `send-keys`, no `-e`/`-J`,
  no public attach endpoint, no adapter/service/catalog splice, and no full
  D/0/07d gate;
- the 07b test edit retained its accepted write and zero-byte rejection
  assertions.

Not verified or not owned:

- The P0 real-helper functional-path closure and the detailed post-`ACCEPT`
  peer/process/tmux identity binding were the other reviewer's assignment.
  I used their ordinary paths only where necessary to exercise reviewer B's
  drift and retirement invariants.
- The direct socket-directory/process-table enumeration was interrupted by
  the provider content filter and was not retried; cleanup evidence is the
  existing suite/fixture's returned assertions only.
- No Darwin host was available; the deterministic Darwin gate passed.
- I did not run the full D/0/07d composition/race matrix, live Codex or Claude
  providers, network behavior, full CI, integration, promotion, or release.

The pre-existing untracked `gateway/node_modules` entry was left untouched.
