# Review Submission — Project V5 B/0/00 (Trial 2)

## Trial-1 correction

Trial 1 found that MCP's schema validation named the one-hour protocol ceiling
when the service had a lower configured maximum. The correction keeps the
public schema ceiling at 3600000 ms but lets the tool mapper read immutable,
non-enumerable service-limit metadata. Direct and MCP calls must now both name
the effective maximum even when an input exceeds both limits.

The regression combines a 300000 ms effective maximum with
`leaseTtlMs: 3600001`; the initial RED returned 300000 direct versus 3600000
through MCP.

## Review range

- Original implementation: `d521afb..7913479`.
- Preserved trial-1 KO: `3b9fa93`.
- Correction candidate: first implementation commit after `3b9fa93`.

Review the final `d521afb..HEAD` contract and focus the correction on
`3b9fa93..HEAD`. Verify the internal metadata does not add a ninth enumerable
direct operation or expose credentials.

## Required evidence

- Trial-2 focused matrix: 36/36; V5 structure focus: 13/13.
- Repository gate: 124/124 structure; 669 Gateway (654 passed, 15 declared
  opt-in skips); 25 E2E (24 passed, one real-agent opt-in skip); 29/29 CLI;
  84 LangGraph (81 passed, three integration skips); smoke, policy, and lint
  green.
- Disposable isolated Redis 7 matrix: 6/6 with a random host port, followed by
  container removal; shared port 6379 was not contacted.
- Combined effective/protocol maximum parity RED then GREEN.
- Existing 600000, 900000, 3600000, capabilities, schema, default, configured
  override, factory, and exact-eight-operation regressions.
- Full Gateway, structure, E2E, smoke, policy, CLI, LangGraph, lint, diff, and
  credential-signature gates.

## Review request

Publish `B_0_0-2_reviewed_OK.md` or `B_0_0-2_reviewed_KO.md`. Preserve trial 1
and list only reproducible blockers in a KO.
