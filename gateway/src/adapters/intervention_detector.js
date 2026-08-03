import { append as auditAppend } from "../core/audit.js";

const expected = new Map();
const GRACE_MS = 3_600;
const MIN_DIFF_CHARS = 200;

function currentTime(options = {}) {
  return options.now ?? Date.now();
}

export function recordExpectedAsk(sessionId, snapshotBefore, options = {}) {
  expected.set(sessionId, {
    lastSnapshot: String(snapshotBefore ?? ""),
    lastAskAt: currentTime(options),
  });
}

export function checkForIntervention({ sessionId, currentSnapshot, traceId, now = Date.now() }) {
  const previous = expected.get(sessionId);
  if (!previous) return false;

  if (now - previous.lastAskAt < GRACE_MS) return false;

  const current = String(currentSnapshot ?? "");
  if (previous.lastSnapshot === current) return false;
  if (Math.abs(current.length - previous.lastSnapshot.length) < MIN_DIFF_CHARS) return false;

  auditAppend({
    type: "HUMAN_TMUX_INTERVENTION",
    traceId,
    sessionId,
    note: "best-effort detection; pane changed without recent agent.ask",
  });
  expected.set(sessionId, { lastSnapshot: current, lastAskAt: now });
  return true;
}

export function _resetForTests() {
  expected.clear();
}
