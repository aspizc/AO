from __future__ import annotations

import asyncio

from orchestrator_langgraph.activities import (
    APPROVAL_REQUEST_ACTIVITY,
    CHECKPOINT_ACTIVITY,
    DELEGATE_ACTIVITY,
    PUSH_ACTIVITY,
    REVIEW_ACTIVITY,
)
from orchestrator_langgraph.telemetry import InMemorySpanExporter, TelemetryTracer
from orchestrator_langgraph.workflows import (
    IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW,
    ImplementTestReviewPushWorkflowInput,
    run_implement_test_review_push_workflow,
)


def base_input(**updates):
    payload = {
        "task_id": "task-root",
        "session_id": "session-1",
        "trace_id": "trace-1",
        "repo": "sample-apps",
        "cwd": "/tmp/sample-apps",
        "target_branch": "feature/project-v1",
        "max_attempts": 2,
        "implement_prompt": "Implement the task.",
        "test_prompt": "Run tests.",
        "review_prompt": "Review the changes.",
    }
    payload.update(updates)
    return ImplementTestReviewPushWorkflowInput(**payload)


def test_workflow_name_is_stable():
    assert IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW == "implement_test_review_push"


def test_happy_path_runs_implement_test_review_push_intent():
    asyncio.run(_assert_happy_path_runs_implement_test_review_push_intent())


async def _assert_happy_path_runs_implement_test_review_push_intent():
    calls = []

    async def execute_activity(name, payload):
        calls.append((name, payload))
        if name == CHECKPOINT_ACTIVITY:
            return {
                "activity_id": f"act-{payload['node_name']}",
                "artifact_id": f"art-{payload['node_name']}",
                "result": {"artifactId": f"art-{payload['node_name']}"},
            }
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "implement":
            return {"activity_id": "act-implement", "result": {"sessionId": "coder-session"}}
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "test":
            return {"activity_id": "act-test", "result": {"exitCode": 0, "stdout": "ok"}}
        if name == REVIEW_ACTIVITY:
            return {"activity_id": "act-review", "result": {"stdout": "Verdict: OK"}}
        if name == APPROVAL_REQUEST_ACTIVITY:
            return {
                "activity_id": "act-approval",
                "approval_id": "apr-push",
                "status": "pending",
                "result": {"approvalId": "apr-push", "status": "pending"},
            }
        if name == PUSH_ACTIVITY:
            return {
                "activity_id": "act-push",
                "status": "push_ready",
                "mode": "dry_run",
                "target_branch": payload["target_branch"],
                "artifact_id": "art-push",
                "result": {"artifactId": "art-push"},
            }
        raise AssertionError(f"unexpected activity {name}: {payload}")

    result = await run_implement_test_review_push_workflow(
        base_input(),
        activity_executor=execute_activity,
        approval_signal_waiter=granted_approval_signal,
    )

    assert result["workflow"] == IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW
    assert result["status"] == "push_ready"
    assert result["attempt"] == 1
    assert result["implement_result"] == {"sessionId": "coder-session"}
    assert result["test_result"] == {"exitCode": 0, "stdout": "ok"}
    assert result["review_result"] == {"stdout": "Verdict: OK"}
    assert result["approval_request"]["approval_id"] == "apr-push"
    assert result["approval_response"] == {"approvalId": "apr-push", "status": "granted"}
    assert result["push_result"]["artifact_id"] == "art-push"
    assert result["checkpoint_artifact_ids"] == [
        "art-checkpoint_implement",
        "art-checkpoint_test",
        "art-checkpoint_review",
        "art-checkpoint_approval_granted",
        "art-checkpoint_push_intent",
    ]
    assert [name for name, _payload in calls] == [
        DELEGATE_ACTIVITY,
        CHECKPOINT_ACTIVITY,
        DELEGATE_ACTIVITY,
        CHECKPOINT_ACTIVITY,
        REVIEW_ACTIVITY,
        CHECKPOINT_ACTIVITY,
        APPROVAL_REQUEST_ACTIVITY,
        CHECKPOINT_ACTIVITY,
        PUSH_ACTIVITY,
        CHECKPOINT_ACTIVITY,
    ]
    assert [payload["node_name"] for _name, payload in calls] == [
        "implement",
        "checkpoint_implement",
        "test",
        "checkpoint_test",
        "review",
        "checkpoint_review",
        "approval_request",
        "checkpoint_approval_granted",
        "push_intent",
        "checkpoint_push_intent",
    ]
    assert calls[-2][1]["produced_by"] == "session-1"


async def granted_approval_signal(_approval_request, _timeout_seconds):
    return {"approvalId": "apr-push", "status": "granted"}


def test_denied_approval_returns_without_push():
    asyncio.run(_assert_denied_approval_returns_without_push())


async def _assert_denied_approval_returns_without_push():
    calls = []

    async def execute_activity(name, payload):
        calls.append((name, payload))
        if name == CHECKPOINT_ACTIVITY:
            return {
                "activity_id": f"act-{payload['node_name']}",
                "artifact_id": f"art-{payload['node_name']}",
                "result": {"artifactId": f"art-{payload['node_name']}"},
            }
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "implement":
            return {"activity_id": "act-implement", "result": {"sessionId": "coder-session"}}
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "test":
            return {"activity_id": "act-test", "result": {"exitCode": 0, "stdout": "ok"}}
        if name == REVIEW_ACTIVITY:
            return {"activity_id": "act-review", "result": {"stdout": "Verdict: OK"}}
        if name == APPROVAL_REQUEST_ACTIVITY:
            return {
                "activity_id": "act-approval",
                "approval_id": "apr-push",
                "status": "pending",
                "result": {"approvalId": "apr-push", "status": "pending"},
            }
        raise AssertionError(f"push should not run after denied approval: {name}")

    async def denied_approval_signal(_approval_request, timeout_seconds):
        assert timeout_seconds == 86400
        return {"approvalId": "apr-push", "status": "denied"}

    result = await run_implement_test_review_push_workflow(
        base_input(),
        activity_executor=execute_activity,
        approval_signal_waiter=denied_approval_signal,
    )

    assert result["status"] == "approval_denied"
    assert result["approval_status"] == "denied"
    assert result["approval_response"] == {"approvalId": "apr-push", "status": "denied"}
    assert "push_result" not in result
    assert PUSH_ACTIVITY not in [name for name, _payload in calls]
    assert result["checkpoint_artifact_ids"][-1] == "art-checkpoint_approval_denied"


def test_approval_timeout_returns_without_push():
    asyncio.run(_assert_approval_timeout_returns_without_push())


async def _assert_approval_timeout_returns_without_push():
    calls = []

    async def execute_activity(name, payload):
        calls.append((name, payload))
        if name == CHECKPOINT_ACTIVITY:
            return {
                "activity_id": f"act-{payload['node_name']}",
                "artifact_id": f"art-{payload['node_name']}",
                "result": {"artifactId": f"art-{payload['node_name']}"},
            }
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "implement":
            return {"activity_id": "act-implement", "result": {}}
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "test":
            return {"activity_id": "act-test", "result": {"exitCode": 0}}
        if name == REVIEW_ACTIVITY:
            return {"activity_id": "act-review", "result": {"stdout": "OK"}}
        if name == APPROVAL_REQUEST_ACTIVITY:
            return {
                "activity_id": "act-approval",
                "approval_id": "apr-push",
                "status": "NEVER_AUTO",
                "result": {"approvalId": "apr-push", "status": "NEVER_AUTO"},
            }
        raise AssertionError(f"push should not run after approval timeout: {name}")

    async def timeout_approval_signal(_approval_request, timeout_seconds):
        assert timeout_seconds == 7
        return None

    result = await run_implement_test_review_push_workflow(
        base_input(approval_timeout_seconds=7),
        activity_executor=execute_activity,
        approval_signal_waiter=timeout_approval_signal,
    )

    assert result["status"] == "approval_timeout"
    assert result["approval_request"]["status"] == "NEVER_AUTO"
    assert result["approval_response"] is None
    assert "push_result" not in result
    assert PUSH_ACTIVITY not in [name for name, _payload in calls]
    assert result["checkpoint_artifact_ids"][-1] == "art-checkpoint_approval_timeout"


def test_failed_tests_retry_until_max_attempts_without_review_or_push():
    asyncio.run(_assert_failed_tests_retry_until_max_attempts_without_review_or_push())


async def _assert_failed_tests_retry_until_max_attempts_without_review_or_push():
    calls = []

    async def execute_activity(name, payload):
        calls.append((name, payload))
        if name == CHECKPOINT_ACTIVITY:
            return {
                "activity_id": f"act-{payload['node_name']}-{payload['attempt_number']}",
                "artifact_id": f"art-{payload['node_name']}-{payload['attempt_number']}",
                "result": {"artifactId": f"art-{payload['node_name']}-{payload['attempt_number']}"},
            }
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "implement":
            return {"activity_id": f"act-implement-{payload['attempt_number']}", "result": {}}
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "test":
            return {
                "activity_id": f"act-test-{payload['attempt_number']}",
                "result": {"exitCode": 1, "stdout": "failed"},
            }
        raise AssertionError(f"review/push should not run after failed tests: {name}")

    result = await run_implement_test_review_push_workflow(
        base_input(max_attempts=2),
        activity_executor=execute_activity,
    )

    assert result["status"] == "failed_tests"
    assert result["attempt"] == 2
    assert result["failed_tests"] == {"exitCode": 1, "stdout": "failed"}
    assert result["checkpoint_artifact_ids"] == [
        "art-checkpoint_implement-1",
        "art-checkpoint_test-1",
        "art-checkpoint_implement-2",
        "art-checkpoint_test-2",
        "art-checkpoint_failed_tests-2",
    ]
    assert "review_result" not in result
    assert "push_result" not in result
    assert [(name, payload["node_name"], payload["attempt_number"]) for name, payload in calls] == [
        (DELEGATE_ACTIVITY, "implement", 1),
        (CHECKPOINT_ACTIVITY, "checkpoint_implement", 1),
        (DELEGATE_ACTIVITY, "test", 1),
        (CHECKPOINT_ACTIVITY, "checkpoint_test", 1),
        (DELEGATE_ACTIVITY, "implement", 2),
        (CHECKPOINT_ACTIVITY, "checkpoint_implement", 2),
        (DELEGATE_ACTIVITY, "test", 2),
        (CHECKPOINT_ACTIVITY, "checkpoint_test", 2),
        (CHECKPOINT_ACTIVITY, "checkpoint_failed_tests", 2),
    ]


def test_workflow_telemetry_preserves_trace_id_and_safe_node_attributes():
    asyncio.run(_assert_workflow_telemetry_preserves_trace_id_and_safe_node_attributes())


async def _assert_workflow_telemetry_preserves_trace_id_and_safe_node_attributes():
    exporter = InMemorySpanExporter()
    telemetry = TelemetryTracer(enabled=True, exporter=exporter)

    async def execute_activity(name, payload):
        if name == CHECKPOINT_ACTIVITY:
            return {
                "activity_id": f"act-{payload['node_name']}",
                "artifact_id": f"art-{payload['node_name']}",
                "result": {"artifactId": f"art-{payload['node_name']}"},
            }
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "implement":
            return {"activity_id": "act-implement", "result": {}}
        if name == DELEGATE_ACTIVITY and payload["node_name"] == "test":
            return {"activity_id": "act-test", "result": {"exitCode": 0, "stdout": "must not record"}}
        if name == REVIEW_ACTIVITY:
            return {"activity_id": "act-review", "result": {"stdout": "must not record"}}
        if name == APPROVAL_REQUEST_ACTIVITY:
            return {
                "activity_id": "act-approval",
                "approval_id": "apr-push",
                "status": "pending",
                "result": {"approvalId": "apr-push", "status": "pending"},
            }
        if name == PUSH_ACTIVITY:
            return {
                "activity_id": "act-push",
                "status": "push_ready",
                "mode": "dry_run",
                "target_branch": payload["target_branch"],
                "artifact_id": "art-push",
                "result": {"artifactId": "art-push"},
            }
        raise AssertionError(name)

    await run_implement_test_review_push_workflow(
        base_input(trace_id="trace-preserved"),
        activity_executor=execute_activity,
        approval_signal_waiter=granted_approval_signal,
        telemetry=telemetry,
    )

    root = [span for span in exporter.spans if span["name"] == "workflow.implement_test_review_push"][0]
    assert root["trace_id"] == "trace-preserved"
    assert root["attributes"] == {
        "trace_id": "trace-preserved",
        "task_id": "task-root",
        "session_id": "session-1",
        "node_name": "implement_test_review_push",
        "status": "push_ready",
    }
    activity_spans = [span for span in exporter.spans if span["name"] == "workflow.activity"]
    assert ("implement", "1", "ok") in [
        (span["attributes"]["node_name"], span["attributes"]["attempt"], span["attributes"]["status"])
        for span in activity_spans
    ]
    assert ("checkpoint_test", "1", "tested") in [
        (span["attributes"]["node_name"], span["attributes"]["attempt"], span["attributes"]["status"])
        for span in activity_spans
    ]
    assert all("stdout" not in span["attributes"] for span in exporter.spans)


def test_workflow_telemetry_records_error_status():
    asyncio.run(_assert_workflow_telemetry_records_error_status())


async def _assert_workflow_telemetry_records_error_status():
    exporter = InMemorySpanExporter()
    telemetry = TelemetryTracer(enabled=True, exporter=exporter)

    async def execute_activity(_name, _payload):
        raise TimeoutError("activity timed out")

    try:
        await run_implement_test_review_push_workflow(
            base_input(),
            activity_executor=execute_activity,
            telemetry=telemetry,
        )
    except TimeoutError:
        pass
    else:
        raise AssertionError("expected TimeoutError")

    root = [span for span in exporter.spans if span["name"] == "workflow.implement_test_review_push"][0]
    failed_activity = [span for span in exporter.spans if span["name"] == "workflow.activity"][0]
    assert root["status"]["code"] == "ERROR"
    assert root["attributes"]["status"] == "error"
    assert root["attributes"]["error_code"] == "TimeoutError"
    assert failed_activity["status"]["code"] == "ERROR"
    assert failed_activity["attributes"]["node_name"] == "implement"
    assert failed_activity["attributes"]["error_code"] == "TimeoutError"


def test_rejects_unbounded_activity_retries():
    asyncio.run(_assert_rejects_unbounded_activity_retries())


async def _assert_rejects_unbounded_activity_retries():
    async def execute_activity(_name, _payload):
        raise AssertionError("activities should not run")

    try:
        await run_implement_test_review_push_workflow(
            base_input(activity_retry_max_attempts=0),
            activity_executor=execute_activity,
        )
    except ValueError as err:
        assert "activity_retry_max_attempts" in str(err)
    else:
        raise AssertionError("expected invalid retry policy to fail")
