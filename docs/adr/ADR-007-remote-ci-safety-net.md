# ADR-007 - Remote CI Safety Net

Date: 2026-06-10
Amended: 2026-07-26 (Project V5 G/0/00)
Status: accepted

## Context

The repository already has a local quality gate in
[`scripts/ci.sh`](../../scripts/ci.sh), and the V3 coder/reviewer flow treats
that script as the authoritative check before handoff. Without a remote
GitHub Actions workflow, a broken commit can still reach `develop` or `main`
without the same gate running on a clean machine.

Some checks remain intentionally local or opt-in. Real agent CLI execution,
tmux-supervised paths, Temporal, and Postgres integrations require
operator-controlled environments. Project V5 G/0/00 promotes the coordination
Redis acceptance lane to required remote CI evidence.

## Decision

Add a minimal GitHub Actions workflow for pushes and pull requests targeting
`develop` and `main`.

The workflow is a remote safety net, not a second source of test logic. It
checks out the repository, prepares the Node versions sampled by the
[canonical runtime contract](../node-runtime.md) and Python 3.11, installs the
Gateway and Python workspace dependencies, and then runs `scripts/ci.sh` with
the virtual environment active. The YAML must not reimplement the individual
lint, test, smoke, policy, or E2E commands from the script.

The workflow uses minimum repository permissions (`contents: read`) and does
not require secrets. It does not enable real E2E execution or install
operator-only tooling.

Each matrix job provisions a disposable `redis:7.2-alpine` service on its own
runner, publishes it only on loopback, and waits for `redis-cli ping`. The job
sets `AGENTS_TEST_REDIS_URL` to that service before invoking the unchanged
`scripts/ci.sh` entry point. The required Redis suite then rejects a runtime
skip, zero tests, the wrong major version, cluster/replica topology, protocol
race failure, or leaked `agents:test:v5:*` keys.

`ci/suites.json` is the authoritative suite contract. `scripts/ci.sh` is the
stable entry point and delegates to `scripts/ci_gate.py`, which validates the
required-suite set, discovered-file inventory, minimum counts, and exact skip
allowlist before emitting one machine-readable result. Commands are argument
arrays executed without a shell.

The runtime manifest is paired with `ci/suites-contract.json`, a
non-refreshable bootstrap baseline. The baseline fixes the ordered
required/optional IDs and each suite's classification, runner, argument
vector, include/exclude scope, minimum count, timeout, allowed skips, and
readiness. Only the runtime manifest's `inventorySha256` is refreshed
mechanically; changing any governed topology or policy requires a separate
contract diff.

Every suite has a finite validated timeout and starts in a new session beneath
a fresh per-suite supervisor. The embedding gate binds that helper to a pidfd
and waits for a versioned `READY` handshake. Only the helper becomes a child
subreaper and enforces the default-`SIGCHLD` and empty-child preconditions, so
children created by another caller thread never enter the suite's ownership
domain. A process-wide nonblocking lock still rejects concurrent or reentrant
gate commands.

After `Popen`, the supervisor registers the root pidfd before `/proc`
validation or child interaction. A provisional root handle retains stable
authority when root stat stays unreadable; readable descendants are bound only
after stable pre/post identity snapshots. Timeout, operator cancellation, and
every post-spawn exception use bounded TERM/KILL while rescanning the
descendant tree and adopted children. Normal signalling and reaping use
pidfds, containing late forks, reparenting, and `setsid()`.

Persistent root-pidfd acquisition failure is the deliberately narrow
exception. The fresh helper knows that its exact unreaped `Popen` child cannot
have reused its PID, so it may signal and reap that direct child numerically,
then do the same only for directly observed children adopted into that helper.
No generic inferred PID, PGID, or embedding-process child is eligible.

The final proof requires two consecutive scans with no new owned process, an
exactly reaped root, closed pidfds, and restoration of the helper's prior
subreaper state. A private length-prefixed protocol carries base64-encoded
stream bytes and a cleanup-proof record; the embedding gate accepts no result
without that complete proof and reaps the helper through its pidfd. Pre-run
EOF restores and exits without spawning a runner, while SIGINT/SIGTERM are
forwarded to the helper and still produce the single final cancelled JSON.
Missing pidfd/prctl support, non-default `SIGCHLD`, unreadable non-root
identity, signalling uncertainty, malformed protocol, or failure to reach the
fixed point propagates `ProcessCleanupError` without a JSON result. The
workflow retains an independent 45-minute job timeout.

Handler installation/restoration is masked, and a zero-byte buffered
write/flush handshake captures cancellation before finalization. The logical
output-commit boundary is the final pending-signal drain followed by freezing
the cancellation-adjusted payload/status inside the commit primitive. Every
signal pending before that freeze selects `cancelled` and 130/143; a later
signal is explicitly post-commit even before the first kernel byte. A partial
low-level write is never replayed through a full buffered fallback. The
post-freeze handoff installs `SIG_IGN` while both signals are blocked, drains
the transition, restores the caller's exact mask, and then restores the exact
handlers. Thus a signal at final unmask cannot replace the frozen exit; once
an individual caller handler is restored, later delivery belongs to the
caller.

Python dependencies are installed by hash from the universal
`requirements.lock`, and Gateway dependencies use `npm ci`. Lock regeneration
is an explicit local operation described in the
[CI contract](../ci-contract.md), never an implicit CI step. Optional service
lanes report `infrastructure_unavailable`; they do not masquerade as required
coverage. The required Redis readiness condition uses that same distinct
status but returns nonzero when its URL is absent, while a protocol assertion
remains `failed`. Exact allowlisted infrastructure skips in other required
suites retain their existing honest status and exit policy. Postgres, Temporal,
and providers are not prerequisites of this baseline gate.

Node TAP output must contain exactly one coherent summary for each required
field and unique observed skip IDs. Child output is decoded explicitly from
bytes, so malformed UTF-8 becomes a reported suite failure rather than a
traceback that replaces stdout.

## Consequences

- `ci/suites.json` remains the executable source of truth and
  `ci/suites-contract.json` its independently edited topology/policy baseline;
  `scripts/ci.sh` remains the stable entry point.
- Local coder/reviewer handoff and GitHub Actions exercise the same gate.
- Remote CI supplies one health-checked, disposable Redis 7 standalone service
  per Node matrix job; local callers must supply their own isolated equivalent.
- File-set changes normally refresh only `ci/suites.json`; suite topology and
  policy changes must update both manifest and baseline deliberately. The
  workflow changes only when setup requirements change.
- A required or optional lane cannot disappear, narrow its topology, collect
  zero tests, duplicate TAP accounting, or introduce a new skip while
  remaining green.
- `passed`, `infrastructure_unavailable`, `timed_out`, `cancelled`, and
  `failed` remain distinguishable machine states.
- Remote confirmation still requires the owner to push the branch and inspect
  the GitHub Actions run.
