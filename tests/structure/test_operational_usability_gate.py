import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
CHECKLIST = ROOT / "docs" / "mvp-acceptance-checklist.md"
CI_MANIFEST = ROOT / "ci" / "suites.json"
SMOKE = ROOT / "scripts" / "smoke_mcp.mjs"


def test_readme_declares_supported_two_agent_mcp_flow():
    text = README.read_text(encoding="utf-8")

    assert "human-facing orchestrator -> Gateway MCP -> coder child + reviewer child" in text
    assert "Codex as coder" in text
    assert "P/0/3" in text


def test_checklist_references_real_mcp_two_agent_evidence():
    text = CHECKLIST.read_text(encoding="utf-8")

    assert "tests/gateway/tool_agent.test.js" in text
    assert "tests/e2e/mcp_two_agent_workflow.test.js" in text
    assert "Codex as a real coder is optional/post-MVP evidence covered by P/0/3" in text


def test_ci_and_smoke_gate_operational_mcp_surface():
    manifest = json.loads(CI_MANIFEST.read_text(encoding="utf-8"))
    suites = {suite["id"]: suite for suite in manifest["suites"]}
    smoke = SMOKE.read_text(encoding="utf-8")

    assert suites["test.e2e"]["include"] == ["tests/e2e/**/*.test.js"]
    assert suites["smoke.mcp"]["argv"] == ["node", "scripts/smoke_mcp.mjs"]
    assert "agent.spawn" in smoke
    assert "agent.ask" in smoke
