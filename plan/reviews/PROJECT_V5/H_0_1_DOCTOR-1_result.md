# Independent Review Result — Project V5 H/0/01 DOCTOR Trial 1

Verdict: KO

The submitted pure doctor core has the requested narrow technical scope, the
declared commit chain is exact, and all permitted focused tests and directed
static checks pass. The result cannot be accepted because four independently
reproduced P1 contract violations remain at the validation boundaries:
credential-shaped `profileId` values reach every output channel, the JSON
schema admits a non-kebab profile ID rejected by Python, a hostile ordinary
exception from the binding iterable escapes unsanitized with its cause, and an
exact-type forged nested remediation passes renderer validation.

This verdict is limited to `H_0_1_DOCTOR` Trial 1. It does not review or claim
the later real probes, CLI wiring, portability lane, integration, promotion,
publication, release, or completion of H/0/01.

## P0 findings

None.

## P1 findings

### P1-1 — Credential-shaped profile IDs are copied into DTO, repr, JSON, and human output

Evidence:

- `cli/src/agents_cli/doctor.py:26` defines only a lexical kebab-case pattern.
- `cli/src/agents_cli/doctor.py:43-48` treats every matching string of 1–64
  characters as safe. There is no credential/canary exclusion.
- `cli/src/agents_cli/doctor.py:720-725` stores that caller value in the
  `DoctorResult`.
- `cli/src/agents_cli/doctor.py:742-759` and
  `cli/src/agents_cli/doctor.py:772-785` copy it into JSON and human output.
- `schemas/doctor-result-v1.schema.json:17-22` admits the same
  credential-shaped strings.

The strings `tok-live-doctor-secret-canary` and
`sk-proj-secret-canary-123` both satisfy the current pattern. Independent
execution showed that each is accepted and is present in all three inspected
channels:

```text
credential_canary tok-live-doctor-secret-canary accepted True
dto_repr_json_human (True, True, True)
credential_canary sk-proj-secret-canary-123 accepted True
dto_repr_json_human (True, True, True)
```

This violates the exclusive requirement that token/canary values never reach a
DTO representation, JSON, or human output, and that canary-shaped profile IDs
be rejected. The fact that these values use only the allowed kebab alphabet
does not make them safe IDs; common credential forms can use the same
alphabet.

Required correction:

- retain support for every genuinely safe canonical kebab-case ID of length
  1–64;
- reject credential- and canary-shaped values before constructing any DTO;
- keep Python and schema acceptance aligned; and
- add adversarial safe-alphabet token/canary cases, not only canaries already
  rejected incidentally by underscores or uppercase characters.

### P1-2 — The Draft 2020-12 schema accepts a trailing-LF profile ID that Python rejects

Evidence:

- Python validates with `re.fullmatch` at
  `cli/src/agents_cli/doctor.py:43-48`.
- The schema uses
  `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` at
  `schemas/doctor-result-v1.schema.json:21`.
- The project's selected `jsonschema.Draft202012Validator` applies the final
  `$` in a way that accepts a match immediately before a final newline.

Starting from an otherwise valid projection:

```python
validator.is_valid({**projection, "profileId": "safe-id\n"})
```

observed:

```text
schema_accepts_trailing_lf True
```

`run_doctor("safe-id\n", bindings)` raises the canonical exit-2
`DoctorContractError`, so the schema and typed contract disagree. A profile ID
with a line terminator is not safe kebab case and can create downstream
line-oriented rendering or logging ambiguity.

Required correction:

- close the schema against every character outside the accepted ASCII
  alphabet without relying on the final `$` alone;
- prove that Python and Draft 2020-12 validation accept and reject the same
  boundary values; and
- add LF, CR, other control-character, minimum, maximum, and over-maximum
  profile cases.

### P1-3 — A hostile ordinary exception from the binding iterable escapes with raw text and cause

Evidence:

- `run_doctor` accepts any `Iterable[ProbeBinding]` at
  `cli/src/agents_cli/doctor.py:690-693`.
- `_snapshot_bindings` materializes caller-controlled iteration at
  `cli/src/agents_cli/doctor.py:674-683`.
- `cli/src/agents_cli/doctor.py:684-687` re-raises every
  `DoctorContractError`, including caller-created subclasses, rather than
  replacing it with a fresh canonical error from no cause.

Independent reproduction used:

```python
class HostileContractError(doctor.DoctorContractError):
    def __str__(self):
        return "tok-live-hostile-error-canary"

    def __repr__(self):
        return "HostileContractError(tok-live-hostile-error-canary)"

def hostile_bindings():
    raise HostileContractError() from ValueError("/home/owner/private")
    yield

doctor.run_doctor("canonical-orchestrator", hostile_bindings())
```

Observed:

```text
hostile_binding_error_type HostileContractError
hostile_binding_error_leaks True True
```

No probe ran and no partial result was returned, but the exit-2 boundary was
not safe: the hostile subclass, canary-bearing text, and explicit cause all
survived. `DoctorContractError` is an ordinary `Exception`; only
`KeyboardInterrupt`, `SystemExit`, and `GeneratorExit` are required to
propagate intact.

Required correction:

- sanitize every ordinary exception originating from caller-controlled
  iteration into a fresh exact canonical `DoctorContractError` with
  `from None`;
- do not trust an incoming exception merely because it inherits the public
  contract-error type; and
- add iterable-level hostile exception, hostile contract-error subclass, cause,
  and control-flow-signal tests.

### P1-4 — Renderer validation accepts an exact-type forged nested remediation

Evidence:

- `Remediation.__post_init__` checks exact scalar field types and values only at
  construction time in `cli/src/agents_cli/doctor.py:77-84`.
- `_validate_check` checks only `type(check.remediation) is Remediation` at
  `cli/src/agents_cli/doctor.py:594-607`.
- It then relies on dataclass equality at
  `cli/src/agents_cli/doctor.py:619-620`; it does not recursively revalidate
  `doc` and `anchor`.

An exact `Remediation` instance can be reconstructed without `__post_init__`
and given non-string fields whose equality method reports equality with the
static strings. An exact `DoctorCheck` and exact `DoctorResult` containing that
value then pass `project_result`:

```python
class EqualStatic:
    def __eq__(self, other):
        return True

forged_remediation = object.__new__(doctor.Remediation)
object.__setattr__(forged_remediation, "doc", EqualStatic())
object.__setattr__(forged_remediation, "anchor", EqualStatic())
```

After inserting it into otherwise canonical exact-type check/result instances,
independent execution observed:

```text
forged_nested_remediation_accepted True
{'doc': 'docs/doctor.md', 'anchor': 'synthetic-input'}
```

The renderer reconstructs safe static output, so this case did not leak the
forged fields. It nevertheless violates the explicit renderer contract:
renderers must reject forgeries as well as dicts and subclasses. Exact outer
types are insufficient when nested values are not revalidated.

Required correction:

- recursively validate every nested canonical DTO at the renderer boundary;
- require exact `str` types and exact static values for remediation fields
  before any equality operation; and
- add exact-type forged/mutated nested DTO cases alongside dict and subclass
  rejection cases.

## Reviewer profile

- Requested profile: GPT-5.6 Sol.
- Requested reasoning: `ultra`.
- Requested execution tier: priority/fast.
- Review mode: independent, adversarial, evidence-based local QA.
- No external telemetry was available to independently attest model identity,
  reasoning configuration, latency, or service tier. These values record the
  requested orchestration profile only.

## Frozen identity, range, and parentage

- Branch: `feat/V5-H-0-01-doctor`
- Worktree:
  `/tmp/agents-orchestrator-v5-h001-doctor.fiYhEy/worktree`
- Base:
  `37f3d60ee769df1fdc397a4e81ff14efa664555d`
- Base tree:
  `12a644057c29d26452b6f194fda08a78dbe47d8f`
- Initial RED:
  `f6664d52724584cf6674db00d9e85f8bd81d6d94`
- Initial RED tree:
  `5330e9d0bc8fd0f457f6a6444de5dffd2510f886`
- Initial GREEN:
  `d2fce26d5fab28426f8903ac0795d4be330e258b`
- Initial GREEN tree:
  `4d9263f60047440a19420fb5b4c4a10ac986ba3c`
- Correction RED:
  `0f40aec03b592ecec76e45cfc6d04988682d05c7`
- Correction RED tree:
  `63641a238610f871b785f70030409c9ae151eddc`
- Final technical:
  `1a466f8799dd2530301adc403ef7886001f2c527`
- Final technical tree:
  `8c3202ad5c588e95da0ece95ac819f60a06e1ce3`
- Request-only:
  `c6390f81f783c0227c090ee63314c9ec1f9eb4b3`
- Request-only tree:
  `a7b5966c49da1f91c4d3d7e3fa9a2969f89b34d0`
- Exact technical range:
  `37f3d60ee769df1fdc397a4e81ff14efa664555d..1a466f8799dd2530301adc403ef7886001f2c527`

Parentage is direct and linear:

```text
37f3d60ee769df1fdc397a4e81ff14efa664555d
  -> f6664d52724584cf6674db00d9e85f8bd81d6d94
  -> d2fce26d5fab28426f8903ac0795d4be330e258b
  -> 0f40aec03b592ecec76e45cfc6d04988682d05c7
  -> 1a466f8799dd2530301adc403ef7886001f2c527
  -> c6390f81f783c0227c090ee63314c9ec1f9eb4b3
```

The worktree was clean at the exact request HEAD before review.

## Scope reconstruction

The net technical range adds exactly:

```text
cli/src/agents_cli/doctor.py          +785/-0
schemas/doctor-result-v1.schema.json  +831/-0
tests/cli/test_doctor.py              +452/-0
```

All three technical files are mode `100644`. Their final blobs are:

```text
cli/src/agents_cli/doctor.py
  72783a22c240a07ae26adc367b3eb09a20429953
schemas/doctor-result-v1.schema.json
  240d7bcd546a252ddfdfd7f695965482b324475a
tests/cli/test_doctor.py
  21ceac5f1976ed34ccc095b9d1cf2ea8442454f8
```

The request commit adds only:

```text
plan/reviews/PROJECT_V5/H_0_1_DOCTOR-1_to_review.md
```

No CLI main/output helper, real probe, sample, bootstrap, documentation,
manifest, workflow, lock, shared configuration, provider, Gateway,
coordination, Redis, MCP, KYA, portability, or plan-index file is in the
technical range.

The source AST imports only:

```text
__future__, json, re, collections.abc, dataclasses, enum, types, typing
```

There is no filesystem, process, socket, HTTP, Redis, provider, Gateway, MCP,
or coordination import. No real I/O or command execution path was found.

## TDD evidence reconstruction

The historical RED commits were not executed or checked out in the frozen
review worktree.

- The base contains neither `agents_cli.doctor` nor
  `doctor-result-v1.schema.json`.
- Initial RED `f6664d5` adds only `tests/cli/test_doctor.py`.
- Initial GREEN `d2fce26` adds the implementation and schema. Its six test-line
  changes are Ruff B023 closure binding and formatting; no acceptance
  assertion is removed.
- Correction RED `0f40aec` changes only the doctor test and adds the generic
  profile and three control-signal expectations.
- The `doctor.py` and schema blobs are identical at `d2fce26` and `0f40aec`,
  proving that correction RED did not include the fix.
- Final technical `1a466f8` changes only implementation and schema.
- The doctor-test blob is identical at `0f40aec` and `1a466f8`, proving the
  correction did not rewrite or relax its RED test.

This is a valid red/green sequence for the behavior it covers. The four P1s
above are missing acceptance coverage rather than evidence that the recorded
tests were falsified.

## Verification performed

Focused doctor inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial1-review-pytest \
  tests/cli/test_doctor.py
```

Result:

```text
24 passed in 0.10s
```

Integrated SAMPLE/layout inventory:

```text
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=cli/src \
  uv run --offline --no-project --with pytest --with jsonschema \
  python -m pytest -q -p no:cacheprovider \
  --basetemp=/tmp/h001-doctor-trial1-review-structure \
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

Additional read-only checks:

- `Draft202012Validator.check_schema` passed.
- Every one of the 35 static registry outcomes produced a schema-valid
  projection for `portable-review-v2`.
- All 70 corresponding wrong aggregate-status mutations were rejected.
- The four adversarial P1 reproductions above ran in memory only.
- The directed production/schema canary scan found zero checked-in copies of
  the test canaries.
- `BaseException` has zero occurrences in the final production source.
- `git diff --check` passed over both the technical range and the request-only
  range.
- Exact commit, tree, parent, path, file-mode, blob, and initial-cleanliness
  checks passed.

Passing submitted tests do not negate the four uncovered boundary cases.

## Honest limits

This review did not run aggregate suites, CI, installation, a historical RED
suite, npm, network access, Redis, MCP, KYA, provider commands, Gateway,
coordination, shared services, tmux, agents, subagents, integration,
portability, promotion, publication, or release.

The review request itself does not overclaim the PROBES slice, portability,
full H/0/01 completion, integration, promotion, publication, or release.

No technical implementation, test, schema, documentation, plan, or request
file was modified by the reviewer.

## Postflight before result creation

Each authorized cache path was checked individually and was absent:

```text
.pytest_cache/
.ruff_cache/
cli/.ruff_cache/
cli/src/agents_cli/__pycache__/
tests/cli/__pycache__/
tests/structure/__pycache__/
```

The two exact reviewer basetemp paths were also absent:

```text
/tmp/h001-doctor-trial1-review-pytest
/tmp/h001-doctor-trial1-review-structure
```

A `/proc` current-directory scan run from outside the worktree found zero
processes rooted at the task worktree or a descendant. Immediately before this
result file was created,
`git status --porcelain=v1 --untracked-files=all` was empty at the exact
request HEAD.
