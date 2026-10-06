# Review Submission - Project V5 H/0/01 DOCTOR (Trial 9)

## Requested reviewer

Please assign a fresh **GPT-5.6 Sol** reviewer with **ultra** reasoning on the
**Priority/Fast** service tier. The reviewer should start from repository
evidence rather than inherited implementation conclusions and write the
independent verdict to:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-9_result.md
```

## Review boundary

This request addresses the two findings in the independently reviewed Trial 8
DOCTOR result:

```text
530eec79f503e5c874e76f3ab24df8409bf14188
tree 6f4b3331e8b4b86390ada51a258027d94fe2cbc8
docs(review): record H_0_1_DOCTOR trial 8 result
```

The binding plan and its two amendments were consulted read-only:

```text
744f06c1685855c5dda2c4f2d1a20fb3721c94e3
docs(plan): bind ACK trial 3 and doctor trial 9

4d0e42e54f791afed3a5c9cbd9aad5af52bc04df
docs(plan): extend ACK and doctor correction gates

7f328b4985b48f495cdf3415bb8742568fb42ecc
docs(plan): define doctor in-process trust boundary
```

None of those shared plan commits was merged or cherry-picked into this
branch. No shared plan, index, README, manifest, workflow, lock, schema, or
suite inventory was edited.

The review covers only:

- atomic admission relative to supported DTO descriptor writes and issuance
  retirement;
- complete recursive result and six-binding snapshots;
- release of the admission protocol before intentional probe invocation;
- immutable standard weak-reference discovery and identity-safe retirement;
- bounded ledger retirement without caller graph or probe retention;
- preservation of the closed DOCTOR result contract; and
- the task-owned documentation and in-process trust boundary.

It does not cover CLI wiring, real probes, providers, Redis, Gateway, MCP,
KYA, portability, integration, promotion, publication, release, or the full
H/0/01 exit gate.

## Trial 8 findings addressed

### P1 - validation/capture race

Trial 8 checked exact issuance identity and irreversible taint before reading
DTO fields, but the check and recursive snapshot were separate operations. A
supported descriptor write could land after `_issue_record` returned and
before field capture. A valid replacement `DoctorResult.profile_id` could be
projected, and a concurrently replaced `ProbeBinding.probe` capability could
be invoked.

Trial 9 makes admission an optimistic recursive transaction:

1. each admitted DTO passes the exact type, ledger key, exact live reference,
   root identity, and untainted check;
2. the transaction records only the integer key, sealed DTO type, and exact
   `_IssueRecord`, never a caller graph or probe;
3. known fields are read once into the existing closed local snapshots, and
   nested DTOs join the same per-thread transaction;
4. every supported descriptor set/delete holds a reentrant `RLock`, marks the
   exact issued root permanently tainted, and touches storage before releasing
   that lock;
5. weak-reference retirement holds the same lock; and
6. before a snapshot is accepted, the transaction takes the lock and
   revalidates every collected ledger entry, reference identity, live
   referent, exact type, and untainted bit.

The final locked verification is the linearization point. A write or
retirement serialized before it makes admission fail; one serialized after it
cannot change the detached local snapshot. Initial checks reject prior taint,
and the final check rejects taint or replacement arising anywhere during the
recursive capture.

Constructors use a fresh nested capture scope, verify every issued child under
the same lock, and only then record the newly validated root. Nested
admissions are reentrant. Scope cleanup occurs in `finally`, including for
control-flow exceptions.

`_snapshot_bindings` owns one transaction for all six bindings. It returns
only committed `(check_id, probe)` pairs. `run_doctor` holds neither the
transaction scope nor the issuance lock when it intentionally invokes a
probe. A post-check replacement therefore either invalidates the transaction
before invocation or occurs after commit while the detached original
capability remains selected.

### P2 - mutable weak-reference retirement key

Trial 8 used a `weakref.ref` subclass with a writable `key` slot. Standard
`weakref.getweakrefs(dto)` discovery exposed that object, so a caller could
rewrite or delete its retirement key and leave dead ledger records behind.

Trial 9 records an exact built-in `weakref.ref`. It has no caller-writable key
attribute. Its callback closes only over the scalar integer key, returns
without mutation if manually called while the referent is live, and retires a
dead record only when:

```text
ledger[key].reference is callback_reference
```

Retirement uses the same issuance lock as descriptor taint and final
admission. A stale callback cannot delete a replacement record. The all-eight
standard-discovery matrix verifies exact built-in reference type, blocked key
set/delete, scalar-only closure cells, live manual-callback safety, and
bounded collection after attempted authority edits.

The ledger continues to retain only a weak reference and irreversible bool.
It retains no DTO root, nested DTO, container, snapshot, callable, or callable
closure.

## Supported in-process trust boundary

The source security claim is limited to the supported public DTO, descriptor,
and standard weak-reference surface, including `object.__setattr__`,
descriptor delete, and `weakref.getweakrefs`.

The binding amendment explicitly excludes code that traverses
`function.__globals__` or `method.__func__.__globals__` into
underscore-prefixed names or private issuance/storage/authority maps. Code
that can mutate module globals, DTO classes, private maps, or Python builtins
already has internal module authority. That reflection is not a Trial 9 source
security claim and should not be used to recreate the removed absolute
"no-route-through-globals" assertion.

The boundary also does not claim to contain arbitrary hostile Python already
executing in the same process. D/0/02 owns real process isolation. Within the
supported boundary, Trial 9 still requires static safe rejection, permanent
taint, exact provenance, and no uncommitted result value or probe capability
use.

## TDD lineage

### RED

```text
d1621d5a256d7db8509e5c7078a2ec66f8887efe
tree 0f24e5323bbceb59fccdb43e502d37ab06012d54
parent 530eec79f503e5c874e76f3ab24df8409bf14188
test(h001): expose doctor admission races
```

The RED commit changes only:

```text
M tests/cli/test_doctor.py
```

It adds 17 directed cases:

- six result-boundary interleavings after exact issuance check;
- one binding capability replacement interleaving;
- one proof that the consistency protocol is released before probe calls;
- eight all-DTO public weak-reference discovery cases; and
- one all-DTO bounded retirement case after attempted key edits.

It also narrows the preserved descriptor test from an absolute reflection
claim to the supported descriptor surface. It does not traverse function
globals or mutate private maps.

Against the unchanged Trial 8 source:

```text
directed: 16 failed, 1 passed, 275 deselected in 0.94s
complete: 16 failed, 276 passed in 8.98s
```

The one pass proves Trial 8 already released its consistency mechanism before
intentional probes; all 16 new race/retirement-authority assertions failed.
A detached `git archive` replay of the RED commit reproduced:

```text
16 failed, 1 passed, 275 deselected in 3.18s
```

The source blob is byte-identical at the Trial 8 base and RED:

```text
73fce9b3d8fab7a676ae69c121aaebe9e0c1de82
```

### GREEN technical

```text
b7353e3da933c97eca2406380c76ce69199508d1
tree d3ac014ebe0c294228fc71fc0b6a05fbbe053ab6
parent d1621d5a256d7db8509e5c7078a2ec66f8887efe
fix(h001): make doctor admission atomic
```

The technical commit changes only:

```text
M cli/src/agents_cli/doctor.py
```

### Task-owned documentation

```text
adeea76b7a54c2c22b80127db035ab4c76baa607
tree 664bc0c078c8b2c48afbeee9fff2dd11aa43e8f4
parent b7353e3da933c97eca2406380c76ce69199508d1
docs(h001): define doctor trust boundary
```

The documentation commit changes only:

```text
M docs/doctor.md
```

It documents the optimistic recursive transaction, locked commit point,
permanent taint, pre-probe release, exact built-in weak references,
scalar-key/exact-reference retirement, and the supported public in-process
trust boundary. It removes the former absolute closure/globals route claim.

The RED test blob remains byte-identical through technical and documentation
commits:

```text
23e4b2c42627e2220108ea4340e99a1c4cabac44
```

## Reproducible verification

Tool identity used for the recorded GREEN runs:

```text
Python 3.13.13
pytest 9.0.3
Ruff 0.15.16
uv 0.11.21
```

Only cached/offline Python tooling, repository files, and in-memory injected
probes were used.

### Trial 9 directed selection

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial9-selection \
  tests/cli/test_doctor.py \
  -k 'result_admission_is_atomic_against_supported_concurrent_mutation or
      binding_capture_never_invokes_a_concurrently_replaced_capability or
      consistency_protocol_is_released_before_intentional_probe_invocation or
      public_weakref_discovery_exposes_no_mutable_retirement_authority or
      weakref_authority_attempts_cannot_prevent_bounded_ledger_retirement'
```

Result:

```text
17 passed, 275 deselected in 0.76s
```

The same 17-case selection passed five consecutive additional runs in
0.74-0.81 seconds each.

### Complete focused inventory

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial9-focal \
  tests/cli/test_doctor.py
```

Result:

```text
292 passed in 12.02s
```

### Preserved Trial 7 adversarial matrix

This exact selection covers non-exact binding containers, binding and
observation issuance, complete pre-probe capture, the all-eight invalid graph
and supported mutation matrix, hostile constructors, container subclasses,
every result boundary, and no-reread consumers:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial9-trial7 \
  tests/cli/test_doctor.py \
  -k 'non_exact_binding_containers or requires_every_exact_binding or
      probe_observation_requires_issued or complete_safe_binding_snapshot or
      every_dto_admission_rejects or every_issued_dto_rejects or
      every_public_dto_constructor_rejects or
      dto_constructors_reject_container_subclasses or
      every_result_boundary_enforces or
      result_consumers_use_validator_snapshot'
```

```text
116 passed, 176 deselected in 5.10s
```

### Amended Trial 8 descriptor/lifecycle matrix

The renamed supported-surface descriptor case replaces the obsolete
`raw_storage_capability` absolute-reflection name:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial9-trial8 \
  tests/cli/test_doctor.py \
  -k 'raw_descriptor or raw_storage_on_supported_surface or issuance_record or
      discarded_run or discarded_runs or canonical_ledger or
      failed_constructor or stale_retirement'
```

```text
68 passed, 224 deselected in 2.09s
```

### Structure, schema, and static gates

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial9-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Result:

```text
8 passed in 0.05s
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

`git diff --check` passed. The final doctor source imports only Python
standard-library modules. The unchanged closed corpus retains 6 checks, 35
outcomes, schema-valid projection parity, aggregate/exit relationships,
fresh detached remediations, static exception behavior, and custom
`BaseException` propagation.

## Frozen identity and pathsets

- Branch: `feat/V5-H-0-01-doctor`.
- Trial 8 KO base:
  `530eec79f503e5c874e76f3ab24df8409bf14188`
  (tree `6f4b3331e8b4b86390ada51a258027d94fe2cbc8`).
- Tests-only RED:
  `d1621d5a256d7db8509e5c7078a2ec66f8887efe`
  (tree `0f24e5323bbceb59fccdb43e502d37ab06012d54`).
- Source-only technical:
  `b7353e3da933c97eca2406380c76ce69199508d1`
  (tree `d3ac014ebe0c294228fc71fc0b6a05fbbe053ab6`).
- Docs-only:
  `adeea76b7a54c2c22b80127db035ab4c76baa607`
  (tree `664bc0c078c8b2c48afbeee9fff2dd11aa43e8f4`).

Parentage is exact and linear:

```text
530eec79f503e5c874e76f3ab24df8409bf14188
  -> d1621d5a256d7db8509e5c7078a2ec66f8887efe
  -> b7353e3da933c97eca2406380c76ce69199508d1
  -> adeea76b7a54c2c22b80127db035ab4c76baa607
```

Exact implementation/documentation range:

```text
530eec79f503e5c874e76f3ab24df8409bf14188..
adeea76b7a54c2c22b80127db035ab4c76baa607
```

Net task-owned paths:

```text
cli/src/agents_cli/doctor.py  +187/-60
tests/cli/test_doctor.py      +385/-3
docs/doctor.md                 +48/-28
```

Final blobs:

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

All remain mode `100644`. The final source is 1,552 lines, the focused test
module is 2,943 lines, and the task-owned documentation is 170 lines.

## Requested review focus and open risks

Please independently verify:

1. the optimistic transaction is serializable at its final locked
   verification for every recursive admission path;
2. every DTO that contributes a value or capability to an accepted snapshot
   contributes its exact issuance record to the owning scope;
3. permanent descriptor taint and weak retirement cannot race past that
   verification;
4. scope nesting and `finally` cleanup retain no caller graph or probe in
   thread-local or ledger state after admission;
5. no uncommitted or post-taint `ProbeBinding` capability can be invoked;
6. the lock and admission scope end before every intentional probe call;
7. built-in weak-reference discovery exposes no mutable retirement authority
   within the supported surface, and stale/manual callbacks are safe; and
8. the documentation states the amended in-process trust boundary without
   claiming source-level isolation from private-global authority.

The principal residual design risk is audit complexity: correctness relies on
irreversible taint plus a final all-record verification rather than holding
the lock throughout recursive field capture. The deterministic interleavings,
five repeated race runs, complete suite, and preserved adversarial matrices
are green, but this linearization argument should receive fresh scrutiny.

The scalar-key callback closure is accepted by the binding amendment. Review
should cover standard `weakref.getweakrefs` discovery and supported mutation,
not treat traversal through function globals/private module maps as a source
boundary claim.

## Postflight and honest limits

Immediately before this request-only file was created:

- the implementation/documentation worktree and index were clean;
- `git diff --check` passed for the exact range;
- all checked Trial 9 pytest basetemps were absent;
- `.pytest_cache/`, `.ruff_cache/`, `__pycache__/`, `.pyc`, and `.pyo`
  artifacts were absent; and
- no generated project artifact was present.

No checkout, secondary worktree, process supervisor, service, or generated
project artifact was created by this trial.

This lane did not run aggregate CI, installation, npm, network access, a real
provider, Redis, Gateway, MCP, KYA, tmux, coordination, shared services,
portability, integration, promotion, publication, or release.

It did not modify `cli/main.py`, real doctor probes, adapters, repositories,
policy registries, shared configuration, manifests, workflows, lock files,
suite hashes, plan indexes, root README, changelog, `message.*`, or
`agents:events`.

No subagent was spawned. This request does not claim an independent verdict,
the PROBES or PORTABILITY slices, completion of H/0/01, integration,
promotion, publication, or release.

## Commits

- `d1621d5a256d7db8509e5c7078a2ec66f8887efe` -
  `test(h001): expose doctor admission races`
- `b7353e3da933c97eca2406380c76ce69199508d1` -
  `fix(h001): make doctor admission atomic`
- `adeea76b7a54c2c22b80127db035ab4c76baa607` -
  `docs(h001): define doctor trust boundary`
