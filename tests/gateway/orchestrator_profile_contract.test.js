import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TOOL_NAMES } from "../../gateway/src/tools/catalog.js";
import {
  CANONICAL_ORCHESTRATOR_PROFILE,
  ORCHESTRATOR_PROFILE_DIGEST,
  resolveEffectiveAgentSelection,
  validateProfileAgainstAgentCapabilities,
  validateProfileAgainstArtifactSchema,
  validateProfileAgainstToolCatalog,
} from "../../gateway/src/core/orchestrator_profile.js";

const require = createRequire(import.meta.url);
const Ajv = require("ajv/dist/2020");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf-8"));
}

test("canonical profile and effective selections validate against versioned schemas", () => {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const profileSchema = readJson("schemas/orchestrator-profile-v1.schema.json");
  const selectionSchema = readJson(
    "schemas/effective-agent-selection-v1.schema.json",
  );
  const validateProfile = ajv.compile(profileSchema);
  const validateSelection = ajv.compile(selectionSchema);

  assert.equal(validateProfile(CANONICAL_ORCHESTRATOR_PROFILE), true, ajv.errorsText(validateProfile.errors));
  for (const agent of ["codex", "claude-code", "gemini-cli"]) {
    const selection = resolveEffectiveAgentSelection({ agent });
    assert.equal(validateSelection(selection), true, ajv.errorsText(validateSelection.errors));
  }
  assert.match(ORCHESTRATOR_PROFILE_DIGEST, /^sha256:[0-9a-f]{64}$/);
});

test("all shipped capability registries match the canonical provider matrix", () => {
  for (const relativePath of [
    "policies/agent-capabilities.json",
    "policies/profiles/mvp2/agent-capabilities.json",
    "policies/profiles/kya/agent-capabilities.json",
  ]) {
    assert.equal(
      validateProfileAgainstAgentCapabilities(
        CANONICAL_ORCHESTRATOR_PROFILE,
        readJson(relativePath),
      ),
      true,
      relativePath,
    );
  }

  const drifted = structuredClone(readJson("policies/agent-capabilities.json"));
  drifted.agents.codex.defaultModel = "gpt-5";
  assert.throws(
    () =>
      validateProfileAgainstAgentCapabilities(
        CANONICAL_ORCHESTRATOR_PROFILE,
        drifted,
      ),
    (error) =>
      error.code === "ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT"
      && error.details.field === "agents.codex.defaultModel",
  );

  const roleDrifted = structuredClone(
    readJson("policies/agent-capabilities.json"),
  );
  for (const agent of Object.values(roleDrifted.agents)) {
    agent.allowedRoles = agent.allowedRoles.filter(
      (role) => role !== "security_reviewer",
    );
  }
  assert.throws(
    () =>
      validateProfileAgainstAgentCapabilities(
        CANONICAL_ORCHESTRATOR_PROFILE,
        roleDrifted,
      ),
    (error) =>
      error.code === "ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT"
      && error.details.field === "roles",
  );
});

test("tool guidance is a total exact projection with mutation safety metadata", () => {
  assert.equal(
    validateProfileAgainstToolCatalog(
      CANONICAL_ORCHESTRATOR_PROFILE,
      TOOL_NAMES,
    ),
    true,
  );
  assert.deepEqual(
    Object.keys(CANONICAL_ORCHESTRATOR_PROFILE.toolGuidance).sort(),
    [...TOOL_NAMES].sort(),
  );

  const expectedMutations = new Set([
    "orchestration.create",
    "orchestration.pause",
    "orchestration.resume",
    "orchestration.cancel",
    "orchestration.complete",
    "orchestration.reattach",
    "task.assign",
    "agent.delegate",
    "agent.spawn",
    "agent.ask",
    "agent.kill",
    "artifact.put",
    "artifact.share",
    "approval.request",
    "approval.respond",
    "message.send",
    "message.reply",
    "session.intervention_note",
    "coordination.register",
    "coordination.heartbeat",
    "coordination.unregister",
    "coordination.send",
    "coordination.receive",
    "coordination.ack",
  ]);

  for (const [name, guidance] of Object.entries(
    CANONICAL_ORCHESTRATOR_PROFILE.toolGuidance,
  )) {
    assert.equal(
      guidance.effect,
      expectedMutations.has(name) ? "mutation" : "read",
      name,
    );
    assert.match(guidance.risk, /^(low|medium|high|critical)$/);
    assert.equal(typeof guidance.destructive, "boolean");
    assert.match(
      guidance.idempotency,
      /^(read-only|natural|caller-keyed|operation-key|none)$/,
    );
    assert.match(
      guidance.retry,
      /^(safe|poll|same-input-only|never)$/,
    );
    assert.equal(typeof guidance.protectedEffect, "boolean");
  }
});

test("workflow prompts reference only typed tools, artifacts, and unavailable prerequisites", () => {
  const artifactSchema = readJson("schemas/artifact.schema.json");
  assert.equal(
    validateProfileAgainstArtifactSchema(
      CANONICAL_ORCHESTRATOR_PROFILE,
      artifactSchema,
    ),
    true,
  );

  assert.deepEqual(Object.keys(CANONICAL_ORCHESTRATOR_PROFILE.workflows), [
    "plan",
    "execute",
    "coordinate",
    "review",
    "recovery",
    "completion",
  ]);
  assert.deepEqual(
    CANONICAL_ORCHESTRATOR_PROFILE.workflows.review.prerequisites,
    ["F/0/03"],
  );
  assert.deepEqual(
    CANONICAL_ORCHESTRATOR_PROFILE.workflows.completion.prerequisites,
    ["F/0/04"],
  );
  assert.deepEqual(CANONICAL_ORCHESTRATOR_PROFILE.prerequisites, {
    "F/0/03": {
      availability: "unavailable",
      capability: "review-gate",
    },
    "F/0/04": {
      availability: "unavailable",
      capability: "completion-integration",
    },
  });

  const toolNames = new Set(TOOL_NAMES);
  for (const [phase, workflow] of Object.entries(
    CANONICAL_ORCHESTRATOR_PROFILE.workflows,
  )) {
    assert.equal(workflow.promptId, `orchestrator.${phase}.v1`);
    assert.ok(workflow.instruction.length > 20);
    for (const tool of workflow.tools) assert.ok(toolNames.has(tool), `${phase}:${tool}`);
    for (const prerequisite of workflow.prerequisites) {
      assert.equal(
        CANONICAL_ORCHESTRATOR_PROFILE.prerequisites[prerequisite].availability,
        "unavailable",
      );
    }
  }
});

test("canonical profile contains no owner-personal defaults or hidden KYA path", () => {
  const serialized = JSON.stringify(CANONICAL_ORCHESTRATOR_PROFILE);
  for (const forbidden of [
    "/home/",
    "/Users/",
    "carase",
    "signicat",
    "PROJECT_KYA",
    "kya/",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("reattach guidance protects the ownership mutation and missing capability still refuses", () => {
  assert.ok(CANONICAL_ORCHESTRATOR_PROFILE.workflows.recovery.tools.includes("orchestration.reattach"));
  assert.deepEqual(CANONICAL_ORCHESTRATOR_PROFILE.toolGuidance["orchestration.reattach"], {
    effect: "mutation", risk: "high", destructive: false, idempotency: "natural",
    retry: "same-input-only", protectedEffect: true,
  });
  const missing = structuredClone(CANONICAL_ORCHESTRATOR_PROFILE);
  delete missing.toolGuidance["orchestration.reattach"];
  assert.throws(() => validateProfileAgainstToolCatalog(missing, TOOL_NAMES),
    { code: "ORCHESTRATOR_PROFILE_CAPABILITY_DRIFT" });
});
