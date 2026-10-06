# Current model defaults — independent review request, trial 1

## Candidate and authority

- Base: `2c7810125bd936ca189784f98f1f436cd9181eb7`.
- Candidate tree: `d3548ed7d6900dc5fc97a284576e624ab6a9c1b9`.
- Exact isolated candidate: `/tmp/ao-defaults-candidate-hg2jmag4`.
- Trace: `tr-ao-defaults-1006-7f6a8745-ffec-4a73-92b9-2a5419862978`.
- Reviewer: independent session `/root/review_default_models`, under the
  operator-authorized session-agent fallback. Not a cross-vendor or
  Gateway-spawned review.
- Owner selected Sol 6.1/max and Opus 5.5/max; authorized policy edits and
  publication. Codex priority tier and legacy aliases remain unchanged.

## Scope and TDD

See [checkpoint](MODEL_DEFAULTS_2026_10_06_checkpoint.md) for acceptance
criteria, changed surfaces, initial RED and focused GREEN, first full-gate
failure, independent alias correction, and the narrow documentation-validator
repair. The valid policy action remains distinct from a callable MCP tool;
negative tagged-call validation is retained.

## Final verification

`bash scripts/ci.sh` ran solo against the exact isolated candidate with
Node 22.22.1, Python 3.11.15, tmux 3.6a-agents.1 and disposable Redis 7.2.
Exit 0: **2,626 passed, 0 failed, 12 skipped; 2,638 total**, `errors: []`.
Aggregate `infrastructure_unavailable` reflects the declared unavailable lanes.

- Structure 447; Gateway 1,621 passes / 9 PostgreSQL skips; E2E 25;
  CLI 424; LangGraph 81 passes / 3 Gateway/Temporal skips; live Redis 22.
- Lock freshness, release verifier, both linters, MCP smoke and policy
  validation passed. `git diff --cached --check` passed.
- Optional real providers did not execute. No Darwin, Node 24, live
  PostgreSQL/Temporal/provider availability or release claim is made.
- Focused checks: 95 runtime, 27 structure, 134 selection-authority and
  10 projection tests passed with no skips.
- Full local log SHA-256: `38b2594dd86cf32562e0ee965bf904333e164689db0e52197ad779d671319098`.
- Committed final gate JSON SHA-256: `0d73847dd34182d6aba42cef004430f1b9d935c82fb4af7c4d053aa6be85be49`.

## Requested verdict

Confirm omitted selections, model-specific effort, tier, active docs/examples,
legacy aliases, unchanged permissions, and the gate-repair boundary. Write a
fresh immutable OK or KO verdict. No implementation changes after this tree
are intended; final additions are handoff, result JSON, independent verdict,
and review-index evidence only. Publication remains pending.
