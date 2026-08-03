import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTmuxTarget } from "../../gateway/src/adapters/session_naming.js";

test("builds expected tmux target", () => {
  const target = buildTmuxTarget({
    traceId: "tr-abc123",
    agent: "gemini-cli",
    role: "restricted-coder",
  });

  assert.equal(target, "ag-tr-abc123-gemini-restricted-coder");
});

test("removes only the gemini cli suffix from agent display", () => {
  const claude = buildTmuxTarget({ traceId: "x", agent: "claude-code", role: "coder" });
  const gemini = buildTmuxTarget({ traceId: "x", agent: "gemini-cli", role: "coder" });

  assert.ok(claude.includes("-claude-code-"));
  assert.ok(gemini.includes("-gemini-coder"));
});

test("sanitizes invalid characters", () => {
  const target = buildTmuxTarget({
    traceId: "tr/../x; rm -rf /",
    agent: "g",
    role: "c",
  });

  assert.match(target, /^[a-z0-9-]+$/);
});

test("throws when required fields are missing", () => {
  assert.throws(() => buildTmuxTarget({ traceId: "", agent: "g", role: "c" }), TypeError);
  assert.throws(() => buildTmuxTarget({ traceId: "x", agent: "", role: "c" }), TypeError);
  assert.throws(() => buildTmuxTarget({ traceId: "x", agent: "g", role: "" }), TypeError);
});

test("keeps tmux target under the length limit", () => {
  const target = buildTmuxTarget({
    traceId: "trace-id-with-a-very-long-suffix-that-should-be-truncated",
    agent: "agent-name-with-a-very-long-suffix-that-should-be-truncated",
    role: "role-name-with-a-very-long-suffix-that-should-be-truncated",
  });

  assert.ok(target.length <= 96);
});
