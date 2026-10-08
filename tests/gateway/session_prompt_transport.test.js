import { test } from "node:test";
import assert from "node:assert/strict";
import { answerSessionPrompt, issuePromptAnswer } from "../../gateway/src/adapters/session_prompt.js";
import { promptTransportFixture } from "./session_prompt_transport_fixture.js";

const capture = { snapshot: "selected one-time prompt\n", target: "%1", serverPid: "100", panePid: "200" };
function exercise({ guardResult = null, version, authorized = true } = {}) {
  const inputs = [];
  const outcomes = [];
  const fx = promptTransportFixture({ current: () => capture, onInput: (byte) => inputs.push(byte), guardResult, version });
  const permit = issuePromptAnswer({ tmuxTarget: "fixture", expected: capture, response: "Enter", authorize: (observed) => {
    assert.equal(observed.snapshot, capture.snapshot, "approval is consumed against the captured evidence buffer bytes");
    return authorized;
  }, onOutcome: (outcome) => outcomes.push(outcome) });
  const result = answerSessionPrompt({ permit, run: fx.run });
  assert.equal(answerSessionPrompt({ permit, run: fx.run }), false, "permits are one use even after refusal");
  return { ...fx, result, inputs, outcomes };
}

test("bound one-time Enter consumes exact evidence through the pinned atomic guard only", () => {
  const fx = exercise();
  assert.equal(fx.result, true);
  assert.deepEqual(fx.inputs, ["\r"]);
  assert.deepEqual(fx.outcomes, ["sent"]);
  assert.equal(fx.calls.some((args) => args[0] === "send-keys"), false);
  const captured = fx.calls.find((args) => args[0] === "capture-pane");
  assert.ok(captured.includes("-b") && captured.includes("-N") && captured.includes("-T"));
  const guarded = fx.calls.find((args) => args[0] === "agents-submit-v1");
  assert.deepEqual(guarded.slice(3), ["-r", "100", "-p", "200", "-x", "120", "-y", "40", "-c", "0", "-l", "10", "-t", "%1"]);
  assert.equal(fx.buffers.size, 0);
});
test("a pinned guard refusal produces a refused outcome, no keys and no retry", () => {
  const fx = exercise({ guardResult: () => ({ status: 1, stderr: "agents: guarded submit refused\n" }) });
  assert.equal(fx.result, false);
  assert.deepEqual(fx.inputs, []);
  assert.deepEqual(fx.outcomes, ["refused"]);
  assert.equal(fx.calls.filter((args) => args[0] === "agents-submit-v1").length, 1);
  assert.equal(fx.buffers.size, 0);
});
test("uncertain guarded delivery never retries or reports sent", () => {
  for (const guardResult of [() => ({ status: 1, stderr: "unknown failure" }), () => ({ status: 0, error: new Error("timeout"), stderr: "" }), () => { throw new Error("transport timeout"); }]) {
    const fx = exercise({ guardResult });
    assert.equal(fx.result, false);
    assert.deepEqual(fx.inputs, []);
    assert.deepEqual(fx.outcomes, ["uncertain"]);
    assert.equal(fx.calls.filter((args) => args[0] === "agents-submit-v1").length, 1);
    assert.equal(fx.buffers.size, 0);
  }
});
test("unavailable runtime and rejected authorization refuse safely and clean evidence", () => {
  for (const options of [{ version: "3.6" }, { authorized: false }]) {
    const fx = exercise(options);
    assert.equal(fx.result, false);
    assert.deepEqual(fx.inputs, []);
    assert.deepEqual(fx.outcomes, ["refused"]);
    assert.equal(fx.buffers.size, 0);
  }
});
