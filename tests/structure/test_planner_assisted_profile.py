import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROFILE = ROOT / "client-config" / "profiles" / "planner-assisted"
MCP = PROFILE / "mcp.json"
ENV = PROFILE / ".env.example"
README = PROFILE / "README.md"
CLIENT_README = ROOT / "client-config" / "README.md"
REPOS = ROOT / "policies" / "repositories.json"
CHANGELOG = ROOT / "CHANGELOG.md"


def test_planner_assisted_mcp_profile_is_safe_default():
    data = json.loads(MCP.read_text(encoding="utf-8"))
    server = data["mcpServers"]["agents-gateway"]
    env = server["env"]

    assert server["transport"] == "stdio"
    assert server["command"] == "node"
    assert "./gateway/src/mcp_server.js" in server["args"]
    assert env["AGENTS_POLICIES_DIR"] == "./policies"
    assert env["AGENTS_DRY_RUN"] == "1"
    assert env["AGENTS_REPO_ROOTS"] == "REPLACE_WITH_ABSOLUTE_AGENTS_ORCHESTRATOR_PATH"
    assert env["AGENTS_CLAUDE_BIN"] == "claude"
    assert "AGENTS_CODEX_BIN" not in env


def test_planner_assisted_env_and_readme_describe_roles_and_scope():
    env_text = ENV.read_text(encoding="utf-8")
    readme = README.read_text(encoding="utf-8")

    for token in (
        "AGENTS_REPO_ROOTS",
        "absolute path",
        "AGENTS_DRY_RUN=1",
        "AGENTS_DRY_RUN=0",
        "claude-opus-5-5",
        "max",
        "planner_system_prompt.md",
        "planner_apply_coder_prompt.md",
        "orchestrator_planning_loop.md",
        "plan/**",
        "human approval",
        "dedicated branch",
    ):
        assert token in env_text or token in readme

    assert "Codex" not in readme


def test_planner_assisted_profile_linked_and_repo_registered():
    client_readme = CLIENT_README.read_text(encoding="utf-8")
    repos = json.loads(REPOS.read_text(encoding="utf-8"))["repositories"]

    assert "profiles/planner-assisted/" in client_readme
    assert repos["agents-orchestrator"]["classification"] == "internal"
    assert "claude-code" in repos["agents-orchestrator"]["allowedAgents"]
    assert "Closes Z/0/2" in CHANGELOG.read_text(encoding="utf-8")
