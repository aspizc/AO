# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 7)

## Verdict

**KO**

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 1 |

Trial 7 correctly retires portable runtime finality as a security claim. The
hostile-left-base subclasses from Trial 6 may now be created, but exact-type
admission rejects them before reading their fields. The private issuance,
binding capture, observation, registry, result, renderer, exception, schema,
and corpus paths also pass their declared tests.

The replacement provenance boundary is nevertheless bypassable. Every
installed tracked-slot descriptor publicly returns its original writable
`member_descriptor`. Writing through that descriptor avoids the mutation
hook. All eight issued DTOs remained untainted and admissible after a
same-value write, and a public canonical node became valid again after a
different-value write was restored. This directly contradicts the binding
plan and documentation claim that every post-issuance write permanently
invalidates provenance.

The strong-reference ledger also has no lifecycle or bound. That is recorded
as P2 because this trial is still an unwired pure core and a one-shot CLI
process could reclaim it at process exit; it must be resolved before this core
is reused in any long-lived process.

## Requested reviewer profile

- Requested model: **GPT-5.6 Sol**
- Requested reasoning effort: **ultra**
- Requested service tier: **Priority/Fast**
- Review date: **2026-07-27**

These values record the requested configuration. The worktree exposes no
independent model, reasoning-effort, or service-tier telemetry, so this result
does not claim telemetry attestation. The reviewer did not spawn or delegate
to any additional agent.

## Frozen identity and scope

- Branch: `feat/V5-H-0-01-doctor`
- Trial 7 base / sealed Trial 6 KO:
  `d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d`
- Base tree:
  `4049f8924bb01b5617225c696ad8eff3079288ba`
- RED 1:
  `ee1430390443e3a5fdf08580547680f89e947d58`
- RED 1 tree:
  `eeb4bffb91cfe7aa3aca8be4ac2cbfa2bb8ea90b`
- RED 2:
  `230990144fec8eb6ad8f5956998b258997d8b506`
- RED 2 tree:
  `06a5659c86bba72cba525e5c727abc1d8097a49e`
- RED 3:
  `f4b8d21ea09a300bf677ec7e72674f1fac8cea24`
- RED 3 tree:
  `5d9c612864b4b581b772c1e71f80e8bae4fe322d`
- Technical candidate:
  `c1f5dc9292453a319d8a29aed5462dc602681fba`
- Technical tree:
  `65f7361fed031212109152e8ccfb5137c6e7ed5d`
- Task-owned documentation:
  `6bbff329c6f30730a58b573f5ca869bf02e24e41`
- Documentation tree:
  `ceb1572a6643c00b537354d2ef29a1950272dbea`
- Request-only HEAD:
  `141e7bd40f38a1c6471b41ec98a953f974c035ae`
- Request tree:
  `05190620fba7936b377611ab197456cc368e58dd`
- Binding plan consulted read-only:
  `894fd3d7e20da2c454923a5f2b2ea3c1bd33e223`
- Exact implementation/documentation range:
  `d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d..6bbff329c6f30730a58b573f5ca869bf02e24e41`
- Review worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`

Parentage is exact and linear:

```text
d71c88452b4cd06f21fbb3c24fe21b21c8f38e6d
  -> ee1430390443e3a5fdf08580547680f89e947d58
  -> 230990144fec8eb6ad8f5956998b258997d8b506
  -> f4b8d21ea09a300bf677ec7e72674f1fac8cea24
  -> c1f5dc9292453a319d8a29aed5462dc602681fba
  -> 6bbff329c6f30730a58b573f5ca869bf02e24e41
  -> 141e7bd40f38a1c6471b41ec98a953f974c035ae
```

The five-commit implementation/documentation range changes exactly three
paths:

```text
cli/src/agents_cli/doctor.py  +922 / -374
tests/cli/test_doctor.py      +589 / -238
docs/doctor.md                 +52 /   -8
```

The three RED commits change only `tests/cli/test_doctor.py`. The technical
commit changes only `cli/src/agents_cli/doctor.py`. The documentation commit
changes only `docs/doctor.md`. The request commit adds only
`plan/reviews/PROJECT_V5/H_0_1_DOCTOR-7_to_review.md`.

This review covers only the exact-type/private-issuance DOCTOR result core and
its task-owned documentation. It does not review or claim CLI wiring, real
probes, providers, Redis, Gateway, MCP, KYA, portability, integration,
promotion, publication, release, or the full H/0/01 exit gate.

## P1 finding

### P1 — The installed tracked descriptor exposes a write path that bypasses permanent taint

The intended mutation fence is:

1. each dataclass member descriptor is replaced by `_TrackedSlot`;
2. `_TrackedSlot.__set__` and `__delete__` mark an existing issuance record
   tainted; and
3. every later admission rejects a tainted record.

The relevant implementation is
`cli/src/agents_cli/doctor.py:84-130,176-194,271-293`.
The defect is at `:107-114`: `_TrackedSlot._storage()` returns the original
slot descriptor. Because class-level descriptor access returns the installed
`_TrackedSlot` itself at `:116-119`, ordinary reflection on a public DTO class
provides the original writable storage capability:

```python
installed = ProbeObservation.__dict__["code"]
raw_slot = installed._storage()
raw_slot.__set__(observation, observation.code)
```

That call mutates the issued DTO without reaching `_TrackedSlot.__set__`.
It does not mutate a module global, DTO class, private ledger/map, or Python
builtin, and it does not rely on `ctypes`. It is a post-issuance object write
performed through a capability exposed by the installed public-class
descriptor, exactly where the request says the original storage is not
exposed.

The independent all-eight reproduction observed:

```text
raw_member_descriptor_exposed=member_descriptor
same_value_bypass_admitted=8/8
all_records_untainted=true
DTOs:
  Remediation
  OutcomeDefinition
  CheckDefinition
  ProbeObservation
  ProbeBinding
  DoctorCheck
  DoctorResult
  DoctorRun
```

For every DTO, the reviewer wrote its first field back through the leaked raw
slot, confirmed the issuance record remained untainted, and successfully ran
the complete corresponding admission validator.

The public paths also accepted representative bypassed objects:

```text
observation same-value raw write -> run_doctor exit 0
binding same-value raw write     -> run_doctor exit 0
result same-value raw write      -> project_result status pass
observation/binding/result taint -> false / false / false
```

The same route defeats the promised irreversibility, not just detection of an
idempotent assignment. On the public CONFIG remediation:

```text
raw write "bootstrap"  -> registry rejected
raw restore original   -> registry accepted again
issuance tainted       -> false
```

The binding plan requires a same-value write, different-value write, hostile
write, or deletion to invalidate issuance permanently. `docs/doctor.md:30-36`
states the same guarantee. The active mutation matrix at
`tests/cli/test_doctor.py:653-688` uses `object.__setattr__`, which dispatches
the installed `_TrackedSlot.__set__` and therefore cannot expose the bypass.
The class-observable test at `:761-804` covers only
`repr`/`str`/equality/hash hook replacement, not the installed field
descriptors or their storage capability.

Impact:

- an issued observation can undergo a post-issuance write and still reach
  outcome lookup;
- an issued binding can undergo a post-issuance write and still be captured;
- root and nested result DTOs can undergo a post-issuance write and still be
  projected or rendered;
- public/canonical registry nodes can be changed and restored without the
  required permanent invalidation; and
- the private ledger no longer proves the claimed history, even when its
  current scalar/object snapshot still matches.

The current value checks still reject an unrestored different or hostile
value without invoking its callbacks. The failure is specifically that the
provenance claim includes mutation history, while the reachable raw storage
path records none.

Required correction:

- do not expose the original writable member descriptor through the installed
  descriptor or another class-observable capability;
- make every supported post-issuance set/delete path advance irreversible
  mutation state, including same-value writes;
- add an all-eight RED that obtains only public DTO/class observables, performs
  same-value and different-then-restored raw writes, and proves every
  constructor/run/result boundary rejects permanently with zero hostile
  callbacks; and
- if pure-Python reflection makes the intended boundary narrower than the
  binding plan, reconcile the plan and documentation explicitly rather than
  retaining the current absolute write-history claim.

## P2 finding

### P2 — The strong-reference issuance ledger grows without a lifecycle or bound

`_ISSUANCE_LEDGER` is a process-global dictionary
(`cli/src/agents_cli/doctor.py:84-95`). Each `_IssueRecord` strongly retains
both the issued object and its complete snapshot (`:87-90`), and
`_record_issue()` only inserts (`:271-275`). There is no removal, weak
reference, generation teardown, run scope, or size bound anywhere in the
module.

This is sufficient to prevent `id` reuse while a record exists, and the
identity check at `:278-293` is sound on that assumption. It also means every
successful public DTO construction remains live until module reload or
process exit. A `ProbeBinding` record additionally retains its callable in its
snapshot (`:533-565`), so a discarded binding can retain an arbitrary trusted
capability and everything captured by its closure.

The independent lifecycle probe observed:

```text
initial ledger after module registry construction: 152
failed constructor added:                         0
six observations plus six bindings:             164
after three runs reusing those inputs:           206
growth per run:                                   14
after del plus gc.collect():                      206
records strongly retained:                       true
after importlib.reload():                         152
old instance exact current type:                 false
old instance rejected after reload:              true
```

The lower bound of 14 retained objects per normal run comes from six fresh
result remediations, six `DoctorCheck` objects, one `DoctorResult`, and one
`DoctorRun` (`cli/src/agents_cli/doctor.py:1538-1565`). Creating fresh
observations and bindings adds more.

This is P2 rather than a second P1 because the current slice is an unwired core
and an enforced one-shot CLI lifecycle could make process exit the bound.
No such lifecycle restriction is currently enforced or documented, however.
Before long-lived composition, either:

- implement safe record reclamation that still prevents `id` reuse and never
  invokes DTO equality/hash or hostile callbacks;
- scope the ledger to an explicit bounded generation/run lifecycle; or
- make one-shot process ownership an enforced and tested integration
  invariant, including the retention implications for probe callables.

A regression should prove that repeated completed runs and discarded
bindings do not retain unbounded DTOs/capability closures under the selected
lifecycle.

## Trial 6 findings and preserved boundary

### Portable finality was removed, not silently reasserted

The Trial 6 final-marker, MRO/namespace scan, metaclass `__new__`, and both
finality `__init_subclass__` hooks are absent from the candidate. Source
search found no finality mechanism. The active test at
`tests/cli/test_doctor.py:418-460` deliberately creates the hostile-left-base
subclass and verifies admission rejects it after construction without
DOCTOR-triggered field callbacks.

Comparing test names against the Trial 7 base shows that the retired tests are
the four portable-finality assertions from Trial 6. The former iterable
`BaseException` test was also removed because bindings are now required to be
an exact tuple and non-tuples are never iterated. Authorized probe
`BaseException` propagation remains covered and independently reproduced.
Other Trial 6 opacity, registry, result, exception, schema, and renderer tests
remain present.

### Exact issuance and constructor behavior

Subject to P1, source inspection and the green matrices confirm:

- admission checks exact root type and an `id`-keyed record whose retained
  value compares with `is` before field access
  (`cli/src/agents_cli/doctor.py:278-293`);
- snapshots are recorded only after `_snapshot_new_dto()` returns successfully
  (`:137-149,846-864`);
- failed construction adds no root ledger record; the reviewer observed zero
  growth for the directed invalid constructor, while the all-eight
  constructor matrix remained green;
- exact unissued objects, missing slots, hostile subclasses, wrong/cyclic
  graphs, and exact-container violations reject statically;
- normal tracked same/different/hostile writes taint all eight DTOs and reject;
- a retained strong reference prevents in-lifetime `id` reuse; and
- reload builds new DTO types and a new ledger, so an old issued object is not
  an exact current type and is rejected before its stale fields are read.

### Six binding capabilities are captured before probes

`_snapshot_bindings()` requires an exact tuple of exactly six entries, admits
every issued exact `ProbeBinding`, and checks the exact canonical `CheckId`
tuple before returning (`cli/src/agents_cli/doctor.py:1486-1502`).
`run_doctor()` obtains that complete immutable snapshot before its first probe
at `:1511-1526`. It consumes the captured `(check_id, probe)` values and does
not reread a later caller binding after a prior probe mutates it.

Each binding capability is invoked once by DOCTOR. Callable identity is not
treated as canonical authority; the same callable may deliberately back more
than one binding, and the implementation makes no stronger identity claim.

### Issued observations precede outcome lookup

After an intentional probe call, `_admit_probe_observation()` verifies exact
type, issuance, taint, and exact field identity
(`cli/src/agents_cli/doctor.py:513-530`). Only its safe `(status, code)`
snapshot reaches `_resolve_outcome()` at `:1533-1537`. Unknown, unissued,
subclassed, missing, or normally mutated observations cannot reach the
outcome map.

Ordinary `Exception` values are never formatted and select only the static
per-check probe-error outcome. `KeyboardInterrupt`, `SystemExit`,
`GeneratorExit`, and an independent custom `BaseException` propagate
unchanged; the custom control object retained exact identity.

### Public, canonical, and private-map authority

The public registry is a detached issued copy of the private canonical graph.
Root tuples, definition/outcome/remediation objects, private definition and
outcome maps, the observation-pair set, and the canonical ID tuple are all
identity-bound and revalidated before probes or public result use
(`cli/src/agents_cli/doctor.py:1217-1429`).

The independent exhaustive inventory replaced each of **82** public authority
nodes once with a structurally equal issued graph and once with the
corresponding private canonical alias:

```text
authority mutations: 164
rejected:            164
probe calls:           0
fingerprint calls:     0
```

Thus structural equality and public/private alias substitution do not reach
primitive fingerprinting or a probe. P1 remains the distinct write-history
bypass through the leaked storage descriptor.

### Result, renderer, aggregate, exit, and remediation contracts

`DoctorCheck`, `DoctorResult`, and `DoctorRun` construction records exact
nested issuance plus matched canonical definition/outcome authority
(`cli/src/agents_cli/doctor.py:568-843`). Result admission recursively
revalidates the issued graph, exact canonical check order, aggregate status,
and exit relationship.

`project_result`, `render_json`, and `render_human` consume only the immutable
snapshot returned by `_validated_result_snapshot()`; none validates and then
rereads caller-owned DTO fields (`:1568-1626`).

The independent closed corpus observed:

```text
registry:                         6 checks / 35 outcomes
schema-valid projections:        70
wrong aggregate statuses rejected: 140
exit relationships checked:      70
```

Across those two-profile runs, all **420** retained result remediations were
distinct, with zero aliases to public or canonical registry remediation
objects and zero reuse. The request's one-profile inventory of 210 is
therefore preserved.

Python/schema profile parity also remained exact:

```text
valid values:                         5
invalid values:                     229
accepted across Python plus schema:  10
rejected across Python plus schema: 458
```

## TDD lineage and blob verification

The RED/GREEN chain is structurally valid:

- RED 1, RED 2, and RED 3 change only
  `tests/cli/test_doctor.py`;
- `cli/src/agents_cli/doctor.py` remains byte-identical at the base and all
  three RED commits:
  `e9d1a562a31a823bd0ab021d6801bf02e50d36d7`;
- the test blobs progress from
  `5592ed2c1670ef76f73e3ef1ba2f8cf9b7916818`
  at the base, to
  `2906002783fb49fbce5fe70767d378922dedd5b7`,
  then `97368f4fa7000ca29b1671f319c8e664f382c93f`,
  and finally
  `4544009cf6b5528542f00759ab8705e2a52ef632`;
- that final RED test blob is byte-identical at the technical,
  documentation, and request commits;
- the technical commit changes only the source, whose final blob is
  `886f92bc1714333650c2a2128ad68732b56dd07a`;
- the documentation commit changes only `docs/doctor.md`, whose final blob is
  `8244eb509dc102cf9f6288675ecfee7b9b2728b8`; and
- the unchanged result-schema blob at both base and request is
  `49f05a54526ac4c8505bb31236099f8ba7c5678c`.

The request records RED results of **7 failed / 94 passed**,
**45 failed / 165 passed**, and **45 failed / 162 passed**. This review
verified their exact parentage, tests-only scope, unchanged pre-GREEN source,
and frozen final RED blob; it did not execute historical RED states.

## Independent verification

Runtime/tool identity:

```text
Python 3.13.13
uv 0.11.21
pytest 9.1.1
Ruff 0.16.0
```

Complete focused inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial7-independent-focal \
  tests/cli/test_doctor.py
```

Result: **207 passed in 5.68s**.

Directed adversarial matrix:

```text
116 passed, 91 deselected in 2.99s
```

It selected exact binding containers, binding/observation issuance, complete
pre-probe capture, all-eight nonissued/invalid graphs, all-eight normal
post-construction mutation forms, all-eight hostile constructors, container
subclasses, every result boundary, and no-reread result consumers.

Structure:

```text
tests/structure/test_h001_sample.py
tests/structure/test_project_layout.py
```

Result: **8 passed in 0.05s**.

Additional gates:

- Ruff check: **passed** with `--no-cache`.
- Ruff format check: **2 files already formatted** with `--no-cache`.
- `python -m json.tool` on the result schema: **passed**.
- Draft 2020-12 schema self-validation: **passed**.
- `git diff --check` for both the implementation/documentation range and the
  documentation-to-request range: **passed**.
- The source imports only Python standard-library modules.
- Reviewer-only in-memory probes reproduced the all-eight raw-slot bypass,
  registry restore, ledger lifecycle, authority inventory, closed corpus,
  profile parity, fresh remediations, custom `BaseException`, and failed
  constructor behavior without filesystem or service effects.

One initial reviewer-only parity probe used an intentionally incomplete
empty-check projection and stopped at its own assertion before testing
candidate parity. Re-running it with the exact canonical projection produced
the **10 accepted / 458 rejected** result above.

## Documentation parity and source complexity

`docs/doctor.md` accurately limits this increment to the pure injected result
core and explicitly excludes command wiring, runtime/provider/coordination
probes, a passing review, and the completion gate. It accurately removes
runtime finality from the security claim and states the same pre-presentation
class/metaclass and privileged-module-mutation exclusions as the binding plan.

Its statement that every post-issuance write is invalid even when the visible
value is unchanged is false under P1. It also states that ledger records retain
strong references but does not define their process lifetime, cleanup, or
bound under P2.

The final source is **1,626 lines**, with **48** top-level functions, **22**
snapshot/admission/validation functions, and **78** numeric snapshot-index
reads. The Trial 7 source change is **+922/-374**. The tests are extensive,
but the positional tuple protocol and duplicated recursive validators make
authority relationships difficult to audit and contributed to a class-level
storage capability escaping unnoticed. This is not counted as a separate
severity finding, but the next correction should prefer named immutable
internal snapshot records and a smaller, auditable storage/issuance primitive.

## Postflight and limits

The worktree was clean at intake. All verification used offline cached Python
tooling, in-memory objects, and repository files. Bytecode writes, pytest
cache, and Ruff cache were disabled. The exact pytest basetemps and checked
repository cache paths were absent after verification.

No network, project installation, service, provider, Redis, Gateway, MCP, KYA,
tmux, coordination, shared state, portability, integration, promotion,
publication, or release command was run. No subagent was spawned. Apart from
this result artifact, no code, tests, task-owned documentation, request, plan,
schema, manifest, workflow, lock, index, or configuration was modified by this
review.

## Final conclusion

**KO.** Trial 7 makes the correct architectural rebaseline away from portable
runtime finality, and its exact-type issuance, complete binding capture,
issued-observation, authority, result, renderer, exception, schema, corpus,
and documentation-scope paths are otherwise strong. The installed descriptor
still exposes the original writable slot, so post-issuance mutation history is
neither complete nor irreversible. That P1 requires a new all-eight RED and a
storage/taint correction before independent OK. The unbounded strong-reference
ledger also needs an explicit lifecycle decision before long-lived wiring.
