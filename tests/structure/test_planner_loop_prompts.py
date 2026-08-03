from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PLANNER = ROOT / "prompts" / "planner_system_prompt.md"
CODER = ROOT / "prompts" / "planner_apply_coder_prompt.md"
ORCHESTRATOR = ROOT / "prompts" / "orchestrator_planning_loop.md"
CHANGELOG = ROOT / "CHANGELOG.md"


def _text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_planner_prompt_covers_draft_review_and_escalation():
    assert PLANNER.is_file()
    text = _text(PLANNER)

    for token in (
        "plan/PROJECT_V0/<stage>/<task>.md",
        "artifact.put",
        'kind: "plan"',
        "artifact.get",
        "sharedArtifactId",
        'kind: "review_notes"',
        "OPEN DECISIONS / QUESTIONS FOR HUMAN",
        "code.write",
        "agent.spawn",
        "Gateway policy is the authority",
    ):
        assert token in text


def test_apply_coder_prompt_restricts_scope_and_open_decisions():
    assert CODER.is_file()
    text = _text(CODER)

    for token in (
        "plan/**",
        "Never edit `policies/`",
        "Never edit `gateway/`",
        "Never edit `tests/`",
        "TODO(open-decision:<id>)",
        "No git push",
        "No commits",
    ):
        assert token in text


def test_orchestrator_prompt_describes_loop_and_human_gate():
    assert ORCHESTRATOR.is_file()
    text = _text(ORCHESTRATOR)

    for token in (
        "draft",
        "apply",
        "review",
        "escalate",
        "task.assign",
        "agent.spawn",
        "agent.ask",
        "approval.request",
        "approval.wait",
        "orchestration.complete",
        "OPEN DECISIONS",
        "plan/**",
        "git diff",
    ):
        assert token in text


def test_z_0_1_changelog_entry_exists():
    assert "Closes Z/0/1" in _text(CHANGELOG)
