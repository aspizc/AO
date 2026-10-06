# Current model defaults checkpoint

## Scope and acceptance criteria

Base: `2c7810125bd936ca189784f98f1f436cd9181eb7`.
The owner explicitly selected Codex `gpt-6.1-sol` at `max` and Claude
`claude-opus-5-5` at `max`. Codex retains `priority` service tier.

- Canonical selection and all three capability registries must resolve those
  defaults when model and effort are omitted, including the model-specific
  Sol 6.1 default effort.
- Active execution examples, README, adapter guides, project status, and
  mirrored project orchestration skills must describe the same defaults.
- Legacy explicit models and alias targets remain available; roles,
  permissions, approvals, coordination settings and dependencies are unchanged.
- Required full gate and independent review precede commit and publication.
- Author and committer use `carlos.aspizc@gmail.com`.

## Authority and workflow

The operator's authorization for policy edits and publication applies.
Gateway trace: `tr-ao-defaults-1006-7f6a8745-ffec-4a73-92b9-2a5419862978`.
The previously recorded AO spawn `REQUEST_CONTEXT_DENIED` and authorized
session-agent fallback apply. Implementation is by the root session;
`/root/review_default_models` independently reviews. This is not a
Gateway-spawned or cross-vendor review.

## TDD RED

Before production changes, updated `policy_model.test.js` and
`tool_agent_model.test.js` assertions exercised omitted model selection and
explicit aliases. `node --test` on those files produced 23 passes, 5 expected
failures, 0 skips (28 total) against the old defaults. The current-defaults
structure assertions were also updated before the production JSON.

## TDD GREEN

- Focused runtime selection: 95 passed, 0 failed, 0 skipped across policy,
  tool propagation, canonical profile, both adapters, Codex supervised mode,
  all registry profiles, and persistent-connection E2E.
- A first focused run caught two stale escaped model regex expectations;
  they were corrected to assert the emitted Sol 6.1 command output.
- Focused structure selection: 27 passed, 0 failed, 0 skipped across current
  defaults, client profiles, prompts, and smoke/runbook examples.
- Full gate and independent verdict are pending at this checkpoint.

## Verification boundary

The existing KYA and legacy MVP2/planning smoke connection-lifecycle limits
remain documented. Changing their example model identifiers does not repair
that lifecycle or establish successful execution. No live provider, release,
PostgreSQL, Temporal, Darwin, or Node 24 validation is claimed here.

## Initial full gate and correction

Tree `6da8070b357038d46205d1072d376bec8fa7e4e8` completed the full gate
with exit 1: 2,622 passed, 3 failed, 12 declared skips (2,637 total).
Two failures came from an incorrectly changed explicit `gpt-5.6` alias
expectation in `orchestrator_profile_authority.test.js`. The independent
reviewer found it; its original 5.6 expectation is restored. The file is now
unchanged against the base and all 134 authority tests pass.

The third failure predates this model update: documentation reference scanning
mistook `task.assign`'s valid `artifact.put.review_notes` policy action for a
callable MCP tool. The token is now recognized as a non-tool reference, using
the existing exclusion set. The added regression first produced RED (8 pass,
2 fail) and then GREEN (10 pass, 0 fail); it also proves that a tagged call to
that fictional tool is still rejected. No policy permission or tool changed.
The initial full-gate JSON is retained alongside this checkpoint. A fresh full
gate on the corrected candidate is required before independent acceptance.
