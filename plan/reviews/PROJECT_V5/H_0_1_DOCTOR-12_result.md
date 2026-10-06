# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 12)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

Trial 12 removes `_OpaqueDTO.__del__`, keeps the discovered weak-reference
callback slots-only with the built-in `id` call surface, and correctly retires
a genuinely dead exact record and its matching callback authority from a
private post-collection sweep. The submitted directed and complete DOCTOR
inventories pass on Python 3.13 and Python 3.11.

It does not close the operator-ratified Option A requirement. The issued DTO
still exposes multiple ordinary Python bound functions, including
`__repr__`, `__eq__`, and its dataclass-generated `__init__`. Their writable
function dictionaries are directly reachable as, for example:

```python
binding.__repr__.__func__.__dict__["retained"] = binding
setattr(reference().__eq__.__func__, "retained", binding)
```

The reviewer expressed the sibling hunt as ordinary pytest cases in an
isolated export of the existing DOCTOR harness. Both assignment forms through
`__repr__`, `__eq__`, and `__init__` retained the binding, weak-referenceable
probe capability, issuance-reference referent, and ledger record on both
runtimes. Removing the injected function state then reclaimed the complete
graph and returned the ledger to baseline.

This route does not traverse function globals, mutate a DTO class, touch a
private module map, or mutate a Python builtin. It begins at the supported
issued DTO or at the referent returned by its discovered issuance reference.
Because the sweep intentionally requires a dead reference, the function-state
root prevents the sweep from becoming eligible to retire the record. This is
the same P2 retention class for a fifth spelling, not a failure of the exact
sweep once a referent is genuinely dead.

## Frozen identity and exact pathsets

- Ratified Option A base:
  `974c1e9221c796382bcdda24216321cec870d163`
- Base tree:
  `41a418531bd1b6a9acda3131b53546ae948fa344`
- Tests-only RED:
  `d244748588a12abe709c4d708fe1d3ef1a2f27b8`
- RED tree:
  `7faac8689dcdc63354a09d489cb6d25064cd3e1e`
- Source-only GREEN:
  `7448ebd77ae523a898814618cba06ea62f657f7c`
- GREEN tree:
  `f3f009e18d819904b4e07c35f35b4dde772ec0b6`
- Task-owned documentation and reviewed HEAD:
  `061d1d620b9a94ef44736f2899123791e48ffbc0`
- Reviewed tree:
  `e7a598cb8663c8e0d8c4e6d6efadf8e106880462`
- Review branch:
  `review/V5-H-0-01-doctor-12`

The lineage is exact and linear:

```text
974c1e9221c796382bcdda24216321cec870d163
  -> d244748588a12abe709c4d708fe1d3ef1a2f27b8
  -> 7448ebd77ae523a898814618cba06ea62f657f7c
  -> 061d1d620b9a94ef44736f2899123791e48ffbc0
```

Commit-local pathsets are exact:

```text
d244748  M tests/cli/test_doctor.py
7448ebd  M cli/src/agents_cli/doctor.py
061d1d6  M docs/doctor.md
```

The exact net candidate pathset from the ratified base is:

```text
cli/src/agents_cli/doctor.py  +47 / -31
docs/doctor.md                +21 / -11
tests/cli/test_doctor.py     +134 /  -0
```

The frozen candidate blobs independently matched the submission:

```text
cli/src/agents_cli/doctor.py
  7b4c178411b93cbcf6d3a32ba82ce4ba66861a54
tests/cli/test_doctor.py
  e2e40f1f9b6f72b8515f5f8d458f7813fed46ae1
docs/doctor.md
  f3f4d5a8b03cc33bbc6ea39d7ff63b1530bfc4c8
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

The requested submission file was absent from the frozen review worktree and
is not in the reviewed tree. The reviewer read the exact untracked submission
from the implementation worktree at
`plan/reviews/PROJECT_V5/H_0_1_DOCTOR-12_to_review.md`; its SHA-256 was
`0e416e41131488e417a68a3870f5289d149a5c60ed0b1dee7bf563cb4639a160`.
This provenance issue is recorded but is not counted as a product-severity
finding.

## RED validity

Passed.

The RED commit was exported to an isolated temporary tree. Its source and test
blobs were independently confirmed as:

```text
cli/src/agents_cli/doctor.py
  50ceeaa28c39bd8ca2d5087a61b993abf087893d
tests/cli/test_doctor.py
  e2e40f1f9b6f72b8515f5f8d458f7813fed46ae1
```

Thus the RED combined the unchanged Trial 11 source with the committed Trial
12 tests. The reviewer ran the submitted three-test selection with the
required offline pytest envelope and isolated basetemps:

```text
Python 3.13: 6 failed, 1 passed, 306 deselected in 0.52s
Python 3.11: 6 failed, 1 passed, 306 deselected in 0.43s
```

All four `__del__` retention variants first proved that the binding, probe
capability, issuance referent, and ledger record remained live. They failed
only at the intended final `route_writable is False` assertion after cleanup.
The DTO half of the minimal surface check found the ordinary
`_retire_issued_dto` function, and manual live invocation removed the record.
The weakref-callback half passed. The RED is deterministic and causally valid.

## P2 finding

### P2 — Option A closes `__del__` but leaves sibling DTO-bound Python function dictionaries

The operator ratification requires that no ordinary Python-function
`__dict__` be reachable from the issued DTO at all, explicitly choosing
Option A instead of deferring this residual to D/0/02
(`plan/reviews/PROJECT_V5/H_0_1_DOCTOR_to_check_by_human.md:4-8,44-50`).

The reviewed implementation still defines `_OpaqueDTO.__repr__` and
`_OpaqueDTO.__eq__` as ordinary Python functions
(`cli/src/agents_cli/doctor.py:240-249`). `_seal_dto` defines another ordinary
`opaque_repr` closure and installs it as every sealed DTO's `__repr__` and
`__str__`, while installing `_OpaqueDTO.__eq__` as `__eq__`
(`cli/src/agents_cli/doctor.py:254-272`). The frozen dataclass decorators also
generate ordinary instance methods such as `__init__`
(`cli/src/agents_cli/doctor.py:277-318`).

An isolated review-only pytest discovery case enumerated the ordinary bound
Python-function surfaces on an issued `ProbeBinding`:

```text
Python 3.13:
  __delattr__, __eq__, __getstate__, __init__, __replace__, __repr__,
  __setattr__, __setstate__, __str__

Python 3.11:
  __delattr__, __eq__, __getstate__, __init__, __repr__,
  __setattr__, __setstate__, __str__
```

The reviewer then parameterized both `function.__dict__` assignment and direct
function-attribute assignment across these representative supported routes:

```text
binding.__repr__.__func__
reference().__eq__.__func__
binding.__init__.__func__
```

Results:

```text
Python 3.13: 7 failed, 313 deselected in 0.50s
Python 3.11: 7 failed, 313 deselected in 0.66s
```

One failure per runtime is the exhaustive surface assertion. The other six
are retention cases. In every retention case:

- the selected surface was an ordinary Python function;
- the selected assignment form was writable;
- the binding weak reference remained live;
- the weak-referenceable probe capability remained live;
- the discovered issuance reference returned that exact binding;
- the ledger still contained the binding's key; and
- after removing the injected function state and collecting, both referents
  died and the ledger returned exactly to baseline.

The supplied regression does not bind the ratified universal condition.
`test_dto_lifecycle_function_state_cannot_retain_binding_and_probe` looks only
for `getattr(owner, "__del__", None)` at
`tests/cli/test_doctor.py:1823-1825`. The minimal
`test_retirement_surfaces_expose_no_python_function_state` checks only the
callback call surface and `binding.__del__` at
`tests/cli/test_doctor.py:1884-1899`. Once `__del__` is absent, the DTO half
passes without inspecting any other bound dunder. Reintroducing or retaining
ordinary Python state on `__repr__`, `__eq__`, `__init__`, or the other
discovered methods therefore leaves every committed Trial 12 closure
assertion green.

This remains P2, consistent with Trials 8–11. It can retain a caller
capability and prevent bounded lifecycle retirement, but the reviewed
admission path remains fail-closed and no unsafe result projection was shown.

Required correction:

- eliminate or replace every ordinary Python bound-function surface reachable
  from each issued DTO and from the referent returned by its discovered
  issuance reference, not only `__del__`;
- add an exhaustive regression over every public issued DTO that detects
  Python bound functions across its observable dunders, including
  runtime-version-specific dataclass methods;
- retain representative collection tests proving that both direct
  function-attribute assignment and `function.__dict__` assignment cannot
  retain a binding/probe graph through either the binding or discovered
  referent route; and
- preserve the accepted built-in callback, exact sweep guards, callback-map
  cleanup, displaced-value release, irreversible taint, and atomic admission.

Option B was explicitly rejected by the operator. Narrowing the criterion to
retirement-named methods would require a new operator decision rather than a
review inference.

## Five-point required-correction adjudication

| Point | Result | Evidence |
|---|---|---|
| 1. No ordinary Python function dictionary through the issued DTO or discovered referent | **KO** | `__del__` is gone and the callback call surface is built-in, but the review found eight or nine ordinary DTO-bound Python functions per runtime. |
| 2. Both assignment forms cannot retain binding and probe | **KO** | Both assignment forms retained the complete graph through `__repr__`, `__eq__`, and `__init__` on both runtimes. |
| 3. Public/manual lifecycle invocation cannot remove a live exact record | **Passed for the submitted lifecycle surface** | The DTO exposes no `__del__`; the committed manual-invocation regression passed in both directed and full inventories. Other ordinary dunder invocation did not itself remove the live record. |
| 4. Preserve exact guards, cleanup, displaced-value release, taint, and atomic admission | **Passed within executed coverage** | Source guards are exact; review-only cleanup cases passed; the 21-case directed selection and both full inventories passed. |
| 5. Minimal regression turns RED if callback or DTO lifecycle regains Python function state | **KO for the ratified class condition** | It turns RED for callback `__call__` or DTO `__del__`, but remains green for the sibling DTO functions measured above. |

## Collection-sweep and callback adjudication

Passed for genuinely dead referents; blocked from closing the overall
retention claim by the P2.

`_RetirementCallback` is slots-only and assigns the built-in `id` as
`__call__` (`cli/src/agents_cli/doctor.py:102-107`). A review-only pytest case
confirmed on both runtimes that the discovered callback has no instance
dictionary, its call surface has no `__func__`, its `__self__` is not the
callback, and the standard closure/default/attribute/dictionary mutations
cannot retain the binding.

The sweep holds `_ISSUANCE_LOCK` and requires:

- the exact `_RetirementCallback` type;
- an exact built-in `weakref.ReferenceType`;
- a dead referent;
- an existing exact ledger record;
- that record's exact reference;
- the same record still at the integer key; and
- the same authority tuple identity still mapped from the callback.

Only then does it remove the ledger entry and the still-matching callback
authority (`cli/src/agents_cli/doctor.py:117-137`). Issuance calls the sweep
before rejecting an existing key (`cli/src/agents_cli/doctor.py:351-361`).

Two review-only pytest cases per runtime passed:

```text
Python 3.13: 2 passed, 320 deselected in 0.17s
Python 3.11: 2 passed, 320 deselected in 0.22s
```

They independently confirmed the callback surface properties and that a dead
exact record and its matching callback-authority entry retire together back
to both baselines even while the test retains the callback object itself. The
committed weakref-authority, discarded-run, canonical-ledger, and stale-record
cases also passed as part of each full inventory.

The remaining P2 acts before those guards: a DTO-bound function roots the
referent, so the exact dead-reference prerequisite never becomes true.

## Preserved mutation and admission behavior

Passed within the executed coverage.

`_TrackedSlot.__set__` and `__delete__` still retain the displaced value under
the issuance lock, taint before raw storage mutation, leave the lock, and only
then release the previous value (`cli/src/agents_cli/doctor.py:184-206`). The
two displaced-value cases passed in the directed selection on both runtimes.

Recursive admission still records exact metadata and performs its final
record/reference/type/taint verification under `_ISSUANCE_LOCK`
(`cli/src/agents_cli/doctor.py:383-440`). The full inventories include the
preserved concurrent-result, binding-capture, and intentional-probe
linearization cases. No candidate source change touched the field-mutation or
admission algorithms.

## Matrix reruns

The sealed candidate passed the requested directed retention/preservation
selection:

```text
Python 3.13: 21 passed, 292 deselected in 0.96s
Python 3.11: 21 passed, 292 deselected in 0.95s
```

The reviewer also ran one complete DOCTOR inventory per required runtime:

```text
Python 3.13.13 / pytest 9.1.1: 313 passed in 15.33s
Python 3.11.15 / pytest 9.1.1: 313 passed in 17.75s
```

No test was skipped. All successful commands used `uv run --offline
--no-project`, `PYTHONDONTWRITEBYTECODE=1`, `PYTHONPATH=cli/src`,
`-p no:cacheprovider`, and isolated basetemps under `/tmp`.

The first sandboxed RED command was refused by Snap confinement before pytest
started. It is not counted as evidence. The successful offline commands ran
outside that confinement after the scoped approval.

`git diff --check` and
`git diff --check 974c1e9221c796382bcdda24216321cec870d163..061d1d620b9a94ef44736f2899123791e48ffbc0`
passed. Source inspection confirmed that the final Doctor module imports only
Python standard-library modules.

## Scope honesty and documentation

Passed.

`docs/doctor.md:30-56` accurately describes the exact weak reference,
built-in discovered callback surface, private authority tuple,
post-collection/pre-issuance sweep, cleanup ordering, and collection timing.
`docs/doctor.md:98-113` continues to limit the claim to the public
DTO/descriptor/weak-reference surface and assigns hostile same-process
isolation to D/0/02. It does not claim runtime probes, providers, Redis,
Gateway, MCP, integration, promotion, or release.

The P2 route stays inside that documented public DTO surface and does not rely
on any stated exclusion. The scope text therefore does not waive the
operator-ratified Option A condition.

## Declared coverage and limits

Independently verified:

- exact branch, HEAD, trees, linear lineage, commit-local pathsets, net
  pathset, and candidate blobs;
- exact tests-only RED source/test identity;
- the seven-case RED selection on Python 3.13 and Python 3.11;
- the sealed 21-case directed selection on both runtimes;
- one full 313-test DOCTOR pass on both runtimes;
- the sibling function-surface enumeration and six representative retention
  cases on both runtimes, all as pytest cases in an isolated exported tree;
- matching ledger/callback-authority cleanup and callback sibling surfaces as
  pytest cases on both runtimes;
- source-level sweep identity guards, displaced-value ordering,
  taint/admission behavior, imports, documentation scope, and diff checks; and
- the exact provenance and digest of the untracked submission file.

Inspected in the submission but not independently rerun as separate lanes:

- its five repeated directed runs;
- separately selected concurrency, Trial 7, Trial 8, and structure matrices;
- schema syntax/self-validation and Ruff commands; and
- aggregate CI or repository/application installation.

The complete DOCTOR reruns did execute the committed concurrency, Trial 7,
Trial 8, schema-use, and lifecycle cases as part of the 313-test inventory;
they were not rerun as separately filtered matrices.

Not tested or claimed:

- network access, a real provider, Redis, Gateway, MCP, KYA, tmux, shared
  services, portability, integration, promotion, publication, or release;
- mutation of private module state, DTO classes, interpreter callback
  registries, or Python builtins; or
- same-process isolation owned by D/0/02.

This result adjudicates only the Trial 12 H/0/01 DOCTOR correction. It makes
no integration, promotion, completion, publication, or release claim.
