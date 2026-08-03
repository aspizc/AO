import re
from pathlib import Path

DOC = Path(__file__).resolve().parents[2] / "docs" / "threat-model.md"


def test_threat_model_doc_exists():
    assert DOC.is_file()


def test_required_categories_are_covered():
    text = DOC.read_text(encoding="utf-8")
    for tag in (f"TM-{n:02d}" for n in range(1, 12)):
        assert tag in text, f"missing threat: {tag}"


def test_each_abuse_case_has_tested_by():
    text = DOC.read_text(encoding="utf-8")
    sections = re.split(r"^### (TM-\d{2}.*)$", text, flags=re.MULTILINE)
    pairs = list(zip(sections[1::2], sections[2::2]))
    assert pairs, "no threat sections found"
    for header, body in pairs:
        assert "Tested by:" in body, f"missing Tested by in {header}"


def test_living_document_section_exists():
    text = DOC.read_text(encoding="utf-8")
    assert "Living document" in text
