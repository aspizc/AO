# Review Submission - Task A/0/6 (Trial 1)

## What was done
- Added `docs/threat-model.md` with 11 threat categories, TM-01 through TM-11.
- Each threat includes description, attacker capability, primary control, defense in depth, and `Tested by:` references to planned or existing tasks/tests.
- Added cross-link from `docs/architecture.md` to the threat model and noted that every threat has a `Tested by:` reference.
- Added README documentation link to `docs/threat-model.md`.
- Added `tests/structure/test_threat_model.py` covering document existence, TM-01..TM-11 coverage, `Tested by:` for every section, and the living document section.
- Updated `CHANGELOG.md` with the A/0/6 entry.

## Why
- Stage B depends on a concrete threat model so registry, policy, sanitizer, approval, and bypass-regression work can map to explicit abuse cases.
- The document turns V4 risk prose into testable controls and future bypass regression identifiers.

## Decisions Taken
- Kept all content ASCII-only and used `TM-XX - name` headings for compatibility with repository conventions.
- Used future task/test references where the implementation does not exist yet, because the task explicitly allows planned `Tested by:` identifiers.
- Kept the scope technical and security-focused, excluding project delivery risks.
- Did not add extra threat categories beyond TM-01..TM-11 in this trial to keep Stage A focused on the required baseline.

## Verification
- Initial Red: `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure -k threat_model` failed with 4 failures because `docs/threat-model.md` did not exist.
- `PATH="$PWD/.venv/bin:$PATH" pytest tests/structure -k threat_model` - passed, 4 tests.
- `PATH="$PWD/.venv/bin:$PATH" ./scripts/ci.sh` - passed with `==> All checks passed.`
- `grep -E "^### TM-" docs/threat-model.md | wc -l` - reported `11`.
- `rg -n "Tested by:|Living document|Threat Model|threat-model.md" docs/threat-model.md docs/architecture.md README.md` - confirmed threat references and cross-links.
- `rg -n "—|→|≤|[áéíóúÁÉÍÓÚñÑ]" docs/threat-model.md docs/architecture.md README.md tests/structure/test_threat_model.py` - no matches.

## Commit
- `f887257` - `docs(security): add threat model with 11 abuse cases (A/0/6)`
