# Independent Review — Project V5 B/0/01 (Trial 1)

Verdict: **KO**

## Blocking findings

1. **The documented least-privilege Redis ACL omits the command required by
   `coordination.status`.**

   The adapter implements readiness by issuing `PING`
   (`gateway/src/core/coordination_queue.js:1634-1639`). The runbook says its
   list covers the commands currently issued by the adapter, but the list does
   not include `PING` (`docs/coordination-bus.md:821-828`); the structure-test
   command inventory omits it as well
   (`tests/structure/test_v5_coordination_docs.py:53-68`). A client that receives
   `NOPERM` for `PING` is mapped by the adapter to
   `COORDINATION_UNAVAILABLE`
   (`gateway/src/core/coordination_queue.js:2167-2171`). A fake-client
   reproduction using exactly that `NOPERM` response returns:

   ```json
   {
     "code": "COORDINATION_UNAVAILABLE",
     "message": "coordination requires a reachable Redis service"
   }
   ```

   Therefore an operator following the published service-ACL inventory can
   deploy a healthy Redis channel on which the new readiness operation can
   never report ready, blocking the documented `PING` health contract in
   B/0/01 (`plan/PROJECT_V5/B/0/01.md:19-25`,
   `plan/PROJECT_V5/B/0/01.md:44-49`).

2. **The candidate changes the public `artifact.list` contract and its audit
   behavior without any owning B sheet or review-request traceability.**

   `requesterAgent` and `requesterRole` become required public inputs
   (`gateway/src/tools/artifact.js:23-27`), and the handler adds policy
   evaluation plus `POLICY_DECIDED` audit publication
   (`gateway/src/tools/artifact.js:118-140`). That requires downstream smoke
   changes (`scripts/smoke_mvp2.mjs:259-263`,
   `scripts/smoke_planning.mjs:214-218`). Neither B/0/01's scope, TDD, or
   acceptance criteria (`plan/PROJECT_V5/B/0/01.md:17-49`) nor its submission
   outcome/review request
   (`plan/PROJECT_V5/reviews/B_0_1-1_to_review.md:3-13`,
   `plan/PROJECT_V5/reviews/B_0_1-1_to_review.md:42-48`) mentions this breaking
   adjacent-tool change; no active B–I sheet contains `artifact.list`,
   `requesterAgent`, or `requesterRole`.

   The new handler uses `auditAppend`, whose configured default stream is
   `agents:events` and whose `append` path publishes best effort
   (`gateway/src/core/audit.js:44-59`, `gateway/src/core/audit.js:88-91`).
   Consequently, this unowned change also adds an `artifact.list` policy event
   to the legacy audit stream when Redis audit publishing is configured, while
   the submission declares no `agents:events` semantic change
   (`plan/PROJECT_V5/reviews/B_0_1-1_to_review.md:23-26`). The plan and review
   request must explicitly own and reconcile the schema, policy, audit, client
   migration, and exclusion impact before this range can be approved.
