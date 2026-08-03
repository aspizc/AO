"""Metrics consumer for sanitized agents-gateway Redis Stream events."""

from __future__ import annotations

import importlib
import json
import os
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, TextIO

DEFAULT_STREAM = "agents:events"
RESTRICTED_PATTERN = re.compile(r"(^|[^a-z0-9])(raw|restricted)([^a-z0-9]|$)", re.IGNORECASE)


@dataclass(frozen=True)
class MetricsConsumerConfig:
    redis_url: str
    redis_stream: str = DEFAULT_STREAM

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> MetricsConsumerConfig:
        source = os.environ if env is None else env
        redis_url = source.get("AGENTS_REDIS_URL", "")
        if not redis_url:
            raise RuntimeError("AGENTS_REDIS_URL is required to run the metrics consumer")
        return cls(
            redis_url=redis_url,
            redis_stream=source.get("AGENTS_REDIS_STREAM") or DEFAULT_STREAM,
        )


@dataclass
class MetricsSnapshot:
    event_counts: Counter[str] = field(default_factory=Counter)
    accepted_events: int = 0
    rejected_events: int = 0
    latency_total_seconds: float = 0.0
    latency_count: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def average_latency_seconds(self) -> float | None:
        if self.latency_count == 0:
            return None
        return self.latency_total_seconds / self.latency_count


class SanitizedEventError(ValueError):
    """Raised when a stream entry contains restricted/raw material."""


def decode_stream_fields(fields: Mapping[Any, Any]) -> dict[str, str]:
    decoded: dict[str, str] = {}
    for key, value in fields.items():
        decoded[_decode_stream_value(key)] = _decode_stream_value(value)
    return decoded


def parse_stream_entry(entry_id: Any, fields: Mapping[Any, Any]) -> dict[str, str]:
    decoded = decode_stream_fields(fields)
    for key, value in decoded.items():
        if _contains_restricted_token(key):
            raise SanitizedEventError(f"{_decode_stream_value(entry_id)} rejected: restricted field {key!r}")
        if _contains_restricted_value(value):
            raise SanitizedEventError(f"{_decode_stream_value(entry_id)} rejected: restricted value in {key!r}")

    event_type = decoded.get("event_type") or decoded.get("type")
    if not event_type:
        raise SanitizedEventError(f"{_decode_stream_value(entry_id)} rejected: missing event_type")
    decoded["event_type"] = event_type
    return decoded


def consume_entries(
    entries: Iterable[Any],
    *,
    observed_at: datetime | None = None,
    stderr: TextIO | None = None,
) -> MetricsSnapshot:
    snapshot = MetricsSnapshot()
    observed = _as_aware_utc(observed_at or datetime.now(timezone.utc))

    for entry_id, fields in iter_stream_entries(entries):
        try:
            event = parse_stream_entry(entry_id, fields)
        except SanitizedEventError as err:
            snapshot.rejected_events += 1
            snapshot.errors.append(str(err))
            continue

        snapshot.accepted_events += 1
        snapshot.event_counts[event["event_type"]] += 1
        _record_latency(snapshot, entry_id, event, observed)

    render_snapshot(snapshot, stderr=stderr)
    return snapshot


def iter_stream_entries(entries: Iterable[Any] | Mapping[Any, Any] | None):
    if entries is None:
        return

    if isinstance(entries, Mapping):
        for stream_entries in entries.values():
            for entry in stream_entries:
                yield _entry_parts(entry)
        return

    for item in entries:
        if _looks_like_xread_stream(item):
            _stream_name, stream_entries = item
            for entry in stream_entries:
                yield _entry_parts(entry)
        else:
            yield _entry_parts(item)


def render_snapshot(snapshot: MetricsSnapshot, *, stderr: TextIO | None = None) -> None:
    out = stderr or sys.stderr
    payload: dict[str, Any] = {
        "component": "metrics_consumer",
        "accepted_events": snapshot.accepted_events,
        "rejected_events": snapshot.rejected_events,
        "event_counts": dict(sorted(snapshot.event_counts.items())),
        "average_latency_seconds": snapshot.average_latency_seconds,
    }
    out.write(json.dumps(payload, sort_keys=True) + "\n")
    for error in snapshot.errors:
        out.write(json.dumps({"component": "metrics_consumer", "level": "error", "error": error}) + "\n")


class RedisStreamReader:
    def __init__(self, redis_client: Any, stream: str, *, start_id: str = "$") -> None:
        self.redis_client = redis_client
        self.stream = stream
        self.last_id = start_id

    def read(self, *, block_ms: int = 5_000, count: int = 100):
        response = self.redis_client.xread({self.stream: self.last_id}, block=block_ms, count=count)
        for entry_id, _fields in iter_stream_entries(response):
            self.last_id = _decode_stream_value(entry_id)
        return response


def create_redis_reader(
    config: MetricsConsumerConfig | None = None,
    *,
    env: Mapping[str, str] | None = None,
    redis_module: Any | None = None,
) -> RedisStreamReader:
    resolved = config or MetricsConsumerConfig.from_env(env)
    module = redis_module
    if module is None:
        try:
            module = importlib.import_module("redis")
        except ImportError as err:
            raise RuntimeError(
                "redis Python dependency is required for the real metrics consumer; "
                'run pip install "orchestrator-langgraph[redis]" or use fake readers in tests'
            ) from err

    client = module.Redis.from_url(resolved.redis_url, decode_responses=False)
    return RedisStreamReader(client, resolved.redis_stream)


def run_once(
    reader: Any,
    *,
    observed_at: datetime | None = None,
    stderr: TextIO | None = None,
) -> MetricsSnapshot:
    entries = reader.read() if hasattr(reader, "read") else reader
    return consume_entries(entries, observed_at=observed_at, stderr=stderr)


def main() -> int:
    reader = create_redis_reader()
    run_once(reader)
    return 0


def _decode_stream_value(value: Any) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return str(value)


def _contains_restricted_token(value: str) -> bool:
    return bool(RESTRICTED_PATTERN.search(value))


def _contains_restricted_value(value: str) -> bool:
    if _contains_restricted_token(value):
        return True
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return False
    return _json_contains_restricted_value(parsed)


def _json_contains_restricted_value(value: Any) -> bool:
    if isinstance(value, dict):
        return any(
            _contains_restricted_token(str(key)) or _json_contains_restricted_value(nested)
            for key, nested in value.items()
        )
    if isinstance(value, list):
        return any(_json_contains_restricted_value(item) for item in value)
    if isinstance(value, str):
        return _contains_restricted_token(value)
    return False


def _entry_parts(entry: Any) -> tuple[Any, Mapping[Any, Any]]:
    if not isinstance(entry, tuple) or len(entry) != 2:
        raise TypeError(f"stream entry must be a two-item tuple, got {entry!r}")
    entry_id, fields = entry
    if not isinstance(fields, Mapping):
        raise TypeError(f"stream entry fields must be a mapping, got {fields!r}")
    return entry_id, fields


def _looks_like_xread_stream(item: Any) -> bool:
    return (
        isinstance(item, tuple | list)
        and len(item) == 2
        and not isinstance(item[1], Mapping)
        and isinstance(item[1], Iterable)
        and all(isinstance(entry, tuple | list) and len(entry) == 2 for entry in item[1])
    )


def _record_latency(
    snapshot: MetricsSnapshot,
    entry_id: Any,
    event: Mapping[str, str],
    observed: datetime,
) -> None:
    timestamp = event.get("timestamp")
    if not timestamp:
        return
    try:
        event_time = _parse_timestamp(timestamp)
    except ValueError as err:
        snapshot.errors.append(f"{_decode_stream_value(entry_id)} timestamp ignored: {err}")
        return

    snapshot.latency_total_seconds += max(0.0, (observed - event_time).total_seconds())
    snapshot.latency_count += 1


def _parse_timestamp(value: str) -> datetime:
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    parsed = datetime.fromisoformat(normalized)
    return _as_aware_utc(parsed)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


if __name__ == "__main__":
    raise SystemExit(main())
