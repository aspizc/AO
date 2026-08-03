"""Temporal activity wrappers for agents-gateway MCP calls."""

from __future__ import annotations

import copy
import json
from dataclasses import asdict, dataclass, field
from typing import Any, Callable, Mapping, Protocol

from orchestrator_langgraph._contracts import raise_on_tool_error
from orchestrator_langgraph.client.gateway_client import GatewayClient
from orchestrator_langgraph.telemetry import TelemetryTracer, create_telemetry_from_env

DELEGATE_ACTIVITY = "delegate_activity"
REVIEW_ACTIVITY = "review_activity"
APPROVAL_REQUEST_ACTIVITY = "approval_request_activity"
PUSH_ACTIVITY = "push_activity"
CHECKPOINT_ACTIVITY = "checkpoint_activity"


@dataclass(frozen=True)
class DelegateActivityInput:
    trace_id: str
    node_name: str
    attempt_number: int
    task_id: str
    prompt: str
    agent: str = "codex"
    role: str = "coder"
    repo: str = "sample-apps"
    cwd: str = "."


@dataclass(frozen=True)
class DelegateActivityOutput:
    activity_id: str
    result: dict[str, Any]


@dataclass(frozen=True)
class ReviewActivityInput:
    trace_id: str
    node_name: str
    attempt_number: int
    task_id: str
    prompt: str
    agent: str = "claude-code"
    role: str = "reviewer"
    repo: str = "sample-apps"
    cwd: str = "."


@dataclass(frozen=True)
class ReviewActivityOutput:
    activity_id: str
    result: dict[str, Any]


@dataclass(frozen=True)
class ApprovalRequestActivityInput:
    trace_id: str
    node_name: str
    attempt_number: int
    action: str
    reason: str
    requested_by: str = "temporal-workflow"
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ApprovalRequestActivityOutput:
    activity_id: str
    approval_id: str | None
    status: str | None
    result: dict[str, Any]


@dataclass(frozen=True)
class PushActivityInput:
    trace_id: str
    node_name: str
    attempt_number: int
    target_branch: str
    produced_by: str = "langgraph"
    classification: str = "internal"


@dataclass(frozen=True)
class PushActivityOutput:
    activity_id: str
    status: str
    mode: str
    target_branch: str
    artifact_id: str | None
    result: dict[str, Any]


@dataclass(frozen=True)
class CheckpointActivityInput:
    trace_id: str
    node_name: str
    attempt_number: int
    status: str
    state: dict[str, Any]
    produced_by: str = "langgraph"
    classification: str = "internal"


@dataclass(frozen=True)
class CheckpointActivityOutput:
    activity_id: str
    artifact_id: str | None
    result: dict[str, Any]


class GatewayContext(Protocol):
    async def __aenter__(self) -> Any:
        ...

    async def __aexit__(self, exc_type, exc, tb) -> None:
        ...


GatewayClientFactory = Callable[..., GatewayContext]


def deterministic_activity_id(trace_id: str, node_name: str, attempt_number: int) -> str:
    return f"{trace_id}:{node_name}:{attempt_number}"


def _default_gateway_client_factory(*, trace_id: str) -> GatewayClient:
    return GatewayClient(trace_id=trace_id)


@dataclass
class GatewayActivityRunner:
    gateway_client_factory: GatewayClientFactory = _default_gateway_client_factory
    telemetry: TelemetryTracer = field(default_factory=create_telemetry_from_env)
    _responses_by_cache_key: dict[tuple[str, str], dict[str, Any]] = field(default_factory=dict)

    async def delegate_activity(self, payload: DelegateActivityInput | Mapping[str, Any]) -> DelegateActivityOutput:
        activity_input = _coerce_dataclass(DelegateActivityInput, payload)
        activity_id = deterministic_activity_id(
            activity_input.trace_id,
            activity_input.node_name,
            activity_input.attempt_number,
        )
        result = await self._cached_call(
            activity_id,
            trace_id=activity_input.trace_id,
            node_name=activity_input.node_name,
            attempt_number=activity_input.attempt_number,
            task_id=activity_input.task_id,
            tool="agent.delegate",
            args={
                "agent": activity_input.agent,
                "role": activity_input.role,
                "repo": activity_input.repo,
                "cwd": activity_input.cwd,
                "traceId": activity_input.trace_id,
                "taskId": activity_input.task_id,
                "prompt": activity_input.prompt,
            },
        )
        return DelegateActivityOutput(activity_id=activity_id, result=result)

    async def review_activity(self, payload: ReviewActivityInput | Mapping[str, Any]) -> ReviewActivityOutput:
        activity_input = _coerce_dataclass(ReviewActivityInput, payload)
        activity_id = deterministic_activity_id(
            activity_input.trace_id,
            activity_input.node_name,
            activity_input.attempt_number,
        )
        result = await self._cached_call(
            activity_id,
            trace_id=activity_input.trace_id,
            node_name=activity_input.node_name,
            attempt_number=activity_input.attempt_number,
            task_id=activity_input.task_id,
            tool="agent.delegate",
            args={
                "agent": activity_input.agent,
                "role": activity_input.role,
                "repo": activity_input.repo,
                "cwd": activity_input.cwd,
                "traceId": activity_input.trace_id,
                "taskId": activity_input.task_id,
                "prompt": activity_input.prompt,
            },
        )
        return ReviewActivityOutput(activity_id=activity_id, result=result)

    async def approval_request_activity(
        self,
        payload: ApprovalRequestActivityInput | Mapping[str, Any],
    ) -> ApprovalRequestActivityOutput:
        activity_input = _coerce_dataclass(ApprovalRequestActivityInput, payload)
        activity_id = deterministic_activity_id(
            activity_input.trace_id,
            activity_input.node_name,
            activity_input.attempt_number,
        )
        result = await self._cached_call(
            activity_id,
            trace_id=activity_input.trace_id,
            node_name=activity_input.node_name,
            attempt_number=activity_input.attempt_number,
            tool="approval.request",
            args={
                "traceId": activity_input.trace_id,
                "action": activity_input.action,
                "requestedBy": activity_input.requested_by,
                "context": {
                    **dict(activity_input.context),
                    "reason": activity_input.reason,
                },
            },
        )
        return ApprovalRequestActivityOutput(
            activity_id=activity_id,
            approval_id=result.get("approvalId"),
            status=result.get("status"),
            result=result,
        )

    async def push_activity(self, payload: PushActivityInput | Mapping[str, Any]) -> PushActivityOutput:
        activity_input = _coerce_dataclass(PushActivityInput, payload)
        activity_id = deterministic_activity_id(
            activity_input.trace_id,
            activity_input.node_name,
            activity_input.attempt_number,
        )
        result = await self._cached_call(
            activity_id,
            trace_id=activity_input.trace_id,
            node_name=activity_input.node_name,
            attempt_number=activity_input.attempt_number,
            tool="artifact.put",
            args={
                "traceId": activity_input.trace_id,
                "kind": "push_intent",
                "classification": activity_input.classification,
                "producedBy": activity_input.produced_by,
                "content": f"Dry-run push intent for {activity_input.target_branch}",
            },
        )
        return PushActivityOutput(
            activity_id=activity_id,
            status="push_ready",
            mode="dry_run",
            target_branch=activity_input.target_branch,
            artifact_id=result.get("artifactId"),
            result=result,
        )

    async def checkpoint_activity(
        self,
        payload: CheckpointActivityInput | Mapping[str, Any],
    ) -> CheckpointActivityOutput:
        activity_input = _coerce_dataclass(CheckpointActivityInput, payload)
        activity_id = deterministic_activity_id(
            activity_input.trace_id,
            activity_input.node_name,
            activity_input.attempt_number,
        )
        result = await self._cached_call(
            activity_id,
            trace_id=activity_input.trace_id,
            node_name=activity_input.node_name,
            attempt_number=activity_input.attempt_number,
            tool="artifact.put",
            args={
                "traceId": activity_input.trace_id,
                "kind": "workflow_checkpoint",
                "classification": activity_input.classification,
                "producedBy": activity_input.produced_by,
                "content": json.dumps(
                    {
                        "activity_id": activity_id,
                        "node_name": activity_input.node_name,
                        "attempt_number": activity_input.attempt_number,
                        "status": activity_input.status,
                        "state": activity_input.state,
                    },
                    sort_keys=True,
                ),
            },
        )
        return CheckpointActivityOutput(
            activity_id=activity_id,
            artifact_id=result.get("artifactId"),
            result=result,
        )

    async def _cached_call(
        self,
        activity_id: str,
        *,
        trace_id: str,
        node_name: str,
        attempt_number: int,
        tool: str,
        args: Mapping[str, Any],
        task_id: str | None = None,
    ) -> dict[str, Any]:
        cache_key = (tool, activity_id)
        if cache_key in self._responses_by_cache_key:
            return copy.deepcopy(self._responses_by_cache_key[cache_key])

        span = self.telemetry.start_span(
            "activity.gateway_call",
            trace_id=trace_id,
            attributes={
                "trace_id": trace_id,
                "task_id": task_id,
                "node_name": node_name,
                "activity_name": tool,
                "attempt": attempt_number,
            },
        )
        try:
            async with self.gateway_client_factory(trace_id=trace_id) as gateway_client:
                result = await gateway_client.call_tool(tool, args)
            raise_on_tool_error(result, tool)
        except Exception as err:
            span.set_attributes({"status": "error", "error_code": _error_code(err)})
            span.set_status("ERROR")
            span.record_exception(err)
            span.end()
            raise
        span.set_attribute("status", "ok")
        span.set_status("OK")
        span.end()
        self._responses_by_cache_key[cache_key] = copy.deepcopy(result)
        return copy.deepcopy(result)


def build_temporal_activity_wrappers(activity_module: Any) -> list[Any]:
    runner = GatewayActivityRunner()

    async def delegate_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return asdict(await runner.delegate_activity(payload))

    async def review_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return asdict(await runner.review_activity(payload))

    async def approval_request_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return asdict(await runner.approval_request_activity(payload))

    async def push_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return asdict(await runner.push_activity(payload))

    async def checkpoint_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return asdict(await runner.checkpoint_activity(payload))

    return [
        activity_module.defn(name=DELEGATE_ACTIVITY)(delegate_activity),
        activity_module.defn(name=REVIEW_ACTIVITY)(review_activity),
        activity_module.defn(name=APPROVAL_REQUEST_ACTIVITY)(approval_request_activity),
        activity_module.defn(name=PUSH_ACTIVITY)(push_activity),
        activity_module.defn(name=CHECKPOINT_ACTIVITY)(checkpoint_activity),
    ]


def _error_code(err: BaseException) -> str:
    return type(err).__name__


def _coerce_dataclass(cls: type[Any], payload: Any) -> Any:
    if isinstance(payload, cls):
        return payload
    if isinstance(payload, Mapping):
        return cls(**dict(payload))
    raise TypeError(f"{cls.__name__} payload must be a mapping or {cls.__name__}")
