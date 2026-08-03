from pathlib import Path


DOC = Path(__file__).resolve().parents[2] / "docs" / "adapters" / "claude-code.md"


def test_claude_adapter_notes_exist():
    assert DOC.is_file()


def test_claude_adapter_notes_define_manual_checklist():
    text = DOC.read_text(encoding="utf-8")

    assert "Manual verification checklist" in text
    assert "claude --version" in text
