from __future__ import annotations

import importlib
import io
import json
from datetime import datetime, timezone

import pytest

from orchestrator_langgraph.consumers.metrics import (
    DEFAULT_STREAM,
    MetricsConsumerConfig,
    RedisStreamReader,
    consume_entries,
    create_redis_reader,
    run_once,
)


def stderr_lines(stderr):
    return [json.loads(line) for line in stderr.getvalue().splitlines()]


def test_consume_entries_counts_events_and_average_latency():
    stderr = io.StringIO()
    observed_at = datetime(2026, 1, 1, 0, 0, 3, tzinfo=timezone.utc)

    snapshot = consume_entries(
        [
            (
                b"1-0",
                {
                    b"event_type": b"gateway_tool_call",
                    b"timestamp": b"2026-01-01T00:00:00.000Z",
                    b"metadata": b'{"tool":"agent.delegate"}',
                },
            ),
            (
                b"2-0",
                {
                    b"event_type": b"gateway_tool_call",
                    b"timestamp": b"2026-01-01T00:00:02+00:00",
                },
            ),
            (b"3-0", {b"event_type": b"approval_requested"}),
        ],
        observed_at=observed_at,
        stderr=stderr,
    )

    assert snapshot.accepted_events == 3
    assert snapshot.rejected_events == 0
    assert snapshot.event_counts == {"approval_requested": 1, "gateway_tool_call": 2}
    assert snapshot.average_latency_seconds == 2.0
    assert stderr_lines(stderr)[0] == {
        "component": "metrics_consumer",
        "accepted_events": 3,
        "rejected_events": 0,
        "event_counts": {"approval_requested": 1, "gateway_tool_call": 2},
        "average_latency_seconds": 2.0,
    }


def test_consume_entries_rejects_restricted_or_raw_fields_and_values():
    stderr = io.StringIO()

    snapshot = consume_entries(
        [
            (b"1-0", {b"event_type": b"safe_event"}),
            (b"2-0", {b"event_type": b"safe_event", b"raw_diff": b"redacted"}),
            (b"3-0", {b"event_type": b"safe_event", b"metadata": b'{"classification":"restricted"}'}),
            (b"4-0", {b"event_type": b"safe_event", b"note": b"contains raw output"}),
        ],
        stderr=stderr,
    )

    assert snapshot.accepted_events == 1
    assert snapshot.rejected_events == 3
    assert snapshot.event_counts == {"safe_event": 1}
    errors = stderr_lines(stderr)[1:]
    assert len(errors) == 3
    assert all(error["level"] == "error" for error in errors)
    assert "restricted field 'raw_diff'" in errors[0]["error"]
    assert "restricted value in 'metadata'" in errors[1]["error"]
    assert "restricted value in 'note'" in errors[2]["error"]


def test_run_once_accepts_fake_reader_with_xread_shape():
    class FakeReader:
        def read(self):
            return [
                (
                    b"agents:events",
                    [
                        (b"1-0", {b"event_type": b"gateway_tool_call"}),
                        (b"2-0", {b"event_type": b"approval_requested"}),
                    ],
                )
            ]

    snapshot = run_once(FakeReader(), stderr=io.StringIO())

    assert snapshot.accepted_events == 2
    assert snapshot.event_counts == {"approval_requested": 1, "gateway_tool_call": 1}


def test_consume_entries_accepts_redis_xread_list_outer_shape():
    snapshot = consume_entries(
        [
            [
                b"agents:events",
                [
                    (b"1-0", {b"event_type": b"gateway_tool_call"}),
                    (b"2-0", {b"event_type": b"approval_requested"}),
                ],
            ]
        ],
        stderr=io.StringIO(),
    )

    assert snapshot.accepted_events == 2
    assert snapshot.event_counts == {"approval_requested": 1, "gateway_tool_call": 1}


def test_redis_stream_reader_advances_last_id_for_xread_list_outer_shape():
    class FakeRedisClient:
        def xread(self, streams, block, count):
            assert streams == {"agents:events": "$"}
            return [[b"agents:events", [(b"1-0", {b"event_type": b"gateway_tool_call"})]]]

    reader = RedisStreamReader(FakeRedisClient(), "agents:events")

    response = reader.read()

    assert response == [[b"agents:events", [(b"1-0", {b"event_type": b"gateway_tool_call"})]]]
    assert reader.last_id == "1-0"


def test_consume_entries_accepts_redis_xread_dict_shape():
    snapshot = consume_entries(
        {
            b"agents:events": [
                (b"3-0", {b"event_type": b"gateway_tool_call"}),
                (b"4-0", {b"event_type": b"approval_requested"}),
            ]
        },
        stderr=io.StringIO(),
    )

    assert snapshot.accepted_events == 2
    assert snapshot.event_counts == {"approval_requested": 1, "gateway_tool_call": 1}


def test_redis_stream_reader_advances_last_id_for_xread_dict_shape():
    class FakeRedisClient:
        def xread(self, streams, block, count):
            assert streams == {"agents:events": "$"}
            return {b"agents:events": [(b"3-0", {b"event_type": b"gateway_tool_call"})]}

    reader = RedisStreamReader(FakeRedisClient(), "agents:events")

    response = reader.read()

    assert response == {b"agents:events": [(b"3-0", {b"event_type": b"gateway_tool_call"})]}
    assert reader.last_id == "3-0"


def test_idle_redis_xread_none_is_treated_as_empty_batch():
    class FakeRedisClient:
        def xread(self, streams, block, count):
            assert streams == {"agents:events": "$"}
            return None

    reader = RedisStreamReader(FakeRedisClient(), "agents:events")

    snapshot = run_once(reader, stderr=io.StringIO())

    assert reader.last_id == "$"
    assert snapshot.accepted_events == 0
    assert snapshot.rejected_events == 0
    assert snapshot.event_counts == {}


def test_config_requires_redis_url_and_defaults_stream():
    with pytest.raises(RuntimeError, match="AGENTS_REDIS_URL is required"):
        MetricsConsumerConfig.from_env({})

    config = MetricsConsumerConfig.from_env({"AGENTS_REDIS_URL": "redis://localhost:6379/0"})

    assert config.redis_url == "redis://localhost:6379/0"
    assert config.redis_stream == DEFAULT_STREAM


def test_create_redis_reader_raises_clear_error_when_redis_dependency_missing(monkeypatch):
    real_import_module = importlib.import_module

    def fake_import_module(name):
        if name == "redis":
            raise ImportError("missing")
        return real_import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    with pytest.raises(RuntimeError, match="redis Python dependency is required"):
        create_redis_reader(MetricsConsumerConfig(redis_url="redis://localhost:6379/0"))


def test_create_redis_reader_uses_env_and_injected_redis_module():
    class FakeRedisClient:
        def __init__(self):
            self.calls = []

        def xread(self, streams, block, count):
            self.calls.append((streams, block, count))
            return [(b"custom:stream", [(b"5-0", {b"event_type": b"safe_event"})])]

    class FakeRedisFactory:
        client = FakeRedisClient()

        @classmethod
        def from_url(cls, url, decode_responses):
            cls.url = url
            cls.decode_responses = decode_responses
            return cls.client

    class FakeRedisModule:
        Redis = FakeRedisFactory

    reader = create_redis_reader(
        env={
            "AGENTS_REDIS_URL": "redis://example:6379/0",
            "AGENTS_REDIS_STREAM": "custom:stream",
        },
        redis_module=FakeRedisModule,
    )

    snapshot = run_once(reader, stderr=io.StringIO())

    assert FakeRedisFactory.url == "redis://example:6379/0"
    assert FakeRedisFactory.decode_responses is False
    assert FakeRedisFactory.client.calls == [({"custom:stream": "$"}, 5000, 100)]
    assert reader.last_id == "5-0"
    assert snapshot.event_counts == {"safe_event": 1}
