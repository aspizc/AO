export const VISIBILITY_MATRIX = [
  {
    name: "gemini restricted-coder sees raw restricted diffs",
    traceId: "tr-vis-gemini-raw",
    requester: { agent: "gemini-cli", role: "restricted-coder" },
    artifact: {
      kind: "raw_diff",
      classification: "restricted",
      content: "api_key=abcdef1234567890",
    },
    expected: "allow",
  },
  {
    name: "gemini restricted-coder sees sanitized internal diffs",
    traceId: "tr-vis-gemini-sanitized",
    requester: { agent: "gemini-cli", role: "restricted-coder" },
    artifact: {
      kind: "raw_diff_sanitized",
      classification: "internal",
      content: "api_key=<REDACTED>",
    },
    expected: "allow",
  },
  {
    name: "claude orchestrator is denied raw restricted diffs",
    traceId: "tr-vis-claude-orchestrator-raw",
    requester: { agent: "claude-code", role: "orchestrator" },
    artifact: {
      kind: "raw_diff",
      classification: "restricted",
      content: "api_key=abcdef1234567890",
    },
    expected: "deny",
  },
  {
    name: "claude orchestrator sees sanitized internal diffs",
    traceId: "tr-vis-claude-orchestrator-sanitized",
    requester: { agent: "claude-code", role: "orchestrator" },
    artifact: {
      kind: "raw_diff_sanitized",
      classification: "internal",
      content: "api_key=<REDACTED>",
    },
    expected: "allow",
  },
  {
    name: "claude reviewer receives sanitized replacement for raw restricted diffs",
    traceId: "tr-vis-claude-reviewer-raw",
    requester: { agent: "claude-code", role: "reviewer" },
    artifact: {
      kind: "raw_diff",
      classification: "restricted",
      content: "api_key=abcdef1234567890",
    },
    expected: "allow_with_sanitization",
  },
  {
    name: "claude reviewer sees sanitized internal diffs",
    traceId: "tr-vis-claude-reviewer-sanitized",
    requester: { agent: "claude-code", role: "reviewer" },
    artifact: {
      kind: "raw_diff_sanitized",
      classification: "internal",
      content: "api_key=<REDACTED>",
    },
    expected: "allow",
  },
  {
    name: "codex tester is denied raw restricted diffs",
    traceId: "tr-vis-codex-tester-raw",
    requester: { agent: "codex", role: "tester" },
    artifact: {
      kind: "raw_diff",
      classification: "restricted",
      content: "api_key=abcdef1234567890",
    },
    expected: "deny",
  },
  {
    name: "codex tester sees internal test reports",
    traceId: "tr-vis-codex-tester-report",
    requester: { agent: "codex", role: "tester" },
    artifact: {
      kind: "test_report",
      classification: "internal",
      content: "all tests passed",
    },
    expected: "allow",
  },
];
