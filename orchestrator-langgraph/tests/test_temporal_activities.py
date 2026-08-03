from __future__ import annotations

import asyncio
from dataclasses import asdict
from typing import Any, Mapping

import pytest

from orchestrator_langgraph.activities import (
    APPROVAL_REQUEST_ACTIVITY,
    CHECKPOINT_ACTIVITY,
    DELEGATE_ACTIVITY,
    PUSH_ACTIVITY,
    REVIEW_ACTIVITY,
    ApprovalRequestActivityInput,
    CheckpointActivityInput,
    DelegateActivityInput,
    GatewayActivityRunner,
    PushActivityInput,
    ReviewActivityInput,
    build_temporal_activity_wrappers,
    deterministic_activity_id,
)
from orchestrator_langgraph.telemetry import InMemorySpanExporter, TelemetryTracer


class RecordingGateway:
    def __init__(
        self,
        calls: list[tuple[str, str, dict[str, Any]]],
        trace_id: str,
        response: dict[str, Any] | None = None,
        error: Exception | None = None,
    ):
        self._calls = calls
        self._trace_id = trace_id
        self._response = response or {"sessionId": "ss-1", "stdout": "ok"}
        self._error = error

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return None

    async def call_tool(self, name: str, args: Mapping[str, Any] | None = None) -> dict[str, Any]:
        self._calls.append((self._trace_id, name, dict(args or {})))
        if self._error:
            raise self._error
        return dict(self._response)


def test_activity_id_is_deterministic_from_trace_node_and_attempt():
    assert deterministic_activity_id("tr-1", "review", 2) == "tr-1:review:2"


def test_delegate_activity_calls_gateway_with_trace_and_schema_safe_args():
    asyncio.run(_assert_delegate_activity_calls_gateway_with_trace_and_schema_safe_args())


async def _assert_delegate_activity_calls_gateway_with_trace_and_schema_safe_args():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(calls, trace_id)
    )

    output = await runner.delegate_activity(
        DelegateActivityInput(
            trace_id="tr-delegate",
            node_name="implement",
            attempt_number=3,
            task_id="ts-1",
            prompt="Do the task.",
        )
    )

    assert output.activity_id == "tr-delegate:implement:3"
    assert output.result == {"sessionId": "ss-1", "stdout": "ok"}
    assert calls == [
        (
            "tr-delegate",
            "agent.delegate",
            {
                "agent": "codex",
                "role": "coder",
                "repo": "sample-apps",
                "cwd": ".",
                "traceId": "tr-delegate",
                "taskId": "ts-1",
                "prompt": "Do the task.",
            },
        )
    ]
    assert "metadata" not in calls[0][2]
    assert "context" not in calls[0][2]


def test_repeated_activity_id_returns_cached_response_without_second_gateway_call():
    asyncio.run(_assert_repeated_activity_id_returns_cached_response_without_second_gateway_call())


async def _assert_repeated_activity_id_returns_cached_response_without_second_gateway_call():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            calls,
            trace_id,
            {"sessionId": f"ss-{len(calls) + 1}", "stdout": "ok"},
        )
    )
    payload = {
        "trace_id": "tr-cache",
        "node_name": "review",
        "attempt_number": 1,
        "task_id": "ts-review",
        "prompt": "Review it.",
    }

    first = await runner.review_activity(payload)
    second = await runner.review_activity(payload)

    assert first == second
    assert first.result == {"sessionId": "ss-1", "stdout": "ok"}
    assert len(calls) == 1


def test_cache_key_includes_tool_to_avoid_cross_activity_collisions():
    asyncio.run(_assert_cache_key_includes_tool_to_avoid_cross_activity_collisions())


async def _assert_cache_key_includes_tool_to_avoid_cross_activity_collisions():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            calls,
            trace_id,
            {"artifactId": f"art-{len(calls) + 1}"},
        )
    )

    await runner.delegate_activity(
        DelegateActivityInput(
            trace_id="tr-collision",
            node_name="same-node",
            attempt_number=1,
            task_id="ts-1",
            prompt="Delegate.",
        )
    )
    await runner.push_activity(
        PushActivityInput(
            trace_id="tr-collision",
            node_name="same-node",
            attempt_number=1,
            target_branch="main",
        )
    )

    assert [call[1] for call in calls] == ["agent.delegate", "artifact.put"]


def test_gateway_client_exceptions_are_not_swallowed():
    asyncio.run(_assert_gateway_client_exceptions_are_not_swallowed())


async def _assert_gateway_client_exceptions_are_not_swallowed():
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            [],
            trace_id,
            error=RuntimeError("mcp failed"),
        )
    )

    with pytest.raises(RuntimeError, match="mcp failed"):
        await runner.delegate_activity(
            DelegateActivityInput(
                trace_id="tr-error",
                node_name="implement",
                attempt_number=1,
                task_id="ts-1",
                prompt="Do the task.",
            )
        )


def test_gateway_tool_error_results_fail_visibly():
    asyncio.run(_assert_gateway_tool_error_results_fail_visibly())


async def _assert_gateway_tool_error_results_fail_visibly():
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            [],
            trace_id,
            {"error": "TOOL_ERROR", "code": "TOOL_ERROR", "message": "permission denied"},
        )
    )

    with pytest.raises(RuntimeError, match="Gateway tool agent.delegate failed"):
        await runner.review_activity(
            ReviewActivityInput(
                trace_id="tr-tool-error",
                node_name="review",
                attempt_number=1,
                task_id="ts-review",
                prompt="Review it.",
            )
        )


def test_activity_telemetry_records_attributes_and_error_status():
    asyncio.run(_assert_activity_telemetry_records_attributes_and_error_status())


async def _assert_activity_telemetry_records_attributes_and_error_status():
    exporter = InMemorySpanExporter()
    telemetry = TelemetryTracer(enabled=True, exporter=exporter)
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            [],
            trace_id,
            {"error": "TOOL_ERROR", "code": "TOOL_ERROR", "message": "permission denied"},
        ),
        telemetry=telemetry,
    )

    with pytest.raises(RuntimeError):
        await runner.delegate_activity(
            DelegateActivityInput(
                trace_id="tr-activity-error",
                node_name="implement",
                attempt_number=2,
                task_id="ts-activity",
                prompt="must not be recorded",
            )
        )

    assert len(exporter.spans) == 1
    span = exporter.spans[0]
    assert span["name"] == "activity.gateway_call"
    assert span["trace_id"] == "tr-activity-error"
    assert span["status"]["code"] == "ERROR"
    assert span["attributes"] == {
        "trace_id": "tr-activity-error",
        "task_id": "ts-activity",
        "node_name": "implement",
        "activity_name": "agent.delegate",
        "attempt": "2",
        "status": "error",
        "error_code": "RuntimeError",
    }
    assert "prompt" not in span["attributes"]


def test_push_activity_returns_push_contract_and_uses_artifact_put():
    asyncio.run(_assert_push_activity_returns_push_contract_and_uses_artifact_put())


async def _assert_push_activity_returns_push_contract_and_uses_artifact_put():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            calls,
            trace_id,
            {"artifactId": "art-push", "kind": "push_intent"},
        )
    )

    output = await runner.push_activity(
        PushActivityInput(
            trace_id="tr-push",
            node_name="push",
            attempt_number=1,
            target_branch="main",
            produced_by="ss-review",
        )
    )

    assert asdict(output) == {
        "activity_id": "tr-push:push:1",
        "status": "push_ready",
        "mode": "dry_run",
        "target_branch": "main",
        "artifact_id": "art-push",
        "result": {"artifactId": "art-push", "kind": "push_intent"},
    }
    assert calls[0][1] == "artifact.put"
    assert calls[0][2]["traceId"] == "tr-push"
    assert "metadata" not in calls[0][2]
    assert "context" not in calls[0][2]


def test_approval_request_activity_calls_gateway_approval_request():
    asyncio.run(_assert_approval_request_activity_calls_gateway_approval_request())


async def _assert_approval_request_activity_calls_gateway_approval_request():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            calls,
            trace_id,
            {"approvalId": "apr-push", "status": "pending"},
        )
    )

    output = await runner.approval_request_activity(
        ApprovalRequestActivityInput(
            trace_id="tr-approval",
            node_name="approval_request",
            attempt_number=1,
            action="git.push",
            reason="Push reviewed changes.",
            requested_by="temporal-workflow",
            context={"targetBranch": "feature/test"},
        )
    )

    assert asdict(output) == {
        "activity_id": "tr-approval:approval_request:1",
        "approval_id": "apr-push",
        "status": "pending",
        "result": {"approvalId": "apr-push", "status": "pending"},
    }
    assert calls == [
        (
            "tr-approval",
            "approval.request",
            {
                "traceId": "tr-approval",
                "action": "git.push",
                "requestedBy": "temporal-workflow",
                "context": {
                    "targetBranch": "feature/test",
                    "reason": "Push reviewed changes.",
                },
            },
        )
    ]


def test_checkpoint_activity_persists_workflow_state_via_artifact_put():
    asyncio.run(_assert_checkpoint_activity_persists_workflow_state_via_artifact_put())


async def _assert_checkpoint_activity_persists_workflow_state_via_artifact_put():
    calls: list[tuple[str, str, dict[str, Any]]] = []
    runner = GatewayActivityRunner(
        gateway_client_factory=lambda *, trace_id: RecordingGateway(
            calls,
            trace_id,
            {"artifactId": "art-checkpoint", "kind": "workflow_checkpoint"},
        )
    )

    output = await runner.checkpoint_activity(
        CheckpointActivityInput(
            trace_id="tr-checkpoint",
            node_name="checkpoint_test",
            attempt_number=2,
            status="tested",
            state={"passed": True},
            produced_by="session-1",
        )
    )

    assert output.artifact_id == "art-checkpoint"
    assert calls[0][1] == "artifact.put"
    assert calls[0][2]["kind"] == "workflow_checkpoint"
    assert calls[0][2]["producedBy"] == "session-1"
    assert '"status": "tested"' in calls[0][2]["content"]


def test_temporal_wrappers_are_decorated_with_expected_names():
    def fake_activity_defn(*, name):
        def decorate(fn):
            fn._activity_name = name
            return fn

        return decorate

    activities = build_temporal_activity_wrappers(
        type("ActivityModule", (), {"defn": staticmethod(fake_activity_defn)})
    )

    assert [activity._activity_name for activity in activities] == [
        DELEGATE_ACTIVITY,
        REVIEW_ACTIVITY,
        APPROVAL_REQUEST_ACTIVITY,
        PUSH_ACTIVITY,
        CHECKPOINT_ACTIVITY,
    ]
