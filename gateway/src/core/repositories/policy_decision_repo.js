import { getDb } from "../state.js";

export function insertDecision(row) {
  getDb()
    .prepare(
      `INSERT INTO policy_decisions
       (decision_id, trace_id, context, decision, reason_code, decided_at)
       VALUES (@decisionId, @traceId, @context, @decision, @reasonCode, @decidedAt)`,
    )
    .run(row);
  return row;
}

export function getDecisionById(decisionId) {
  return getDb().prepare("SELECT * FROM policy_decisions WHERE decision_id = ?").get(decisionId) || null;
}

export function listDecisionsByTrace(traceId) {
  return getDb().prepare("SELECT * FROM policy_decisions WHERE trace_id = ? ORDER BY decided_at, decision_id").all(traceId);
}
