# Doctor core, closed status probes, sample, and lock-only bootstrap

The read-only diagnostic command is implemented and registered by the CLI:

```bash
agent-run doctor
agent-run doctor --json
```

It composes the closed Doctor result core, six local core checks, provider
login checks, and coordination/authority status probes. The production
composition currently supplies an unavailable coordination snapshot and no
runtime-authority capability, so a nonzero result can reflect those explicit
boundaries. It does not establish runtime isolation, state ownership, review
acceptance, or release readiness. The synthetic sample and lock-only bootstrap
are separate from a completed real-provider workflow. See
[project status](project-status.md) for the verified candidate.

## Synthetic input

`examples/hero/profile.json` is a `doctor-profile/v1` input. It points only to
repository and plan files inside the example and selects roles, models, and
tools from the canonical orchestrator profile. The sample uses the existing
unrestricted `sample-apps` repository identity and contains no owner data,
credentials, environment-specific paths, or provider output.

The schema at `schemas/doctor-profile-v1.schema.json` closes the input shape.
The diagnostic output is a separate `doctor-result/v1` contract at
`schemas/doctor-result-v1.schema.json`.

## Result-core admission boundary

The core accepts twelve deterministically ordered injected probe bindings: the
six core bindings followed by `claude-login`, `codex-login`, `coordination`,
`coordination-scope`, `isolation`, and `state-ownership`. It produces only the
versioned safe projection:

```text
schemaVersion, profileId, status,
checks[{id, status, code, summary, remediation{doc, anchor}}]
```

Every public DTO constructor validates the complete object before adding a
record to a private issuance ledger keyed by `id`. Each record retains only an
exact built-in `weakref.ref` to the root and an irreversible taint bit: it
retains no root, nested DTO, snapshot, container, probe capability, or
capability closure. The weak reference retains an opaque, stateless callback
whose call surface is an immutable built-in, not a Python bound method or
writable function dictionary. A module-private authority map binds that exact
callback to the integer key and exact weak reference instead of placing
authority in a writable closure, default, keyword default, function attribute,
or instance dictionary. A reference found through `weakref.getweakrefs`
therefore exposes neither mutable retirement authority nor an ordinary Python
function dictionary on its callback call surface.

Public DTOs expose no retirement `__del__` method. Manually invoking the
discovered built-in callback while its referent is live only computes its
identity and cannot retire the record. A module-private collection sweep runs
after garbage collection and before new issuance. It retires only a dead
reference whose exact callback authority, ledger key, record identity, and
record reference still agree, and removes both the ledger record and callback
authority under the issuance lock. A stale authority therefore cannot delete a
replacement record, and an `id` cannot be reused while its valid dead record
remains unswept. The stable garbage-collection hook is not reachable through
the supported DTO or discovered-weakref surface; reaching module globals or
the interpreter's callback registry is the out-of-scope internal authority
described below. Failed constructors add no record, discarded runs and
bindings are reclaimable, and the canonical registry remains live because its
public and private roots remain live.

The tracked field descriptors keep their raw writable slots behind a
module-private authority map rather than exposing them on the supported
descriptor surface. Every supported set or delete runs under a reentrant
issuance lock and permanently taints an issued DTO before touching storage,
including a same-value write or a value that is later restored. Weak-reference
retirement uses the same lock. Replacing or deleting a field retains its
previous value until after that lock is released, so a finalizer on the
displaced value cannot re-enter the issuance path while the mutation owns the
lock.

Admission is an optimistic recursive transaction. It first checks exact type,
live weak-reference identity, and untainted state, then records only the
integer key, sealed DTO type, and exact issuance record while reading each
known slot once into a local safe snapshot. Nested issued DTOs join the same
transaction. At commit, the transaction takes the issuance lock and
revalidates every collected record, exact reference, live referent, exact
type, and untainted bit. That locked verification is the linearization point:
a supported write or retirement serialized before it makes the transaction
fail, while one serialized after it cannot change the detached snapshot. No
post-taint result value or replaced probe capability is accepted. The
transaction never uses DTO equality or hashing. Exact `object.__new__`
forgeries, missing slots, subclasses, container subclasses, cycles, and any
post-issuance write remain invalid even when their visible value is unchanged.

`run_doctor` accepts only an exact tuple containing all twelve issued
`ProbeBinding` objects with exact `CheckId` values. It validates the complete
tuple and captures safe `(check_id, probe)` pairs before invoking the first
probe. The admission transaction and issuance lock are both released before
any intentional probe invocation. Each callable is an explicitly trusted
capability, is invoked once, and has no canonical-identity requirement. Only
an issued, exact, unchanged `ProbeObservation` can reach outcome lookup.

`DoctorRun`, `validate_result`, `project_result`, `render_json`, and
`render_human` revalidate the complete issued graph from those one-read local
snapshots. Validators return the complete safe snapshot consumed by the next
operation; renderers do not validate and then reread caller-owned DTO fields.
Invalid inputs produce only the static unchained `DOCTOR_CONTRACT_INVALID`
error. Ordinary probe exceptions select an allowlisted static outcome, while
`BaseException` control-flow signals propagate unchanged.

Runtime class finality is not part of this security claim. Normal class-hook
immutability and opaque DTO observables remain defense in depth, but Python
code can define subclasses through non-cooperative metaclasses and multiple
inheritance. Admission therefore depends on exact type and private issuance,
not on preventing subclass creation.

The retirement claim is specific to its two lifecycle surfaces: the DTO has no
`__del__` finalizer, and the callback found on its issuance weak reference has
a slots-only built-in call surface. It is not a claim that an ordinary
pure-Python object exposes no other Python functions. Every normal Python
class necessarily exposes inherited, generated, or class-defined dunder
methods such as `__repr__`, `__eq__`, `__init__`, `__str__`, `__setattr__`,
and `__delattr__`; runtime-specific methods can add further surfaces. Their
bound `__func__.__dict__` remains writable and can retain a live DTO graph.
Eliminating every such surface would require replacing the pure-Python DTO
with a non-Python built-in or compiled extension type, outside this
stdlib-only preflight.

That residual requires same-process Python execution, a live issued DTO or the
live referent returned by its issuance weak reference, and the loaded Doctor
module. It is recorded as `V5-H-0-01-D01` in the Project V5 deferred register
and owned by D/0/02. Under the operator-ratified narrowed criterion, this
unavoidable dunder reflection surface is the same-process boundary, not a
DOCTOR retirement failure. The boundary does not weaken the absent `__del__`,
built-in callback, exact sweep, cleanup, taint, or atomic admission
requirements.

The admission and retirement claims are limited to the supported public DTO,
descriptor, and weak-reference operations described above and begin when a
value is presented to the core. They do not claim to prevent code executed in
an attacker-defined class or metaclass body before presentation. Traversing
`function.__globals__` (or
`method.__func__.__globals__`) into underscore-prefixed names or private
authority maps grants internal module authority and is outside this source
boundary. The same is true for code able to mutate the doctor module's
globals, DTO classes, private ledger or authority maps, or Python builtins.
Process isolation for hostile in-process Python code belongs to D/0/02; this
module does not claim to provide it.

## Provider login

The provider-login factory consumes only the reviewed H/0/00 `execution`
mode. An `available` provider receives exactly one shell-free version check
and one shell-free, read-only login-status check through an injected runner:

- Claude Code: `claude --version`, then `claude auth status`.
- Codex: `codex --version`, then `codex login status`.

Each runner call has a fixed five-second bound. The runner returns only a
closed command status; Doctor does not inspect or display command output.
Registry-only providers run no commands and report that login is not required.
Missing executables, timeouts, stale login, and unexpected probe failures map
to static allowlisted diagnostics. No stdout, stderr, exception detail, argv,
configuration value, username, path, token, or credential is admitted to a
result or renderer.

For an unavailable CLI, install the named provider CLI using its official
instructions and rerun the version and status commands above. For missing or
stale authentication, complete the provider's documented interactive login
outside Doctor, then rerun the matching status command. For a timeout, resolve
the local CLI/process issue and retry the status command.
Doctor never logs in automatically and never changes provider configuration.

## Coordination

The Gateway bridge consumes only a supplied pure projection containing the
coordination Redis URL, key prefix, canonical scope, and shutdown timeout. It
does not call the general configuration loader. It constructs exactly one
directly owned coordination instance through the narrow factory seam, calls
`status({})` once, and then calls `close()` once without arguments. The bridge
does not register or discover a participant, send or receive a message, ACK,
heartbeat, inspect or expose a managed client, restart a service, or signal a
shared runtime.

One status result produces both closed checks. A ready status reports
`COORDINATION_READY`; an exact canonical scope reports
`COORDINATION_SCOPE_MATCH`, while an exact mismatch reports
`COORDINATION_SCOPE_MISMATCH`. A missing or unsafe scope reports
`COORDINATION_SCOPE_PROBE_ERROR` without changing a valid readiness result.
Disabled or unreachable coordination reports `COORDINATION_UNAVAILABLE` and
cannot claim a scope result. Invalid input, malformed status, ordinary probe
errors, an invalid factory or instance, and any close failure report only the
two static probe-error codes.

For `COORDINATION_UNAVAILABLE`, verify that the configured coordination Redis
service is enabled and reachable, then rerun Doctor. For
`COORDINATION_SCOPE_MISMATCH`, align the configured canonical scope used by
the directly owned instance and rerun Doctor. For either probe-error code,
verify the pure projection and the status/close lifecycle contract before
retrying. Doctor never displays the URL, prefix, scope, raw configuration,
exception detail, credentials, or personal paths, and it never restarts the
service automatically.

## Isolation

Without an explicitly injected D-owned authority capability, Doctor uses the
static `ISOLATION_UNAVAILABLE` fallback and remains non-green. Doctor never
inspects host permissions, UID/GID, paths, environment, PIDs, files, locks,
booleans, or processes to infer isolation. It therefore does not claim that
the current process is really isolated.

A future D-owned authority may return only this module's exact closed
`IsolationStatus.READY` or `IsolationStatus.UNAVAILABLE` value together with
an exact state-ownership status. Doctor then maps that status to
`ISOLATION_READY` or `ISOLATION_UNAVAILABLE`; malformed or caller-asserted
values remain unavailable. An ordinary capability exception produces only
the static `ISOLATION_PROBE_ERROR` result, without exception details.

For `ISOLATION_UNAVAILABLE`, retain the non-green result until the future
D-owned authority supplies the isolation guarantee, then rerun Doctor. For
`ISOLATION_PROBE_ERROR`, repair that authority's closed status contract before
retrying. Doctor does not create or repair an isolation boundary itself.

## State ownership

Without an explicitly injected D-owned authority capability, Doctor uses the
static `STATE_OWNERSHIP_UNVERIFIABLE` fallback and remains non-green. Doctor
does not inspect host state or accept paths, permissions, ownership metadata,
PIDs, process state, files, locks, booleans, or caller assertions as proof of
exclusive ownership. It therefore does not claim that state is really owned
or protected from a second writer.

A future D-owned authority may return only this module's exact closed
`StateOwnershipStatus.OWNED`, `FOREIGN_SECOND_WRITER`, `STALE`, or `OPAQUE`
value together with an exact isolation status. Doctor maps those values to
`STATE_OWNERSHIP_OWNED`, `STATE_OWNERSHIP_CONFLICT`,
`STATE_OWNERSHIP_STALE`, or `STATE_OWNERSHIP_UNVERIFIABLE`. The one injected
capability runs once during Doctor execution; both bindings share only the
detached static result. Malformed values fail closed, and an ordinary
capability exception produces only `STATE_OWNERSHIP_PROBE_ERROR` without raw
details.

For a conflict or stale result, stop additional writers and have the future
D-owned authority re-establish exclusive current ownership before rerunning
Doctor. For an unverifiable result, keep the check non-green until that
authority can verify ownership. For a probe error, repair the authority's
closed status contract. Doctor never acquires, steals, or repairs ownership.

## Bootstrap

From the checkout root, run:

```bash
cd /path/to/agents-orchestrator
./scripts/bootstrap.sh
```

The script resolves that checkout to a physical root and rejects symbolic
links in every dependency input, sample target, or managed output control
path. Before any installer call, its read-only Node preflight checks the
supported runtime, package manifest/lock-root parity, the exact reviewed Node
lock bytes, and the recorded Python lock-input digest.

The Node lock is bound to two independently versioned release authorities:
`ci/production-sbom.json` must use `production-sbom/v1` and name
`gateway/package-lock.json` exactly once in `sourceLocks`, while
`ci/production-advisories.json` must use `production-advisories/v1` and name
that lock exactly once in `lockDigests`. Both values must be canonical
`sha256:<lowercase-hex>` digests, must agree, and must equal the SHA-256 of the
checked-in lock byte for byte. A missing, symbolic-linked, malformed, stale, or
tampered snapshot or lock fails before uv/npm selection and before dependency
state can be created.

After the uv steps, the script repeats the same complete Node-only preflight
immediately after its last physical boundary validation and immediately before
`npm ci`. If uv changed the regular lock, SBOM, or advisory bytes after the
initial preflight, this final recheck fails without invoking npm or creating a
fresh `gateway/node_modules`. The valid virtualenv, sync, and editable-install
effects already completed by uv are intentionally retained; this bootstrap
does not attempt to roll them back.

The final recheck closes the deterministic gap across the preceding uv steps,
but it is not filesystem isolation or serialization. A process with the same
user identity could still replace bytes after the final preflight reads them
and before npm opens the lock. D/0/02 owns that isolation boundary; this sample
bootstrap does not claim to eliminate the residual check-to-exec race. The
bootstrap performs no intervening operation between the final recheck and the
npm invocation.

The lock, manifests, SBOM, and advisory snapshot are read-only inputs in task
lanes. Changing the reviewed lock requires the integrator-owned release
snapshot refresh; bootstrap work must not regenerate or hand-edit either
authority. The preflight does not maintain a second package graph or SemVer
implementation and does not infer that a different, locally plausible lock is
reviewed.

After preflight, the script requires uv 0.11.21, creates `.venv` itself, and
always runs the checked-in installation commands in this order:

```bash
uv venv --python 3.11 .venv
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
npm --prefix gateway ci --ignore-scripts
```

The npm step materializes the reviewed lock graph with dependency lifecycle
scripts disabled. Because the required `better-sqlite3` native addon remains
unbuilt, this bootstrap does not make that dependency runnable; its native
boundary is `NATIVE_ADDON_UNAVAILABLE`. Runnable native dependency proof
belongs only to I/0/04; this bootstrap does not claim it.

Node and npm must be available, Node must satisfy the engine range in
`gateway/package.json`, and uv must be able to resolve Python 3.11. No separate
global Python executable is required for preflight. npm enforces the Node
range again through the checked-in configuration. Python and Node application
dependencies do not need to be globally installed. Existing regular `.venv`
or `gateway/node_modules` contents never cause an install step to be skipped,
so a second invocation follows the same lock-only sequence.

The structure tests replace uv and npm with strict local fakes. They exercise a
disposable checkout and empty home without using a provider, Redis, MCP, or the
network. A real install with empty dependency caches and permitted hash-pinned
network access is an integration gate and is intentionally not claimed by this
task lane.
