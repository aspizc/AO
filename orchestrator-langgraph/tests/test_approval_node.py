import asyncio

from orchestrator_langgraph.graphs.delegate_review import FixtureGatewayClient
from orchestrator_langgraph.nodes.approval import approval_node


def base_state():
    return {
        "trace_id": "tr-approval",
        "task_id": "ts-root",
        "approval_action": "git.push",
        "approval_reason": "Push reviewed changes.",
        "approval_timeout_seconds": 3,
        "approval_context": {"targetBranch": "feature/test"},
    }


def test_approval_node_requests_and_waits():
    asyncio.run(_assert_approval_node_requests_and_waits())


async def _assert_approval_node_requests_and_waits():
    gateway = FixtureGatewayClient(
        responses={
            "approval.request": [{"approvalId": "apr-test", "status": "pending"}],
            "approval.wait": [{"approvalId": "apr-test", "status": "granted"}],
        }
    )

    result = await approval_node(base_state(), gateway)

    assert result["status"] == "approval_granted"
    assert result["approval_request"]["approvalId"] == "apr-test"
    assert result["approval_result"]["status"] == "granted"
    assert [(call.tool, call.args) for call in gateway.calls] == [
        (
            "approval.request",
            {
                "traceId": "tr-approval",
                "action": "git.push",
                "requestedBy": "langgraph",
                "context": {
                    "targetBranch": "feature/test",
                    "taskId": "ts-root",
                    "reason": "Push reviewed changes.",
                },
            },
        ),
        ("approval.wait", {"approvalId": "apr-test", "timeoutMs": 3000}),
    ]


def test_pending_approval_remains_blocking():
    asyncio.run(_assert_pending_approval_remains_blocking())


async def _assert_pending_approval_remains_blocking():
    gateway = FixtureGatewayClient(
        responses={
            "approval.request": [{"approvalId": "apr-test", "status": "pending"}],
            "approval.wait": [{"approvalId": "apr-test", "status": "pending"}],
        }
    )

    result = await approval_node(base_state(), gateway)

    assert result["status"] == "approval_pending"
    assert result["approval_result"]["status"] == "pending"
