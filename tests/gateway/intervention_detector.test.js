import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configureAudit, query, _resetForTests as resetAudit } from "../../gateway/src/core/audit.js";
import {
  _resetForTests as resetDetector,
  checkForIntervention,
  recordExpectedAsk,
} from "../../gateway/src/adapters/intervention_detector.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function fresh() {
  resetAudit();
  resetDetector();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "intervention-detector-"));
  configureAudit({ auditLog: path.join(workspace, "audit.jsonl") });
}

test("does not flag immediately after known agent ask", async () => {
  fresh();
  recordExpectedAsk("session-1", "before", { now: 1_000 });

  const flagged = checkForIntervention({
    sessionId: "session-1",
    currentSnapshot: "after".repeat(100),
    traceId: "tr-int",
    now: 1_100,
  });
  const events = await query({ traceId: "tr-int" });

  assert.equal(flagged, false);
  assert.equal(events.length, 0);
});

test("detects unexpected pane change and writes audit", async () => {
  fresh();
  recordExpectedAsk("session-1", "before", { now: 1_000 });

  const flagged = checkForIntervention({
    sessionId: "session-1",
    currentSnapshot: "after".repeat(100),
    traceId: "tr-int",
    now: 10_000,
  });
  const events = await query({ traceId: "tr-int", type: "HUMAN_TMUX_INTERVENTION" });

  assert.equal(flagged, true);
  assert.equal(events.length, 1);
  assert.equal(events[0].sessionId, "session-1");
  assert.match(events[0].note, /best-effort/);
});

test("does not flag small snapshot changes", async () => {
  fresh();
  recordExpectedAsk("session-1", "before", { now: 1_000 });

  const flagged = checkForIntervention({
    sessionId: "session-1",
    currentSnapshot: "before plus small change",
    traceId: "tr-int",
    now: 10_000,
  });
  const events = await query({ traceId: "tr-int" });

  assert.equal(flagged, false);
  assert.equal(events.length, 0);
});

test("documents tmux intervention as best effort", () => {
  const architecture = fs.readFileSync(path.join(REPO_ROOT, "docs", "architecture.md"), "utf-8");

  assert.match(architecture, /Tmux intervention is best-effort/);
  assert.match(architecture, /session\.intervention_note/);
});
