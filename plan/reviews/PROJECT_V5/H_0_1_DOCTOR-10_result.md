# Independent Review Result — Project V5 H/0/01 DOCTOR (Trial 10)

## Verdict

reviewed_KO

| Severity | Count |
|---|---:|
| P0 | 0 |
| P1 | 0 |
| P2 | 1 |

The displaced-value correction closes the Trial 9 lock/finalizer finding.
Supported set and delete retain the previous slot value while the issuance
lock owns the taint-plus-storage transition, then release that value only
after leaving the lock. Taint remains irreversible and admission retains the
same lock-based linearization.

The callback correction is incomplete. The discovered callback instance has
no direct closure, defaults, keyword defaults, writable instance attributes,
or instance dictionary, and its scalar-key map plus exact-reference check are
sound as written. However, the callback exposes its Python `__call__` method.
The underlying function has a writable `__dict__`, which can retain an issued
`ProbeBinding` and its probe capability. That keeps the referent live, so
neither ledger retirement nor callback-authority cleanup can run.

## Frozen identity and exact pathsets

- Trial 9 result base:
  `3d52848dbacd28ba15dce5cee84f683df2ceb455`
- Base tree:
  `89efbf871b3e7a3ed5b705c9130228d4ca454cea`
- Tests-only RED:
  `458e45fb49a64670e0c516eb5041f5cd851e7725`
- RED tree:
  `90841d85e261911511ca2e9aa362298706fc911e`
- Tests-only RED refinement:
  `bbdb70749c0f83f294aca2fb54a70d1421f8aa5d`
- Refined RED tree:
  `7285047b0bbd93450c7490ce51a7acbaf2421a32`
- Source-only technical candidate:
  `014faa6fdd17348cb4ef8fde7068ba7d4ef5896b`
- Technical tree:
  `ba79cfd1effe665af74540fec8d7956b8a1750ad`
- Task-owned documentation:
  `87ff105501b4586424a3dc46122ca7c07a53580f`
- Documentation tree:
  `362c02743a55a68c3a27250e856e69030b0d45e1`
- Request-only reviewed HEAD:
  `f3918705c5ec1b090bfbed311b86613b876591bf`
- Request tree:
  `ea2ac69af1d0429358c7bea0d79f24bb21977a66`
- Review worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor10.8cA6PC/worktree`

The lineage is exact and linear:

```text
3d52848dbacd28ba15dce5cee84f683df2ceb455
  -> 458e45fb49a64670e0c516eb5041f5cd851e7725
  -> bbdb70749c0f83f294aca2fb54a70d1421f8aa5d
  -> 014faa6fdd17348cb4ef8fde7068ba7d4ef5896b
  -> 87ff105501b4586424a3dc46122ca7c07a53580f
  -> f3918705c5ec1b090bfbed311b86613b876591bf
```

Commit-local pathsets are exact:

```text
458e45f  M tests/cli/test_doctor.py
bbdb707  M tests/cli/test_doctor.py
014faa6  M cli/src/agents_cli/doctor.py
87ff105  M docs/doctor.md
f391870  A plan/reviews/PROJECT_V5/H_0_1_DOCTOR-10_to_review.md
```

The exact net technical/documentation candidate pathset from the Trial 9
result base through `87ff105` is:

```text
cli/src/agents_cli/doctor.py  +36 /  -7
docs/doctor.md                +14 / -10
tests/cli/test_doctor.py     +175 /  -0
```

The request-only pathset is:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-10_to_review.md  +248 / -0
```

Final reviewed blobs are:

```text
cli/src/agents_cli/doctor.py
  77230a1bdaa281f31f9ab56c511e2cc665dc8c4a
tests/cli/test_doctor.py
  3359dd0b05c6db35f6d13d687d3670d510b1549f
docs/doctor.md
  908fdb5d419e23dc4f60b6e3bfa6dfa120017cc7
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-10_to_review.md
  d34ebbbfe8e3b068aad18eaf0a09515f7d78f8c3
```

## Gate 1 — displaced-value release and atomic taint

Passed.

`_TrackedSlot.__set__` and `__delete__` read and retain the previous raw slot
value under `_ISSUANCE_LOCK`, mark the exact issued root tainted, and perform
the raw storage operation before leaving that same lock
(`cli/src/agents_cli/doctor.py:155-177`). The explicit `del previous` occurs
after the `with` block. On an exceptional storage operation, context-manager
exit likewise releases the lock before frame-local cleanup can release the
previous value.

Thus a last-reference caller finalizer cannot run while the descriptor owns
the issuance lock. The taint bit is set before either set or delete touches
storage and is never reset. Admission verification continues to share the
same lock, so no untainted post-write state is exposed.

The supplied frozen evidence reports the complete focused inventory passing
on both supported runtimes:

```text
Python 3.13: 304 passed
Python 3.11: 304 passed
```

No P0, P1, or P2 finding remains for this gate.

## P2 finding

### P2 — The callback's Python `__call__` function dictionary can retain the binding and probe graph

`_RetirementCallback` uses `__slots__ = ()`, but its `__call__` implementation
is an ordinary Python function (`cli/src/agents_cli/doctor.py:101-115`).
Starting only from the standard discovered weak-reference callback, a caller
can reach and mutate that function dictionary:

```python
reference.__callback__.__call__.__func__.__dict__["retained"] = binding
```

This does not traverse `function.__globals__`, access either private authority
map, mutate a DTO class, or change a Python builtin. It is writable state
exposed through the callback itself, inside the standard callback-state
boundary reviewed in this trial.

A bounded reviewer probe created an issued `ProbeBinding` containing a unique
weak-referenceable callable, stored that binding through the route above,
dropped all external binding and capability roots, and forced collection. It
observed:

```text
callback direct closure/defaults/kwdefaults/dict: absent
callback method function dictionary writable:    yes
binding retained after GC:                        yes
probe capability retained after GC:               yes
issuance ledger record retained:                  yes
issuance callback still live:                     yes
```

Deleting the injected function-dictionary entry and collecting again reclaimed
the binding and probe and retired the ledger record. The retention path is:

```text
ledger -> issue record -> weakref -> callback -> callback type
       -> __call__ function -> function.__dict__ -> ProbeBinding
       -> probe capability
```

Because the binding remains live, `_RetirementCallback.__call__` never receives
dead-reference delivery. Consequently, the correct exact-reference guard at
`cli/src/agents_cli/doctor.py:111-115` cannot retire the record or clean the
callback-key entry. The guard itself still protects a replacement record if a
callback runs; the lifecycle/no-retention requirement fails before that point.

The new helper checks only direct state on the callback object
(`tests/cli/test_doctor.py:956-987`). The all-eight matrix and the scalar/self-
cycle cases call that helper (`:1619-1689`) but never inspect the callback's
exposed `__call__` method or its underlying function. Therefore the reported
304/304 focused passes do not cover this standard writable route.

This remains P2, consistent with Trial 9: result integrity and the
exact-reference stale-retirement check are not bypassed, but ordinary standard
callback discovery can still create unbounded ledger, DTO, and probe-capability
retention. Trial 10 cannot receive `reviewed_OK` until callback-reachable
writable method state cannot retain the referent graph, or that route is
explicitly removed from the claimed supported boundary.

## Verification summary

| Check | Result |
|---|---:|
| Displaced-value set/delete inspection | passed |
| Irreversible taint and locked mutation inspection | passed |
| Exact-reference retirement guard inspection | passed |
| Direct callback closure/default/attribute/dict checks | passed |
| Callback-method function-dictionary retention probe | failed as described |
| Supplied complete focused inventory, Python 3.13 | 304 passed |
| Supplied complete focused inventory, Python 3.11 | 304 passed |
