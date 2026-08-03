# Independent Review — Project V5 C/0/00 Suite/Lock Increment (Trial 1)

## Verdict

**KO** for commit
`24362a58a29623c136719b27580eafe2e7ec138a`.

## Reviewer

- Model: `gpt-5.6-sol`
- Reasoning effort: `ultra`
- Service profile: `priority/fast`
- Reviewed range:
  `63e572ea741b345fc8f478fa87b251ef071dedcf..24362a58a29623c136719b27580eafe2e7ec138a`
- Review submission:
  [`C_0_0-1_to_review.md`](C_0_0-1_to_review.md), preserved unchanged

This was a local correction review. No network, Redis, Postgres, Temporal,
provider, shared MCP, container, or other service was contacted.

## Reproducible blocking findings

1. **P0 — The gate has no time limit and does not own or terminate the child
   process tree when it receives a signal.**

   The manifest schema has no timeout field
   (`scripts/ci_gate.py:25-36`). The only child launch uses
   `subprocess.run` without `timeout`, `start_new_session`, or
   `process_group` (`scripts/ci_gate.py:440-449`); suites then execute
   sequentially and the JSON is printed only after they all return
   (`scripts/ci_gate.py:519-539,615-617`). The workflow also has no job
   `timeout-minutes` backstop (`.github/workflows/ci.yml:16-61`).

   A Python 3.11 inline probe monkeypatched `subprocess.run` only to record the
   keyword arguments passed by `_run_suite`:

   ```text
   subprocess_run_keywords=["capture_output","check","cwd","env","shell","text"]
   has_timeout=false
   starts_process_group=false
   ```

   A second local probe ran a required synthetic command which spawned a
   descendant, sent `SIGTERM` only to the gate PID, inspected both exact PIDs,
   and then killed the reviewer-owned process group:

   ```json
   {
     "gate_returncode": -15,
     "worker_alive_after_gate_SIGTERM": true,
     "descendant_alive_after_gate_SIGTERM": true
   }
   ```

   A hung suite can therefore block the gate indefinitely, and cancellation
   can leave both the direct runner and its descendants alive. The gate needs
   a finite, validated timeout, isolated process-tree ownership, deterministic
   TERM/KILL escalation and reaping, and SIGINT/SIGTERM coverage.

2. **P0 — The refreshed manifest can authorize removal of a required lane or
   arbitrary narrowing of a governed suite.**

   `requiredSuiteIds` is checked only against the classifications in the same
   mutable document (`scripts/ci_gate.py:121-126,283-291`). Inventory refresh
   derives a new digest from whatever include/exclude patterns are currently
   present and writes it when that self-consistency check succeeds
   (`scripts/ci_gate.py:542-568,586-613`). The hard-coded repository assertion
   is itself under `test.structure`, whose include pattern and minimum can be
   narrowed by that manifest.

   On temporary copies of `ci/suites.json`, the reviewer performed these two
   mutations and invoked the real refresh command:

   ```text
   remove test.cli from requiredSuiteIds and suites:
     python3 scripts/ci_gate.py --repo-root "$PWD" \
       --manifest <temporary-removed.json> --refresh-inventory
     exit=0, status=passed, required count changed 10 -> 9

   set test.structure.include to only
   tests/structure/test_ci_suite_manifest.py:
     python3 scripts/ci_gate.py --repo-root "$PWD" \
       --manifest <temporary-narrowed.json> --refresh-inventory
     exit=0, status=passed
   ```

   This contradicts the documented claim that removing a required lane fails
   before success (`docs/ci-contract.md:60-64`). The authoritative required
   suite/file-set baseline must not be co-editable with the values that
   `--refresh-inventory` blesses; intentional scope changes need a separate,
   fail-visible contract update.

3. **P0 — TAP accounting accepts duplicate summaries and repeated skip IDs.**

   `parse_node_tap` collapses every summary match into a dictionary, so the
   last occurrence silently overwrites earlier values
   (`scripts/ci_gate.py:295-311`). Skip reconciliation compares the count with
   list length but uses sets to detect unexpected IDs, so one allowlisted ID
   can be repeated any number of times (`scripts/ci_gate.py:361-375`).

   The inline parser/assessment probe returned:

   ```json
   {
     "duplicate_summary": {
       "counts": {"tests": 1, "passed": 1, "failed": 0, "skipped": 0},
       "errors": []
     },
     "repeated_skip_ids": {
       "errors": [],
       "infrastructureUnavailable": [
         {"id": "infra case", "service": "synthetic"},
         {"id": "infra case", "service": "synthetic"}
       ]
     }
   }
   ```

   The duplicate-summary input first declared `pass 0 / fail 1` and then
   `pass 1 / fail 0`; the failure disappeared. The second input declared two
   skips with the same single allowlisted ID. Exact accounting must reject
   duplicate summary fields and duplicate observed skip identities rather
   than applying last-value or set semantics.

4. **P0 — A required suite containing allowlisted unavailable cases is
   reported as `passed`.**

   Allowlisted skips populate `infrastructureUnavailable` without changing
   success (`scripts/ci_gate.py:367-376`). `_run_suite` exposes only `failed`
   or `passed` after execution (`scripts/ci_gate.py:491-498`), and the
   aggregate considers only `failed` (`scripts/ci_gate.py:519-539`).

   A real local Node TAP fixture with one required test, one allowlisted skip,
   and no passed test produced:

   ```json
   {
     "exit": 0,
     "report": {
       "status": "passed",
       "counts": {"tests": 1, "passed": 0, "failed": 0, "skipped": 1},
       "suites": [{
         "id": "test.required-infra",
         "classification": "required",
         "status": "passed",
         "infrastructureUnavailable": [
           {"id": "infra case", "service": "synthetic"}
         ]
       }]
     }
   }
   ```

   The real manifest permits nine Postgres skips in `test.gateway` and three
   Gateway/Temporal skips in `test.langgraph` (`ci/suites.json:91-155,225-256`).
   Calling those suites `passed` contradicts the sheet's requirement to
   distinguish unavailable infrastructure from pass
   (`plan/PROJECT_V5/C/0/00.md:52-57`) and the submission's claim that the
   unavailable lanes were not passed
   (`plan/PROJECT_V5/reviews/C_0_0-1_to_review.md:78-81`). Allowlisted
   unavailability may retain its intended exit policy, but it needs a distinct
   machine status at suite and aggregate level.

5. **P1 — Non-UTF-8 child output crashes the runner and violates the one-JSON
   output contract.**

   Child output is decoded implicitly by `text=True`
   (`scripts/ci_gate.py:440-449`). `_run_suite` catches only `OSError`
   (`scripts/ci_gate.py:450-460`), and the call to `run_gate` is outside the
   manifest-error `try` block (`scripts/ci_gate.py:586-617`).

   A required synthetic command that executed
   `sys.stdout.buffer.write(bytes([255]))` returned:

   ```json
   {
     "exit": 1,
     "stdout_bytes": [],
     "stderr_last_line": "UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte"
   }
   ```

   Thus ordinary child output can replace the promised report with a traceback
   and empty stdout, contrary to `docs/ci-contract.md:96-108` and
   `plan/PROJECT_V5/C/0/00.md:73-76`. Output decoding/execution failures must be
   contained and represented in the single JSON result.

## Independent verification

- `git show --stat --summary 24362a5` — inspected the exact implementation
  commit; the implementation blobs are unchanged at review HEAD.
- `python3 scripts/ci_gate.py --validate-only` — exit `0`, exactly one JSON
  report with status `passed`.
- Five isolated inline Python probes exercised process cleanup, manifest
  refresh, TAP/skip accounting, required-suite status, and non-UTF-8 output.
  Reviewer-owned descendants were terminated after inspection.
- `git diff --check 63e572e..24362a5` — passed.
- `git status --short` — clean before this verdict was authored.

The full suite was not repeated: the five isolated blockers are sufficient for
KO, and the review was explicitly constrained to local execution without
service access.

## Required correction for Trial 2

- Add bounded suite execution and deterministic whole-process-tree
  cancellation/reaping, with signal and timeout regressions.
- Anchor required suite/file scope outside the refreshable values and prove
  deletion/narrowing cannot self-validate.
- Reject duplicate TAP summaries and repeated observed skip IDs.
- Represent allowlisted infrastructure unavailability with a status distinct
  from `passed`, including the aggregate report.
- Guarantee the single JSON failure report for undecodable child output.

Preserve this KO. Submit the corrections as Trial 2 with RED/GREEN evidence for
each adversarial case.
