# Review Submission - Project V5 H/0/01 DOCTOR (Trial 10)

## Requested reviewer

Please assign an independent reviewer that did not implement this trial. Review
from the frozen repository evidence and write the verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-10_result.md
```

The result must use `reviewed_OK` or `reviewed_KO`, list every P0/P1/P2
finding, and identify the exact reviewed commits and pathsets. A result commit
must change only that result file.

## Review boundary

Trial 10 is a correction trial for the two findings in the independently
reviewed Trial 9 result:

```text
3d52848dbacd28ba15dce5cee84f683df2ceb455
docs(review): record H_0_1_DOCTOR trial 9 result
```

The review covers:

- release of caller-owned displaced field values outside the issuance lock;
- irreversible taint and atomic admission relative to supported set/delete;
- the standard state exposed by a discovered weak-reference callback;
- bounded issuance-ledger retirement without retaining DTOs or probes;
- exact-reference protection against stale retirement callbacks;
- preservation of the closed DOCTOR result contract; and
- the corresponding task-owned documentation.

It does not cover CLI wiring, runtime probes, providers, Redis, Gateway, MCP,
KYA, integration, promotion, publication, or the complete H/0/01 exit gate.
Private module globals and underscore-prefixed authority maps remain outside
the supported same-process boundary defined by the binding plan and
`docs/doctor.md`.

## Trial 9 findings addressed

### P1 - caller finalizer executed while the issuance lock was held

Trial 9 replaced or deleted a tracked slot while holding `_ISSUANCE_LOCK`.
When the slot owned the last reference to a caller-supplied probe, Python
could invoke that probe object's finalizer before the lock was released. A
finalizer waiting for a worker that performed another supported DTO mutation
could deadlock the issuance protocol.

Trial 10 keeps the atomic state transition but separates reference release:

1. under `_ISSUANCE_LOCK`, the descriptor reads and retains the previous slot
   value;
2. it permanently taints the issued root;
3. it performs the raw set or delete while still holding the lock;
4. it exits the lock; and
5. only then does the local previous-value reference reach release.

The correction applies to both set and delete. The two deterministic
regressions make a last-referenced callable's finalizer start a worker that
performs a supported write on another issued DTO. The finalizer observes that
the worker completes while it waits, neither probe is intentionally invoked,
and both affected roots retain the expected taint.

### P2 - discovered Python closure exposed writable retirement authority

Trial 9 used a Python closure over the scalar issuance key. The exact built-in
weak reference exposed that callback through `reference.__callback__`; normal
closure-cell mutation could then disable retirement or retain a binding and
its probe.

Trial 10 uses a stateless `_RetirementCallback` instance with `__slots__ = ()`.
The scalar key is held in the module-private `_RETIREMENT_CALLBACK_KEYS`
authority map, not in callback-observable closure cells, defaults, keyword
defaults, attributes, or an instance dictionary. On dead-reference delivery,
the callback:

1. returns without mutation if the referent is still live;
2. resolves its scalar key under `_ISSUANCE_LOCK`;
3. retires the ledger record only if that record still contains the exact
   callback reference; and
4. removes only its own still-matching private authority entry.

The new eight-DTO matrix attempts every supported callback-state mutation.
Separate cases prove that a scalar rewrite cannot leave a stale record and
that a self-cycle attempt cannot retain either a `ProbeBinding` or its probe
capability.

The reviewer should explicitly check that this correction does not introduce
an unbounded callback-map leak, a root/capability-retention cycle, or a stale
callback route that can retire a replacement record.

## TDD lineage

### Trial 10 base

```text
3d52848dbacd28ba15dce5cee84f683df2ceb455
tree 89efbf871b3e7a3ed5b705c9130228d4ca454cea
docs(review): record H_0_1_DOCTOR trial 9 result
```

### RED

```text
458e45fb49a64670e0c516eb5041f5cd851e7725
tree 90841d85e261911511ca2e9aa362298706fc911e
parent 3d52848dbacd28ba15dce5cee84f683df2ceb455
test(doctor): expose retirement authority hazards (H/0/01 RED)
```

The commit changes only:

```text
M tests/cli/test_doctor.py
```

Against the unchanged Trial 9 source, its twelve directed cases produced:

```text
12 failed, 292 deselected
```

Those cases comprise two finalizer/descriptor interleavings, an eight-DTO
callback-state matrix, one scalar rewrite retirement case, and one
binding/probe retention case.

### RED baseline refinement

```text
bbdb70749c0f83f294aca2fb54a70d1421f8aa5d
tree 7285047b0bbd93450c7490ce51a7acbaf2421a32
parent 458e45fb49a64670e0c516eb5041f5cd851e7725
test(doctor): scope callback retention baseline (H/0/01 RED)
```

This tests-only one-line correction captures the ledger baseline after the
test's intentionally live observation is issued. It removes a false baseline
delta without weakening the expected callback, binding, capability, or
retirement assertions.

### GREEN technical

```text
014faa6fdd17348cb4ef8fde7068ba7d4ef5896b
tree ba79cfd1effe665af74540fec8d7956b8a1750ad
parent bbdb70749c0f83f294aca2fb54a70d1421f8aa5d
fix(doctor): retire callback authority safely (H/0/01)
```

The commit changes only:

```text
M cli/src/agents_cli/doctor.py
```

The frozen RED test blob through GREEN is:

```text
3359dd0b05c6db35f6d13d687d3670d510b1549f
```

### Task-owned documentation

```text
87ff105501b4586424a3dc46122ca7c07a53580f
tree 362c02743a55a68c3a27250e856e69030b0d45e1
parent 014faa6fdd17348cb4ef8fde7068ba7d4ef5896b
docs(doctor): document opaque retirement authority (H/0/01)
```

The commit changes only:

```text
M docs/doctor.md
```

It documents the stateless callback, private scalar authority, exact-reference
retirement, callback-authority cleanup, and release of displaced caller values
after the issuance lock.

## Frozen candidate identity

Before this request commit, the candidate blobs are:

```text
cli/src/agents_cli/doctor.py
  77230a1bdaa281f31f9ab56c511e2cc665dc8c4a
tests/cli/test_doctor.py
  3359dd0b05c6db35f6d13d687d3670d510b1549f
docs/doctor.md
  908fdb5d419e23dc4f60b6e3bfa6dfa120017cc7
```

The exact net candidate pathset from the Trial 9 result is:

```text
cli/src/agents_cli/doctor.py  +36 /  -7
docs/doctor.md                +14 / -10
tests/cli/test_doctor.py     +175 /  -0
```

No shared plan, README, audit, policy, schema, manifest, lock, workflow, or
suite-inventory file is part of this candidate.

## Reproducible verification

The recorded GREEN evidence uses the repository's cached test environment,
`PYTHONPATH=cli/src`, and no provider, Redis, MCP, network, or shared service.

### Directed Trial 10 cases

```text
12 passed, 292 deselected
```

The same twelve-case selection passed five consecutive additional runs.

### Complete focused inventory

```text
304 passed in 12.52s
```

### Preserved Trial 9 directed selection

```text
17 passed, 287 deselected
```

### Static checks

```text
ruff check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
All checks passed!

ruff format --check cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
2 files already formatted

git diff --check
pass
```

The reviewer should rerun the complete focused inventory and any additional
bounded adversarial checks needed to evaluate the two corrected findings. The
review must remain read-only except for the single result artifact.
