"""Opt-in Temporal crash-recovery harness for implement-test-review-push.

Run with:
    AGENTS_TEMPORAL_INTEGRATION=1 pytest tests/test_temporal_crash_recovery.py

The test uses temporalio.testing.WorkflowEnvironment when temporalio is
installed. It is skipped by default so the normal unit suite does not require a
Temporal test server binary or external service.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

import pytest

from orchestrator_langgraph.activities import (
    APPROVAL_REQUEST_ACTIVITY,
    CHECKPOINT_ACTIVITY,
    DELEGATE_ACTIVITY,
    PUSH_ACTIVITY,
    REVIEW_ACTIVITY,
)
from orchestrator_langgraph.workflows import (
    IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW,
    ImplementTestReviewPushWorkflow,
)

pytestmark = pytest.mark.skipif(
    os.environ.get("AGENTS_TEMPORAL_INTEGRATION") != "1",
    reason=(
        "Temporal integration harness is opt-in. Run: "
        "AGENTS_TEMPORAL_INTEGRATION=1 pytest tests/test_temporal_crash_recovery.py"
    ),
)


@dataclass
class RecoveryHarness:
    calls: Counter[tuple[str, str]] = field(default_factory=Counter)
    implement_checkpoint_started: asyncio.Event = field(default_factory=asyncio.Event)
    implement_checkpoint_can_complete: asyncio.Event = field(default_factory=asyncio.Event)
    approval_requested: asyncio.Event = field(default_factory=asyncio.Event)

    async def delegate_activity(self, payload: dict[str, Any]) -> dict[str, Any]:
        node_name = str(payload["node_name"])
        self.calls[(DELEGATE_ACTIVITY, node_name)] += 1
        result = {"sessionId": f"{node_name}-session"}
        if node_name == "test":
            result = {"exitCode": 0, "stdout": "ok"}
        output = {
            "activity_id": f"act-{node_name}-{payload['attempt_number']}",
            "result": result,
        }
        return output

    async def review_activity(self, payload: dict[str, Any]) -> dict[str, Any]:
        node_name = str(payload["node_name"])
        self.calls[(REVIEW_ACTIVITY, node_name)] += 1
        return {
            "activity_id": f"act-{node_name}-{payload['attempt_number']}",
            "result": {"stdout": "Verdict: OK", "sessionId": "review-session"},
        }

    async def approval_request_activity(self, payload: dict[str, Any]) -> dict[str, Any]:
        node_name = str(payload["node_name"])
        self.calls[(APPROVAL_REQUEST_ACTIVITY, node_name)] += 1
        self.approval_requested.set()
        return {
            "activity_id": f"act-{node_name}-{payload['attempt_number']}",
            "approval_id": "apr-temporal-crash-recovery",
            "status": "pending",
            "result": {"approvalId": "apr-temporal-crash-recovery", "status": "pending"},
        }

    async def push_activity(self, payload: dict[str, Any]) -> dict[str, Any]:
        node_name = str(payload["node_name"])
        self.calls[(PUSH_ACTIVITY, node_name)] += 1
        return {
            "activity_id": f"act-{node_name}-{payload['attempt_number']}",
            "status": "push_ready",
            "mode": "dry_run",
            "target_branch": payload["target_branch"],
            "artifact_id": "art-push-intent",
            "result": {"artifactId": "art-push-intent"},
        }

    async def checkpoint_activity(self, payload: dict[str, Any]) -> dict[str, Any]:
        node_name = str(payload["node_name"])
        self.calls[(CHECKPOINT_ACTIVITY, node_name)] += 1
        if node_name == "checkpoint_implement":
            self.implement_checkpoint_started.set()
            await self.implement_checkpoint_can_complete.wait()
        return {
            "activity_id": f"act-{node_name}-{payload['attempt_number']}",
            "artifact_id": f"art-{node_name}",
            "result": {"artifactId": f"art-{node_name}"},
        }


def test_temporal_worker_restart_replays_without_duplicate_implement_or_implicit_approval():
    asyncio.run(_assert_worker_restart_replays_without_duplicate_implement_or_implicit_approval())


async def _assert_worker_restart_replays_without_duplicate_implement_or_implicit_approval():
    try:
        from temporalio import activity
        from temporalio.testing import WorkflowEnvironment
        from temporalio.worker import Worker
    except ImportError as exc:
        pytest.skip(f"temporalio is required for the opt-in integration harness: {exc}")

    harness = RecoveryHarness()
    task_queue = f"orchestrator-langgraph-crash-recovery-{uuid.uuid4()}"

    @activity.defn(name=DELEGATE_ACTIVITY)
    async def delegate_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return await harness.delegate_activity(payload)

    @activity.defn(name=REVIEW_ACTIVITY)
    async def review_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return await harness.review_activity(payload)

    @activity.defn(name=APPROVAL_REQUEST_ACTIVITY)
    async def approval_request_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return await harness.approval_request_activity(payload)

    @activity.defn(name=PUSH_ACTIVITY)
    async def push_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return await harness.push_activity(payload)

    @activity.defn(name=CHECKPOINT_ACTIVITY)
    async def checkpoint_activity(payload: dict[str, Any]) -> dict[str, Any]:
        return await harness.checkpoint_activity(payload)

    activities = [
        delegate_activity,
        review_activity,
        approval_request_activity,
        push_activity,
        checkpoint_activity,
    ]

    async with await WorkflowEnvironment.start_time_skipping() as env:
        # Keep activities alive so checkpoint completion follows the workflow-worker handoff.
        async with Worker(
            env.client,
            task_queue=task_queue,
            activities=activities,
        ):
            # Disable sticky queues so the replacement worker must replay history.
            async with Worker(
                env.client,
                task_queue=task_queue,
                workflows=[ImplementTestReviewPushWorkflow],
                max_cached_workflows=0,
            ):
                handle = await env.client.start_workflow(
                    IMPLEMENT_TEST_REVIEW_PUSH_WORKFLOW,
                    _workflow_payload(),
                    id=f"itrp-crash-recovery-{uuid.uuid4()}",
                    task_queue=task_queue,
                )
                await asyncio.wait_for(harness.implement_checkpoint_started.wait(), timeout=10)

            async with Worker(
                env.client,
                task_queue=task_queue,
                workflows=[ImplementTestReviewPushWorkflow],
                max_cached_workflows=0,
            ):
                harness.implement_checkpoint_can_complete.set()
                await asyncio.wait_for(harness.approval_requested.wait(), timeout=10)

                with env.auto_time_skipping_disabled():
                    await asyncio.sleep(0.2)
                assert harness.calls[(PUSH_ACTIVITY, "push_intent")] == 0

                await handle.signal(
                    "approval_response",
                    {"approvalId": "apr-temporal-crash-recovery", "status": "granted"},
                )
                result = await asyncio.wait_for(handle.result(), timeout=10)

    assert result["status"] == "push_ready"
    assert result["approval_response"] == {
        "approvalId": "apr-temporal-crash-recovery",
        "status": "granted",
    }
    assert harness.calls[(DELEGATE_ACTIVITY, "implement")] == 1
    assert harness.calls[(PUSH_ACTIVITY, "push_intent")] == 1


def _workflow_payload() -> dict[str, Any]:
    return {
        "task_id": "task-temporal-crash-recovery",
        "session_id": "session-temporal-crash-recovery",
        "trace_id": "trace-temporal-crash-recovery",
        "repo": "sample-apps",
        "cwd": "/tmp/sample-apps",
        "target_branch": "feature/project-v1",
        "max_attempts": 1,
        "implement_prompt": "Implement the task.",
        "test_prompt": "Run tests.",
        "review_prompt": "Review the changes.",
        "activity_timeout_seconds": 30,
        "activity_retry_max_attempts": 1,
        "approval_timeout_seconds": 86400,
    }
