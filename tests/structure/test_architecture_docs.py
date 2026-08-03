from pathlib import Path

DOCS = Path(__file__).resolve().parents[2] / "docs"


def test_architecture_doc_exists():
    assert (DOCS / "architecture.md").is_file()


def test_architecture_doc_mentions_gateway_only():
    text = (DOCS / "architecture.md").read_text(encoding="utf-8")
    assert "Gateway" in text
    assert "no standalone" in text.lower() or "does not exist" in text.lower()


def test_architecture_doc_mentions_policy_before_spawn():
    text = (DOCS / "architecture.md").read_text(encoding="utf-8")
    assert "policy" in text.lower()
    assert "spawn" in text.lower() or "delegate" in text.lower()


def test_required_adrs_exist():
    for name in (
        "ADR-001-gateway-only.md",
        "ADR-002-no-orchestrator-component.md",
        "ADR-003-policy-before-spawn.md",
    ):
        assert (DOCS / "adr" / name).is_file(), f"missing {name}"
