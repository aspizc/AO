# README lifecycle guide — independent review, trial 1

## Verdict and candidate

**reviewed_OK** for candidate tree
`67522922a6f5a74a3beb0a093145088c2073dc36`, based on
`1dac6b58c86750431957a33f5ebb217f73e3974b` on `release/1.1.0`.

Trace: `tr-ao-readme-life-1007-98cf904f-3ead-4816-952b-d275117ca0aa`.
Reviewer: Codex `/root/review_readme_lifecycle`, separately assigned from the
implementer under the operator-authorized session-agent fallback. The reviewer
made no candidate changes and authored only this verdict. No Claude execution,
cross-vendor review or Gateway-spawned review is claimed.

No blocking findings remain in the two-file documentation candidate. Only
the handoff, this verdict and review-index evidence may be added after
acceptance; changes to the reviewed documentation require another review.

## Independent checks

- Verified that the candidate differs from the base only in `README.md` and
  `docs/project-status.md`. Their current blob hashes match the frozen tree:
  `fc687e82b0e05e4c2b874a24e2dfb6630416e679` and
  `4487b25f842c091c4829f7eadfd51421b6b9fc69`, respectively.
- Read the complete lifecycle guidance and checked it against the generic
  skills inventory, ideation/planning/build/audit sources, AO's orchestration
  profile, operator guide, runtime/CI contracts and V6 generic requirements.
  The guide covers versioned drafts, epics/stories/tasks, dependency waves,
  initial environment and test preparation, implementation and audit follow-up.
  KYA supplies reusable practices; project paths, stack and commands remain
  configurable examples.
- Confirmed that AO installation is distinguished from target-project setup.
  Browser and infrastructure tools are selected by project need. The dependency
  example explains prerequisites and shared-contract ownership before parallel
  API/UI work, then integration before dependent browser checks.
- Confirmed the current/manual versus planned boundary: persistent host
  connections and supervised sessions are operational mechanisms; an automatic
  wave launcher is explicitly planned. Gateway lifetime is distinguished from
  task/trace/session authority, independent review and resource ownership.
  Legacy connection limitations remain visible.
- Checked the Playwright commands against its [official CI guide](https://playwright.dev/docs/ci).
  Checked backend-free Terraform initialization/validation and resource-bearing
  tests against the [validation reference](https://developer.hashicorp.com/terraform/cli/commands/validate)
  and [test reference](https://developer.hashicorp.com/terraform/cli/commands/test).
  The examples are correct within their stated project prerequisites and do
  not imply that static validation proves an infrastructure deployment.
- Independently ran `node --test tests/gateway/tool_projection_contract.test.js`:
  **10 passed, 0 failed, 0 skipped**, exit 0. A transient Markdown check resolved
  all **85 local links and heading targets**. `git diff --check` passed.
- Independently queried public remote refs: `main` and peeled tag `1.0.0` both
  resolve to `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`; the annotated tag object
  is `0d43cf7bf13acc9b28a5d4e9fcb14cc83ea5b5ac`. Inspected that tag's candidate,
  reviewed tree and gate annotations, plus the committed MODEL_DEFAULTS handoff,
  verdict and gate JSON. They support the recorded **2,626 passed, 0 failed,
  12 skipped; 2,638 total** and tested tree
  `d3548ed7d6900dc5fc97a284576e624ab6a9c1b9`.

## Verification and integration boundary

The runtime counts are historical evidence for the published 1.0.0 candidate,
not a new runtime gate of this documentation tree. The aggregate remains
`infrastructure_unavailable`: nine PostgreSQL and three Gateway/Temporal
checks were skipped; optional live providers did not run. This review does not
establish live provider, Darwin, Node 24 or missing integration coverage.

No browser installation, provider call, infrastructure creation, policy change
or full runtime gate was performed for this documentation review. Review
acceptance does not establish integration, promotion, publication or a 1.1.0
release. Scoped commit and review-index integration remain the integrator's
responsibility.
