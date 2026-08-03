import re
from pathlib import Path


DOC = Path(__file__).resolve().parents[2] / "docs" / "mvp-acceptance-checklist.md"


def checklist_rows(text):
    return [row for row in text.splitlines() if re.match(r"\| \d+ \|", row)]


def test_checklist_exists():
    assert DOC.is_file()


def test_each_item_has_evidence_and_status():
    text = DOC.read_text(encoding="utf-8")
    rows = checklist_rows(text)

    assert len(rows) == 27
    for row in rows:
      cols = [col.strip() for col in row.strip("|").split("|")]
      criterion, evidence, status = cols[1], cols[2], cols[3]
      assert criterion, f"empty criterion: {row}"
      assert evidence and evidence.lower() != "tbd", f"missing evidence: {row}"
      assert status in ("[ ]", "[x]"), f"invalid status: {row}"


def test_checklist_references_security_tm_ids():
    text = DOC.read_text(encoding="utf-8")

    assert "TM-02" in text
    assert "TM-05" in text


def test_checklist_keeps_reviewer_as_authority():
    text = DOC.read_text(encoding="utf-8").lower()

    assert "reviewer must verify" in text
