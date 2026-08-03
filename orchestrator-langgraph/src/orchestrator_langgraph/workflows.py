"""Temporal workflow scaffolds for orchestrator-langgraph."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, fields
from datetime import timedelta
from typing import Any, Awaitable, Callable, Mapping

from orchestrator_langgraph.activities import (
    APPROVAL_REQUEST_ACTIVITY,
    CHECKPOINT_ACTIVITY,
    DELEGATE_ACTIVITY,
    PUSH_ACTIVITY,
    REVIEW_ACTIVITY,
)
from orchestrator_langgraph.telemetry import TelemetryTracer

IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW = "implement_test_review_push"


try:
    from temporalio import workflow
    from temporalio.common import RetryPolicy
except ImportError:

    class _WorkflowFallback:
        def defn(self, **_kwargs):
            def decorate(cls):
                return cls

            return decorate

        def run(self, fn):
            return fn

        async def execute_activity(self, *_args, **_kwargs):
            raise RuntimeError("temporalio is required to execute Temporal activities")

        async def wait_condition(self, *_args, **_kwargs):
            raise RuntimeError("temporalio is required to wait for workflow signals")

        def signal(self, fn=None, **_kwargs):
            def decorate(signal_fn):
                return signal_fn

            return decorate(fn) if fn else decorate

    workflow = _WorkflowFallback()

    class RetryPolicy:
        def __init__(self, *, maximum_attempts: int):
            self.maximum_attempts = maximum_attempts


ActivityExecutor = Callable[[str, dict[str, Any]], Awaitable[dict[str, Any]]]
ApprovalSignalWaiter = Callable[[dict[str, Any], int], Awaitable[dict[str, Any] | None]]


@dataclass(frozen=True)
class ImplementTestReviewPushWorkflowInput:
    task_id: str
    session_id: str
    trace_id: str
    repo: str
    cwd: str
    target_branch: str
    max_attempts: int
    implement_prompt: str
    test_prompt: str
    review_prompt: str
    implement_agent: str = "codex"
    implement_role: str = "coder"
    test_agent: str = "codex"
    test_role: str = "tester"
    review_agent: str = "claude-code"
    review_role: str = "reviewer"
    push_classification: str = "internal"
    checkpoint_classification: str = "internal"
    activity_timeout_seconds: int = 300
    activity_retry_max_attempts: int = 1
    approval_action: str = "git.push"
    approval_reason: str = "Push reviewed changes."
    approval_timeout_seconds: int = 86400


@workflow.defn(name=IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW)
class ImplementTestReviewPushWorkflow:
    def __init__(self) -> None:
        self._approval_response: dict[str, Any] | None = None

    @workflow.signal(name="approval_response")
    def approval_response(self, response: dict[str, Any]) -> None:
        self._approval_response = dict(response)

    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        workflow_input = coerce_workflow_input(payload)
        self._approval_response = None

        async def execute_activity(name: str, activity_payload: dict[str, Any]) -> dict[str, Any]:
            return await workflow.execute_activity(
                name,
                activity_payload,
                start_to_close_timeout=timedelta(seconds=workflow_input.activity_timeout_seconds),
                retry_policy=RetryPolicy(
                    maximum_attempts=workflow_input.activity_retry_max_attempts,
                ),
            )

        async def wait_for_approval_signal(
            _approval_request: dict[str, Any],
            timeout_seconds: int,
        ) -> dict[str, Any] | None:
            try:
                await workflow.wait_condition(
                    lambda: self._approval_response is not None,
                    timeout=timedelta(seconds=timeout_seconds),
                )
            except asyncio.TimeoutError:
                return None
            return dict(self._approval_response or {})

        return await run_implement_test_review_push_workflow(
            workflow_input,
            activity_executor=execute_activity,
            approval_signal_waiter=wait_for_approval_signal,
        )


async def run_implement_test_review_push_workflow(
    payload: ImplementTestReviewPushWorkflowInput | Mapping[str, Any],
    *,
    activity_executor: ActivityExecutor,
    approval_signal_waiter: ApprovalSignalWaiter | None = None,
    telemetry: TelemetryTracer | None = None,
) -> dict[str, Any]:
    workflow_input = coerce_workflow_input(payload)
    tracer = telemetry or TelemetryTracer()
    root_span = tracer.start_span(
        "workflow.implement_test_review_push",
        trace_id=workflow_input.trace_id,
        attributes={
            "trace_id": workflow_input.trace_id,
            "task_id": workflow_input.task_id,
            "session_id": workflow_input.session_id,
            "node_name": "implement_test_review_push",
        },
    )
    if workflow_input.max_attempts < 1:
        root_span.set_attributes({"status": "error", "error_code": "ValueError"})
        root_span.set_status("ERROR")
        root_span.end()
        raise ValueError("max_attempts must be at least 1")
    if workflow_input.activity_retry_max_attempts < 1:
        root_span.set_attributes({"status": "error", "error_code": "ValueError"})
        root_span.set_status("ERROR")
        root_span.end()
        raise ValueError("activity_retry_max_attempts must be at least 1")
    if workflow_input.approval_timeout_seconds < 1:
        root_span.set_attributes({"status": "error", "error_code": "ValueError"})
        root_span.set_status("ERROR")
        root_span.end()
        raise ValueError("approval_timeout_seconds must be at least 1")

    activity_ids: list[str] = []
    checkpoint_artifact_ids: list[str] = []
    last_implement_result: dict[str, Any] = {}
    last_test_result: dict[str, Any] = {}

    try:
        for attempt in range(1, workflow_input.max_attempts + 1):
            implement_output = await _execute_activity_with_span(
                activity_executor,
                tracer,
                workflow_input,
                DELEGATE_ACTIVITY,
                {
                    "trace_id": workflow_input.trace_id,
                    "node_name": "implement",
                    "attempt_number": attempt,
                    "task_id": workflow_input.task_id,
                    "prompt": workflow_input.implement_prompt,
                    "agent": workflow_input.implement_agent,
                    "role": workflow_input.implement_role,
                    "repo": workflow_input.repo,
                    "cwd": workflow_input.cwd,
                },
            )
            activity_ids.append(str(implement_output.get("activity_id", "")))
            last_implement_result = dict(implement_output.get("result", {}))
            implement_checkpoint = await _checkpoint(
                activity_executor,
                workflow_input,
                telemetry=tracer,
                node_name="checkpoint_implement",
                attempt=attempt,
                status="implemented",
                state={"implement_result": last_implement_result},
            )
            _append_checkpoint(checkpoint_artifact_ids, implement_checkpoint)

            test_output = await _execute_activity_with_span(
                activity_executor,
                tracer,
                workflow_input,
                DELEGATE_ACTIVITY,
                {
                    "trace_id": workflow_input.trace_id,
                    "node_name": "test",
                    "attempt_number": attempt,
                    "task_id": workflow_input.task_id,
                    "prompt": workflow_input.test_prompt,
                    "agent": workflow_input.test_agent,
                    "role": workflow_input.test_role,
                    "repo": workflow_input.repo,
                    "cwd": workflow_input.cwd,
                },
            )
            activity_ids.append(str(test_output.get("activity_id", "")))
            last_test_result = dict(test_output.get("result", {}))
            test_status = "tested" if _tests_passed(last_test_result) else "tests_failed"
            test_checkpoint = await _checkpoint(
                activity_executor,
                workflow_input,
                telemetry=tracer,
                node_name="checkpoint_test",
                attempt=attempt,
                status=test_status,
                state={"test_result": last_test_result},
            )
            _append_checkpoint(checkpoint_artifact_ids, test_checkpoint)

            if _tests_passed(last_test_result):
                review_output = await _execute_activity_with_span(
                    activity_executor,
                    tracer,
                    workflow_input,
                    REVIEW_ACTIVITY,
                    {
                        "trace_id": workflow_input.trace_id,
                        "node_name": "review",
                        "attempt_number": attempt,
                        "task_id": workflow_input.task_id,
                        "prompt": workflow_input.review_prompt,
                        "agent": workflow_input.review_agent,
                        "role": workflow_input.review_role,
                        "repo": workflow_input.repo,
                        "cwd": workflow_input.cwd,
                    },
                )
                activity_ids.append(str(review_output.get("activity_id", "")))
                review_result = dict(review_output.get("result", {}))
                review_checkpoint = await _checkpoint(
                    activity_executor,
                    workflow_input,
                    telemetry=tracer,
                    node_name="checkpoint_review",
                    attempt=attempt,
                    status="reviewed",
                    state={"review_result": review_result},
                )
                _append_checkpoint(checkpoint_artifact_ids, review_checkpoint)

                approval_output = await _execute_activity_with_span(
                    activity_executor,
                    tracer,
                    workflow_input,
                    APPROVAL_REQUEST_ACTIVITY,
                    {
                        "trace_id": workflow_input.trace_id,
                        "node_name": "approval_request",
                        "attempt_number": attempt,
                        "action": workflow_input.approval_action,
                        "reason": workflow_input.approval_reason,
                        "requested_by": "temporal-workflow",
                        "context": {
                            "taskId": workflow_input.task_id,
                            "sessionId": workflow_input.session_id,
                            "repo": workflow_input.repo,
                            "cwd": workflow_input.cwd,
                            "targetBranch": workflow_input.target_branch,
                            "attempt": attempt,
                        },
                    },
                )
                activity_ids.append(str(approval_output.get("activity_id", "")))
                approval_request = dict(approval_output)
                if approval_signal_waiter is None:
                    raise RuntimeError("approval_signal_waiter is required after approval_request")
                approval_response = await approval_signal_waiter(
                    approval_request,
                    workflow_input.approval_timeout_seconds,
                )
                if approval_response is None:
                    approval_checkpoint = await _checkpoint(
                        activity_executor,
                        workflow_input,
                        telemetry=tracer,
                        node_name="checkpoint_approval_timeout",
                        attempt=attempt,
                        status="approval_timeout",
                        state={"approval_request": approval_request},
                    )
                    _append_checkpoint(checkpoint_artifact_ids, approval_checkpoint)
                    return _finish_workflow_span(
                        root_span,
                        "approval_timeout",
                        _base_result(workflow_input, attempt, activity_ids, checkpoint_artifact_ids)
                        | {
                            "status": "approval_timeout",
                            "implement_result": last_implement_result,
                            "test_result": last_test_result,
                            "review_result": review_result,
                            "approval_request": approval_request,
                            "approval_response": None,
                        },
                    )

                approval_status = _approval_status(approval_response)
                if approval_status not in {"approved", "granted"}:
                    approval_checkpoint = await _checkpoint(
                        activity_executor,
                        workflow_input,
                        telemetry=tracer,
                        node_name="checkpoint_approval_denied",
                        attempt=attempt,
                        status="approval_denied",
                        state={
                            "approval_request": approval_request,
                            "approval_response": approval_response,
                        },
                    )
                    _append_checkpoint(checkpoint_artifact_ids, approval_checkpoint)
                    return _finish_workflow_span(
                        root_span,
                        "approval_denied",
                        _base_result(workflow_input, attempt, activity_ids, checkpoint_artifact_ids)
                        | {
                            "status": "approval_denied",
                            "approval_status": approval_status,
                            "implement_result": last_implement_result,
                            "test_result": last_test_result,
                            "review_result": review_result,
                            "approval_request": approval_request,
                            "approval_response": approval_response,
                        },
                    )

                approval_checkpoint = await _checkpoint(
                    activity_executor,
                    workflow_input,
                    telemetry=tracer,
                    node_name="checkpoint_approval_granted",
                    attempt=attempt,
                    status="approval_granted",
                    state={
                        "approval_request": approval_request,
                        "approval_response": approval_response,
                    },
                )
                _append_checkpoint(checkpoint_artifact_ids, approval_checkpoint)

                push_output = await _execute_activity_with_span(
                    activity_executor,
                    tracer,
                    workflow_input,
                    PUSH_ACTIVITY,
                    {
                        "trace_id": workflow_input.trace_id,
                        "node_name": "push_intent",
                        "attempt_number": attempt,
                        "target_branch": workflow_input.target_branch,
                        "produced_by": workflow_input.session_id,
                        "classification": workflow_input.push_classification,
                    },
                )
                activity_ids.append(str(push_output.get("activity_id", "")))
                push_checkpoint = await _checkpoint(
                    activity_executor,
                    workflow_input,
                    telemetry=tracer,
                    node_name="checkpoint_push_intent",
                    attempt=attempt,
                    status=str(push_output.get("status", "push_ready")),
                    state={"push_result": dict(push_output)},
                )
                _append_checkpoint(checkpoint_artifact_ids, push_checkpoint)

                return _finish_workflow_span(
                    root_span,
                    str(push_output.get("status", "push_ready")),
                    _base_result(workflow_input, attempt, activity_ids, checkpoint_artifact_ids)
                    | {
                        "status": push_output.get("status", "push_ready"),
                        "implement_result": last_implement_result,
                        "test_result": last_test_result,
                        "review_result": review_result,
                        "approval_request": approval_request,
                        "approval_response": approval_response,
                        "push_result": dict(push_output),
                    },
                )

        failed_checkpoint = await _checkpoint(
            activity_executor,
            workflow_input,
            telemetry=tracer,
            node_name="checkpoint_failed_tests",
            attempt=workflow_input.max_attempts,
            status="failed_tests",
            state={"failed_tests": last_test_result},
        )
        _append_checkpoint(checkpoint_artifact_ids, failed_checkpoint)

        return _finish_workflow_span(
            root_span,
            "failed_tests",
            _base_result(workflow_input, workflow_input.max_attempts, activity_ids, checkpoint_artifact_ids) | {
                "status": "failed_tests",
                "implement_result": last_implement_result,
                "test_result": last_test_result,
                "failed_tests": last_test_result,
            },
        )
    except Exception as err:
        root_span.set_attributes({"status": "error", "error_code": type(err).__name__})
        root_span.set_status("ERROR")
        root_span.record_exception(err)
        root_span.end()
        raise


def coerce_workflow_input(
    payload: ImplementTestReviewPushWorkflowInput | Mapping[str, Any],
) -> ImplementTestReviewPushWorkflowInput:
    if isinstance(payload, ImplementTestReviewPushWorkflowInput):
        return payload
    if isinstance(payload, Mapping):
        allowed = {field.name for field in fields(ImplementTestReviewPushWorkflowInput)}
        return ImplementTestReviewPushWorkflowInput(
            **{key: value for key, value in dict(payload).items() if key in allowed}
        )
    raise TypeError("workflow input must be a mapping or ImplementTestReviewPushWorkflowInput")


def _base_result(
    workflow_input: ImplementTestReviewPushWorkflowInput,
    attempt: int,
    activity_ids: list[str],
    checkpoint_artifact_ids: list[str],
) -> dict[str, Any]:
    return {
        "workflow": IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW,
        "task_id": workflow_input.task_id,
        "session_id": workflow_input.session_id,
        "trace_id": workflow_input.trace_id,
        "repo": workflow_input.repo,
        "cwd": workflow_input.cwd,
        "target_branch": workflow_input.target_branch,
        "attempt": attempt,
        "max_attempts": workflow_input.max_attempts,
        "activity_ids": [activity_id for activity_id in activity_ids if activity_id],
        "checkpoint_artifact_ids": list(checkpoint_artifact_ids),
    }


def _tests_passed(result: Mapping[str, Any]) -> bool:
    if "passed" in result:
        return bool(result["passed"])
    if "exitCode" in result:
        return result["exitCode"] == 0
    if "exit_code" in result:
        return result["exit_code"] == 0
    return str(result.get("status", "")).lower() in {"passed", "ok", "success"}


def _approval_status(approval_response: Mapping[str, Any]) -> str:
    return str(approval_response.get("status", "")).strip().lower()


async def _checkpoint(
    activity_executor: ActivityExecutor,
    workflow_input: ImplementTestReviewPushWorkflowInput,
    *,
    telemetry: TelemetryTracer | None = None,
    node_name: str,
    attempt: int,
    status: str,
    state: dict[str, Any],
) -> dict[str, Any]:
    return await _execute_activity_with_span(
        activity_executor,
        telemetry or TelemetryTracer(),
        workflow_input,
        CHECKPOINT_ACTIVITY,
        {
            "trace_id": workflow_input.trace_id,
            "node_name": node_name,
            "attempt_number": attempt,
            "status": status,
            "state": state,
            "produced_by": workflow_input.session_id,
            "classification": workflow_input.checkpoint_classification,
        },
    )


async def _execute_activity_with_span(
    activity_executor: ActivityExecutor,
    telemetry: TelemetryTracer,
    workflow_input: ImplementTestReviewPushWorkflowInput,
    activity_name: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    node_name = str(payload.get("node_name", activity_name))
    attempt = payload.get("attempt_number")
    span = telemetry.start_span(
        "workflow.activity",
        trace_id=workflow_input.trace_id,
        attributes={
            "trace_id": workflow_input.trace_id,
            "task_id": workflow_input.task_id,
            "session_id": workflow_input.session_id,
            "node_name": node_name,
            "activity_name": activity_name,
            "attempt": attempt,
        },
    )
    try:
        result = await activity_executor(activity_name, payload)
    except Exception as err:
        span.set_attributes({"status": "error", "error_code": type(err).__name__})
        span.set_status("ERROR")
        span.record_exception(err)
        span.end()
        raise
    status = str(result.get("status") or payload.get("status") or "ok")
    span.set_attribute("status", status)
    span.set_status("OK")
    span.end()
    return result


def _finish_workflow_span(span: Any, status: str, result: dict[str, Any]) -> dict[str, Any]:
    span.set_attribute("status", status)
    span.set_status("OK")
    span.end()
    return result


def _append_checkpoint(checkpoint_artifact_ids: list[str], checkpoint: Mapping[str, Any]) -> None:
    artifact_id = checkpoint.get("artifact_id")
    if artifact_id:
        checkpoint_artifact_ids.append(str(artifact_id))
