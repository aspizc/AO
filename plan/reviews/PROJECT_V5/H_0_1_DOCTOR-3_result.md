# Independent Review Result — Project V5 H/0/01 DOCTOR Trial 3

Verdict: KO

Trial 3 correctly adds recursive validation at the three boundaries named by
the Trial 2 verdict: `DoctorRun` validates its complete result before reading
the exit envelope, `OutcomeDefinition` validates its nested remediation, and
`CheckDefinition` validates every outcome before constructing comparison
pairs. The submitted tests, the historical RED, and the focused regression
inventories all reproduce as declared.

The trial still cannot be accepted because two independently reproduced P1
contract violations remain. All eight public DTOs retain automatic
field-traversing representation, equality, and hashing behavior, including the
arbitrary callable held by a valid `ProbeBinding`. Separately, `run_doctor`
consumes the publicly reassignable registry without invoking the new recursive
registry validator; if outcome resolution then fails after an ordinary probe
exception, that exception remains attached to the supposedly static contract
error.

This verdict is limited to `H_0_1_DOCTOR` Trial 3. It does not review or claim
the later real probes, CLI wiring, portability lane, integration, promotion,
publication, release, or completion of H/0/01.

## P0 findings

None.

## P1 findings

### P1-1 — Automatic DTO observables traverse caller-provided fields

Evidence:

- Every public DTO uses the default field-based behavior of
  `@dataclass(frozen=True, slots=True)`:
  - `Remediation` at `cli/src/agents_cli/doctor.py:84-90`;
  - `OutcomeDefinition` at `cli/src/agents_cli/doctor.py:111-120`;
  - `CheckDefinition` at `cli/src/agents_cli/doctor.py:149-156`;
  - `ProbeObservation` at `cli/src/agents_cli/doctor.py:193-210`;
  - `ProbeBinding` at `cli/src/agents_cli/doctor.py:216-227`;
  - `DoctorCheck` at `cli/src/agents_cli/doctor.py:230-239`;
  - `DoctorResult` at `cli/src/agents_cli/doctor.py:242-250`; and
  - `DoctorRun` at `cli/src/agents_cli/doctor.py:253-270`.
- The default dataclass configuration generates field-based `repr`, equality,
  and hash behavior. `str` falls back to that representation.
- `ProbeBinding.__post_init__` accepts any callable at
  `cli/src/agents_cli/doctor.py:221-227`; its `probe` field is not excluded
  from representation, comparison, or hashing.
- The new validators protect constructor and renderer boundaries, but they are
  not consulted by these automatic DTO operations.

An independent matrix reconstructed each exact DTO with one caller-provided
field and then exercised the four automatic operations. All eight classes
invoked the corresponding field callbacks:

```text
Remediation       repr/str -> repr callback and canary; hash -> hash; eq -> eq
OutcomeDefinition repr/str -> repr callback and canary; hash -> hash; eq -> eq
CheckDefinition   repr/str -> repr callback and canary; hash -> hash; eq -> eq
ProbeObservation  repr/str -> repr callback and canary; hash -> hash; eq -> eq
ProbeBinding      repr/str -> repr callback and canary; hash -> hash; eq -> eq
DoctorCheck       repr/str -> repr callback and canary; hash -> hash; eq -> eq
DoctorResult      repr/str -> repr callback and canary; hash -> hash; eq -> eq
DoctorRun         repr/str -> repr callback and canary; hash -> hash; eq -> eq
```

This is not limited to reconstructed values. A normally constructed,
contract-valid `ProbeBinding` containing a valid callable produced:

```text
repr ('repr',) canary=True
str  ('repr',) canary=True
hash ('hash',)
eq   ('eq',)
```

The result violates the Trial 2 requirement that public typed envelopes reject
or isolate caller-provided values before representation, equality, or hashing.
It also creates an ordinary path through which a valid injected probe object
can appear in a DTO representation.

Required correction:

- define an explicit, field-independent representation/equality/hash policy
  for every public DTO instead of retaining the generated field traversal;
- at minimum, exclude the arbitrary `ProbeBinding.probe` callable from
  representation, comparison, and hashing;
- ensure reconstructed values cannot cause field callbacks or place field
  content in `repr`/`str`; and
- add one normal valid-callable case plus exact reconstructed cases for all
  eight DTOs, asserting zero field callbacks and no canary in any observable.

### P1-2 — `run_doctor` trusts a reassignable registry and can retain a probe exception as error context

Evidence:

- `CHECK_REGISTRY` is the public module value defined at
  `cli/src/agents_cli/doctor.py:293-575`.
- `_DEFINITION_BY_ID`, `_OUTCOME_BY_OBSERVATION`,
  `_ALL_OBSERVATION_PAIRS`, and `_CANONICAL_CHECK_IDS` are derived once at
  `cli/src/agents_cli/doctor.py:577-594`.
- The new `_validate_registry` recursively validates definitions at
  `cli/src/agents_cli/doctor.py:597-629`, but it is called only during module
  import at `cli/src/agents_cli/doctor.py:632`.
- `run_doctor` does not invoke that validator. It snapshots bindings and then
  iterates the current public `CHECK_REGISTRY` at
  `cli/src/agents_cli/doctor.py:781-788`.
- When a probe raises an ordinary exception, `run_doctor` calls
  `_exception_outcome` inside the active handler at
  `cli/src/agents_cli/doctor.py:789-790`.
- `_exception_outcome` reads the current definition and raises its contract
  error at `cli/src/agents_cli/doctor.py:657-663`. That raise occurs while the
  probe exception is still active.

A directed runtime-registry probe replaced the public value with an exact
`CheckDefinition` carrying an invalid exception selector and then used an
ordinary failing probe. The probe executed before registry rejection, one
field hash callback occurred during resolution, and the resulting error was:

```text
error type: exact DoctorContractError
error args: ("doctor contract validation failed",)
error code/exit: DOCTOR_CONTRACT_INVALID / 2
cause: None
context: ProbeFailure
```

Thus the error text is static, but its accessible `__context__` retains the
ordinary probe exception and its caller-owned state. This contradicts the
required exact static base error with neither cause nor context, and it shows
that the public runtime registry reaches a probe observable before recursive
validation.

Required correction:

- make one private, canonical registry snapshot and its matching derived maps
  the runtime authority, or recursively validate and atomically reconcile the
  current registry before binding materialization and before any probe runs;
- do not consume a public reassignable registry together with stale derived
  maps;
- if post-probe resolution fails, create the replacement exact
  `DoctorContractError` only after leaving the probe exception handler so both
  `__cause__` and `__context__` are `None`; and
- add a runtime registry-reassignment regression proving zero probe/field
  callbacks and an exact context-free error.

## P2 findings

None.

## Verified Trial 2 corrections

The submitted corrections themselves behave as intended for the cases they
cover:

- `DoctorRun.__post_init__` calls `_validated_outcomes` at
  `cli/src/agents_cli/doctor.py:258-270` before reading `exit_code` or deriving
  the expected exit.
- `_validate_outcome_definition` checks exact primitive types and calls
  `_validate_remediation` at `cli/src/agents_cli/doctor.py:123-146`.
- `_validate_check_definition` recursively validates every exact outcome at
  `cli/src/agents_cli/doctor.py:159-190` before constructing pairs or sets.
- `_validate_registry` calls the complete definition validator before reading
  IDs/codes or applying inventory comparisons at
  `cli/src/agents_cli/doctor.py:597-629`.
- Ordinary validation failures at these corrected boundaries become a fresh
  exact static `DoctorContractError` after their local exception handlers.
- Exact `int` exit codes remain required; booleans, floats, wrong tuple types,
  forged nested values, and structurally cyclic invalid graphs were rejected
  by the independent constructor matrix.
- `KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` propagated unchanged
  at both the external-iterable and probe boundaries.

Independent focused matrices completed as follows:

```text
constructor/type/error/cycle/signal matrix: 31 OK
binding/observation/result/iterable matrix: 28 OK
```

The two P1 findings above are additional public/runtime boundaries; they do not
negate the correctness of the narrow submitted fixes.

## Regression verification

Focused doctor inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial3-review-current \
  tests/cli/test_doctor.py
```

Result:

```text
65 passed in 0.14s
```

Integrated SAMPLE/layout inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial3-review-structure \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Result:

```text
8 passed in 0.06s
```

Directed Ruff:

```text
uv run --offline --no-project --with ruff \
  ruff check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
uv run --offline --no-project --with ruff \
  ruff format --check --no-cache \
  cli/src/agents_cli/doctor.py tests/cli/test_doctor.py
```

Result: lint passed; both files were already formatted.

The independent closed-inventory enumerator observed:

```text
registry: 6 checks / 35 outcomes
schema-valid projections: 70
wrong aggregate statuses rejected: 140
exit relationships checked: 70
profile Python/schema parity: 10 accepted / 242 rejected
```

The profile corpus retained the credential-prefix denylist, exact length
boundaries, byte/control suffixes, CR/LF/CRLF, NEL, Unicode line separators,
zero-width/BOM, non-BMP, safe near-prefix names, and rejected-value
pre-observable behavior. Result validation, JSON/human rendering, aggregate
status, and exit `0`/`1` behavior did not regress.

Additional read-only checks:

- `git diff --check` passed for the exact technical range.
- The result schema is byte-identical to the Trial 3 base.
- The doctor source still imports only Python standard-library modules.
- Directed production/schema scans found none of the submitted or independent
  canaries, personal paths, raw-configuration markers, or traceback payloads.
- No filesystem, process, socket, provider, Redis, Gateway, MCP, or
  coordination import was added to the doctor core.

Passing submitted tests do not negate the two independently reproduced public
boundary violations.

## TDD evidence reconstruction

The Trial 3 sequence is authentic:

- RED `3b04fcaca42bfd162a618e37f5b8073022d269ae` has direct parent
  `4ef502b2c2c4b77361d33213893e6bece95690e3` and changes only
  `tests/cli/test_doctor.py`.
- The exact RED tree was exported with `git archive` to a disposable directory,
  without checking it out or creating a worktree.
- Its complete focused suite independently reproduced exactly:

  ```text
  19 failed, 46 passed
  ```

- The 19 failures match the declared breakdown: one nested remediation,
  six `CheckDefinition` cases, five registry cases, and seven `DoctorRun`
  cases.
- GREEN `8290b7b9826317254ab72799c13d6779db6ccc4c` has direct parent
  `3b04fcaca42bfd162a618e37f5b8073022d269ae` and changes only
  `cli/src/agents_cli/doctor.py`.
- The test blob is byte-identical at RED and GREEN:
  `29cff188a635ee9641db5a323f07be956fc0bd9a`.
- The GREEN focused suite passes all 65 tests. No RED assertion was removed or
  relaxed.

## Reviewer profile

- Requested reviewer profile: GPT-5.6 Sol.
- Requested reasoning configuration: `ultra`.
- Requested execution mode: Priority/Fast.
- Review mode: independent, adversarial, evidence-based local QA.
- The reviewer runtime exposed no independent telemetry that could attest
  actual model identity, reasoning configuration, service tier, latency, or
  speed. The values above record the requested orchestration profile, not
  invented measured telemetry.

## Frozen identity, range, and parentage

- Branch: `feat/V5-H-0-01-doctor`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`
- Trial 3 base:
  `4ef502b2c2c4b77361d33213893e6bece95690e3`
- Base tree:
  `8d1c75756f20023cf0a88adb71cfc9fb1f0afda8`
- RED:
  `3b04fcaca42bfd162a618e37f5b8073022d269ae`
- RED tree:
  `5dc56b60296d9b2654aceb3c01225f868a9d2318`
- Final technical:
  `8290b7b9826317254ab72799c13d6779db6ccc4c`
- Final technical tree:
  `31056d4cb553eacd657c38a6d53e78ca3603cfe9`
- Request-only:
  `5e9864bb9ac167881887245bbc8d53cc9842c174`
- Request-only tree:
  `3be5339078f10386007ec56a236d46cb61b4147f`
- Exact technical range:
  `4ef502b2c2c4b77361d33213893e6bece95690e3..8290b7b9826317254ab72799c13d6779db6ccc4c`

Parentage is direct and linear:

```text
4ef502b2c2c4b77361d33213893e6bece95690e3
  -> 3b04fcaca42bfd162a618e37f5b8073022d269ae
  -> 8290b7b9826317254ab72799c13d6779db6ccc4c
  -> 5e9864bb9ac167881887245bbc8d53cc9842c174
```

The request-only commit adds only:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-3_to_review.md
```

## Scope reconstruction

The exact technical range changes only:

```text
cli/src/agents_cli/doctor.py  +102/-57
tests/cli/test_doctor.py      +271/-0
```

Both files remain mode `100644`. Their final blobs are:

```text
cli/src/agents_cli/doctor.py
  94a4d7a90bf2c8b4355a3a0b9ec2a93bfc241529
tests/cli/test_doctor.py
  29cff188a635ee9641db5a323f07be956fc0bd9a
```

The unchanged schema remains mode `100644` with blob:

```text
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
```

No CLI main/output helper, real probe, sample, bootstrap, documentation,
manifest, workflow, lock, shared configuration, provider, Gateway,
coordination, Redis, MCP, KYA, portability, plan index, or shared suite file is
in the technical range.

## Honest limits

This review did not run aggregate suites, full CI, installation, npm, network
access, Redis, MCP, KYA, provider commands, Gateway, coordination, shared
services, tmux, agents, subagents, runtime supervision, portability,
integration, promotion, publication, or release.

Only local offline cached Python tooling and injected in-memory fakes were
used. No real probe, provider, service, runtime-supervision process, or
coordination path was started.

The historical RED used a disposable `git archive`; no branch checkout,
additional worktree, agent, or subagent was created. Its temporary export and
all exact pytest basetemp paths were absent at postflight.

No implementation, submitted test, schema, task specification, request,
documentation, plan index, or prior result was modified by the reviewer. The
reviewer performed no push.

## Postflight before result creation

The worktree was clean at exact request HEAD before this result file was
created. The following generated paths were individually absent:

```text
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
/tmp/h001-doctor-trial3-review-current
/tmp/h001-doctor-trial3-review-structure
```
