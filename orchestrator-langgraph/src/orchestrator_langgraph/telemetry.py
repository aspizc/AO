"""Dependency-free OTel-inspired telemetry helpers."""

from __future__ import annotations

import json
import os
import sys
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol

TRUE_VALUES = {"1", "true", "yes", "on"}
SAFE_ATTRIBUTE_KEYS = {
    "trace_id",
    "task_id",
    "session_id",
    "node_name",
    "activity_name",
    "attempt",
    "status",
    "error_code",
}


class SpanExporter(Protocol):
    def export(self, span: Mapping[str, Any]) -> None:
        ...


@dataclass
class InMemorySpanExporter:
    spans: list[dict[str, Any]] = field(default_factory=list)

    def export(self, span: Mapping[str, Any]) -> None:
        self.spans.append(dict(span))

    def reset(self) -> None:
        self.spans.clear()


class NoopSpanExporter:
    def export(self, _span: Mapping[str, Any]) -> None:
        return None


class StderrSpanExporter:
    def export(self, span: Mapping[str, Any]) -> None:
        sys.stderr.write(f"{json.dumps({'type': 'otel_span', **dict(span)}, sort_keys=True)}\n")


def env_flag(value: str | None) -> bool:
    return str(value or "").strip().lower() in TRUE_VALUES


def safe_attributes(attributes: Mapping[str, Any] | None = None) -> dict[str, str]:
    safe: dict[str, str] = {}
    for key, value in dict(attributes or {}).items():
        if key not in SAFE_ATTRIBUTE_KEYS or value is None:
            continue
        normalized = str(value)[:256]
        if normalized:
            safe[key] = normalized
    return safe


@dataclass
class TelemetryTracer:
    enabled: bool = False
    exporter: SpanExporter = field(default_factory=NoopSpanExporter)
    service_name: str = "orchestrator-langgraph"
    realtime: bool = False

    def start_span(self, name: str, *, trace_id: str | None = None, attributes: Mapping[str, Any] | None = None):
        if not self.enabled:
            return NoopSpan()
        return TelemetrySpan(
            name=name,
            trace_id=trace_id,
            service_name=self.service_name,
            exporter=self.exporter,
            attributes=safe_attributes(attributes),
            realtime=self.realtime,
        )


class NoopSpan:
    def set_attribute(self, _key: str, _value: Any) -> None:
        return None

    def set_attributes(self, _attributes: Mapping[str, Any] | None = None) -> None:
        return None

    def set_status(self, _code: str) -> None:
        return None

    def record_exception(self, _err: BaseException) -> None:
        return None

    def end(self) -> None:
        return None


@dataclass
class TelemetrySpan:
    name: str
    trace_id: str | None
    service_name: str
    exporter: SpanExporter
    attributes: dict[str, str]
    realtime: bool = False
    status: dict[str, str] = field(default_factory=lambda: {"code": "UNSET"})
    events: list[dict[str, Any]] = field(default_factory=list)
    ended: bool = False
    span_id: str | None = field(init=False, default=None)
    start_time_unix_nano: int | None = field(init=False, default=None)

    def __post_init__(self) -> None:
        if self.realtime:
            self.span_id = str(uuid.uuid4())
            self.start_time_unix_nano = time.time_ns()

    def set_attribute(self, key: str, value: Any) -> None:
        self.attributes.update(safe_attributes({key: value}))

    def set_attributes(self, attributes: Mapping[str, Any] | None = None) -> None:
        self.attributes.update(safe_attributes(attributes))

    def set_status(self, code: str) -> None:
        self.status = {"code": code if code in {"OK", "ERROR", "UNSET"} else "UNSET"}

    def record_exception(self, err: BaseException) -> None:
        self.set_attribute("error_code", type(err).__name__)
        self.events.append({"name": "exception", "attributes": {"error_code": type(err).__name__}})

    def end(self) -> None:
        if self.ended:
            return
        self.ended = True
        span: dict[str, Any] = {
            "resource": {"service.name": self.service_name},
            "name": self.name,
            "trace_id": self.trace_id,
            "attributes": dict(self.attributes),
            "status": dict(self.status),
            "events": list(self.events),
        }
        if self.realtime:
            span["span_id"] = self.span_id
            span["start_time_unix_nano"] = self.start_time_unix_nano
            span["end_time_unix_nano"] = time.time_ns()
        self.exporter.export(span)


def create_telemetry_from_env(env: Mapping[str, str] | None = None) -> TelemetryTracer:
    resolved_env = os.environ if env is None else env
    enabled = env_flag(resolved_env.get("AGENTS_OTEL_ENABLED"))
    exporter: SpanExporter = NoopSpanExporter()
    if enabled:
        exporter = StderrSpanExporter()
    return TelemetryTracer(
        enabled=enabled,
        exporter=exporter,
        service_name=resolved_env.get("AGENTS_OTEL_SERVICE_NAME", "orchestrator-langgraph"),
        realtime=True,
    )
