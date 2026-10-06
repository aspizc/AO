# H/0/01 PROBES — Trial 2 Review Result

## Verdict

reviewed_KO

## Identities (authenticated from git)

- Candidate: `4b151e7552a8e0c39ce0d3b8e5d04e1240a0406e`, tree
  `f8d23fcf67f9fcae54c6decab46fbb930c92c9ba`.
- Request: `24218eada09c0dbeab41c220b4021ff92efdb9ba`, tree
  `40e654c510f1d29fe589336ee2897d03a53c9dd9`, parent `4b151e7…` — one-path
  delta (`plan/reviews/PROJECT_V5/H_0_1_PROBES-2_to_review.md`), blob SHA-256
  `c3415e5cc51f45542e9e3fd1cfb8c02bf1e16427ad02e2479545194cb3943914` (match).
- Static A2 note (evidence only, not authority):
  `workspace/.v5-h001-probes-t2-static-a2-note.md`, SHA-256
  `9b553b78f45fda402409f5be9d178da2fe08c21930fb0719d628d9a8b30f7418` (match).
- Reviewer: fresh independent Claude Fable 5 (max), blocker-first scope; the
  prior Trial 2 final reviewer is void (budget overrun, no result written).

## Scope: blocker-first partial coverage (declared, intentional)

Reviewed only: the request's provider fail-closed/hostile claims plus its
limitations/checklist; `doctor_probes.py` `_execution_mode` (L103–116),
`create_provider_login_bindings` (L259–282), `create_doctor_probe_bindings`
(L440–453); the A2 note's Findings section; one independent hostile-input
reproducer; the two focused provider/composition test files. This verdict does
not certify anything outside that scope.

## Reproducer outcome (independent, no product/test edits persisted)

Scratchpad script, `PYTHONPATH=<worktree>/cli/src`, exact `dict` providers
mapping containing one custom key with `__hash__() == hash("claude-code")` and
`__eq__` raising a sentinel `RuntimeError`; runner stub that asserts if
invoked:

- `create_provider_login_bindings(providers, runner)` → **sentinel escaped at
  construction** (`Sentinel('HOSTILE-EQ-ESCAPED')`).
- `create_doctor_probe_bindings(providers=…, runner=…, …)` → **sentinel
  escaped at construction**.

Mechanism: `_execution_mode` runs eagerly at composition (L270/L278) and
`dict.get(providers, provider.value)` (L106) probes the hash table, invoking
the stored key's raising `__eq__` with no guard on the provider path (the
coordination path wraps its equivalent traversal). The hostile mapping
therefore raises out of the public factory instead of failing closed to the
static `CLAUDE_CODE_LOGIN_PROBE_ERROR` / `CODEX_LOGIN_PROBE_ERROR`
observations. Zero runner calls occurred (stub never tripped); no output was
synthesized — the failure mode is escape, not leakage.

This contradicts the request's claims that malformed/hostile provider
projections "fail closed to the allowlisted static observations" and that
provider fakes cover "malformed projections, hostile values": existing tests
cover wrong-shape inputs, not raising-key exact dicts. The limitations section
does not disclaim this edge. Per the adjudication rule, escape ⇒ KO even at
P2 severity.

## Findings

- **P0**: none in reviewed scope.
- **P1**: none in reviewed scope.
- **P2 (blocking by adjudication rule)**: construction-time hostile-key escape
  described above (`doctor_probes.py` L103–116 via L270/L278/L450). Confirms
  the A2 note's P2 finding by independent reproduction.
- **P2 (informational, from A2 note, consistent with accepted boundary)**:
  provider one-shot behavior is enforced by the registry's single invocation,
  not by `_ProviderLoginProbe` itself. Non-blocking.

## Commands and totals

- Reproducer (above): both public factories raised the sentinel; exit 0 from
  harness; 0 runner calls.
- `PYTHONPATH=<worktree>/cli/src cli/.venv/bin/python -m pytest
  tests/cli/test_doctor_provider_probes.py
  tests/cli/test_doctor_probe_composition.py -q` → **25 passed** in 5.60s
  (gap is untested, not a regression).

## Trial 3 correction (minimal, numbered)

1. Guard the exact-dict lookup/classification in `_execution_mode` at the
   construction boundary so an ordinary exception raised by hostile keys
   during lookup classifies as `_ExecutionMode.INVALID` (→ static
   `*_LOGIN_PROBE_ERROR`), preserving the existing `BaseException`
   propagation policy and zero runner calls.
2. Add a TDD RED test first: exact `dict` with a colliding raising key passed
   to the public factory must construct, emit the static probe-error
   observations, and invoke the runner zero times.
3. Rerun the existing focused gates
   (`tests/cli/test_doctor_provider_probes.py`,
   `tests/cli/test_doctor_probe_composition.py`) and record totals.

No other change is requested by this trial.

## Unreviewed domains (explicit)

Coordination probes, authority probes, schema validation, documentation,
leakage canaries beyond the reproducer, Gateway JS tests, Ruff/format gates,
`scripts/ci.sh`, lock-graph materialization, Python 3.13 matrix, and all
checklist items not named in the scope above were **not reviewed** in this
blocker-first pass; no inference of their status is made in either direction.
