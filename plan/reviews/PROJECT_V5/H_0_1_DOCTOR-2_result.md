# Independent Review Result — Project V5 H/0/01 DOCTOR Trial 2

Verdict: KO

The four Trial 1 corrections are effective at the boundaries directly covered
by the submission: credential-like profile IDs are rejected before binding
iteration, Python and Draft 2020-12 agree at the absolute string end, ordinary
binding-iterable exceptions are rebuilt as exact static errors without their
chain, and the result renderers reject forged nested remediation values before
calling hostile methods.

The trial still cannot be accepted because two independently reproduced P1
violations remain in distinct public DTO boundaries. `DoctorRun` accepts an
exact forged `DoctorResult` without recursively validating it, including a
credential-like profile or hostile primitive, and its generated representation
then exposes that value. Separately, the registry-definition DTO constructors
trust exact outer child types: `OutcomeDefinition` accepts a forged
`Remediation`, while `CheckDefinition` hashes forged child fields before
validating their primitive types.

This verdict is limited to `H_0_1_DOCTOR` Trial 2. It does not review or claim
the later real probes, CLI wiring, portability lane, integration, promotion,
publication, release, or completion of H/0/01.

## P0 findings

None.

## P1 findings

### P1-1 — `DoctorRun` accepts an unvalidated forged result and exposes it through DTO representation

Evidence:

- `cli/src/agents_cli/doctor.py:220-223` makes `DoctorRun` the typed public
  result/exit envelope.
- `cli/src/agents_cli/doctor.py:224-240` reads `self.result.status` and checks
  only that the outer value has exact type `DoctorResult`; it never calls the
  recursive validator.
- The recursive result validator exists at
  `cli/src/agents_cli/doctor.py:668-702`, but it is used only by the result
  validation/rendering functions, not by `DoctorRun.__post_init__`.

An exact `DoctorResult` reconstructed with `object.__new__` was given the
otherwise-denied profile `tok-live-doctor-run-synthetic-canary`, canonical
checks, and `ResultStatus.PASS`. The constructor accepted it with exit `0`, and
the generated `DoctorRun` representation contained the canary:

```text
doctor_run_profile_bypass DoctorRun True
```

Two further variants used an exact forged nested `Remediation` and a hostile
non-`ResultStatus` status value. Both were accepted without invoking the
hostile object during construction; `repr(DoctorRun)` then invoked its hostile
`__repr__` and contained the canary:

```text
doctor_run_forged_nested accepted True repr_hostile True canary_in_repr True
doctor_run_forged_primitive accepted True repr_hostile True canary_in_repr True
```

Thus the profile denylist and recursive renderer validation can be bypassed
through the public typed run envelope. The issue is not that a caller can forge
an object in isolation; it is that another contract constructor accepts that
forgery as a valid `DoctorRun` before representation or downstream use.

Required correction:

- recursively validate the exact `DoctorResult` and every nested DTO/primitive
  in `DoctorRun.__post_init__` before reading or comparing `result.status`;
- only after that validation, enforce the exact `int` exit-code relationship;
- rebuild every ordinary validation failure as the exact static
  `DoctorContractError` without cause, context, payload, or hostile method
  calls; and
- add exact forged root status, profile, check, and remediation cases, proving
  rejection before equality, string, representation, or serialization.

### P1-2 — Registry DTO constructors trust forged children and invoke hostile hash/repr before recursive validation

Evidence:

- `cli/src/agents_cli/doctor.py:119-129` validates the scalar fields of an
  `OutcomeDefinition` but checks only
  `type(self.remediation) is Remediation`; it does not call the existing
  recursive remediation validator at `cli/src/agents_cli/doctor.py:93-108`.
- `cli/src/agents_cli/doctor.py:138-156` checks only that each child has exact
  outer type `OutcomeDefinition`. It constructs `(probe_status, code)` pairs
  and hashes them at `cli/src/agents_cli/doctor.py:145-146` before validating
  the child primitive fields. It also does not validate the primitive type of
  `exception_code` before later comparison.

An exact forged remediation with hostile `doc` and `anchor` fields was accepted
by the normal `OutcomeDefinition` constructor. Its generated representation
called both hostile `__repr__` methods and emitted their canary:

```text
outcome_forged_remediation accepted True repr_hostile True canary_in_repr True
outcome_nested_bypass OutcomeDefinition True ('repr', 'repr')
```

An exact forged `OutcomeDefinition` with hostile `probe_status` and `code`
fields was then supplied to the normal `CheckDefinition` constructor. The
constructor eventually returned a static contract error, but only after
invoking the hostile `__hash__` twice:

```text
check_definition_forged_outcome result DoctorContractError hostile_calls ('hash', 'hash')
check_definition_prevalidation_calls DoctorContractError ('hash', 'hash') True True
```

This violates the required ordering: exact nested DTO and primitive validation
must precede equality, hashing, representation, string conversion, or
serialization.

Required correction:

- make `OutcomeDefinition` recursively validate its exact `Remediation`
  fields before accepting the object;
- make `CheckDefinition` recursively validate every exact child outcome,
  every child primitive, nested remediation, and exact nonempty
  `exception_code` before constructing or hashing comparison keys;
- convert ordinary failures to a fresh exact static contract error without
  invoking hostile methods; and
- add constructor-level exact forgeries for child enum, string, remediation,
  and exception-code fields, asserting zero hostile equality/hash/repr/str
  calls.

## P2 findings

None.

## Verified Trial 1 corrections

### Credential-like profile boundary

- The closed prefix set is defined at
  `cli/src/agents_cli/doctor.py:26-34`.
- The shared absolute-end pattern is defined at
  `cli/src/agents_cli/doctor.py:35-38` and copied exactly into
  `schemas/doctor-result-v1.schema.json:17-22`.
- `run_doctor` rejects the profile at
  `cli/src/agents_cli/doctor.py:736-737`, before binding materialization at
  `cli/src/agents_cli/doctor.py:738`.

An independent JSON-domain corpus covered 46 accepted and 298 rejected values.
It included all seven denied prefixes, case variants, ASCII and Unicode
separator variants, NUL and other byte suffixes, LF, CR, CRLF, NEL, LS, PS,
zero-width characters, BOM, combining characters, a lone surrogate, a
non-BMP character, length 1/64/65, and unrelated safe identifiers such as
`sketch-agent`, `token-agent`, `tokyo-runner`, `my-sk-worker`, and
`github-patch-runner`. Python and Draft 2020-12 agreed for the full corpus.
Every rejected value failed before the hostile binding object's `__iter__`
was touched:

```text
profile_json_domain_parity 46 298 OK
invalid_profile_preobservable 298 OK
```

### Binding-iterable exception boundary

`cli/src/agents_cli/doctor.py:705-727` materializes and validates the external
iterable inside an ordinary-exception guard, then raises the replacement only
after leaving that handler.

Independent probes covered ordinary generators, an
`ExceptionGroup`, a hostile `DoctorContractError` subclass, tuple and list
subclasses overriding iteration, a separate hostile iterator, a failing
`__length_hint__`, and an invalid iterator return. Every ordinary failure
became an exact `DoctorContractError` with the static code/message, exit `2`,
no copied attributes, and both `__cause__` and `__context__` equal to `None`.
`KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` all propagated:

```text
iterable_exception_matrix OK
```

### Result validation/rendering boundary

The corrected path recursively checks remediation fields at
`cli/src/agents_cli/doctor.py:93-108`, validates each result check at
`cli/src/agents_cli/doctor.py:621-657`, validates the complete result at
`cli/src/agents_cli/doctor.py:668-702`, and uses that validation before the
public projection/renderers at `cli/src/agents_cli/doctor.py:772-825`.

Exact forged `DoctorResult`, `DoctorCheck`, and `Remediation` values with
hostile equality, hash, string, and representation methods were rejected by
`validate_result`, `project_result`, `render_json`, and `render_human`.
No hostile method was invoked:

```text
submitted_result_boundaries OK
```

### Closed inventory, aggregation, and exit semantics

Every one of the 35 static outcomes was exercised under both
`canonical-orchestrator` and `portable-review-v2`. All 70 projections validated
against Draft 2020-12; both wrong aggregate statuses for every projection were
rejected, for 140 invalid mutations. JSON and human rendering remained
deterministic, and exit `1` occurred exactly for aggregate `fail`:

```text
inventory_projection_aggregate 70 140 OK
```

## Reviewer profile

- Requested reviewer profile: GPT-5.6 Sol.
- Requested reasoning configuration: `ultra`.
- Requested execution mode: Priority/Fast.
- Review mode: independent, adversarial, evidence-based local QA.
- The reviewer runtime exposed no independent telemetry that could attest the
  actual model identity, reasoning setting, service tier, latency, or speed.
  The values above therefore record the exact requested orchestration profile,
  not invented measured telemetry.

## Frozen identity, range, and parentage

- Branch: `feat/V5-H-0-01-doctor`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`
- Trial 2 base:
  `dc351a51869ce9ba1dcbde15d2bedfe58f319f97`
- Base tree:
  `1349da3b789594a294c6c0c0f462c47b7c441f5d`
- RED:
  `0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9`
- RED tree:
  `1e50be24619761d0c6e7339bd41bc3a6a652d933`
- Final technical:
  `41a0d609a06a4286cfb2975b96a0f70108af4414`
- Final technical tree:
  `180b980902493ba25182171c04e01a4fa7a0ca5a`
- Request-only:
  `d6d276822770ef127400299381654978c9b99a68`
- Request-only tree:
  `a0327a046fe86f8224ae77fd1b4645deeba2850d`
- Exact technical range:
  `dc351a51869ce9ba1dcbde15d2bedfe58f319f97..41a0d609a06a4286cfb2975b96a0f70108af4414`

Parentage is direct and linear:

```text
dc351a51869ce9ba1dcbde15d2bedfe58f319f97
  -> 0e008027d9e94cbdc6e14bf9d14ee806b8e6fec9
  -> 41a0d609a06a4286cfb2975b96a0f70108af4414
  -> d6d276822770ef127400299381654978c9b99a68
```

The request-only commit adds only:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-2_to_review.md
```

## Scope and TDD reconstruction

The exact technical range modifies only:

```text
cli/src/agents_cli/doctor.py
schemas/doctor-result-v1.schema.json
tests/cli/test_doctor.py
```

All three files remain mode `100644`. Their final blobs are:

```text
cli/src/agents_cli/doctor.py
  f63865dd73059255f7cdb9b9255fa253eb099795
schemas/doctor-result-v1.schema.json
  49f05a54526ac4c8505bb31236099f8ba7c5678c
tests/cli/test_doctor.py
  135a4e786483f4cbf9ebf3dfed5615021128b796
```

The TDD sequence is authentic for the submitted corrections:

- RED `0e00802` has direct parent `dc351a5` and changes only
  `tests/cli/test_doctor.py`.
- The exact RED tree was exported with `git archive` to a disposable directory,
  without checking it out or creating a worktree. Its complete focused suite
  independently reproduced `14 failed, 27 passed`; the failures match the nine
  credential cases, absolute-end assertion, iterable context, and three
  forged-remediation cases.
- GREEN `41a0d60` has direct parent `0e00802` and changes only
  `cli/src/agents_cli/doctor.py` and
  `schemas/doctor-result-v1.schema.json`.
- The test blob is byte-identical between RED and GREEN. The GREEN did not
  remove or relax the RED assertions.
- The current complete focused suite passes all 41 submitted tests.

No CLI main/output helper, real probe, sample, bootstrap, documentation,
manifest, workflow, lock, shared configuration, provider, Gateway,
coordination, Redis, MCP, KYA, portability, or plan-index file appears in the
technical range.

## Verification performed

Focused doctor inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=<disposable-review-temp> \
  tests/cli/test_doctor.py
```

Result:

```text
41 passed in 0.13s
```

Integrated SAMPLE/layout inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=<disposable-review-temp> \
  tests/structure/test_h001_sample.py \
  tests/structure/test_project_layout.py
```

Result:

```text
8 passed in 0.05s
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

Additional read-only verification:

- `python -m json.tool schemas/doctor-result-v1.schema.json` passed.
- `Draft202012Validator.check_schema` passed through the focused tests.
- The exact profile, iterable, inventory, aggregate, and DTO probes documented
  above ran in memory only.
- `git diff --check` passed for the exact technical range.
- Exact commit, tree, parent, path, mode, blob, and request-only checks passed.
- A directed production/schema scan found no test canary, personal path,
  credential-bearing URL, raw configuration, or traceback payload. The
  secret-shaped strings in the technical diff are synthetic test fixtures
  under `tests/cli/test_doctor.py`.
- No network, provider, Redis, Gateway, MCP, KYA, tmux, agent, subagent,
  runtime supervisor, or shared-service path was invoked.

Passing submitted tests do not negate the two independently reproduced public
DTO boundary violations.

## Honest limits

This review did not run aggregate suites, CI, installation, npm, network
access, Redis, MCP, KYA, provider commands, Gateway, coordination, shared
services, tmux, agents, subagents, integration, portability, promotion,
publication, or release.

The historical RED was executed from a disposable `git archive`, not by
checking out the review branch or creating another worktree. Only local
offline cached Python tooling was used. No real probe, service, provider,
runtime-supervision, or coordination process was started.

No technical implementation, submitted test, schema, task specification,
request, documentation, plan index, or prior result was modified by the
reviewer.

## Postflight before result creation

The following generated paths were individually absent:

```text
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

All disposable Trial 2 test and RED-export directories were removed by their
exact validated `/tmp` paths. Immediately before this result file was created,
`git status --porcelain=v1 --untracked-files=all` was empty at the exact
request HEAD.
