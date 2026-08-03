# Independent Review — Project V5 B/0/00 (Trial 1)

Verdict: **KO**

## Blocking findings

1. **MCP does not report the effective configured lease maximum for all
   excessive values and therefore diverges from the direct surface.**

   The service validates against `config.coordinationLeaseMaxMs`
   (`gateway/src/services/coordination_service.js:256-262`), but the MCP Zod
   schema rejects values above the protocol ceiling first
   (`gateway/src/tools/coordination.js:21-25`) and its validation mapper
   hard-codes `MAX_COORDINATION_LEASE_TTL_MS`
   (`gateway/src/tools/coordination.js:79-90`). With an effective maximum of
   `300000` and `leaseTtlMs: 3600001`, the same registration returns:

   ```json
   {
     "direct": {
       "error": "COORDINATION_INVALID_INPUT",
       "message": "leaseTtlMs exceeds maximum 300000"
     },
     "mcp": {
       "error": "COORDINATION_INVALID_INPUT",
       "message": "leaseTtlMs exceeds maximum 3600000"
     }
   }
   ```

   This contradicts B/0/00's configured-maximum and parity criteria
   (`plan/PROJECT_V5/B/0/00.md:43-50`) and the ADR's exact-effective-limit
   contract (`docs/adr/ADR-V5-01-redis-coordination-plane.md:83-90`,
   `docs/adr/ADR-V5-01-redis-coordination-plane.md:145-149`). The existing
   parity test covers `300001` with a `300000` maximum
   (`tests/gateway/coordination_surface_parity.test.js:320-347`) while the
   protocol-ceiling test uses no lower effective maximum
   (`tests/gateway/tool_coordination.test.js:140-169`), so neither detects the
   combined case.

2. **The candidate changes the public `artifact.list` contract and its audit
   behavior without any owning B sheet or review-request traceability.**

   `requesterAgent` and `requesterRole` become required public inputs
   (`gateway/src/tools/artifact.js:23-27`), and the handler adds policy
   evaluation plus `POLICY_DECIDED` audit publication
   (`gateway/src/tools/artifact.js:118-140`). That requires downstream smoke
   changes (`scripts/smoke_mvp2.mjs:259-263`,
   `scripts/smoke_planning.mjs:214-218`). Neither B/0/00's scope, TDD, or
   acceptance criteria (`plan/PROJECT_V5/B/0/00.md:17-50`) nor its submission
   outcome/review request
   (`plan/PROJECT_V5/reviews/B_0_0-1_to_review.md:3-15`,
   `plan/PROJECT_V5/reviews/B_0_0-1_to_review.md:42-48`) mentions this breaking
   adjacent-tool change; no active B–I sheet contains `artifact.list`,
   `requesterAgent`, or `requesterRole`.

   The new handler uses `auditAppend`, whose configured default stream is
   `agents:events` and whose `append` path publishes best effort
   (`gateway/src/core/audit.js:44-59`, `gateway/src/core/audit.js:88-91`).
   Consequently, this unowned change also adds an `artifact.list` policy event
   to the legacy audit stream when Redis audit publishing is configured, while
   the sheet and submission declare no `agents:events` semantic change
   (`plan/PROJECT_V5/B/0/00.md:26-29`,
   `plan/PROJECT_V5/reviews/B_0_0-1_to_review.md:25-27`). The plan and review
   request must explicitly own and reconcile the schema, policy, audit, client
   migration, and exclusion impact before this range can be approved.
