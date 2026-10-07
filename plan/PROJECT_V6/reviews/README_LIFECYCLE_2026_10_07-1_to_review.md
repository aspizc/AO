# README lifecycle guide — independent review request, trial 1

- Base: `1dac6b58c86750431957a33f5ebb217f73e3974b`.
- Candidate tree: `67522922a6f5a74a3beb0a093145088c2073dc36`.
- Branch: `release/1.1.0`.
- Trace: `tr-ao-readme-life-1007-98cf904f-3ead-4816-952b-d275117ca0aa`.
- Independent reviewer: Codex `/root/review_readme_lifecycle`, using the
  previously authorized session-agent fallback. No Claude execution or
  cross-vendor/Gateway-spawned review is claimed.

## User request and acceptance

The README must explain recommended use of generic AO through ideation and
versioned drafts; planning epics, stories, tasks and parallel waves; initial
environment/tooling preparation including TDD, Playwright and Terraform;
implementation; and audit. Preserve reusable KYA methods while allowing
other project types and configurable conventions.

The candidate adds a phase table, concrete outcomes/checks, a dependency-wave
example, generic skill links and project-appropriate tooling commands.
It distinguishes AO installation from target-project setup, persistent host
operation from planned automatic wave launching, and task/review identity
from shared Gateway process lifetime. It corrects stale no-release claims
in README and the linked project-status page using the published 1.0.0 tag
and existing exact candidate gate evidence. It creates no new release or
runtime feature and changes no policy or provider default.

## Verification

- `node --test tests/gateway/tool_projection_contract.test.js`:
  **10 passed, 0 failed, 0 skipped**, exit 0.
- Local link check: **85 links resolve**, including README section anchors.
- `git diff --cached --check`: passed.
- `git ls-remote origin refs/heads/main refs/tags/1.0.0 refs/tags/1.0.0^{}`:
  main and peeled tag both `41f9ce28aa59673283a7c5494200e0ec7b56e2f6`;
  annotated tag object `0d43cf7bf13acc9b28a5d4e9fcb14cc83ea5b5ac`.
- Existing MODEL_DEFAULTS_2026_10_06 review and gate JSON support the recorded
  2,626 passes / 12 declared skips. These historical runtime counts are not
  presented as new checks of this documentation change.
- Tool guidance checked against official Playwright installation/CI docs and
  HashiCorp Terraform init/validate/plan/test references linked in the README.
- No browser installation, cloud-resource creation, live provider execution
  or full runtime gate was performed for this documentation-only change.
- Focused test log SHA-256:
  `fae7e70de53e5c8931eaa69cdd9dcac877b100bec4e047e32d46db5802e2ba36`.

Write an immutable independent OK or KO for the two-file documentation
candidate. Only request/verdict/index evidence may be added after acceptance
before committing with `carlos.aspizc@gmail.com`.
