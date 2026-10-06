# Review Submission - Project V5 H/0/01 PROBES (Trial 3)

## Requested reviewer and verdict

Please assign a fresh independent Claude Fable 5 reviewer at maximum reasoning
that did not implement this trial and has not inherited coder context. Review
the frozen Trial 3 candidate and write the lane-native verdict only to:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-3_result.md
```

The verdict must be exactly `reviewed_OK` or `reviewed_KO`, identify the exact
reviewed request and candidate commit/tree/pathset, and list every P0/P1/P2
finding. The result commit must change only that result file. Do not create or
edit a review index, plan/status file, prior review artifact, or unrelated
path.

This is an immutable review request, not a self-review or an OK claim. Trial 2
was independently `reviewed_KO` for the hostile provider-key escape described
below. Trial 3 closes only the three numbered corrections in that KO. Full CI
and independent adjudication are pending.

## Gateway and coder identity

```text
trace          tr-v5-h001-probes-t3-d85a20bd-c431-4d38-a5f3-3c3f68d16679
task           ts-e4db809f-ad19-463f-a0f5-a7f48f95f131
role           coder
agent/model    codex / gpt-5.6-sol
reasoning      max
service tier   priority
```

No internal sub-agent was spawned or delegated work. The separately assigned
reviewer is the only authority that may adjudicate this candidate.

## Narrow review boundary

Review only the Trial 3 correction to the provider execution-mode admission
boundary:

- an exact `dict` may contain a stored custom key whose hash collides with
  `"claude-code"` and whose equality raises an ordinary exception;
- both `create_provider_login_bindings` and the composed public
  `create_doctor_probe_bindings` must construct successfully for that input;
- both provider checks must return their static
  `CLAUDE_LOGIN_PROBE_ERROR` / `CODEX_LOGIN_PROBE_ERROR` observations without
  invoking the runner;
- an ordinary `Exception` from the exact-dict lookup/classification boundary
  must classify as `_ExecutionMode.INVALID`; and
- a `BaseException` from that same boundary must propagate as the exact same
  object with zero runner calls.

No other provider, coordination, authority, Doctor DTO, schema, documentation,
Gateway, portability, or integration behavior is changed or claimed.

## Frozen lineage and identities

The following identities were recomputed from the local repository:

```text
Trial 3 baseline commit  095ca221b9e24abf3d96604b331aaccde7ccea94
baseline tree            0d4d18e7a291701c18326e3e32868bf9279ca1be
baseline parent          24218eada09c0dbeab41c220b4021ff92efdb9ba
baseline subject         review(v5): record H_0_1 PROBES trial 2 result

Trial 3 RED commit       91dbdfe605f6410b3fe38cb9eb4b4a7927a07f02
RED tree                 5e63598fe16b2a237852ea0f58f8f4c1115ba715
RED parent               095ca221b9e24abf3d96604b331aaccde7ccea94
RED subject              test(doctor): expose hostile provider key escape (V5 H/0/01 PROBES Trial 3 RED)

Trial 3 GREEN commit     7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76
GREEN/candidate tree     d208b1fe7a6e6cf29b7bac302a705b95dc9cad67
GREEN parent             91dbdfe605f6410b3fe38cb9eb4b4a7927a07f02
GREEN subject            fix(doctor): fail closed on hostile provider keys (V5 H/0/01 PROBES Trial 3 GREEN)

branch                   fix/V5-H-0-01-probes-trial3
candidate range          095ca221b9e24abf3d96604b331aaccde7ccea94..7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76
```

The ancestry is linear and exact: baseline -> RED -> GREEN. The RED commit is
a direct child of the authenticated baseline, and GREEN is a direct child of
RED.

### Trial 3 request-envelope contract

This request must be committed directly on GREEN candidate
`7e1a606d7756dfae4ab3f7bf6ff996e80ae7cd76` with subject:

```text
docs(review): request H/0/01 PROBES Trial 3 review
```

Its commit delta must add exactly:

```text
plan/reviews/PROJECT_V5/H_0_1_PROBES-3_to_review.md
```

The containing request commit/tree/blob cannot be embedded in its own
content-addressed file without changing those identities. The reviewer must
therefore authenticate the committed envelope's request commit, tree, parent,
subject, single-path delta, and file blob, and record them in the result.

## Exact Trial 3 pathsets

The RED commit changes exactly one path:

```text
M tests/cli/test_doctor_provider_probes.py  +78 / -0
```

The GREEN commit changes exactly one path:

```text
M cli/src/agents_cli/doctor_probes.py  +12 / -9
```

The complete baseline-to-GREEN range changes exactly two paths:

```text
M cli/src/agents_cli/doctor_probes.py            +12 / -9
M tests/cli/test_doctor_provider_probes.py       +78 / -0
TOTAL: 2 files changed, 90 insertions(+), 9 deletions(-)
```

No policy, prior review artifact, review index, plan/status file, schema,
documentation, dependency, lock, or unrelated code path is in the range.

## TDD RED chronology

The test change was committed before production changed. It adds an exact
`dict` containing a `CollidingProviderKey` whose hash is exactly
`hash("claude-code")` and whose equality raises the supplied sentinel. Both
the provider factory and composed factory are exercised. Separate cases use
an ordinary `RuntimeError` sentinel and a `KeyboardInterrupt` object.

Before the production edit, this exact source-pinned command ran once:

```text
PYTHONDONTWRITEBYTECODE=1 \
PYTHONPATH=/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes-t3/cli/src \
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes/cli/.venv/bin/python \
  -m pytest \
  tests/cli/test_doctor_provider_probes.py::test_hostile_provider_key_lookup_fails_closed_without_commands \
  tests/cli/test_doctor_provider_probes.py::test_hostile_provider_key_lookup_base_exception_propagates_unchanged \
  -q -p no:cacheprovider
```

Result: `2 failed, 2 passed in 0.16s`; `0 skipped`; exit `1`.

The two intended failures were:

```text
test_hostile_provider_key_lookup_fails_closed_without_commands[provider]
test_hostile_provider_key_lookup_fails_closed_without_commands[composed]
```

In both, the exact `RuntimeError("HOSTILE_PROVIDER_KEY")` escaped from
`dict.get(providers, provider.value)` during factory construction. That is the
Trial 2 KO mechanism and therefore the intended RED. The two
`BaseException` cases already passed, proving the existing boundary propagated
the exact `KeyboardInterrupt` object and made zero runner calls.

## Minimum GREEN correction

Only `_execution_mode` changed. After the existing exact-type `dict` guard,
its current lookup/classification statements are wrapped in `try` /
`except Exception`; an ordinary exception now returns
`_ExecutionMode.INVALID`. There is no new abstraction and no adjacent behavior
change. Because the handler catches only `Exception`, `BaseException` still
propagates unchanged.

## Focused verification

Tool identities:

```text
Python 3.11.15
pytest 9.1.1
Ruff 0.15.22
```

All commands below passed on their first invocation; there were no retries.

### Exact new tests GREEN

The exact RED command above was rerun after the production edit.

Result: `4 passed in 0.49s`; `0 failed`; `0 skipped`; exit `0`.

The passing matrix proves both public construction paths return the two static
provider probe-error observations, the runner call list remains empty, and
both `BaseException` cases propagate the exact same object with zero calls.

### Complete focused provider and composition files

```text
PYTHONDONTWRITEBYTECODE=1 \
PYTHONPATH=/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes-t3/cli/src \
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes/cli/.venv/bin/python \
  -m pytest \
  tests/cli/test_doctor_provider_probes.py \
  tests/cli/test_doctor_probe_composition.py \
  -q -p no:cacheprovider
```

Result: `29 passed in 5.25s`; `0 failed`; `0 skipped`; exit `0`.

### Ruff, in-memory compile, and Git integrity

The following three paths were checked together:

```text
cli/src/agents_cli/doctor_probes.py
tests/cli/test_doctor_provider_probes.py
tests/cli/test_doctor_probe_composition.py
```

```text
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes/cli/.venv/bin/python \
  -m ruff check <three paths>
```

Result: `All checks passed!`; `0` errors; exit `0`.

```text
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes/cli/.venv/bin/python \
  -m ruff format --check <three paths>
```

Result: `3 files already formatted`; exit `0`.

```text
PYTHONDONTWRITEBYTECODE=1 \
/home/carase/git/personal/agents-orchestrator/workspace/clones/wt-h001-probes/cli/.venv/bin/python \
  -c 'from pathlib import Path; path = Path("cli/src/agents_cli/doctor_probes.py"); compile(path.read_bytes(), str(path), "exec")'
```

Result: `1` production module compiled in memory; no bytecode written; exit
`0`.

```text
git diff --check
```

Result: no output; exit `0`.

Before each technical commit, the staged and unstaged pathsets were
authenticated. After GREEN, the tracked worktree and index were clean. The
only status entry was the accepted pre-existing untracked symlink:

```text
?? gateway/node_modules
```

It was never staged and still targets:

```text
/home/carase/git/personal/agents-orchestrator/gateway/node_modules
```

## Explicit limitations and pending work

- This trial corrects only the three numbered items in the Trial 2 KO.
- Full CI was not run and remains pending.
- Independent review/adjudication is pending; the coder wrote no verdict.
- Only the two focused Python test files were run; no broader Doctor, Gateway,
  schema, coordination, authority, portability, or release matrix is claimed.
- The behavioral tests ran on Python 3.11.15; no Python 3.13 behavioral matrix
  is claimed.
- No live provider, network, Redis, MCP, Gateway process, shared service, or
  agent process was contacted.
- No integration, promotion, publication, tagging, or release is claimed.
- The accepted untracked `gateway/node_modules` symlink is outside every
  commit pathset.

## Reviewer checklist

1. Authenticate the request envelope, baseline/RED/GREEN/request ancestry,
   every commit and tree identity, subjects, and exact pathsets.
2. Independently reproduce the colliding stored-key lookup for both public
   factories and confirm both static provider probe-error observations with
   zero runner calls.
3. Confirm the guard is limited to `_execution_mode`'s exact-dict
   lookup/classification and that ordinary `Exception` fails closed while the
   exact `BaseException` object propagates.
4. Re-run or inspect every focused command and its pass/fail/skip total,
   including the chronological RED evidence.
5. Enforce the narrow Trial 3 boundary and every explicit limitation.
6. Write only
   `plan/reviews/PROJECT_V5/H_0_1_PROBES-3_result.md`, use exactly
   `reviewed_OK` or `reviewed_KO`, list all P0/P1/P2 findings, and commit only
   that result path. Do not update an index or plan/status file.
