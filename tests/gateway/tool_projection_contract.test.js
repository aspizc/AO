import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractToolCallExamples,
  renderToolCatalogMarkdown,
  validateToolCallExamples,
  validateToolReferences,
} from "../../gateway/src/tools/contract_projection.js";
import { TOOL_CATALOG } from "../../gateway/src/tools/catalog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

test("committed generated catalog documentation is byte-current", () => {
  const documented = fs.readFileSync(
    path.join(ROOT, "docs", "mcp-tool-catalog.md"),
    "utf8",
  );
  assert.equal(documented, renderToolCatalogMarkdown());
});

test("generated documentation carries one semantically valid tool-call example per tool", () => {
  const markdown = renderToolCatalogMarkdown();
  assert.equal(extractToolCallExamples(markdown).length, TOOL_CATALOG.length);
  assert.deepEqual(validateToolCallExamples(markdown), []);
});

test("semantic example validation rejects arguments outside the selected tool schema", () => {
  const markdown = [
    "```json mcp-tool-call",
    JSON.stringify({
      tool: "approval.poll",
      arguments: {
        approvalId: "apr-contract-example",
        traceId: "tr-not-accepted-by-this-tool",
      },
    }),
    "```",
  ].join("\n");

  assert.deepEqual(validateToolCallExamples(markdown), [
    "example 1 (approval.poll): arguments violate the canonical input schema",
  ]);
});

test("every product prompt references only canonical registered tools", () => {
  const promptDir = path.join(ROOT, "prompts");
  const failures = [];
  for (const file of fs.readdirSync(promptDir).filter((name) => name.endsWith(".md"))) {
    const text = fs.readFileSync(path.join(promptDir, file), "utf8");
    for (const violation of validateToolReferences(text)) {
      failures.push(`${file}: ${violation}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("normative public docs contain no callable fictional aliases", () => {
  const sources = [
    "README.md",
    "gateway/README.md",
    "docs/operator-guide.md",
    "docs/mvp2-orchestrator-runbook.md",
    "docs/planning-loop-runbook.md",
    "docs/gateway-error-contract.md",
  ];
  const failures = [];
  for (const relative of sources) {
    const text = fs.readFileSync(path.join(ROOT, relative), "utf8");
    for (const violation of validateToolReferences(text)) {
      failures.push(`${relative}: ${violation}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("normative prompts and docs keep tagged tool examples semantically valid", () => {
  const sources = [
    ...fs.readdirSync(path.join(ROOT, "prompts"))
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join("prompts", name)),
    "README.md",
    "gateway/README.md",
    "docs/operator-guide.md",
    "docs/mvp2-orchestrator-runbook.md",
    "docs/planning-loop-runbook.md",
    "docs/gateway-error-contract.md",
  ];
  const failures = [];
  for (const relative of sources) {
    const text = fs.readFileSync(path.join(ROOT, relative), "utf8");
    for (const violation of validateToolCallExamples(text)) {
      failures.push(`${relative}: ${violation}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("operator guidance does not promise unsupported trace or policy fields", () => {
  const promptFiles = [
    "orchestrator_mvp2_two_agent.md",
    "orchestrator_system_prompt.md",
    "planner_system_prompt.md",
  ];
  const text = promptFiles
    .map((name) => fs.readFileSync(path.join(ROOT, "prompts", name), "utf8"))
    .join("\n");

  assert.doesNotMatch(text, /(?:report|includes?) the `ruleId` and (?:a )?reason/i);
  assert.doesNotMatch(text, /`traceId` attached to\s+every subsequent/i);
  assert.match(text, /fixed public message/i);
  assert.match(text, /only when (?:its|the) schema accepts it/i);
});

test("reference validation distinguishes source files from fictional tools", () => {
  assert.deepEqual(
    validateToolReferences(
      "See gateway/src/tools/artifact.js, then call artifact.put.plan.",
    ),
    ["non-canonical tool reference `artifact.put.plan`"],
  );
});

test("reference validation accepts only canonical namespace wildcards", () => {
  assert.deepEqual(
    validateToolReferences(
      "The legacy `message.*` contract and additive `coordination.*` tools stay isolated.",
    ),
    [],
  );
  assert.deepEqual(
    validateToolReferences("Never call `policy.*` or `fictional.*`."),
    ["non-canonical tool reference `policy.*`"],
  );
});


test("review-note policy actions are not callable MCP tool names", () => {
  const assignment = '```json mcp-tool-call\n'
    + JSON.stringify({
      tool: "task.assign",
      arguments: {
        traceId: "tr-review",
        caller: { agent: "claude-code", role: "orchestrator" },
        target: { agent: "claude-code", role: "reviewer", action: "artifact.put.review_notes" },
        repo: "sample-apps",
        brief: "Review sanitized diff",
      },
    }) + '\n```';
  assert.deepEqual(validateToolReferences(assignment), []);
  assert.deepEqual(validateToolCallExamples(assignment), []);
  const fictionalCall = '```json mcp-tool-call\n'
    + JSON.stringify({ tool: "artifact.put.review_notes", arguments: {} }) + '\n```';
  assert.deepEqual(validateToolCallExamples(fictionalCall), ["example 1: unknown canonical tool"]);
});

test("prompt policy actions are not callable MCP tool names", () => {
  const actions = ["session.prompt.command", "session.prompt.trust", "session.prompt.permission", "session.prompt.unknown"];
  for (const action of actions) {
    assert.deepEqual(validateToolReferences(`Policy action: ${action}`), [], "literal policy actions must remain usable in operator documentation");
    const call = '```json mcp-tool-call\n' + JSON.stringify({ tool: action, arguments: {} }) + '\n```';
    assert.deepEqual(validateToolCallExamples(call), ["example 1: unknown canonical tool"], "an action allowlist must never grant MCP callability");
  }
});
