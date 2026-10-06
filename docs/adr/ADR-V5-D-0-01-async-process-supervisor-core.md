# ADR V5-D-0-01: Standalone async process supervisor core

- Status: Proposed for independent `D_0_1_CORE` review
- Date: 2026-07-26
- Task: Project V5 `D/0/01`, core slice

## Context

The Gateway needs one nonblocking process boundary that preserves literal
argv elements, streams output with backpressure, applies one absolute
one-shot budget, and cleans a complete owned process tree after cancellation
or abrupt caller/supervisor loss. This core is deliberately not wired into
provider adapters or lifecycle services; that splice has separate C and H
review dependencies.

The historical FIFO boundary is not retained. A FIFO creator, FIFO utility,
shell control channel, and import-time ambient Python lookup would each add a
second execution plan and another cleanup race.

## Decision

`createProcessSupervisor()` is a standalone async factory. `start()` accepts:

- one immutable configured runtime plan
  `{ executable, args, env }`;
- an absolute utility argv array, explicit environment, cwd, and session ID;
- either `mode: "one-shot"` with one absolute Unix-millisecond deadline, or
  `mode: "persistent"` with no deadline; and
- optional stdout/stderr writable streams.

The implementation rejects unknown request fields. In particular, there is
no FIFO option. Output uses separate OS pipes and Node stream backpressure.
Caller-owned destinations are never ended or destroyed by the supervisor.
Provider output never shares the bounded JSON control transcript.

The launch record is encoded to UTF-8 exactly once before spawn. Its complete
JSON-line frame must be strictly smaller than the helper's 1 MiB control
limit; reaching the limit is invalid. Argv, runtime args, environment entries,
individual encoded arguments/values, paths, and session IDs also have
deterministic count/byte limits. These checks happen before runtime creation,
so an oversized request cannot create S or write a partial frame. The control
writer serializes whole pre-encoded frames, waits for both the write callback
and `drain` after backpressure, and maps synchronous write failures,
asynchronous stream errors, callback `EPIPE`, or premature close to the same
fixed control failure. Once an authenticated lease exists, a failed control
channel activates only the exact fallback described below.
The writer owns one explicit disposer: every public terminal path removes its
global `error`/`close` listeners, rejects any still-active private write, and
severs its failure callback before completion is resolved or rejected.

The configured runtime executable receives its configured arguments unchanged
and then the absolute helper path. This is the only interpreter plan. A
configured shebang wrapper is supported even when `PATH` has no Python. The
helper never looks up or starts `python3`.

The utility child calls:

```text
execve(argv[0], argv, env)
```

after an exact pre-exec identity handshake. It does not use `execvp`, a shell,
command interpolation, or an `ENOEXEC` fallback. Cwd and utility-exec failures
produce fixed provider-data-free errors.

## Topology and authority

```text
caller C
  |
  +-- detached supervisor S (PID = PGID = SID)
        |
        +-- persistent reaper R (member/anchor of S's PGID and SID)
              |
              +-- utility leader U (PID = PGID = SID)
                    |
                    +-- utility descendants
```

S creates a CLOEXEC liveness pipe before forking R. R owns the utility and is
never replaced by it. R also retains the caller control-pipe read end; S closes
its copy. Therefore:

- caller `SIGKILL` becomes control-pipe EOF at R;
- supervisor S `SIGKILL` becomes liveness-pipe EOF at R; and
- cancellation is one idempotent control command.

R emits `reaper_ready` before utility creation. The event binds S and R's
PID/start-token/PGID/SID, a launch binding digest, and SHA-256 of a private
caller nonce. The caller re-reads Linux process identities before accepting
the event. Only then may it release utility creation.

U calls `setsid()`, reports its exact identity, and waits. The caller validates
that identity and binding digest before sending `continue`; R registers its
child-exit observer before that release. The binding digest covers executable,
argv, cwd, and adapter/session identity without placing those values in the
transcript.

If S exits unexpectedly, caller-side fallback is fail-closed. It revalidates
the still-live R anchor and signals `SIGTERM` exactly once to S's authenticated
negative PGID. Missing, malformed, stale, PID-reused, start-token-mismatched,
or group-mismatched leases cause zero numeric signals. R interprets that TERM
as a cleanup request. There is no PID-only or pattern fallback.

## Deadline and settlement

The one-shot deadline is an absolute timestamp shared by caller and R; setup,
identity gates, execution, output transfer, and destination write callbacks all
consume the same budget. The caller uses one injected scheduler timer for
responsiveness while R independently compares the same absolute timestamp so
caller loss cannot remove the budget. The timer remains armed after utility or
helper exit and is cleared only when the public completion promise settles. No
stage creates a new duration.

Persistent mode rejects a supplied deadline and arms no scheduler timer.
Explicit cancel, deadline, stream, transcript, and control races use
first-observed-wins precedence. The winner is immutable, writes at most one
termination command, and owns the one completion promise. A helper terminal
reason observed before a local failure wins, except that a normal `exited`
event remains provisional until output transfer completes. Thus a sink failure
after utility exit still rejects with `PROCESS_STREAM_FAILED`, and a deadline
that expires while a sink callback is pending still resolves `timed_out`.

Public settlement requires all three terminal gates: child exit, one
idempotent transcript terminal transition, and output completion or local
output abort. Stream failure settlement therefore occurs only after R has
cleaned and S has exited. Deadline/cancel abort detaches the supervisor's
listeners, resumes the owned source pipe for bounded draining, and stops
waiting for the caller-owned destination; it does not destroy that
destination.

Output and transcript boundaries use two distinct phases. Logical close locks
the first cause, stops data flow, and queues one `setImmediate` sentinel in the
event loop's check phase while an idempotent `error` guard remains installed.
A boundary contains exactly the error emissions observed before that sentinel
runs. This includes synchronous duplicates and all `process.nextTick` and V8
microtasks already racing from the callback that closed the boundary, including
nested work they enqueue before the sentinel. It intentionally excludes errors
emitted after the sentinel: at that point ownership has returned to the caller,
and the supervisor does not claim to contain arbitrary future emissions.

The sentinel resolves the local gate. Central finalization then disposes every
transfer, transcript parser, and control writer before public settlement.
Disposal removes all listeners, nulls strong source/destination and failure
handler references, and detaches every pending write-callback lease. A child
spawn error closes the transcript through the same sentinel rather than
bypassing its active boundary.

A detached callback lease cannot re-enter supervisor state. If a caller later
releases a previously blocked writable callback with an error, the callback
installs a no-op `error` guard and queues the same check-phase sentinel before
returning. The guard therefore covers both the Writable's paired error and a
duplicate queued as a microtask after the callback returns. Until the sentinel
runs it retains only the caller-owned Writable and guard-local state; it has no
reference to the transfer, failure handler, supervisor, completion, or
termination path. The supervisor neither invokes nor awaits the callback and
never ends or destroys the caller-owned sink.

## Linux cleanup guarantee

R calls `prctl(PR_SET_CHILD_SUBREAPER, 1)` before readiness. U is kept
wait-observable and unreaped while its isolated process group is terminated:

1. exact U group `SIGTERM`;
2. exact adopted-child TERM during the bounded grace period;
3. exact U group `SIGKILL`;
4. exact start-token-validated adopted-child KILL; and
5. repeated owned-child reaping until R has no children.

Keeping U wait-held prevents PID/PGID reuse during group signaling. A
descendant that calls `setsid()` becomes an adopted direct child after its
parent dies and is then signaled and reaped by exact PID/start token.
Unrelated sentinels are never group members or R descendants.

## Darwin limitation

Darwin has no equivalent application-level subreaper facility. R registers
`EVFILT_PROC` with `NOTE_EXIT` through `kqueue` before releasing U. Cleanup is
therefore limited honestly to the direct child leader and members that remain
in U's isolated PGID (`child-leader+same-pgid`). R can signal that group and
reap U, but cannot claim authority over a descendant that escapes into a new
session and is reparented outside R.

The default caller fallback is disabled on Darwin because Node has no native
start-token reader in this core; the in-process R liveness pipe remains the
supervisor-loss authority. Native Darwin execution is a later platform gate;
this slice supplies and tests the deterministic kqueue-before-release seam.

## Error and data boundary

Control events contain only protocol names, fixed reasons, digests, and
process identities. They contain no utility argv, environment, stdout,
stderr, or provider error text. Public errors use fixed codes/messages and do
not serialize a rejected executable, argument, environment value, output
chunk, or raw helper exception.

Source error/close and destination error/close are terminal stream failures.
The transfer is detached, sibling output is aborted, and exact cleanup begins
automatically; callers do not need to call `cancel()`. Transcript `error`,
premature `close`, malformed JSON, oversize data, and an unterminated final
frame share one idempotent terminal transition and one EventEmitter boundary
guard. Error-plus-error, error-plus-nextTick-error,
close-plus-nextTick-error-plus-nextTick-error, partial-frame, error-plus-close,
duplicate close, and child-exit ordering cannot throw an unhandled stream error
or wait for an `end` event which will never arrive. Once the check-phase
boundary closes, its disposer leaves zero supervisor listeners on the
transcript and caller-owned destinations.

## Consequences

- Provider adapters and lifecycle state remain unchanged until
  `D_0_1_SPLICE`.
- The runtime wrapper must preserve S's process identity while executing the
  supplied helper source (direct interpreter invocation, shebang execution,
  `exec`, or equivalent same-process wrapper).
- Linux proves complete owned descendant containment. Darwin explicitly does
  not claim escaped-session containment.
- The design has no FIFO dependency, shell fallback, ambient second Python,
  provider-data transcript, or broad cleanup command.
- Closed framing and output/control settlement rules make a helper limit,
  `EPIPE`, or stuck caller sink a fixed supervisor result instead of an
  unhandled exception or indefinitely pending session.
