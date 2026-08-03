from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
STAGE_B = ROOT / "plan" / "PROJECT_V1" / "B"
ADR_V1_02 = ROOT / "docs" / "adr" / "ADR-V1-02-hybrid-orchestrator-selector.md"


def read_stage_b() -> str:
    return "\n".join(path.read_text() for path in sorted(STAGE_B.rglob("*.md")))


def test_stage_b_uses_real_gateway_tool_names():
    text = read_stage_b()

    assert "`task.assign`" in text
    assert "`agent.delegate`" in text
    assert "`artifact.put`" in text
    assert "`approval.request`" in text
    assert "`approval.wait`" in text


def test_stage_b_marks_ghost_tools_as_forbidden():
    text = read_stage_b()

    assert "No existen `agent.review`, `artifact.store`" in text
    assert "No usar `agent.review` ni `artifact.store`" in text


def test_stage_b_does_not_require_real_git_push_tool():
    text = read_stage_b()

    assert "push real de git" in text
    assert "fuera de scope hasta que exista una tool MCP de push" in text
    assert "no ejecuta `git push`" in text


def test_adr_v1_02_documents_hybrid_orchestrator_selector():
    text = ADR_V1_02.read_text()

    assert "# ADR-V1-02" in text
    assert "hybrid orchestrator" in text.lower()
    assert "selector esta fuera del Gateway" in text
    assert "mismas MCP tools" in text
    assert "LangGraph" in text
    assert "LLM" in text
