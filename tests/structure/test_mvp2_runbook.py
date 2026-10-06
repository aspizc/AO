from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
RUNBOOK = ROOT / "docs" / "mvp2-orchestrator-runbook.md"
README = ROOT / "README.md"
OPERATOR_GUIDE = ROOT / "docs" / "operator-guide.md"


def _text():
    return RUNBOOK.read_text(encoding="utf-8")


def test_mvp2_runbook_exists():
    assert RUNBOOK.is_file()


def test_mvp2_runbook_covers_prereqs_install_and_dry_run():
    text = _text()

    for token in ("node", "tmux", "codex", "claude", "uv pip sync --require-hashes requirements.lock", "npm --prefix gateway ci"):
        assert token in text
    assert "AGENTS_DRY_RUN=1" in text
    assert "node scripts/smoke_mcp.mjs" in text


def test_mvp2_runbook_covers_real_profile_and_prompt():
    text = _text()

    assert "client-config/profiles/codex-coder-claude-reviewer/.env.example" in text
    assert "client-config/profiles/codex-coder-claude-reviewer/mcp.json" in text
    assert "prompts/orchestrator_mvp2_two_agent.md" in text
    assert "AGENTS_POLICIES_DIR=./policies" in text
    assert "AGENTS_REPO_ROOTS" in text


def test_mvp2_runbook_covers_launch_observe_and_verify():
    text = _text()

    assert "agent.spawn" in text
    assert "tmux ls" in text
    assert "tmux attach -t" in text
    assert "session.attach_info" in text
    assert "workspace/artifacts" in text
    assert "workspace/audit/events.jsonl" in text
    assert "SESSION_STARTED" in text
    assert "AGENT_MODEL_RESOLVED" in text


def test_mvp2_runbook_is_host_agnostic_and_links_from_docs():
    text = _text()

    for forbidden in ("Cursor", "Antigravity", ".mdc", ".cursor"):
        assert forbidden not in text
    assert "mvp2-orchestrator-runbook.md" in README.read_text(encoding="utf-8")
    assert "mvp2-orchestrator-runbook.md" in OPERATOR_GUIDE.read_text(encoding="utf-8")


def test_mvp2_runbook_has_troubleshooting():
    text = _text()

    for symptom in ("Codex disabled", "cwd", "tmux", "model", "login"):
        assert symptom in text
