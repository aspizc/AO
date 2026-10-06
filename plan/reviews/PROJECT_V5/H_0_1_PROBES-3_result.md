# H/0/01 PROBES — Trial 3 Review Result

## Verdict

reviewed_OK

This OK closes only the three numbered Trial 2 KO corrections inside the
`H_0_1_PROBES` slice. It does not imply integration, promotion, release,
full-sheet H/0/01 completion, a passing aggregate CI gate, or any live
provider/Redis/isolation/state-ownership evidence. The canonical status of the
full reproducible gate on the combined review tree is
`infrastructure_unavailable`, not `passed` (adjudicated below).

## Reviewer identity

Fresh independent Claude Fable 5 (`claude-fable-5`) at maximum reasoning, role
`reviewer`, reviewer task `ts-573c58c1-e1a8-45ff-8420-e4f31f64b0e5`, trace
`tr-v5-h001-probes-t3-d85a20bd-c431-4d38-a5f3-3c3f68d16679`. This reviewer did
not implement the candidate, inherited no coder context, and spawned or
delegated to no sub-agent. Every identity below was recomputed directly from
Git and every total was rerun or independently reproduced in this worktree.

## Identities (authenticated from Git)

```text
baseline  commit 095ca221b9e24abf3d96604b331aaccde7ccea94
          tree   0d4d18e7a291701c18326e3e32868bf9279ca1be
          parent 24218eada09c0dbeab41c220b4021ff92efdb9ba
          subject "review(v5): record H_0_1 PROBES trial 2 result"

RED       commit 91dbdfe605f6410b3fe38cb9eb4b4a7927a07f02
          tree   5e63598fe16b2a237852ea0f58f8f4c1115ba715  (parent = baseline)
          subject "test(doctor): expose hostile provider key escape (V5 H/0/01 PROBES Trial 3 RED)"
          delta  exactly M tests/cli/test_doctor_provider_probes.py  +78/-0
                 (blob 205e82f… -> e6adc06f6cfd9d32726f3bfe16e5bb12652f5c39)

GREEN     commit 7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76   <- technical candidate
          tree   d208b1fe7a6e6cf29b7bac302a705b95dc9cad67   (parent = RED)
          subject "fix(doctor): fail closed on hostile provider keys (V5 H/0/01 PROBES Trial 3 GREEN)"
          delta  exactly M cli/src/agents_cli/doctor_probes.py  +12/-9
                 (blob 7c1271d… -> b66f5fa75131772ef171d25d7e679ef737765b21)

range     095ca221..7e1a606d = exactly 2 files, +90/-9, no other path

request   commit 2f54ab25de9f5057124c3f081822c430a69fd6ea
          tree   36c0a5e8686d071a0c90b2aeafdc93555144b80c   (parent = GREEN)
          subject "docs(review): request H/0/01 PROBES Trial 3 review"
          delta  exactly A plan/reviews/PROJECT_V5/H_0_1_PROBES-3_to_review.md
          blob   git f237bc52ecada557a72a712c634a51f28cbe97b7
                 SHA-256 ca8593b985076547732789b6ec03734306df9b0a97a0e0f77ad897cf4c90b02b
                 byte-identical at the request commit, at HEAD, and on disk

overlay   commit 37d18920aeaa7fa0341d389799dc73b835eaec9a   <- combined review HEAD
          tree   231d4c3889b535e68b4befc11319cbc5f9a7b898   (parent = request)
          subject "chore(ci): refresh H/0/01 PROBES inventory (V5 H/0/01 Trial 3)"
          delta  exactly M ci/suites.json
                 (blob a03baf112271222… -> 536320e213d441578…)
```

Ancestry is linear and exact: baseline -> RED -> GREEN -> request -> overlay.
The worktree blobs for both technical paths are byte-identical to the GREEN/RED
committed blobs through HEAD; `git status` shows only the accepted untracked
`gateway/node_modules` symlink.

The technical GREEN candidate (`7e1a606d` / tree `d208b1fe`) and the
integrator-owned combined review tree (`37d18920` / tree `231d4c38`) are
distinct objects; this verdict adjudicates the technical candidate and
authenticates the overlay as mechanical.

## Integrator overlay adjudication (mechanical, necessary)

- A structural JSON diff of `ci/suites.json` between request and overlay shows
  the suite id set unchanged and exactly three suites changed —
  `lint.python`, `test.gateway`, `test.cli` — each only in the
  `inventorySha256` field. No suite topology, command, classification,
  `allowedSkips`/skip policy, timeout, or product/test code changed.
- The canonical digest (`scripts/ci_gate.py::inventory_digest`, SHA-256 over
  the sorted matched path list) was recomputed from pristine `git archive`
  exports: at the overlay tree 0 suites are stale; at the request tree and at
  the baseline tree exactly those three suites are stale, and the recomputed
  correct values equal the overlay's new values byte-for-byte.
- The staleness therefore predates Trial 3 (already present at the baseline);
  the technical range adds/removes no file and could not alter any inventory.
  This matches the sheet's rule that shared suite manifests are
  integration-owned.

## Trial 2 KO corrections — all three closed

1. `_execution_mode` now wraps its exact-dict lookup/classification in
   `try`/`except Exception` after the unchanged exact-type `dict` guard; an
   ordinary exception classifies as `_ExecutionMode.INVALID`, which
   short-circuits `_ProviderLoginProbe.__call__` to the static
   `CLAUDE_LOGIN_PROBE_ERROR`/`CODEX_LOGIN_PROBE_ERROR` observations before
   any runner access. The handler catches only `Exception`, so `BaseException`
   propagates unchanged. The handler body returns the enum member and touches
   nothing on the exception object (no chaining, no dynamic content near DTOs).
2. TDD RED first: the RED commit (parent of GREEN) adds the colliding-key
   matrix against both public factories, with an ordinary `RuntimeError`
   sentinel and a `KeyboardInterrupt` object.
3. The focused gates were rerun (totals below).

Inspection confirms the guard is confined to `_execution_mode`: `providers`
reaches only `create_provider_login_bindings` (two `_execution_mode` calls);
`create_doctor_probe_bindings` adds no other access to the hostile mapping.

## Independent reproduction (reviewer-authored, no coder test code reused)

A 17-check scratchpad reproducer against the candidate passed in full:

- both public factories construct on an exact `dict` whose stored key hash
  equals `hash("claude-code")` and whose `__eq__` raises;
- both provider checks project static `fail`/`CLAUDE_LOGIN_PROBE_ERROR` and
  `fail`/`CODEX_LOGIN_PROBE_ERROR` through a full `run_doctor` +
  `project_result`, with issued exact `ProbeObservation` objects;
- zero runner invocations on every hostile path;
- `_execution_mode` returns `INVALID` for both `RuntimeError` and
  `ValueError` hostile variants; honest `available`/`registry-only`
  classification is unregressed; non-dict and dict-subclass inputs remain
  `INVALID` (exact-type guard intact);
- the exact `KeyboardInterrupt` object (`is`-identity) propagates from both
  factories with zero runner calls.

The same reproducer at a pristine baseline-tree export reproduces the Trial 2
escape (the sentinel `RuntimeError` raises out of both public factories at
construction), proving the correction is real rather than vacuous.

RED chronology was reproduced at a pristine RED-tree export: the exact
four-case selection yields `2 failed, 2 passed`, failing precisely on the two
fail-closed parametrizations with `RuntimeError("HOSTILE_PROVIDER_KEY")`
escaping from `dict.get` during construction, while both `BaseException` cases
already passed — matching the request's declared RED run.

## Tests actually run by this reviewer

Toolchain: fresh untracked `.venv` synchronized from `requirements.lock`
(uv 0.11.21) with Python 3.11.15, pytest 9.1.1, Ruff 0.15.22, PyYAML 6.0.3,
LangGraph 1.2.1; Node v22.22.1 via the untracked `gateway/node_modules`
symlink whose target's `gateway/package-lock.json` is byte-identical to the
candidate blob (`9c81b72e…`, SHA-256 `71bf2f56…`).

```text
exact new matrix (2 test ids, 4 cases)                4 passed, 0 failed, 0 skipped
focused pair (provider + composition files)          29 passed, 0 failed, 0 skipped
all five Doctor/probe Python files                  384 passed, 0 failed, 0 skipped
Node Doctor bridge (doctor_coordination_probe)       10 pass,  0 fail,  0 skipped
Doctor schemas (-k "schema or render or projection"
  over test_doctor.py + test_h001_sample.py)         34 passed
ruff check (3 declared paths)                        All checks passed
ruff format --check (3 declared paths)               3 files already formatted
in-memory compile of doctor_probes.py                OK, no bytecode written
git diff --check                                     clean
bash scripts/ci.sh (full canonical gate, venv on PATH)
  aggregate: 2363 passed, 0 failed, 12 skipped; zero suite errors
  canonical status: infrastructure_unavailable (NOT passed)
```

Full-gate lane decomposition (reviewer rerun, matching the orchestrator's
declared run exactly): structure 410 passed; Gateway non-live 1428 passed with
9 live-PostgreSQL tests declared infrastructure-unavailable; E2E 25 passed;
CLI 413 passed; LangGraph 81 passed with 3 infrastructure-unavailable
(2 `gateway-integration` real-Gateway tests, 1 `temporal` crash-recovery
test); `test.redis-live` and optional `test.real-agents` had no service;
`lint.python`, `lint.gateway`, `lock.python`, `release.candidate`,
`smoke.mcp`, and `policy.registry` passed.

Gateway evidence authenticated: raw diff artifact
`art-530db50c-2bfa-4ebf-9860-9056b188c96b` matches Git byte-for-byte
(including blob transitions); implementation notes
`art-0ab11ea5-7d01-4caa-ae5d-7420f023544b` are consistent with every
recomputed identity and rerun total above.

## Findings

- **P0**: none.
- **P1**: none.
- **P2 (informational, non-blocking)**: the canonical aggregate gate status is
  `infrastructure_unavailable` — 12 live-lane tests (9 PostgreSQL, 2 real
  Gateway, 1 Temporal) plus `test.redis-live` and optional real providers had
  no service. This is an honestly labeled non-green status, not a Trial 3
  defect: the immutable request declares full CI pending, and the sheet
  assigns live/real evidence to D/0/02–03, I/0/04, and integration. It does
  block any green-aggregate or integration claim (see Limitations).
- **P2 (informational, non-blocking)**: the immutable request states the
  untracked `gateway/node_modules` symlink "still targets" the primary
  checkout; at review time it targets
  `workspace/clones/wt-wave2-main-candidate/gateway/node_modules`
  (re-pointed after the request commit; integrator-owned provisioning).
  Immaterial to the candidate: untracked, outside every commit pathset, and
  the target's `gateway/package-lock.json` is byte-identical to the candidate.
- **P2 (informational, non-blocking)**: the coder's pinned verification
  commands invoked the Trial 1/2 worktree's venv interpreter
  (`…/wt-h001-probes/cli/.venv/bin/python`) against this worktree's sources
  via `PYTHONPATH`. Declared tool identities match this worktree's fresh
  `.venv`, and every total was reproduced here, so the evidence stands.

## Infrastructure-unavailable adjudication

The 12 unavailable tests and the two service-less lanes are exactly the live
surfaces the H/0/01 task-lane contract excludes ("no tmux, MCP, live Redis,
network, or real provider") and whose authoritative evidence belongs to
D-owned ports and the integration/release gates. With zero failed tests in
every executed lane, the explicit `infrastructure_unavailable` status neither
indicts this narrow candidate nor converts into a passing aggregate gate. The
full gate on the combined tree with required services present remains an open
integrator obligation.

## Limitations

- Scope is the narrow Trial 3 correction only; no other provider,
  coordination, authority, Doctor DTO, schema, documentation, Gateway,
  portability, or integration behavior is adjudicated here.
- Behavioral evidence is Python 3.11.15 only; no Python 3.13 matrix is
  claimed.
- No live provider, network, Redis, MCP, Gateway process, shared service, or
  agent process was contacted; no lock-graph materialization, portability, or
  native-runtime claim is made.
- `reviewed_OK` is a review state only: no integration, promotion,
  publication, tagging, release, or full-sheet H/0/01 completion is implied.
  H/0/01 remains `in_progress` (DOCTOR Trial 11 route, probes portability,
  and the sheet exit gate remain open).
