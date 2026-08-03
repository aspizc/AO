from pathlib import Path


DOC = Path(__file__).resolve().parents[2] / "docs" / "operator-guide.md"


def test_operator_guide_exists():
    assert DOC.is_file()


def test_operator_guide_mentions_policy_validate():
    assert "agent-run policy validate" in DOC.read_text(encoding="utf-8")


def test_operator_guide_mentions_generic_mcp_config():
    text = DOC.read_text(encoding="utf-8")

    assert "client-config/mcp.json.example" in text


def test_operator_guide_marks_specific_ides_out_of_scope():
    text = DOC.read_text(encoding="utf-8").lower()

    assert "out of scope" in text
    assert "cursor" in text
    assert "antigravity" in text
