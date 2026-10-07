# CI suite and dependency contract

The repository has one executable CI contract. `ci/suites.json` declares every
required and optional-service suite, while the non-refreshable
`ci/suites-contract.json` anchors the reviewed suite IDs and execution
topology. `scripts/ci_gate.py` validates both files and runs the manifest.
`scripts/ci.sh` is the stable local and remote entry point; it contains no
second copy of the suite list.

The required `release.candidate` lane invokes the content-addressed release
and supply-chain verifier. That verifier records both authoritative CI files
as candidate materials and calls `scripts/ci_gate.py` for topology, skip,
readiness, and inventory validation; it does not define or refresh a second
suite inventory.

The required `public.hygiene` lane scans tracked publication inputs for personal
paths and private repository registrations. Historical plan and audit evidence
is preserved under explicit path exemptions; fixture exceptions bind an exact
path and literal in `ci/public-hygiene-fixtures.json`. Active registrations are
never exempted.

See [project status](project-status.md) for the latest published implementation
SHA, exact local gate totals, and unavailable integration lanes.

## Reproducible installation

Python 3.11 is the minimum lock target. `requirements.lock` is a universal,
hash-checked resolution of both Python project manifests and all of their
extras. Regeneration is pinned to uv 0.11.21 and the 2026-10-06 index cutoff;
installation does not invoke the resolver. Install a clean environment without
resolving new versions:

```bash
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci
```

The gate adds `cli/src` and `orchestrator-langgraph/src` to child-process
`PYTHONPATH`, so CI exercises the checked-out source without an unlocked
dependency resolution. The editable packages use the hatchling backend pinned
by `ci/requirements-build.in`; `--no-deps --no-build-isolation` prevents that
source install from consulting an index. GitHub Actions uses the same lock
commands and never regenerates either lockfile.

The required retained-control session tests use the
[pinned tmux runtime](tmux-runtime.md). Remote CI obtains the official source
archive and the public builder image by its pinned digest, then invokes the
existing offline builder. It places the resulting binary on the job's search
path, sets `D007C_TEST_TMUX_PATH`, and enables `D007C_RUN_REAL_TMUX_PROBE=1`.
The tmux server uses a job-local `TMUX_TMPDIR`; no system-wide tmux installation
or pre-existing private image is required.

The exact install commands are
`uv pip sync --require-hashes requirements.lock` and
`npm --prefix gateway ci`; lock freshness is checked with
`./scripts/requirements_lock.sh --check`.

Regenerate the Python lock only after an intentional project-manifest change:

```bash
./scripts/requirements_lock.sh
./scripts/requirements_lock.sh --check
```

`./scripts/requirements_lock.sh --check --offline` is the no-network
freshness check when the uv metadata cache is populated. The generated file
contains no checkout-specific absolute path. `--upgrade` is an explicit
operator action and cannot be combined with `--check`.

## Authoritative suite manifest

### LangGraph security pin

The current LangGraph range is `>=1.2.5,<1.2.6`, allowing the lock to select
`langgraph-sdk==0.4.4`. The former `langgraph==1.2.1` required an SDK below
`0.4`; its locked SDK `0.3.15` was affected by an OSV advisory fixed in
`0.4.4`. The upgrade therefore replaces the old compatibility pin rather than
leaving the vulnerable SDK constrained below its fixed version.

On 2026-10-06, an isolated environment using LangGraph `1.2.5` and SDK
`0.4.4` completed the LangGraph suite with **81 passed and 3 integration
skips** in 0.79 seconds, including `test_implement_test_review_push_graph`,
which had hung with `1.2.4`. This verifies the isolated upgrade against that
suite; it does not exercise the skipped integrations or establish that the
combined repository candidate passed its full gate. Record the candidate's
own gate and exact skip identities separately.

### Manifest entries

Each entry in `ci/suites.json` has:

- a stable suite ID and an `argv` array executed without a shell;
- a `required` or `optional-service` classification;
- repository-relative include/exclude globs;
- an inventory digest over the exact matched path set;
- a validated timeout from 1 to 3600 seconds;
- a positive minimum count for test runners; and
- exact skip IDs, each classified as `infrastructure_unavailable` and bound to
  the unavailable service.

`ci/suites-contract.json` is deliberately not an inventory-refresh target. It
fixes the ordered required and optional ID sets and every suite field except
`inventorySha256`: classification, runner, `argv`, include/exclude patterns,
minimum count, timeout, exact skip allowlist, and readiness condition. Removing
or reclassifying a lane, narrowing its discovery, changing its command,
lowering its minimum, adding a skip, or weakening an opt-in therefore cannot be
self-authorized by `--refresh-inventory`. Such a change requires an explicit,
review-visible edit to both the runtime manifest and the topology contract.

Matching zero test files, adding or removing a governed file without refreshing
the inventory, collecting too few tests, returning an unlisted or duplicate
skip ID, emitting duplicate/incoherent TAP summary fields, or reporting
incomplete runner counts fails before the gate can claim success. The required
`lock.python` lane also compares the embedded input digest against both Python
project manifests, the locked build-backend input, and the pinned resolver
contract without accessing the network.

After intentionally adding, removing, or renaming a governed file, refresh and
review the `ci/suites.json` inventory-only diff:

```bash
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
```

The refresh command never writes `ci/suites-contract.json`. Do not refresh
inventory merely to hide an unexplained deletion. The path diff and manifest
digest change are review evidence.

## Bounded execution and cancellation

Every selected suite gets a fresh supervisor process. The embedding gate opens
that helper's pidfd and waits for a versioned `READY` frame before it sends a
run request. The helper, not the embedding process, requires the default
`SIGCHLD` disposition, enables `PR_SET_CHILD_SUBREAPER`, verifies that its new
domain is childless, and starts the suite from its JSON `argv` with
`shell=False` in a new session. Caller-owned children can therefore be created
before or after `READY` without entering the suite's ownership domain. A
process-wide, non-blocking lock still rejects overlapping or reentrant gate
commands.

The helper opens the direct runner's pidfd immediately after `Popen`, before
any child interaction. A provisional root handle remains registered until two
matching `/proc/<pid>/stat` snapshots establish its full identity. If root
stat remains opaque, the unreaped pidfd keeps the numeric identity stable
while descendants are discovered; the root is reaped only after the domain is
quiescent. Every readable descendant is likewise bound to a pidfd after
matching pre/post identity snapshots.

The gate applies the suite's `timeoutSeconds`; timeout, SIGINT, and SIGTERM
trigger bounded TERM-to-KILL escalation inside the helper. Cleanup repeatedly
discovers the live tree and children reparented to the subreaper, including
descendants which call `setsid()` or are created by a TERM handler. Normal
signalling and reaping use pidfds. The sole numeric fallback is a persistent
post-spawn root-pidfd failure: because the fresh helper created the exact
direct runner and has not reaped it, that PID cannot be reused. The helper may
signal and reap that root, then only its subsequently adopted, directly
observed unreaped children. It never infers authority from an arbitrary PID,
PGID, or a child of the embedding process.

The supervisor returns a command result only after all handles report exit,
no owned `/proc` record remains, two consecutive scans discover nothing new,
the runner has been reaped, every pidfd is closed, and the helper's exact
entry subreaper state is restored. The private length-prefixed JSON protocol
base64-encodes stdout/stderr bytes and the parent rejects any result without
that complete cleanup proof. EOF or a protocol failure before the run request
causes the helper to restore and exit; cancellation is forwarded through the
stable helper pidfd. Timeout is reported as `timed_out`; operator signals are
reported as `cancelled` with exit 130 for SIGINT or 143 for SIGTERM. GitHub
Actions also applies a 45-minute job backstop.

This containment contract requires Linux `/proc`, libc pidfd/prctl support,
and the default `SIGCHLD` disposition inside the fresh helper. Unsupported
kernel capabilities, an unreadable non-root identity, a fork storm, failure
to clean a pidfd-less direct-child domain, malformed supervisor protocol, or
any other absence uncertainty raises `ProcessCleanupError` through the suite
and CLI without publishing a gate result.

Initial handler installation and final restoration occur with both signals
blocked. Before output finalization, a cancellable buffered write/flush
handshake completes. The logical output-commit boundary is then explicit:
while signals remain blocked, the gate drains pending SIGINT/SIGTERM, applies
cancellation, renders again when state changed, and freezes the payload and
status. Every signal pending before that freeze selects the one `cancelled`
JSON and 130/143 result. A signal received after the freeze is post-commit and
does not rewrite the selected result or exit, even if the first kernel write
has not run yet. After the frozen write, the gate changes both dispositions to
`SIG_IGN` while they remain blocked, drains the transition, restores the exact
caller mask, and then restores both exact caller handlers. This caller-handoff
sequence closes the pending-signal-to-unmask race; a signal delivered after
its caller handler has been restored belongs to the caller. A partial
low-level write is never followed by a full-payload fallback, which could
duplicate bytes.

Child stdout/stderr is captured as bytes and decoded explicitly. Invalid UTF-8
is rendered safely to stderr and makes the suite fail; it cannot raise a
decode traceback or suppress the final JSON object.

## Required versus unavailable infrastructure

The default gate requires lock-input freshness, release-candidate
supply-chain validation, lint, structure, Gateway unit/fake tests, dry-run
E2E, MCP smoke, registry validation, CLI tests, LangGraph unit/fake tests, and
the isolated Redis 7 live lane.
The release lane is offline: it verifies exact pinned lock/tree inputs,
cross-platform hash coverage, signed-review trust roots, and the bounded raw
plus canonical primary OSV snapshot. Network access belongs only to the
explicit reviewed snapshot-refresh workflow, never to `scripts/ci.sh`.
Known Postgres, Gateway-integration, and Temporal opt-ins remain in those
suites only through their exact allowlisted IDs; the JSON report lists them as
infrastructure unavailable rather than silently treating them as coverage.
Any suite with one of those observed allowlisted skips has status
`infrastructure_unavailable`, and so does the aggregate report. This state may
return exit zero only because every observed skip identity was explicitly
allowlisted; it is never called `passed`.

`test.redis-live` is a required suite with a required-service readiness
condition. GitHub Actions supplies a disposable `redis:7.2-alpine` standalone
service, waits for `redis-cli ping`, and passes only its loopback URL through
`AGENTS_TEST_REDIS_URL`. Local runs must supply an independently managed,
disposable Redis 7 standalone URL through that same variable; the lane must
never target a shared coordination namespace. If the variable is absent, the
runner does not invoke the suite, reports `infrastructure_unavailable`, and
returns nonzero because required infrastructure is missing. This differs from
an assertion failure and cannot become a skipped green result.

When selected, the lane verifies Redis major version 7, standalone/non-cluster
primary topology, repeated multi-client contention, replacement and expiry
fences, pending-safe backpressure/reclaim, dedupe equality/conflict, atomic ACK
and tombstones, and exact-prefix cleanup. A runtime skip, zero tests, wrong
version or topology, protocol assertion failure, or leaked keys fails the
gate. The lane never uses broad database cleanup.

The real Codex/Claude flow remains an `optional-service` lane. With no
`AGENTS_E2E_REAL=1`, the runner does not invoke it and reports
`infrastructure_unavailable`. PostgreSQL, Temporal, and provider promotion
remain owned by later V5 sheets.

## Output contract

Run:

```bash
./scripts/ci.sh
```

Child command output goes to stderr. Stdout contains exactly one JSON object
with the overall status, aggregate counts, per-suite counts, exact unavailable
infrastructure, and errors. `passed` means no suite was unavailable. Explicitly
allowlisted test skips and unselected optional services may retain exit zero
with `infrastructure_unavailable`; a missing required-service readiness
condition returns 1 with that same distinct status. Assertion failures and
timeouts also return 1, invalid manifests/contracts return 2, and cancellation
returns the signal-derived code documented above.

A process-cleanup uncertainty is the deliberate exception to the one-JSON
rule: no suite or aggregate result is safe to publish while the subreaper
domain may still be alive, so `ProcessCleanupError` propagates without a JSON
result. Likewise, a partial stdout commit is never replayed as a second full
record.
