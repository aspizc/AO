from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
README = ROOT / "README.md"
ADR = ROOT / "docs" / "adr" / "ADR-004-mvp-scope.md"


def test_readme_has_quickstart():
    assert "Quickstart" in README.read_text(encoding="utf-8")


def test_mvp_scope_adr_exists():
    assert ADR.is_file()


def test_readme_keeps_gateway_as_the_orchestration_enforcement_boundary():
    text = README.read_text(encoding="utf-8").lower()

    assert "no privileged standalone orchestrator" in text
    assert "orchestrator role" in text
    assert "gateway remains the enforcement boundary" in text


def test_readme_links_core_docs():
    text = README.read_text(encoding="utf-8")

    assert "docs/operator-guide.md" in text
    assert "docs/mvp-acceptance-checklist.md" in text
    assert "docs/adr/" in text
