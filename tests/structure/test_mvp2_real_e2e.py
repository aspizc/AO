import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
REAL_E2E = ROOT / "tests" / "e2e" / "mcp_two_agent_real.test.js"
CI_MANIFEST = ROOT / "ci" / "suites.json"
RUNBOOK = ROOT / "docs" / "mvp2-orchestrator-runbook.md"


def _real_e2e_text():
    return REAL_E2E.read_text(encoding="utf-8")


def test_mvp2_real_e2e_exists_and_is_guarded():
    assert REAL_E2E.is_file()
    text = _real_e2e_text()

    assert "AGENTS_E2E_REAL" in text
    assert "skip" in text
    assert "tmux" in text
    assert "codex" in text
    assert "claude" in text


def test_mvp2_real_e2e_exercises_two_agent_contract():
    text = _real_e2e_text()

    for token in (
        "orchestration.create",
        "task.assign",
        "agent.spawn",
        "agent.ask",
        "agent.view",
        "artifact.share",
        "artifact.put",
        "agent.kill",
        "orchestration.complete",
    ):
        assert token in text

    assert "gpt-6.1-sol" in text
    assert "max" in text
    assert "priority" in text
    assert "claude-opus-5-5" in text
    assert "AGENT_MODEL_RESOLVED" in text
    assert "SANITIZATION_APPLIED" in text


def test_mvp2_real_e2e_is_documented_as_optional():
    manifest = json.loads(CI_MANIFEST.read_text(encoding="utf-8"))
    real_agents = next(
        suite for suite in manifest["suites"] if suite["id"] == "test.real-agents"
    )
    assert real_agents["classification"] == "optional-service"
    assert real_agents["readiness"]["environmentEquals"] == {
        "AGENTS_E2E_REAL": "1"
    }
    assert "mcp_two_agent_real.test.js" in RUNBOOK.read_text(encoding="utf-8")
