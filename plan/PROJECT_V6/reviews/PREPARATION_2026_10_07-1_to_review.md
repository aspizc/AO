# PROJECT_V6 preparation — independent review request, trial 1

## Scope and candidate

- Base: AO `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`, annotated `1.0.0`.
- Candidate tree: `2cc6ddb48953fa188b0ae6e47bfcb70f211fd075`.
- Branch: `release/1.1.0`, created at the base before this preparation.
- Source plan: sibling commit `5f72f8bce15b22a7f73292511c83b8ab7f3bdad1`.
- Scope: plan import, AO baseline correction, direct operator decisions,
  requested first-two-wave ordering, project registration and review evidence.
- All changes are Markdown under `plan/`; no runtime, policy, model-default,
  secret, machine-config or source-sibling changes are included.
- Trace: `tr-ao-v6-plan-1007-71406004-1493-45ad-aa81-b8f786be5d86`.
- Reviewer: independent Codex session `/root/review_v6_preparation`, using
  the previously authorized session-agent fallback for AO's Gateway spawn
  denial. This is not cross-vendor or Gateway-spawned review. Claude is not
  invoked, per the operator's temporary instruction.

## Acceptance for preparation

1. Seven sheets remain planned, indexed, with their inherited implementation
   tests/criteria intact. No implementation or release success is claimed.
2. The three supplied human decisions are recorded as operator instructions,
   with A/0/02's additional choices explicitly pending.
3. A/0/04 has no functional dependency on A/0/00; the requested wave order
   is consistent and shared files have isolated-worktree/serial-integration
   handling. Later source waves are provisional because the user table was
   truncated during wave 2.
4. Current AO lineage, file inventory and changed anchors are distinguished
   from source provenance. Coders must recheck anchors on each actual base.
5. The no-Claude constraint is explicit; fixture tests do not discharge
   live Claude acceptance checks. No global model change is requested.

## Verification performed

- `.venv/bin/python -m pytest -q tests/structure/test_project_layout.py`:
  **3 passed, 0 failed**.
- Preparation checker: 18 Markdown files and **73 local links** resolve;
  all seven sheets contain the required sections and remain `planned`.
- Logical DAG inspected: acyclic. Wave-1 config.js and wave-2 Gateway README
  overlaps are documented with serial integration and conflict review.
- Byte comparison: the 18 existing source files listed in BASELINE.md are
  identical between sibling `8234588` and AO `41f9ce2`; AO-specific changed
  anchors and cleanup inventory were corrected separately.
- `git diff --cached --check`: passed. Local tag `1.0.0` peels to the base.
- No implementation RED/GREEN, full runtime gate or live provider checks
  were run for this documentation-only preparation. They remain each
  implementation sheet's required evidence; prior release totals are not
  credited to this plan.

## Requested verdict

Review the preparation acceptance above and write a fresh immutable verdict.
This review does not declare all sheet designs production-ready or unlock
pending A/0/02 choices. After acceptance, only handoff/verdict/index evidence
may be added to the candidate before the requested plan-only commit.
