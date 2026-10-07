# A_0_2 Trial 1 — Post-migration fixture checkpoint

Status: corrective implementation prepared; no independent verdict or
integration claim. This is a new immutable supplement to
[the original handoff](A_0_2-1_to_review.md), which remains unchanged.

Base for this bounded continuation:
`3f7d78a461c09582038fa3611d445966b192aeac` on
`feat/V6-A-0-02-public-setup`. That operator-owned commit removed personal
registrations from the shipped base and profile registries and preserved
them in a local overlay outside the checkout. The original handoff's pending
operator migration and red public-registry scan describe its earlier state.

## Observed RED

The parent gate log `/tmp/ao-v6-a02-gate.log` reported seven failures using
removed repository IDs: six in codex_enable_profile.test.js and one in
policy_classification.test.js. Inspection showed `repo.unknown` preventing
the intended model/tier and planner-classification assertions from running.

Before this correction, ran:

```bash
node --test tests/gateway/codex_enable_profile.test.js tests/gateway/policy_classification.test.js
```

Actual result: 28 tests, 21 passed, 7 failed, 0 skipped. Retained raw output:
`workspace/a02-evidence/registry-migration-red.log`.

## Minimal correction and preserved intent

Changed only the seven affected fixture dependencies in those two files to
the already-shipped `developer-tools` repository. The policy engine checks
classification and allowedAgents for these operations; tags and the former
personal ID do not define the behavior under test. `developer-tools` permits
Codex and is internal in both the base and optional KYA profile. Added an
explicit internal-classification assertion to each affected test, so a future
fixture reclassification cannot silently weaken that premise.

The six profile tests still load the KYA agent/role profile and keep their
existing assertions for default/explicit priority, undeclared-tier rejection,
sol/max defaults, model aliases, and ultra allowed on sol/terra but denied on
luna. The planner test still verifies Codex planner delegation on an internal
repository; renamed it to `codex_planner_is_allowed_on_internal_repo` to match
the generic fixture. No policy entries or production behavior were changed.

## Observed GREEN

```bash
node --test tests/gateway/codex_enable_profile.test.js tests/gateway/policy_classification.test.js tests/gateway/registry_overlay.test.js
python3 scripts/check_public_hygiene.py --repo-root .
git diff --check
git diff --name-only -- policies
```

- Tests: 39 passed, 0 failed, 0 skipped; raw output in
  `workspace/a02-evidence/registry-migration-green.log`.
- Scanner: exit 0, 0 findings.
- Diff whitespace check: passed.
- Policy diff: no changed paths relative to this continuation's operator base.

No commits, manifest/index edits, new review verdicts or full-gate run occurred
in this continuation. The parent owns manifest inventory refresh, the next
solo full gate, candidate finalization and independent review. The earlier
full-gate failure remains attributed; focused GREEN does not replace it.
