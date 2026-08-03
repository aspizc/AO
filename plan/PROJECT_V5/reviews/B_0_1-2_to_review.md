# Review Submission — Project V5 B/0/01 (Trial 2)

## Trial-1 correction

Trial 1 found that `coordination.status` issues Redis `PING` while the runbook's
least-privilege ACL inventory omitted that command. The correction adds
`PING` to the inventory and makes the structural command set fail if it drifts
again.

The initial RED failed specifically because `` `PING` `` was absent from the
ACL section.

## Review range

- Original implementation: `d521afb..7913479`.
- Preserved trial-1 KO: `3b9fa93`.
- Correction candidate: first implementation commit after `3b9fa93`.

Review the final `d521afb..HEAD` contract and focus the correction on
`3b9fa93..HEAD`.

## Required evidence

- Trial-2 focused matrix: 36/36; V5 structure focus: 13/13.
- Repository gate: 124/124 structure; 669 Gateway (654 passed, 15 declared
  opt-in skips); 25 E2E (24 passed, one real-agent opt-in skip); 29/29 CLI;
  84 LangGraph (81 passed, three integration skips); smoke, policy, and lint
  green.
- Disposable isolated Redis 7 matrix: 6/6 with a random host port, followed by
  container removal; shared port 6379 was not contacted.
- ACL inventory RED then GREEN.
- Existing readiness, anomalous response, unavailable Redis, canonical scope,
  mismatch, no-side-effect, exact-eight-operation, and isolated live Redis
  regressions.
- Full Gateway, structure, E2E, smoke, policy, CLI, LangGraph, lint, diff, and
  credential-signature gates.

## Review request

Publish `B_0_1-2_reviewed_OK.md` or `B_0_1-2_reviewed_KO.md`. Preserve trial 1
and list only reproducible blockers in a KO.
