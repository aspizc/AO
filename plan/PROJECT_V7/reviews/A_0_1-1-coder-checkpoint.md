# V7 A/0/01 — Coder checkpoint

Trace: `tr-v7-a01-f75e045d-8572-4862-a0ee-3ac0e575b7ca`.
Branch: `feat/V7-A-0-01-shared-capacity`; base: `f59b91e`.
Implementation evidence only; no independent verdict or integration claim.

## RED checkpoint

Read AGENTS, canonical profile/build skill, plan README, V7 README/stage A,
sheet A/0/01 and immutable plan Trial 1 KO / Trial 2 OK. Stage A owns the
stage README; no `A/0/README.md` exists. The root authorized built in Codex
execution after Gateway `task.assign` returned `REQUEST_CONTEXT_DENIED`.

Wrote all distinguishing tests before production code. Initial system
`python3` lacks pytest (exit 1, `A_0_1-1-tdd-red.log`); that invocation is an
environment failure, not TDD evidence. Repeated using the existing symlinked
`.venv/bin/python`: **60 errors**, exit 1, because the ledger/command modules
did not exist. Exact output: `A_0_1-1-tdd-red-tests.log`. Tests name every RED
case in the sheet, plus real spawn-process barriers, memory/headroom, crash
ownership, path/lock aliasing, post-replacement failure and closed record bounds.

Root owns main.py registration, gate inventory, CHANGELOG, review index,
independent review, commits and full gate. Coder writes only the ledger,
shared safe errors/schema, budget-init command and focused tests/evidence.

Remaining: scoped GREEN, safe path/schema failure checks, immutable handoff.

## Settled checkpoint

Focused new tests and existing CLI scaffold/output regressions: **78 passed,
0 failed, 0 skipped**, exit 0 (`A_0_1-1-green-final.txt`). Scoped Ruff passed.
`git diff --check` passed; all candidate implementation paths are new files.
No policy, shared registration, release, or existing production path changed.

Attributed intermediate failures: the first GREEN failed only the alias test's
inherited group-writable directory; explicit mode 0700 fixed that fixture.
The second GREEN demonstrated the JSON-schema trailing-newline boundary defect;
strict end matching fixed it. GREEN attempts 3 and 4 passed (60 and 67 tests).
An additional named RED test demonstrated restrictive umask prevented exact
0600 publication; exclusive lock creation and fchmod before publication fixed
it. The final run includes all 68 new cases and 10 CLI regressions.

Raw .log files are gitignored. Byte-identical exclusive-created `.txt` copies
are the durable review evidence; original logs remain available locally.
See the new immutable `A_0_1-1_to_review.md`. Root is about to advance the base
and add shared registration/inventory; those changes need root validation.
Production edits are settled for that freeze. Full gate and independent review
remain pending; no acceptance, integration or release is claimed.
