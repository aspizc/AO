from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ADR = ROOT / "docs" / "adr" / "ADR-005-mvp2-scope.md"
CHECKLIST = ROOT / "docs" / "mvp2-acceptance-checklist.md"
README = ROOT / "README.md"
PLAN_README = ROOT / "plan" / "README.md"
CHANGELOG = ROOT / "CHANGELOG.md"


def test_mvp2_adr_exists_and_reaffirms_invariants():
    assert ADR.is_file()
    text = ADR.read_text(encoding="utf-8")

    for token in (
        "MVP2.0",
        "model selection",
        "Codex coder",
        "gpt-5",
        "medium",
        "workspace-write",
        "Claude reviewer",
        "claude-opus-4-7",
        "generic MCP host",
        "ADR-002",
        "ADR-003",
        "enabled by default",
        "restricted",
        "CI deterministic",
    ):
        assert token in text


def test_mvp2_checklist_links_evidence():
    assert CHECKLIST.is_file()
    text = CHECKLIST.read_text(encoding="utf-8")

    for token in (
        "V/0/0",
        "V/0/1",
        "V/0/2",
        "W/0/0",
        "W/0/1",
        "W/0/2",
        "X/0/0",
        "X/0/1",
        "X/0/2",
        "Y/0/0",
        "Y/0/1",
        "tests/e2e/mcp_two_agent_real.test.js",
        "scripts/smoke_mvp2.mjs",
        "scripts/ci.sh",
    ):
        assert token in text


def test_readme_and_plan_map_reference_mvp2_gate():
    readme = README.read_text(encoding="utf-8")
    plan = PLAN_README.read_text(encoding="utf-8")

    assert "MVP2.0 scope" in readme
    assert "docs/mvp2-acceptance-checklist.md" in readme
    assert "docs/adr/ADR-005-mvp2-scope.md" in readme
    assert "V/W/X/Y" in plan
    assert "Y/0/2" in plan
    assert "MVP2.0 gate" in plan
    assert "Closes Y/0/2" in CHANGELOG.read_text(encoding="utf-8")
