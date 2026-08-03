import pytest

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state


@pytest.mark.parametrize(
    "payload",
    [
        {"error": "INVALID_INPUT", "message": "missing field"},
        {"code": "TIMEOUT", "message": "agent.delegate timed out"},
        {"tool_error": "POLICY_DENIED", "decision": {"allowed": False}},
        {"isError": True, "message": "MCP envelope marked the call as failed"},
        {"error": "TOOL_ERROR", "code": "TOOL_ERROR", "message": "boom"},
    ],
)
def test_raise_on_tool_error_detects_all_gateway_error_fields(payload):
    with pytest.raises(RuntimeError) as exc_info:
        raise_on_tool_error(payload, "agent.delegate")

    message = str(exc_info.value)
    assert "Gateway tool agent.delegate failed" in message
    assert "payload=" in message


def test_raise_on_tool_error_truncates_and_redacts_payload():
    payload = {
        "error": "TOOL_ERROR",
        "prompt": "do not expose this prompt",
        "content": "x" * 1000,
    }

    with pytest.raises(RuntimeError) as exc_info:
        raise_on_tool_error(payload, "artifact.put")

    message = str(exc_info.value)
    assert len(message) < 700
    assert "do not expose this prompt" not in message
    assert "x" * 100 not in message
    assert "<redacted>" in message


def test_raise_on_tool_error_allows_success_payloads():
    raise_on_tool_error({"ok": True, "isError": False}, "demo.ok")


@pytest.mark.parametrize("state", [{}, {"trace_id": ""}, {"trace_id": None}])
def test_require_state_rejects_missing_or_empty_values(state):
    with pytest.raises(RuntimeError, match="state missing required key: trace_id"):
        require_state(state, "trace_id")


def test_require_state_returns_present_value_as_string():
    assert require_state({"trace_id": "tr-123"}, "trace_id") == "tr-123"
    assert require_state({"attempt": 2}, "attempt") == "2"
