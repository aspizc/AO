# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 9)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 1 |

Trial 9 closes the Trial 8 admission race. The recursive transaction collects
the exact issuance records that contribute to a result or six-binding
snapshot, verifies all of them under the same reentrant issuance lock, cleans
up its thread-local scope, and releases both scope and lock before intentional
probe calls. The exact built-in weak reference also removes Trial 8's writable
`reference.key` attribute.

One blocking concurrency defect remains. `_TrackedSlot.__set__` and
`__delete__` keep the issuance lock while the raw member descriptor replaces
or deletes the previous field value. If that value is the final reference to
an otherwise valid callable with `__del__`, caller code runs while the global
issuance lock is owned. A finalizer that waits for another thread performing a
supported DTO mutation or admission can deadlock both threads and every other
issuance-lock waiter.

There is also a separate lifecycle defect. The built-in weak reference exposes
its Python callback, and the callback's closure cell is writable through
standard weak-reference discovery. Replacing the scalar key prevents bounded
retirement; pointing the cell back to its own `ProbeBinding` creates a
ledger-rooted cycle that retains both the binding and its probe capability.
That route does not traverse `function.__globals__` or a private map.

## Requested reviewer profile

- Requested model: **GPT-5.6 Sol**
- Requested reasoning effort: **ultra**
- Requested service tier: **Priority/Fast**
- Review date: **2026-07-27**

These values record the requested review profile only. The worktree and review
runtime expose no independent model, reasoning-effort, or service-tier
telemetry, so this result does not claim external telemetry attestation. The
reviewer did not spawn, delegate to, or supervise another agent and did not use
tmux.

## Frozen identity and scope

- Branch: `feat/V5-H-0-01-doctor`
- Trial 8 KO base:
  `530eec79f503e5c874e76f3ab24df8409bf14188`
- Base tree:
  `6f4b3331e8b4b86390ada51a258027d94fe2cbc8`
- Tests-only RED:
  `d1621d5a256d7db8509e5c7078a2ec66f8887efe`
- RED tree:
  `0f24e5323bbceb59fccdb43e502d37ab06012d54`
- Source-only technical candidate:
  `b7353e3da933c97eca2406380c76ce69199508d1`
- Technical tree:
  `d3ac014ebe0c294228fc71fc0b6a05fbbe053ab6`
- Task-owned documentation:
  `adeea76b7a54c2c22b80127db035ab4c76baa607`
- Documentation tree:
  `664bc0c078c8b2c48afbeee9fff2dd11aa43e8f4`
- Request-only reviewed HEAD:
  `d9c3592d83595ee6cb66a876c59e2243f23dbf62`
- Request tree:
  `70465682bbdde35b7a9135cb414b473846afb694`
- Review worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`

The binding plan and amendments were consulted read-only at:

```text
744f06c1685855c5dda2c4f2d1a20fb3721c94e3
4d0e42e54f791afed3a5c9cbd9aad5af52bc04df
7f328b4985b48f495cdf3415bb8742568fb42ecc
```

Those three plan commits are themselves linear:

```text
744f06c1685855c5dda2c4f2d1a20fb3721c94e3
  -> 4d0e42e54f791afed3a5c9cbd9aad5af52bc04df
  -> 7f328b4985b48f495cdf3415bb8742568fb42ecc
```

They were not merged or cherry-picked into the reviewed task branch. The task
lineage is exact and linear:

```text
530eec79f503e5c874e76f3ab24df8409bf14188
  -> d1621d5a256d7db8509e5c7078a2ec66f8887efe
  -> b7353e3da933c97eca2406380c76ce69199508d1
  -> adeea76b7a54c2c22b80127db035ab4c76baa607
  -> d9c3592d83595ee6cb66a876c59e2243f23dbf62
```

The implementation/documentation range is:

```text
530eec79f503e5c874e76f3ab24df8409bf14188..
adeea76b7a54c2c22b80127db035ab4c76baa607
```

Its exact net pathset is:

```text
cli/src/agents_cli/doctor.py  +187 / -60
tests/cli/test_doctor.py      +385 /  -3
docs/doctor.md                 +48 / -28
```

Commit-local pathsets are exact:

```text
d1621d5  M tests/cli/test_doctor.py
b7353e3  M cli/src/agents_cli/doctor.py
adeea76  M docs/doctor.md
d9c3592  A plan/reviews/PROJECT_V5/H_0_1_DOCTOR-9_to_review.md
```

Final reviewed blobs are:

```text
cli/src/agents_cli/doctor.py
  e443eef167b92f5b2e195744d454aa7723950487
tests/cli/test_doctor.py
  23e4b2c42627e2220108ea4340e99a1c4cabac44
docs/doctor.md
  67d0437bf2d17dbdbf6f7a062355034ed6b3e0b9
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

The source blob is byte-identical at the Trial 8 base and RED:

```text
73fce9b3d8fab7a676ae69c121aaebe9e0c1de82
```

The RED test blob is byte-identical through RED, technical, documentation, and
request commits:

```text
23e4b2c42627e2220108ea4340e99a1c4cabac44
```

This review covers the Trial 9 DOCTOR result core, supported DTO descriptor and
weak-reference surface, admission/constructor transactions, six-binding
capture, renderer/result boundaries, and task-owned documentation. It does not
review or claim CLI wiring, real probes, providers, Redis, Gateway, MCP, KYA,
portability, integration, promotion, publication, release, or the complete
H/0/01 exit gate.

## P1 finding

### P1 — Supported descriptor set/delete can execute caller finalizers while holding the global issuance lock

`ProbeBinding.probe` accepts an arbitrary callable
(`cli/src/agents_cli/doctor.py:256-260`), and binding snapshot validation checks
only `callable(probe)` (`:545-552`). That is the intended trusted-capability
contract.

The tracked descriptor performs both taint and raw storage mutation under one
reentrant lock:

```python
def __set__(self, instance, value):
    with _ISSUANCE_LOCK:
        _mark_dto_mutated(instance)
        _tracked_slot_storage(self).__set__(instance, value)

def __delete__(self, instance):
    with _ISSUANCE_LOCK:
        _mark_dto_mutated(instance)
        _tracked_slot_storage(self).__delete__(instance)
```

This is at `cli/src/agents_cli/doctor.py:140-148`.

Replacing or deleting a member-descriptor value releases the slot's reference
to its previous value before the descriptor operation returns. If the slot is
the final reference, Python runs that object's `__del__` synchronously. The
implementation therefore runs arbitrary caller finalizer code inside
`_ISSUANCE_LOCK`, even though it does not intentionally call the probe.

The deterministic reviewer probe used a fresh, valid, issued `ProbeBinding`.
Its probe was the only reference to a callable whose finalizer:

1. started a worker thread;
2. let the worker signal immediately before a supported same-value
   `object.__setattr__` on another issued DTO;
3. waited up to 0.200 seconds for that write to finish; and
4. returned after recording whether the worker was blocked.

The owner thread then performed either:

```python
object.__setattr__(binding, "probe", replacement_probe)
object.__delattr__(binding, "probe")
```

Observed over eight fresh cases per operation:

```text
set:
  finalizer waits blocked for full 0.200 seconds:  8 / 8
  worker completed after outer lock release:      8 / 8
  worker/finalizer errors:                        0 / 8
  binding permanently tainted:                    8 / 8
  worker target permanently tainted:              8 / 8

delete:
  finalizer waits blocked for full 0.200 seconds:  8 / 8
  worker completed after outer lock release:      8 / 8
  worker/finalizer errors:                        0 / 8
  binding permanently tainted:                    8 / 8
  worker target permanently tainted:              8 / 8
```

The minimum measured wait in each matrix was 0.200 seconds. In all 16 cases,
the worker completed as soon as the finalizer returned and the outer
descriptor operation released the issuance lock. The reproduction used no
private ledger/storage map, function globals, class mutation, Python builtin
mutation, provider, service, or intentional probe call.

Replacing the bounded finalizer wait with an ordinary unbounded `join()` would
deadlock: the owner cannot release the lock until `__del__` returns, while the
worker cannot finish until it acquires that same lock. Because admission,
issuance, supported writes, and retirement all share the lock, other core
operations can then block behind the deadlocked owner.

This is P1 because a supported public descriptor set/delete can turn a valid
callable's ordinary finalization into an unbounded global-core liveness
failure. It is not merely the expected rejection of a tainted DTO, and it is
separate from whether an intentionally invoked probe is trusted.

The new regression at `tests/cli/test_doctor.py:1451-1490` correctly proves the
lock is released before an intentional probe call. It does not cover implicit
finalization during raw slot replacement/deletion. The concurrent binding test
at `:1353-1448` uses plain functions whose removal has no caller finalizer.

Required correction:

- preserve irreversible taint and admission linearization without allowing a
  caller-owned previous field value to reach its final reference while the
  issuance lock is held;
- cover both set and delete of a valid binding's last-referenced callable;
- make a finalizer's worker perform a supported admission or descriptor write
  and prove it completes within a bounded join; and
- retain the guarantee that no post-taint binding capability is captured or
  intentionally invoked.

## P2 finding

### P2 — Standard weakref discovery exposes a writable callback closure that disables retirement and can retain a binding graph

`_issue_retirement_callback(key)` returns a Python closure over the scalar key
at `cli/src/agents_cli/doctor.py:101-112`. `_record_issue()` installs that
callback on an exact built-in `weakref.ref` at `:293-300`.

The built-in reference correctly has no writable `key` attribute. It does,
however, publicly expose the callback as `reference.__callback__`, and the
callback exposes its closure cells. On the reviewed Python runtime this is a
normal writable operation:

```python
reference.__callback__.__closure__[0].cell_contents = 0
```

The all-eight regression at `tests/cli/test_doctor.py:1493-1514` reads each
closure cell and proves its initial value has exact type `int`, but it does not
try to replace or delete `cell_contents`. The bounded-retirement test at
`:1517-1538` attempts only `reference.key = 0`, so it cannot detect the
remaining authority route.

Two independent bounded probes reproduced different consequences.

First, 64 simultaneously live, distinct, issued `ProbeObservation` objects
had their callback closure key replaced with integer `0` before all external
DTO roots were discarded:

```text
distinct issued keys:      64
DTO referents collected:   64 / 64
callbacks cleared:         64 / 64
original stale records:    64 / 64
ledger delta after GC:     64
```

The exact-reference stale-callback check remains safe, but the wrong closure
key prevents the callback from finding the original record.

Second, 64 issued `ProbeBinding` objects each held one unique weak-referenceable
probe capability. Each issuance callback's closure cell was changed to point
back to its own binding, and all external binding/capability roots were
discarded:

```text
distinct issued keys:      64
bindings retained:         64 / 64
probe capabilities retained:
                           64 / 64
callbacks still live:      64 / 64
live records retained:     64 / 64
ledger delta after GC:     64
```

That creates this strong path:

```text
ledger -> issue record -> weakref -> callback -> closure cell
       -> ProbeBinding -> probe capability
```

Because the callback now retains its own referent, collection never starts and
the callback is never cleared. This directly contradicts
`docs/doctor.md:30-43`, which says standard weak-reference discovery exposes no
mutable retirement authority and records retain no root, graph, or probe
capability.

Both probes start only from an issued public DTO and
`weakref.getweakrefs(dto)`. They use `reference.__callback__`,
`function.__closure__`, and writable `cell.cell_contents`; they never traverse
`function.__globals__`, inspect or mutate a private map, mutate a DTO class, or
change a Python builtin. They are therefore inside the explicit Trial 9
weak-reference boundary at binding-plan commit `7f328b4`.

This is classified P2, independently of the blocking P1, because it does not
admit or intentionally invoke a post-taint value, alter a safe result, or
break the transaction's linearization. Its demonstrated consequence is
caller-induced unbounded lifecycle and capability retention in the still
unwired pure core. That matches the established severity treatment:

- Trial 7 classified a ledger that strongly retained every DTO/probe graph as
  P2 because the current slice is not yet a long-lived integrated process; and
- Trial 8 classified public retirement-key mutation and unbounded dead records
  as P2 because result integrity and exact-reference replacement safety held.

The self-cycle is stronger than Trial 8's dead-record-only reproduction because
it retains the binding graph and capability. It remains a lifecycle/resource
defect rather than a result-integrity defect at this slice, so P2 is retained
for consistency with those precedents. It must be corrected or explicitly
reclassified before any long-lived integration relies on bounded reclamation.

Required correction:

- ensure no writable state reachable from the standard discovered weak
  reference can alter the retirement key or make the callback retain its own
  referent/graph;
- preserve the exact key-plus-reference stale-callback guard and live manual
  callback safety;
- extend the all-eight weakref inventory to attempt callback closure mutation
  rather than checking only the initial cell type; and
- prove both a scalar-key rewrite and a self-referential binding/capability
  attempt return the ledger and referent liveness to their canonical bounds.

## Correct behavior preserved

### Admission transaction and constructor scopes

`_capture_consistently()` creates one owning thread-local record list, allows
nested admissions to join it, performs final verification under
`_ISSUANCE_LOCK`, and removes the owning scope in `finally`
(`cli/src/agents_cli/doctor.py:328-392`). Each tracked DTO contributes its
integer key, exact sealed type, and exact `_IssueRecord`; the transaction state
does not itself retain a DTO, container, snapshot, or probe.

Every supported descriptor field set/delete marks the exact live issuance
record permanently tainted before storage changes. Subject to the P1
finalization issue, a write serialized before final verification is rejected,
and one serialized after verification cannot alter the detached field/probe
values already captured.

Constructors install a fresh nested record list, snapshot every issued child,
verify those records and issue the new root while still holding the same
reentrant lock, then restore or delete the previous thread-local scope in
`finally` (`:763-780`). Failed construction does not issue the root.

No missing recursive record, leaked thread-local graph, accepted post-taint
result value, or accepted concurrently replaced binding capability was found.

### Complete six-binding capture and pre-probe release

`_snapshot_bindings()` wraps all six exact binding admissions in one outer
transaction (`cli/src/agents_cli/doctor.py:1406-1428`). Only committed
`(CheckId, probe)` snapshots return. `run_doctor()` receives that tuple at
`:1440`; its first intentional probe call is at `:1452`, after
`_capture_consistently()` has verified the records, released the lock, and
removed the owning scope.

The new deterministic binding race rejects if replacement lands before commit
and otherwise invokes only the already detached original capability. The
separate P1 concerns implicit `__del__` execution during a supported mutation,
not use of an uncommitted binding snapshot.

### Exact issuance and closed result behavior

Initial admission checks exact type, exact ledger record/reference identity,
live referent, and untainted state before field capture. Final verification
rechecks ledger identity, liveness, integer identity, exact type, and taint.
Ordinary collection with an untouched callback retires records; live manual
callbacks return without mutation; exact-reference comparison prevents a
stale callback from deleting a replacement.

The focused inventory preserves:

- eight exact issued DTO types and static safe rejection;
- six deterministic checks and 35 closed outcomes;
- complete recursive result validation;
- canonical public/private registry identity;
- exact observation admission before outcome lookup;
- schema/projection parity and aggregate/exit relationships;
- one-read detached result consumers;
- static unchained `DoctorContractError` behavior;
- static ordinary probe-exception outcomes; and
- unchanged `BaseException` propagation.

### In-process trust boundary

The amended documentation correctly stops claiming isolation against arbitrary
same-process code that traverses `function.__globals__` into underscore-prefixed
module state. It correctly assigns hostile-process isolation to D/0/02. Neither
finding in this result uses that excluded authority: P1 uses normal descriptor
set/delete and callable finalization; P2 uses standard weakref/callback/closure
observables.

## Regression tests and TDD lineage

The declared RED/GREEN structure is valid for the behavior it covers:

- `d1621d5` changes only `tests/cli/test_doctor.py`;
- the doctor source blob is unchanged from the Trial 8 base through RED;
- the final RED test blob remains byte-identical through technical,
  documentation, and request commits;
- `b7353e3` changes only `cli/src/agents_cli/doctor.py`;
- `adeea76` changes only `docs/doctor.md`; and
- `d9c3592` adds only the Trial 9 request.

A detached `git archive` replay of the exact RED commit and 17-case selection
independently reproduced:

```text
16 failed, 1 passed, 275 deselected in 0.94s
```

The candidate changes that same selection to:

```text
17 passed, 275 deselected in 1.00s
```

The REDs are strong for the Trial 8 validation/capture race and direct
`reference.key` retirement-authority defect. They have no last-reference
callable finalizer under descriptor set/delete and do not mutate the callback
closure cell that they already inspect. Those omissions correspond to P1 and
P2 respectively.

## Independent verification

Repository-lock tool identity:

```text
Python     3.13.13
pytest     9.1.1
jsonschema 4.26.0
Ruff       0.15.22
uv         0.11.21
```

The submission recorded pytest 9.0.3 and Ruff 0.15.16 from unpinned
`uv run --offline --with ...` commands. This review instead pinned the versions
in the reviewed repository's `requirements.lock`: pytest 9.1.1, jsonschema
4.26.0, and Ruff 0.15.22. The version difference is disclosed rather than
treated as equivalent service/tool telemetry.

All focused verification used cached offline packages, repository files, and
in-memory objects:

| Verification | Result |
|---|---:|
| Exact RED 17-case archive replay | 16 failed, 1 passed, 275 deselected |
| Trial 9 directed selection | 17 passed, 275 deselected |
| Complete `tests/cli/test_doctor.py` | 292 passed |
| Scoped H/0/01 structure tests | 8 passed |
| JSON syntax | passed |
| Draft 2020-12 schema self-validation | passed |
| Ruff check on source/focused tests | passed |
| Ruff format check on source/focused tests | 2 files already formatted |
| Exact implementation/documentation `git diff --check` | passed |
| Request-only `git diff --check` | passed |

Focused timings were:

```text
directed: 17 passed, 275 deselected in 1.00s
complete doctor: 292 passed in 14.92s
scoped structure: 8 passed in 0.06s
```

Additional reviewer-only evidence:

| Probe | Result |
|---|---:|
| Finalizer-under-lock set cases | 8/8 blocked for bounded wait; 8/8 completed after release |
| Finalizer-under-lock delete cases | 8/8 blocked for bounded wait; 8/8 completed after release |
| Scalar weakref closure rewrite | 64/64 referents collected; 64 stale records; ledger delta 64 |
| Self-cycle weakref closure rewrite | 64/64 bindings and 64/64 capabilities retained; ledger delta 64 |

A broader cached/offline Python pass, without installing Gateway dependencies,
reported:

```text
tests/cli/test_*.py:
  318 passed, 3 failed in 16.27s

tests/structure/test_*.py:
  408 passed, 1 failed in 47.76s
```

The three broad CLI failures are all in the unrelated approval command and
arise because the prohibited/absent Gateway Node install cannot import its
local native dependency. The single broad structure failure reports seven
stale suite inventory hashes on this unintegrated task branch; refreshing
shared suite hashes is explicitly integration-owned. Neither broad failure
touches the reviewed DOCTOR implementation, and no install or network access
was attempted to change those conditions.

Aggregate CI, npm installation, network, providers, Redis, Gateway execution,
MCP, KYA, tmux, coordination, live services, portability, and real probes were
not run. No reviewer-generated checkout, worktree, symlink, cache, bytecode, or
temporary test directory remains. The repository's pre-existing tracked
symlink was preserved.

## Documentation assessment

`docs/doctor.md` accurately describes the optimistic recursive transaction,
locked verification point, permanent taint, six-binding capture, pre-probe
release, exact-reference stale-callback check, and amended in-process trust
boundary.

Its weak-reference claims at `docs/doctor.md:30-43` are false on the supported
surface: standard discovery reaches a writable callback closure cell, and the
self-cycle probe demonstrates root/graph/capability retention. Its statement
that set/delete runs under the issuance lock at `:45-50` is accurate but omits
the resulting last-reference finalizer hazard. Both claims require
reconciliation with the corrected implementation and regressions.

## Final conclusion

reviewed_KO

Trial 9 repairs the two Trial 8 mechanisms targeted by its directed tests and
establishes a coherent optimistic admission transaction. It still permits
caller finalizers to execute under the global issuance lock during supported
descriptor set/delete, producing a reproducible cross-thread deadlock
condition. That P1 blocks acceptance. The separate P2 weakref callback-closure
authority also falsifies bounded retirement and no-graph-retention claims and
should be corrected in the next trial.

This result makes no claim of integration, promotion, publication, release,
the PROBES or PORTABILITY slices, or completion of H/0/01.
