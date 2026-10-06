function safeChunk(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 24)
    .replace(/^-|-$/g, "");
}

function safePrefix(value) {
  return String(value ?? "ag-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}

function displayAgent(agent) {
  const raw = String(agent ?? "");
  if (raw === "gemini-cli") return "gemini";
  if (raw === "antigravity-cli") return "antigravity";
  return safeChunk(raw);
}

export function buildTmuxTarget({ traceId, agent, role, prefix = "ag-" }) {
  const tr = safeChunk(traceId);
  const ag = displayAgent(agent);
  const ro = safeChunk(role);
  if (!tr || !ag || !ro) {
    throw new TypeError("buildTmuxTarget requires traceId, agent and role");
  }

  return `${safePrefix(prefix)}${tr}-${ag}-${ro}`.slice(0, 96);
}
