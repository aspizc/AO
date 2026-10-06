import {
  TOOL_CATALOG,
  TOOL_NAMES,
  validateCatalogInput,
} from "./catalog.js";

const TOOL_NAME_SET = new Set(TOOL_NAMES);
const TOOL_NAMESPACES = new Set(TOOL_NAMES.map((name) => name.split(".")[0]));
const TOOL_NAMESPACE_WILDCARDS = new Set(
  [...TOOL_NAMESPACES].map((namespace) => `${namespace}.*`),
);
const NON_TOOL_DOTTED_TOKENS = new Set(["coordination.v1", "artifact.put.review_notes"]);
const SOURCE_FILE_SUFFIXES = new Set(["cjs", "js", "json", "md", "mjs", "py"]);
const DOTTED_TOKEN = /\b[a-z][a-z0-9_]*\.(?:[a-z_*][a-z0-9_*]*)(?:\.[a-z_*][a-z0-9_*]*)*/g;
const TOOL_CALL_FENCE =
  /^[ \t]*```json[ \t]+mcp-tool-call[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/gm;

function markdownCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function renderToolCatalogMarkdown() {
  const rows = TOOL_CATALOG.map(
    (entry, index) =>
      `| ${index + 1} | \`${entry.name}\` | ${markdownCell(entry.description)} | `
      + `${entry.runtimeDependency} | ${entry.auditRoute} |`,
  );
  const examples = TOOL_CATALOG.flatMap((entry) => [
    `### \`${entry.name}\``,
    "",
    "```json mcp-tool-call",
    JSON.stringify({ tool: entry.name, arguments: entry.example }),
    "```",
    "",
  ]);
  return [
    "# Canonical MCP tool catalog",
    "",
    "This file is generated from `gateway/src/tools/catalog.js`. Edit the catalog,",
    "then update the versioned projection and this document in the same reviewed change.",
    "",
    `The v1 contract contains exactly ${TOOL_CATALOG.length} tools in protocol order.`,
    "",
    "| # | Tool | Description | Runtime dependency | Audit route |",
    "|---:|---|---|---|---|",
    ...rows,
    "",
    "## Machine-verifiable examples",
    "",
    "Each catalog entry owns one non-secret structural example. The contract suite",
    "validates every example with both Zod and the published JSON Schema; examples",
    "are deliberately kept in the typed catalog so prose cannot become authoritative.",
    "",
    ...examples,
  ].join("\n");
}

export function extractToolCallExamples(text) {
  return [...String(text).matchAll(TOOL_CALL_FENCE)].map((match, offset) => {
    try {
      return {
        index: offset + 1,
        raw: match[1],
        value: JSON.parse(match[1]),
      };
    } catch (_error) {
      return {
        index: offset + 1,
        raw: match[1],
        value: undefined,
      };
    }
  });
}

export function validateToolCallExamples(text) {
  const violations = [];
  for (const example of extractToolCallExamples(text)) {
    if (example.value === undefined) {
      violations.push(`example ${example.index}: invalid JSON`);
      continue;
    }
    if (
      !example.value
      || typeof example.value !== "object"
      || Array.isArray(example.value)
    ) {
      violations.push(`example ${example.index}: expected a tool-call object`);
      continue;
    }
    const keys = Object.keys(example.value).sort();
    if (keys.length !== 2 || keys[0] !== "arguments" || keys[1] !== "tool") {
      violations.push(
        `example ${example.index}: expected exactly tool and arguments`,
      );
      continue;
    }
    const { tool, arguments: args } = example.value;
    if (typeof tool !== "string" || !TOOL_NAME_SET.has(tool)) {
      violations.push(`example ${example.index}: unknown canonical tool`);
      continue;
    }
    if (!validateCatalogInput(tool, args).success) {
      violations.push(
        `example ${example.index} (${tool}): arguments violate the canonical input schema`,
      );
    }
  }
  return violations;
}

export function validateToolReferences(text) {
  const violations = new Set();
  for (const match of String(text).matchAll(DOTTED_TOKEN)) {
    const token = match[0];
    if (NON_TOOL_DOTTED_TOKENS.has(token)) continue;
    if (SOURCE_FILE_SUFFIXES.has(token.split(".").at(-1))) continue;
    if (TOOL_NAMESPACE_WILDCARDS.has(token)) continue;
    const namespace = token.split(".")[0];
    if (namespace === "policy" || TOOL_NAMESPACES.has(namespace)) {
      if (!TOOL_NAME_SET.has(token)) {
        violations.add(`non-canonical tool reference \`${token}\``);
      }
    }
  }
  return [...violations].sort();
}
