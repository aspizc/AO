from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNBOOK = ROOT / "docs" / "planning-loop-runbook.md"
SMOKE = ROOT / "scripts" / "smoke_planning.mjs"
README = ROOT / "README.md"
OPERATOR_GUIDE = ROOT / "docs" / "operator-guide.md"
CHANGELOG = ROOT / "CHANGELOG.md"


def _text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_planning_runbook_covers_operator_loop_and_safety():
    assert RUNBOOK.is_file()
    text = _text(RUNBOOK)

    for token in (
        "draft",
        "apply",
        "review",
        "escalate",
        "converge",
        "git checkout -b plan/refine-stage-",
        "node scripts/smoke_planning.mjs",
        "AGENTS_DRY_RUN=0",
        "OPEN DECISIONS / QUESTIONS FOR HUMAN",
        "approval.request",
        "git diff plan/",
        "workspace/artifacts",
        "workspace/audit/events.jsonl",
        "claude-opus-5-5",
        "max",
        "plan/**",
    ):
        assert token in text


def test_planning_smoke_exists_and_reports_evidence():
    assert SMOKE.is_file()
    text = _text(SMOKE)

    for token in (
        "AGENTS_DRY_RUN",
        "AGENTS_DRY_RUN=0",
        "tools/list",
        "agent.delegate",
        "artifact.put",
        "artifact.put.plan",
        "artifact.put.review_notes",
        "OPEN DECISIONS",
        "claude-opus-5-5",
        "max",
        "Planning loop smoke",
        "artifacts",
        "audit",
        "result",
    ):
        assert token in text


def test_planning_runbook_and_smoke_are_linked():
    assert "docs/planning-loop-runbook.md" in _text(README)
    assert "planning-loop-runbook.md" in _text(OPERATOR_GUIDE)
    assert "Closes Z/0/3" in _text(CHANGELOG)
