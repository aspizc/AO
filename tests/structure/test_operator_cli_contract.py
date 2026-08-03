from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "docs" / "operator-cli-contract.md"


def test_operator_cli_contract_document_exists():
    assert DOC.is_file()


def test_policy_validate_contract_is_documented():
    text = DOC.read_text(encoding="utf-8")

    assert "agent-run policy validate" in text
    assert "Exit 0" in text
    assert "Exit 1" in text
    assert "Exit 2" in text
    assert "--policies-dir" in text
    assert "--json" in text
