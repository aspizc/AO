from pathlib import Path


PROMPT = Path(__file__).resolve().parents[2] / "prompts" / "orchestrator_system_prompt.md"


def _text():
    return PROMPT.read_text(encoding="utf-8")


def test_prompt_exists():
    assert PROMPT.is_file()


def test_prompt_mentions_gateway_and_task_assign():
    text = _text()
    assert "agents-gateway" in text
    assert "task.assign" in text


def test_prompt_denies_direct_code_write():
    text = _text().lower()
    assert "do **not** write code" in text or "do not write code" in text


def test_prompt_denies_raw_restricted_access():
    text = _text().lower()
    assert "raw" in text
    assert "restricted" in text
    assert "sanitized" in text


def test_prompt_mentions_approval_request_async():
    text = _text()
    assert "approval.request" in text
    assert "non-blocking" in text
    assert "approval.poll" in text
    assert "approval.wait" in text


def test_prompt_mentions_policy_decision_values():
    text = _text()
    for decision in ("allow", "deny", "require_approval", "allow_with_sanitization"):
        assert decision in text


def test_prompt_has_no_ide_specific_terminology():
    text = _text()
    for forbidden in ("Cursor", "Antigravity", ".mdc", ".cursor"):
        assert forbidden not in text
