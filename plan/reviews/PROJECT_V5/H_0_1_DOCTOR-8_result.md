# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 8)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 1 |

Trial 8 closes both sequential reproductions from Trial 7: installed DTO
descriptors no longer expose their raw writable `member_descriptor`, and
ordinary discarded DTO/result/probe graphs are reclaimed through weak,
identity-checked issuance records. Exact-type admission, deterministic
binding capture, issued observations, canonical authority, safe projections,
and renderer behavior remain green.

The issuance protocol is not concurrently consistent, however. Admission
checks `tainted` only before it starts constructing a fresh snapshot. A
supported descriptor write can then taint and change a DTO while admission is
in progress; the validator reads and accepts the post-taint value. The same
race can replace a binding capability that `run_doctor` subsequently invokes.

The weak-reference lifecycle also leaves its integer retirement key on a
publicly discoverable writable weak-reference object. Standard
`weakref.getweakrefs(dto)` exposes that object. Changing its `key` before
collection prevents the callback from finding the original ledger entry, so
dead records can again accumulate without bound.

## Frozen identity and scope

- Reviewed request commit:
  `6a56e6d9394b546551f65ef24e2d84b9f2da6296`
  (`docs(review): request H_0_1_DOCTOR trial 8`).
- Reviewed request tree:
  `37313a5bb4a9aae1107db24b86e74867a7bfda21`.
- Sealed Trial 7 result/base:
  `822ca1cedf072cd8e1fce00bc9fe572a9f533c2c`.
- Tests-only RED:
  `b7e755a7e2c79f559ff03634e978b5c8cbc66aa2`.
- Technical candidate:
  `50ee288a5c2cc86c104c38eebc8b9ace4a87e276`.
- Task-owned documentation:
  `88dc67b8b96a1c65e248745c4f4d0f9e96da98be`.
- Binding plan consulted read-only:
  `0cfb8ff293fbd2467a7dd5a8575c40d7a083a75c`.
- Exact implementation/documentation range:
  `822ca1cedf072cd8e1fce00bc9fe572a9f533c2c..88dc67b8b96a1c65e248745c4f4d0f9e96da98be`.
- Review worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`.

Parentage is exact and linear:

```text
822ca1cedf072cd8e1fce00bc9fe572a9f533c2c
  -> b7e755a7e2c79f559ff03634e978b5c8cbc66aa2
  -> 50ee288a5c2cc86c104c38eebc8b9ace4a87e276
  -> 88dc67b8b96a1c65e248745c4f4d0f9e96da98be
  -> 6a56e6d9394b546551f65ef24e2d84b9f2da6296
```

The implementation/documentation range changes exactly:

```text
cli/src/agents_cli/doctor.py  +70 / -271
tests/cli/test_doctor.py     +468 /   -0
docs/doctor.md                +27 /  -13
```

The request commit adds only
`plan/reviews/PROJECT_V5/H_0_1_DOCTOR-8_to_review.md`.

This result reviews only the Trial 8 DOCTOR descriptor, issuance, admission,
result, renderer, regression-test, and task-owned documentation boundary. It
does not claim the later PROBES or PORTABILITY slices, CLI wiring, Redis,
Gateway, MCP, integration, promotion, publication, release, or the complete
H/0/01 exit gate.

## P1 finding

### P1 — Admission can consume and invoke post-taint values under concurrent mutation

`_issue_record()` checks exact type, weak-reference identity, and
`not candidate.tainted` at
`cli/src/agents_cli/doctor.py:304-319`. Every admission method then discards
the returned record and constructs a new snapshot without checking the taint
state again:

- `_admit_probe_binding()` at `:475-477`;
- `_admit_probe_observation()` at `:455-457`;
- `_admit_doctor_check()` at `:558-560`;
- `_validated_result_snapshot()` at `:613-615`; and
- `_validate_doctor_run()` at `:640-642`.

The fresh snapshot functions read caller-owned slots after that one-time
check. For example, `_new_binding_snapshot()` reads `check_id` and `probe` at
`:460-472`, while `_new_result_snapshot()` first performs the comparatively
large registry validation and only then reads result fields at `:573-610`.
There is no lock, version, second taint check, or equivalent consistency
protocol.

The descriptor correctly sets `record.tainted = True` before changing storage
at `:119-149`. That ordering makes the race demonstrably inconsistent: a
validator can accept a newly written value even though no state ever contained
both that value and an untainted record.

An independent two-thread stress reproduction used 200 fresh issued
`DoctorResult` roots. One thread called `project_result`; the other performed
the supported:

```python
object.__setattr__(result, "profile_id", "concurrently-changed")
```

Both threads started each iteration at the same barrier with a very small
thread switch interval. The observed result was:

```text
iterations:        200
accepted changed:   79
accepted old:        0
rejected:          121
```

Each accepted projection contained `profileId == "concurrently-changed"` and
its issuance record was already tainted. The changed profile is itself a valid
closed-contract identifier, so this is not rejection of an invalid scalar; it
is acceptance of a value written only after irreversible taint.

A deterministic reviewer scheduling probe paused
`_new_binding_snapshot()` after `_issue_record()` had passed and before its
first field read. A second thread replaced the issued binding's `probe`
through `object.__setattr__`. `run_doctor()` then captured and intentionally
invoked that post-taint capability:

```text
interleaving triggered: true
binding tainted:        true
run exit:               0
original probe calls:   0
injected probe calls:   1
```

The scheduler only fixed the thread interleaving; it did not mutate module
globals, DTO classes, the ledger, an authority map, or Python builtins.

This contradicts the binding plan's irreversible-mutation and safe-snapshot
claims at
`0cfb8ff:plan/PROJECT_V5/H/0/01.md:110-122` and the task documentation at
`docs/doctor.md:43-60`. It also means the existing sequential mutation and
no-reread regressions do not cover a capability-changing race.

Required correction:

- make admission produce one consistent snapshot whose root and nested
  issuance states cannot change unnoticed during capture, using a lock,
  version/sequence protocol, post-capture taint validation, or an equivalently
  auditable mechanism;
- ensure `run_doctor` cannot invoke a binding capability written after its
  admission check;
- add deterministic concurrent RED cases for binding capture and every public
  result boundary, including a valid different value rather than only a
  same-value write; and
- document any intentionally single-threaded ownership restriction if
  concurrency is deliberately excluded, and enforce that restriction rather
  than relying on an unstated process assumption.

## P2 finding

### P2 — The publicly discoverable weak-reference key can disable record retirement

`_IssueReference` stores the ledger key in an ordinary writable slot at
`cli/src/agents_cli/doctor.py:107-116`. `_retire_issue()` trusts that mutable
slot to select the ledger entry at `:98-104`. All eight DTOs are deliberately
weak-referenceable.

Python's standard `weakref.getweakrefs(value)` returns the ledger's
`_IssueReference` for any issued DTO. This requires no access to the doctor
module's private ledger, storage map, authority maps, DTO classes, or builtins.
The returned reference permits normal assignment to `key`.

The independent single-object reproduction observed:

```text
canonical baseline:                 152
ledger after one issued object:     153
issue reference externally seen:   true
referent collected after key edit: true
dead original record retained:     true
ledger delta after collection:       1
```

Repeating the same operation for 100 simultaneously live observations,
changing each discovered issue reference's key to `0`, and then discarding
all observations produced:

```text
referents collected:      100
dead records retained:    100
ledger delta:             100
```

The exact-reference comparison still prevents a stale callback from deleting
an unrelated replacement record. The retained entries also no longer keep
DTOs or probe capabilities alive. This is therefore P2 rather than P1.
Nevertheless, it falsifies the Trial 8 promise that collection retires each
record and that discarded graphs return the ledger to its canonical live-key
baseline. An adversarial caller can restore unbounded dead-record growth.

Required correction:

- do not place retirement authority in externally writable weak-reference
  state, or make the selected mechanism immutable under supported public
  object operations;
- preserve the exact-reference stale-callback guard;
- add a regression that inventories `weakref.getweakrefs()` for every DTO,
  attempts key mutation/deletion, discards a bounded batch, and proves both
  referent collection and canonical ledger-baseline restoration; and
- reconcile the threat boundary explicitly if standard weakref introspection
  is intentionally excluded.

## Correct behavior preserved

### Descriptor semantics and sequential irreversible taint

`_TrackedSlot` now has empty slots and no `_storage()` method. Its methods have
no raw descriptor in defaults, keyword defaults, or closures and delegate
storage resolution to the excluded module-private authority. The 25-field
descriptor inventory found no reachable `member_descriptor`. Sequential
same-value, different-value, hostile, and different-then-restored writes
through supported descriptors taint and reject all eight DTOs.

The dataclass decorator/sealing order is coherent: each DTO is first created
as a frozen slotted weak-referenceable dataclass, and `_seal_dto` then replaces
its field member descriptors while leaving `__weakref__` alone. Construction
writes occur before issuance exists; the metaclass validates the completed
instance and records it only afterward.

### Ordinary weak retirement and stale callbacks

With the issue reference left untouched, `_IssueRecord` contains only one weak
reference and one bool. Discarded observations, bindings, result graphs, runs,
and weak-referenceable probe capabilities collect, and the ledger returns to
the 152-key canonical baseline. Failed constructors add no record. The
callback's exact weak-reference identity check correctly prevents an ordinary
delayed stale callback from deleting a replacement record at a reused integer
key.

### Exact type, closed values, and safe consumers

Sequential admission rejects non-exact/unissued roots and tainted records
before known DTO slots are read. Each individual fresh snapshot reads its
known root fields once, recursively admits exact tuple children, and uses only
exact enums, strings, integers, tuples, and issued nested DTOs. The six
bindings are captured before the first intentional probe call. Result
projection and both renderers consume returned local snapshots without
rereading caller-owned DTO fields.

Canonical private/public registry identity, outcome selection, aggregate
status, exit-code relationships, exception replacement, `BaseException`
propagation, safe profile validation, deterministic ordering, detached
remediations, and schema parity remain covered by the focused suite.

## Regression tests and TDD lineage

The declared RED/GREEN lineage is structurally valid:

- `b7e755a7...` changes only `tests/cli/test_doctor.py`;
- the source blob is byte-identical at the sealed Trial 7 base and RED:
  `886f92bc1714333650c2a2128ad68732b56dd07a`;
- the final RED test blob is
  `427c011ff11710c9f39864d70d33dd9bd85eac6f` and remains byte-identical
  through the technical, documentation, and request commits;
- `50ee288a...` changes only `cli/src/agents_cli/doctor.py`, producing blob
  `73fce9b3d8fab7a676ae69c121aaebe9e0c1de82`;
- `88dc67b...` changes only `docs/doctor.md`, producing blob
  `26cb0260a8f839242301a7dd6685e8006bceaf40`; and
- the result-schema blob remains unchanged:
  `49f05a54526ac4c8505bb31236099f8ba7c5678c`.

The RED commit adds the requested all-eight descriptor and ordinary lifecycle
matrix, and the submission records the expected **67 failed / 1 passed**
directed result against unchanged Trial 7 source. This review verified the
unchanged source blob, exact parentage, tests-only RED scope, and frozen test
blob without checking out or mutating a historical tree.

The new tests are strong for sequential descriptor discovery, normal weak
collection, canonical baseline liveness, failed construction, and exact-ref
stale callbacks. They contain no thread/concurrency case and do not inspect
the issue reference through standard public weakref discovery or attempt to
alter its retirement key. Those omissions correspond directly to P1 and P2.

## Independent verification

All commands used cached offline tooling, repository files, and in-memory
objects only.

Complete focused inventory:

```text
tests/cli/test_doctor.py
275 passed in 7.96s
```

Trial 8 directed descriptor/lifecycle selection:

```text
68 passed, 207 deselected in 1.60s
```

Structure inventory:

```text
tests/structure/test_h001_sample.py
tests/structure/test_project_layout.py
8 passed in 0.07s
```

Additional gates:

- Ruff check: passed with `--no-cache`.
- Ruff format check: 2 files already formatted with `--no-cache`.
- JSON syntax for `schemas/doctor-result-v1.schema.json`: passed.
- Draft 2020-12 schema self-validation: passed.
- `git diff --check` for the implementation/documentation and request ranges:
  passed.
- The final doctor source imports only Python standard-library modules.
- Reviewer-only concurrency and weakref lifecycle probes produced the exact
  counts recorded in P1 and P2.

The complete focused suite subsumes the preserved Trial 7 adversarial
inventory. Aggregate CI, installation, npm, network, services, providers,
Redis, Gateway, MCP, KYA, tmux, portability, integration, promotion,
publication, and release were not run or claimed.

## Documentation

`docs/doctor.md` correctly removes Trial 7's strong-root/snapshot-retention
description and accurately documents the sequential descriptor design, weak
record shape, exact-type admission, local snapshots, deferred wiring, and
runtime-finality exclusion.

Its statements that every post-issuance write remains invalid and that
collection retires discarded records are too broad under P1 and P2. The
documentation must not retain those absolute claims until concurrent
admission and externally observable weak-reference state are either secured
or explicitly excluded and enforced.

## Final conclusion

reviewed_KO

Trial 8 repairs Trial 7's exposed raw slot and ordinary strong-retention
failures, with clean sequential tests and valid TDD parentage. It still admits
post-taint values and capabilities under a real thread race, and its writable
publicly discoverable retirement key permits unbounded dead ledger records.
The P1 admission race and P2 retirement-authority gap require another RED/GREEN
correction before a positive independent verdict.
