import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROFILE = ROOT / "client-config" / "profiles" / "codex-coder-claude-reviewer"
MCP = PROFILE / "mcp.json"
ENV = PROFILE / ".env.example"
README = PROFILE / "README.md"
CLIENT_README = ROOT / "client-config" / "README.md"


def test_mvp2_mcp_profile_is_valid_json():
    data = json.loads(MCP.read_text(encoding="utf-8"))
    server = data["mcpServers"]["agents-gateway"]

    assert server["transport"] == "stdio"
    assert server["command"] == "node"
    assert "./gateway/src/mcp_server.js" in server["args"]


def test_mvp2_mcp_profile_uses_default_policy_registry():
    env = json.loads(MCP.read_text(encoding="utf-8"))["mcpServers"]["agents-gateway"]["env"]

    assert env["AGENTS_DRY_RUN"] == "0"
    assert env["AGENTS_POLICIES_DIR"] == "./policies"
    assert env["AGENTS_CODEX_BIN"] == "codex"
    assert env["AGENTS_CLAUDE_BIN"] == "claude"
    assert env["AGENTS_CODEX_SANDBOX"] == "workspace-write"


def test_mvp2_mcp_profile_does_not_hardcode_local_repo_path():
    text = MCP.read_text(encoding="utf-8")

    assert "REPLACE_WITH_ABSOLUTE_WORK_REPO_PATH" in text
    assert "/home/" not in text


def test_mvp2_env_example_documents_repo_roots_and_dry_run_rehearsal():
    text = ENV.read_text(encoding="utf-8")

    assert "AGENTS_REPO_ROOTS" in text
    assert "absolute" in text.lower()
    assert "AGENTS_DRY_RUN=1" in text
    assert "AGENTS_POLICIES_DIR=./policies" in text
    assert "gpt-5.6-sol" in text
    assert "max" in text
    assert "priority" in text
    assert "claude-fable-5" in text


def test_mvp2_profile_docs_are_linked():
    profile_readme = README.read_text(encoding="utf-8")
    client_readme = CLIENT_README.read_text(encoding="utf-8")

    assert "Codex coder" in profile_readme
    assert "Claude reviewer" in profile_readme
    assert "codex-coder-claude-reviewer" in client_readme
