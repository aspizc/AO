from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROMPT = ROOT / "prompts" / "orchestrator_mvp2_two_agent.md"
PROFILE_README = ROOT / "client-config" / "profiles" / "codex-coder-claude-reviewer" / "README.md"


def _text():
    return PROMPT.read_text(encoding="utf-8")


def test_mvp2_prompt_exists():
    assert PROMPT.is_file()


def test_mvp2_prompt_names_agents_roles_and_models():
    text = _text()

    assert "agent: codex" in text
    assert "role: coder" in text
    assert "model: gpt-6.1-sol" in text
    assert "reasoningEffort: max" in text
    assert "serviceTier: priority" in text
    assert "agent: claude-code" in text
    assert "role: reviewer" in text
    assert "model: claude-opus-5-5" in text


def test_mvp2_prompt_describes_supervised_tool_sequence():
    text = _text()

    for tool in (
        "orchestration.create",
        "task.assign",
        "agent.spawn",
        "agent.ask",
        "agent.view",
        "agent.kill",
        "orchestration.complete",
    ):
        assert tool in text


def test_mvp2_prompt_requires_sanitized_reviewer_handoff_and_async_approvals():
    text = _text()

    assert "artifact.share" in text
    assert "artifact.get" in text
    assert "sharedArtifactId" in text
    assert 'kind: "review_notes"' in text
    assert "raw restricted" in text.lower()
    assert "approval.request" in text
    assert "approval.wait" in text
    assert "async" in text.lower()


def test_mvp2_prompt_defers_security_to_gateway_policy():
    text = _text()

    assert "automatically for every governed tool call" in text
    assert "policy.check" not in text
    assert "Gateway policy" in text
    assert "authority" in text
    assert "Codex" in text
    assert "restricted" in text


def test_mvp2_prompt_mentions_human_tmux_intervention():
    text = _text()

    assert "session.attach_info" in text
    assert "session.intervention_note" in text
    assert "tmux attach" in text


def test_mvp2_profile_links_prompt():
    text = PROFILE_README.read_text(encoding="utf-8")

    assert "orchestrator_mvp2_two_agent.md" in text
