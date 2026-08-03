#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--check" ]]; then
  echo "kya_run_task_mcp wrapper ready"
  exit 0
fi

CONFIG_FILE="${KYA_TASK_CONFIG:-/tmp/kya_current_task.env}"
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing task config: $CONFIG_FILE" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "$CONFIG_FILE"
set +a

: "${KYA_TASK_ID:?missing KYA_TASK_ID}"
: "${KYA_TASK_SLUG:?missing KYA_TASK_SLUG}"
: "${KYA_TASK_TITLE:?missing KYA_TASK_TITLE}"
: "${KYA_CODER_PROMPT:?missing KYA_CODER_PROMPT}"
: "${KYA_REVIEW_PROMPT:?missing KYA_REVIEW_PROMPT}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

export AGENTS_WORKSPACE="${AGENTS_WORKSPACE:-/tmp/kya-agents-workspace}"
export AGENTS_POLICIES_DIR="${AGENTS_POLICIES_DIR:-$REPO_ROOT/policies/profiles/kya}"
export AGENTS_REPO_ROOTS="${AGENTS_REPO_ROOTS:-/home/carase/git/experiments/kya}"
export AGENTS_DRY_RUN="${AGENTS_DRY_RUN:-0}"
export AGENTS_CODEX_SANDBOX="${AGENTS_CODEX_SANDBOX:-workspace-write}"
export KYA_CODEX_MODEL="${KYA_CODEX_MODEL:-gpt-5.6-sol}"
export KYA_CODEX_EFFORT="${KYA_CODEX_EFFORT:-max}"
export KYA_CODEX_SERVICE_TIER="${KYA_CODEX_SERVICE_TIER:-priority}"
export KYA_MCP_REQUEST_TIMEOUT_MS="${KYA_MCP_REQUEST_TIMEOUT_MS:-1200000}"

node "$SCRIPT_DIR/kya_mcp_task_runner.mjs"
