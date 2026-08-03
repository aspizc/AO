# Review Submission - Task A/0/4 (Trial 1)

## What was done
- Added `docs/architecture.md` with the V4 implementation view: layers, forbidden imports, MCP call lifecycle, intentionally absent components, and mapping from `gemini-orchestrator`.
- Added `docs/adr/ADR-001-gateway-only.md` documenting Gateway as the only enforcement point.
- Added `docs/adr/ADR-002-no-orchestrator-component.md` documenting that orchestrator is a role, not a component or directory.
- Added `docs/adr/ADR-003-policy-before-spawn.md` documenting that policy must run before any adapter spawn/delegate call.
- Added `tests/structure/test_architecture_docs.py` to lock required docs and ADRs.
- Updated `CHANGELOG.md` with the A/0/4 entry.

## Why
- Later implementation tasks need concise, test-backed architecture contracts to prevent reinterpreting V4.
- The ADRs make the main safety boundaries explicit: Gateway enforcement, no standalone orchestrator, and policy before process spawn.

## Decisions Taken
- Used ASCII-only Markdown and `->` arrows to keep the docs consistent with repository editing constraints.
- Added a short explicit sentence naming `Gateway` in `architecture.md` so both the test and the document clearly identify the single runtime component.
- Wrote ADR dates as `2026-05-23`, matching the current project date.
- Did not add extra ADRs or long-form architecture content because the task requires a short document that fits on one screen.

## Verification
- Initial Red: `.venv/bin/pytest tests/structure -k architecture` failed with 4 failures because the architecture doc and ADRs did not exist.
- `.venv/bin/pytest tests/structure -k architecture` - passed, 4 tests.
- `.venv/bin/pytest tests/structure tests/cli` - passed, 16 tests.
- `wc -l docs/architecture.md docs/adr/ADR-001-gateway-only.md docs/adr/ADR-002-no-orchestrator-component.md docs/adr/ADR-003-policy-before-spawn.md` - architecture doc is 61 lines; ADRs are 24/24/25 lines.
- `find docs/adr -maxdepth 1 -type f | sort` - confirmed ADR-001, ADR-002, and ADR-003 exist.
- `rg -n "orchestrator/|policy_engine\\.evaluate|spawn|Status: accepted|Date: 2026-05-23|gemini-orchestrator" docs/architecture.md docs/adr` - confirmed required contract terms are present.

## Commit
- `fa45151` - `docs(arch): add architecture doc and ADRs 001-003 (A/0/4)`
