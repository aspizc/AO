# Review Submission — Project V5 B/0/05 (Trial 1)

## Outcome

`artifact.list` now requires the same transitional requester fields as
`artifact.get`, evaluates the dedicated list policy before returning metadata,
and records `POLICY_DECIDED` through local JSONL only. Unknown principals are
denied, first-party smoke callers use the new shape, and a publisher spy proves
that the correction adds nothing to `agents:events`.

The fields remain legacy caller assertions. Server-owned `RequestContext` is a
separate security prerequisite in D/0/00.

## Review range and exclusions

- Original implementation: `d521afb..7913479`.
- Traceability/audit-route correction: first implementation commit after
  `3b9fa93`.

Review the final `d521afb..HEAD` result. No `.mcp.json`, `audit/`, `policies/`,
production `message.*`, artifact-store, sanitization, or shared-service change
is in scope. `agents:events` must receive zero new list decision records.

## Required evidence

- Trial-2 focused matrix: 36/36; V5 structure focus: 13/13.
- Repository gate: 124/124 structure; 669 Gateway (654 passed, 15 declared
  opt-in skips); 25 E2E (24 passed, one real-agent opt-in skip); 29/29 CLI;
  84 LangGraph (81 passed, three integration skips); smoke, policy, and lint
  green.
- Missing requester, unknown-principal deny, allowed list, JSONL decision, and
  publisher-spy tests.
- First-party smoke and public documentation migration.
- Existing artifact get/share, registry, E2E, full CI, diff, and
  credential-signature gates.

## Review request

Independently verify schema, policy-before-data, local-only audit routing,
client migration, transitional trust wording, and exclusions. Publish
`B_0_5-1_reviewed_OK.md` or `B_0_5-1_reviewed_KO.md`; list only reproducible
blockers in a KO.
