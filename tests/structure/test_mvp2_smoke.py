from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SMOKE = ROOT / "scripts" / "smoke_mvp2.mjs"
README = ROOT / "README.md"
RUNBOOK = ROOT / "docs" / "mvp2-orchestrator-runbook.md"


def _smoke_text():
    return SMOKE.read_text(encoding="utf-8")


def test_mvp2_smoke_exists_and_defaults_to_dry_run():
    assert SMOKE.is_file()
    text = _smoke_text()

    assert "AGENTS_DRY_RUN" in text
    assert "AGENTS_DRY_RUN=0" in text
    assert 'defaultPoliciesDir = "policies"' in text


def test_mvp2_smoke_runs_two_agent_flow_and_reports_evidence():
    text = _smoke_text()

    for token in (
        "orchestration.create",
        "task.assign",
        "agent.spawn",
        "agent.ask",
        "agent.view",
        "artifact.share",
        "agent.kill",
        "orchestration.complete",
        "gpt-6.1-sol",
        "max",
        "priority",
        "claude-opus-5-5",
        "MVP2.0 smoke",
        "sessions",
        "artifacts",
        "audit",
        "result",
    ):
        assert token in text


def test_mvp2_smoke_is_linked_from_operator_docs():
    assert "node scripts/smoke_mvp2.mjs" in README.read_text(encoding="utf-8")
    assert "node scripts/smoke_mvp2.mjs" in RUNBOOK.read_text(encoding="utf-8")
