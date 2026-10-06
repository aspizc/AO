# Review Submission - Project V5 H/0/01 DOCTOR (Trial 8)

## Review boundary

This request closes the two findings in the independently reviewed Trial 7
DOCTOR result at:

```text
822ca1cedf072cd8e1fce00bc9fe572a9f533c2c
docs(review): record H_0_1_DOCTOR trial 7 result
```

The binding plan was reconciled separately at:

```text
0cfb8ff293fbd2467a7dd5a8575c40d7a083a75c
docs(plan): bind doctor descriptor lifecycle trial 8
```

That plan commit was consulted read-only with `git show`; it was not
cherry-picked into this branch. No shared plan, index, README, manifest,
workflow, lock, schema, or suite inventory was edited.

The review covers only:

- removal of the class-observable raw `member_descriptor` capability;
- irreversible mutation tracking for all eight DOCTOR DTOs;
- weak issuance-record ownership and identity-safe retirement;
- one-read local admission snapshots with no ledger snapshot retention;
- reclamation of discarded result graphs and probe capabilities; and
- the task-owned DOCTOR documentation for that boundary.

It does not cover CLI wiring, real probes, providers, Redis, Gateway, MCP,
KYA, portability, integration, promotion, publication, release, or the full
H/0/01 exit gate.

## Trial 7 findings closed

### Installed descriptor storage

Trial 7 installed `_TrackedSlot` descriptors whose public `_storage()` method
returned each DTO field's original writable `member_descriptor`. Calling that
descriptor directly bypassed `_TrackedSlot.__set__`, so same-value and
different-then-restored writes remained untainted and admissible.

Trial 8 removes `_TrackedSlot._storage`. The installed descriptor has no
instance dictionary or storage slot, and its methods contain no raw-slot
default or closure. Its `__get__`, `__set__`, and `__delete__` methods resolve
storage only through the module-private `_tracked_slot_storage` helper and
`_TRACKED_SLOT_STORAGE` authority map. Module globals and private authority
maps remain outside the stated attacker boundary.

Every supported set or delete calls `_mark_dto_mutated` before resolving or
touching storage. Taint is one-way, including when the assigned object is the
current value, when a different value is later restored, or when the storage
operation itself fails.

### Weak issuance lifecycle

All eight slotted dataclasses are weak-referenceable. `_IssueRecord` has
exactly two retained values:

```text
reference: weak reference to the exact issued root
tainted: irreversible bool
```

It retains no strong root, nested DTO, construction snapshot, container,
probe callable, or probe closure. `_IssueReference` carries only the integer
ledger key and uses the module-level `_retire_issue` callback, not a
per-capability closure.

Retirement reads the integer key, looks up the record without touching the
DTO, and deletes only when the selected record contains the exact same weak
reference by `is`. A delayed stale callback therefore cannot delete a
replacement record at a reused integer key. Ledger lookup likewise uses only
the built-in integer `id`, exact type, weak-reference dereference, identity,
and the taint bit; it invokes no DTO equality, hashing, formatting, or caller
callback.

Failed constructors validate before `_record_issue` and add no record.
Discarded bindings, observations, completed result graphs, and their probe
capabilities become collectible. After collection the ledger returns to the
canonical live-key baseline. Canonical records remain live only because the
module's public/private registry roots remain live.

### One-read local snapshots

The ledger no longer stores construction snapshots. Each admission now:

1. checks exact root type;
2. resolves the `id`-keyed record;
3. requires its live weak reference to resolve to that exact root;
4. rejects irreversible taint;
5. reads every known root slot once into local variables;
6. validates exact scalar, container, nested issuance, and canonical authority
   relationships from those locals; and
7. returns a closed immutable safe snapshot used by its caller.

Nested DTOs repeat the same admission. `run_doctor` captures all six safe
binding snapshots before the first intentional probe call. Observation
lookup, result validation, projection, and both renderers consume safe local
snapshots and do not reread a caller-owned DTO after validation.

## Threat boundary

The supported claim starts when a value is presented to a DOCTOR boundary.
It excludes:

- code executed in an attacker-defined class or metaclass body before
  presentation; and
- an attacker already able to mutate DOCTOR module globals, DTO classes,
  private issuance/storage/authority maps, or Python builtins.

Within that boundary, rejection causes zero DOCTOR-triggered hostile
`getattr`, iteration, callable invocation, equality, hash, `repr`, `str`,
`bool`, or field-call callbacks.

## TDD evidence

### RED

Commit:

```text
b7e755a7e2c79f559ff03634e978b5c8cbc66aa2
tree ffe7aa8b17b4f6a73baffabc40453bea27b2c062
test(h001): expose doctor descriptor lifecycle gaps
```

Direct parent: exact sealed Trial 7 KO
`822ca1cedf072cd8e1fce00bc9fe572a9f533c2c`.

The RED commit changes only `tests/cli/test_doctor.py` and adds 68 cases:

- 16 all-eight same-value/different-then-restored raw-slot admissions;
- 25 field-descriptor public-observable capability checks;
- 6 nested public-registry raw-slot admissions;
- 8 validate/project/render raw-slot admissions;
- 8 all-eight weak-record shape and referent checks; and
- 5 lifecycle cases for discarded capabilities/result graphs, canonical
  baseline liveness, failed construction, and stale retirement.

The descriptor scan covers descriptor dictionaries, declared slots, function
defaults, keyword defaults, closure cells, non-dunder attributes, zero-arg
observable callables, and exact built-in containers reachable from those
values. It never reads the excluded module-global authority map.

Against the unchanged Trial 7 source, the directed selection produced:

```text
67 failed, 1 passed, 207 deselected in 1.60s
```

The already-correct failed-constructor/no-record case was the one pass. Every
other failure reproduced either an exposed raw writable descriptor,
`tainted=False` admission, a strong/non-weak record, retained capability/result
graph, or missing identity-safe retirement.

The complete RED focal inventory produced:

```text
67 failed, 208 passed in 7.26s
```

The Trial 7 source blob remained byte-identical at the base and RED:

```text
886f92bc1714333650c2a2128ad68732b56dd07a
```

### GREEN

Technical commit:

```text
50ee288a5c2cc86c104c38eebc8b9ace4a87e276
tree faaf116d8a8a619a433fcf8a3fefd5e158df646a
fix(h001): reclaim doctor issuance records
```

Direct parent: tests-only RED
`b7e755a7e2c79f559ff03634e978b5c8cbc66aa2`.

The technical commit changes only `cli/src/agents_cli/doctor.py`.

Task-owned documentation commit:

```text
88dc67b8b96a1c65e248745c4f4d0f9e96da98be
tree efdb635e83672944997c87d3b5d3af8daf02c5cc
docs(doctor): describe weak issuance lifecycle
```

Direct parent: technical commit
`50ee288a5c2cc86c104c38eebc8b9ace4a87e276`.

The documentation commit changes only `docs/doctor.md`. It removes the false
strong-reference/snapshot-retention description and documents weak
retirement, private-map slot authority, irreversible taint, and one-read local
safe snapshots.

The RED test blob is byte-identical at the technical and documentation
commits:

```text
427c011ff11710c9f39864d70d33dd9bd85eac6f
```

## Verification

Runtime/tool identity:

```text
Python 3.13.13
uv 0.11.21
pytest 9.1.1
Ruff 0.16.0
```

### Trial 8 directed selection

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial8-postdocs-selection \
  tests/cli/test_doctor.py \
  -k 'raw_descriptor or raw_storage_capability or issuance_record or discarded_run or discarded_runs or canonical_ledger or failed_constructor or stale_retirement'
```

Result:

```text
68 passed, 207 deselected in 1.60s
```

### Complete focused inventory

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial8-postdocs-focal \
  tests/cli/test_doctor.py
```

Result:

```text
275 passed in 9.34s
```

### Preserved Trial 7 adversarial matrix

The exact prior selection still covers non-exact binding containers,
binding/observation issuance, complete pre-probe capture, all-eight
nonissued/invalid graphs, all-eight supported mutation forms, hostile
constructors, container subclasses, all result boundaries, and no-reread
consumers:

```text
116 passed, 159 deselected in 3.88s
```

All hostile callback inventories remained empty on rejection.

### Structure, schema, and static gates

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial8-postdocs-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Result:

```text
8 passed in 0.06s
```

`python -m json.tool schemas/doctor-result-v1.schema.json` passed, as did
`Draft202012Validator.check_schema`.

```text
uv run --offline --no-project --with ruff \
  ruff check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py

uv run --offline --no-project --with ruff \
  ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
```

Result:

```text
All checks passed!
2 files already formatted
```

`git diff --check` also passed. The doctor source imports only Python
standard-library modules.

The unchanged closed-corpus tests retain 6 checks, 35 outcomes, schema-valid
projection parity, aggregate/exit relationships, fresh detached
remediations, static exception behavior, and custom `BaseException`
propagation.

## Frozen identity and range

- Branch: `feat/V5-H-0-01-doctor`.
- Exact Trial 8 base / sealed Trial 7 KO:
  `822ca1cedf072cd8e1fce00bc9fe572a9f533c2c`
  (tree `ebc1b924b028d596205d7ed543fbce40b90dcd95`).
- RED:
  `b7e755a7e2c79f559ff03634e978b5c8cbc66aa2`
  (tree `ffe7aa8b17b4f6a73baffabc40453bea27b2c062`).
- Technical:
  `50ee288a5c2cc86c104c38eebc8b9ace4a87e276`
  (tree `faaf116d8a8a619a433fcf8a3fefd5e158df646a`).
- Task-owned documentation:
  `88dc67b8b96a1c65e248745c4f4d0f9e96da98be`
  (tree `efdb635e83672944997c87d3b5d3af8daf02c5cc`).

Parentage is exact and linear:

```text
822ca1cedf072cd8e1fce00bc9fe572a9f533c2c
  -> b7e755a7e2c79f559ff03634e978b5c8cbc66aa2
  -> 50ee288a5c2cc86c104c38eebc8b9ace4a87e276
  -> 88dc67b8b96a1c65e248745c4f4d0f9e96da98be
```

Exact implementation/documentation range:

```text
822ca1cedf072cd8e1fce00bc9fe572a9f533c2c..
88dc67b8b96a1c65e248745c4f4d0f9e96da98be
```

Net task-owned paths:

```text
cli/src/agents_cli/doctor.py  +70/-271
tests/cli/test_doctor.py      +468/-0
docs/doctor.md                 +27/-13
```

Final blobs:

```text
cli/src/agents_cli/doctor.py
  73fce9b3d8fab7a676ae69c121aaebe9e0c1de82
tests/cli/test_doctor.py
  427c011ff11710c9f39864d70d33dd9bd85eac6f
docs/doctor.md
  26cb0260a8f839242301a7dd6685e8006bceaf40
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

All remain mode `100644`. The final source is 1,425 lines; the focused test
module is 2,561 lines.

## Postflight

Immediately before this request-only file was created:

- the implementation/documentation worktree was clean;
- `git diff --check` passed for the exact range;
- all checked Trial 8 pytest basetemps were absent;
- `.pytest_cache/`, `.ruff_cache/`, `__pycache__/`, `.pyc`, and `.pyo`
  artifacts were absent; and
- no generated project artifact was present.

No checkout, secondary worktree, process supervisor, service, or generated
project artifact was created by this trial.

## Honest limits

This lane did not run aggregate CI, installation, npm, network access, a real
provider, Redis, Gateway, MCP, KYA, tmux, coordination, shared services,
portability, integration, promotion, publication, or release.

It did not modify `cli/main.py`, real doctor probes, adapters, repositories,
policy registries, shared configuration, manifests, workflows, lock files,
suite hashes, plan indexes, root README, changelog, `message.*`, or
`agents:events`.

Only cached offline Python tooling and injected in-memory fakes were used. No
subagent was spawned. This request does not claim an independent verdict, the
PROBES or PORTABILITY slices, completion of H/0/01, integration, promotion,
publication, or release.

## Commits

- `b7e755a7e2c79f559ff03634e978b5c8cbc66aa2` -
  `test(h001): expose doctor descriptor lifecycle gaps`
- `50ee288a5c2cc86c104c38eebc8b9ace4a87e276` -
  `fix(h001): reclaim doctor issuance records`
- `88dc67b8b96a1c65e248745c4f4d0f9e96da98be` -
  `docs(doctor): describe weak issuance lifecycle`
