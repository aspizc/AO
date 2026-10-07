# V7 A/0/01 — Implementation Trial 1 request

Status: **implemented; independent review and full gate pending**.
This coder request is evidence, not a verdict or integration authority.

| Binding | Value |
|---|---|
| Sheet | `plan/PROJECT_V7/A/0/01.md` |
| Branch | `feat/V7-A-0-01-shared-capacity` |
| Coder base | `f59b91e865ee14c17508821d92dcbaf90384d866` |
| Coder trace | `tr-v7-a01-f75e045d-8572-4862-a0ee-3ac0e575b7ca` |
| Coder | Root-assigned built in Codex `/root/implement_v7_a01` |
| Date | 2026-10-07 |

Root owns final candidate tree binding after the approved base advance,
CLI registration, CI inventory, solo full gate, independent reviewer assignment,
indexing and commits. No coder-owned independent verdict is supplied. The
operator-authorized fallback follows the recorded Gateway `task.assign`
`REQUEST_CONTEXT_DENIED`; it does not change canonical provider defaults.

## Change and intent

Added the standard-library `wave_budget` API over one operator-selected private
local POSIX JSON ledger. Every ledger operation holds the stable sibling flock;
canonical lexical aliases use the same file and lock. Admission evaluates all
count dimensions, canonical provider slots and declared memory after immutable
host headroom in one transaction. Updates fsync a unique private temporary,
atomically replace, and fsync the parent before returning. Initial publication
uses an exclusive atomic hard link, removes the temporary, then syncs the parent;
an existing ledger is never replaced by initialization.

Possible/active effects retain the entire vector after owner crash or lock
release. The owning caller alone may retire a specific record, with explicit
known no-effect or confirmed-closure input after dispatch intent. Closed records
remain idempotent and count toward the 1024-record bound. Corrupt state, unknown
fields, unsafe paths, lock contention and durability failures produce safe
`wave-error/v1` projections. A post-replacement sync failure is reported as
unavailable while its observable record remains charged, never as rollback.

Added the budget-init command implementation and shared error JSON schema.
Success projects the exact closed budget DTO with no path or execution content.
No PID targets, TTL reclamation, process killing, RSS polling, OS memory
enforcement, policy mutation, provider launch or stronger V5 claim is added.
V7 remains separate from the V6 release track.

## Settled public interfaces and constraints

`orchestrator_langgraph.wave_budget` exports:
`initialize_budget(path, limits, *, lock_timeout_ms=1000)`,
`read_budget(path, *, lock_timeout_ms=1000)`,
`reserve_capacity(path, owner_run_id, units, *, task_id=None, attempt=None,
lock_timeout_ms=1000)`, `mark_possible_effect`, `record_effect(..., effects)`,
and `release_capacity(..., *, confirmation=None, lock_timeout_ms=1000)`.
The three update APIs take `(path, owner_run_id, reservation_id)` before their
additional arguments. `confirmation` is `None`, `"no_effect"` or `"closed"`;
missing confirmation after possible/active returns recovery required. It is
cooperative caller evidence, not authenticated authority. `used_capacity`
projects only held units, excluding retained closed records. TypedDict results
use the reviewed exact JSON field names; each operation reads fresh disk state.

`orchestrator_langgraph.wave_errors.WaveError(outcome_code, *, field=None,
resource=None, task_id=None, run_id=None, counters=None, exit_code=None)` exposes
`outcome_code`, `exit_code` and `to_dict()`. Explicit exits are 2–5; capacity
state/unsupported defaults to 3, exhaustion/busy/full to 4, recovery to 5,
other validation/config outcomes to 2. The schema rejects unknown fields and
noninteger/negative counters; error text contains only the outcome code.

Bounded local IDs are `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`; accounting IDs are
canonical UUID strings; nullable attempts are 1–15, matching the V7 trial cap.
Effects have only gatewayId/traceId/sessionId/checkId and bounded local values.
Provider IDs are reused directly from the existing canonical orchestrator
profile schema, cached after the first read; there is no second provider
registry or policy lookup. Missing canonical schema fails unavailable.

Immediate runtime parents must be private (0700-equivalent access), owned by
the current UID; ancestors must be owned by root/current UID without group or
world write, with a root-owned sticky ancestor permitted for system `/tmp`.
Budget and lock targets must be regular, single-link, current-owner 0600 files.
Symlink ancestors and target aliases, hard links and special files are rejected.
Local filesystem support is the operator's declared deployment prerequisite;
primitive availability and actual operations are checked, without pretending
to reliably identify every remote mount. No hostile same-UID security guarantee
is claimed. Root confirmed these bounded choices before implementation.

## TDD RED evidence

Tests were written before both implementation modules existed. The system
`python3` invocation failed because pytest was absent; that is an environment
failure, not RED (`A_0_1-1-tdd-red.txt`). Repeated with the existing symlinked
venv: **60 missing-module errors**, exit 1 (`A_0_1-1-tdd-red-tests.txt`).
Named required distinguishing tests:

- `test_two_processes_cannot_oversubscribe_any_dimension`
- `test_failed_vector_reservation_has_no_partial_charge`
- `test_crashed_owner_possible_effect_keeps_capacity`
- `test_lock_release_does_not_release_surviving_session_capacity`
- `test_corrupt_ledger_never_initializes_empty_capacity`
- `test_release_cannot_target_another_runs_reservation`
- `test_atomic_write_failure_preserves_previous_complete_state`
- `test_budget_init_cannot_raise_existing_limits`
- `test_two_processes_respect_memory_ceiling_minus_headroom`
- `test_memory_exhaustion_rejects_the_entire_count_and_memory_vector`
- `test_memory_headroom_and_missing_declarations_cannot_be_bypassed`
- `test_crashed_possible_effect_keeps_its_declared_memory_charge`

Additional RED: `test_shared_wave_error_envelope_has_closed_safe_shapes` exposed
JSON-schema acceptance of a trailing newline in a resource identifier
(`A_0_1-1-green-attempt-2.txt`, 1 failed/59 passed). Strict end matching fixed it.
`test_created_budget_and_stable_lock_are_0600_under_restrictive_umask` first
failed on exact file mode (`A_0_1-1-tdd-red-umask.txt`, 1 failed/60 deselected),
then exclusive creation/fchmod made the intent pass.

The first GREEN attempt's sole failure was the alias fixture inheriting
group-writable 0775 (`A_0_1-1-green-attempt-1.txt`); explicit 0700 corrected its
setup without weakening path rejection. Attempts 3/4 passed 60/67 cases.

## GREEN verification

```bash
PYTHONPATH=cli/src:orchestrator-langgraph/src .venv/bin/python -m pytest -q orchestrator-langgraph/tests/test_wave_budget.py tests/cli/test_wave_budget_command.py tests/cli/test_cli_scaffold.py tests/cli/test_cli_output.py
```

**78 passed, 0 failed, 0 skipped**, exit 0 in 2.12 seconds.
Raw output: `A_0_1-1-green-final.txt`. This comprises 68 new cases plus 10
existing CLI scaffold/output cases. The child-process races use spawn-context
barriers and observe admissions, not threads. Crash tests observe an actual
owner exit (23); the lock-release test also observes a live, explicitly owned
child until its event-directed exit (0), with no PID signaling. Those are local
synthetic effects, not live Gateway/provider execution or containment proof.
Fault injection observes written bytes and file-sync → replace → parent-sync
ordering, old-state preservation before replace, and held state after replace.

Scoped Ruff on both modules, command and new tests: **PASS**, exit 0.
`git diff --check`: **PASS**, exit 0. No full gate was run by the coder; root's
solo full gate is required before acceptance. No provider, release, tag, commit
or push occurred. No required lane is counted as deferred/pass.

The raw `.log` outputs are gitignored; exclusive-created `.txt` copies preserve
their exact bytes and are the review artifacts. The coder checkpoint records
the intermediate results and final freeze.

## Root registration and candidate paths

Register the existing group in `cli/src/agents_cli/main.py`:

```python
from .wave_budget_command import wave_app
app.add_typer(wave_app, name="wave")
```

If root centralizes the wave group with A/0/00, this module also exports
`budget_init`; register that function as `budget-init` on the chosen group.
Focused command tests exercise the actual group under an isolated root Typer
app; main.py registration is deliberately unmodified and pending root tests.

Candidate implementation paths:

- `orchestrator-langgraph/src/orchestrator_langgraph/wave_budget.py`
- `orchestrator-langgraph/src/orchestrator_langgraph/wave_errors.py`
- `orchestrator-langgraph/tests/test_wave_budget.py`
- `cli/src/agents_cli/wave_budget_command.py`
- `tests/cli/test_wave_budget_command.py`
- `schemas/wave-error-v1.schema.json`
- This immutable request, coder checkpoint and named `.txt` evidence files.

Independent reviewer should validate the final root-bound candidate, rerun the
focused suite and inspect root's full gate, including path alias/lock stability,
post-replace uncertainty, complete vector accounting, retained memory,
owner matching/idempotent retries, closed record cap and safe DTOs. Preserve
this request; corrections belong to a new trial. No independent verdict has
been issued and no implementation acceptance is implied by this handoff.
