"""Shared contracts for decoded agents-gateway tool responses."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

ERROR_FIELDS = ("error", "code", "tool_error", "isError")
MAX_PAYLOAD_CHARS = 500
REDACTED_KEYS = {
    "authorization",
    "content",
    "password",
    "prompt",
    "secret",
    "stderr",
    "stdout",
    "token",
}


def raise_on_tool_error(result: Mapping[str, Any], tool: str) -> None:
    """Raise when a decoded Gateway result carries any known error marker."""

    if not any(result.get(field) for field in ERROR_FIELDS):
        return
    raise RuntimeError(f"Gateway tool {tool} failed: payload={_format_payload(result)}")


def require_state(state: Mapping[str, Any], key: str) -> str:
    """Return a required state value as a string, rejecting missing or empty values."""

    value = state.get(key)
    if not value:
        raise RuntimeError(f"state missing required key: {key}")
    return str(value)


def _format_payload(payload: Mapping[str, Any]) -> str:
    rendered = repr(_redact(payload))
    if len(rendered) <= MAX_PAYLOAD_CHARS:
        return rendered
    return f"{rendered[:MAX_PAYLOAD_CHARS]}...<truncated>"


def _redact(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            key: "<redacted>" if _is_sensitive_key(key) else _redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_redact(item) for item in value)
    return value


def _is_sensitive_key(key: Any) -> bool:
    lowered = str(key).lower()
    return any(marker in lowered for marker in REDACTED_KEYS)
