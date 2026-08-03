import asyncio
from pathlib import Path

from orchestrator_langgraph.graphs.delegate_review import (
    FixtureGatewayClient,
    build_delegate_review_graph,
)

FIXTURES = Path(__file__).parent / "fixtures" / "gateway_responses.json"


def test_dry_run_completes_to_reviewed():
    asyncio.run(_assert_dry_run_completes_to_reviewed())


async def _assert_dry_run_completes_to_reviewed():
    gateway = FixtureGatewayClient.from_file(FIXTURES)
    graph = build_delegate_review_graph(gateway_client=gateway)

    result = await graph.ainvoke(
        {
            "task_id": "ts-test",
            "trace_id": "tr-test",
            "repo": "sample-apps",
            "cwd": "/tmp/sample-apps",
            "delegate_prompt": "Implement the task.",
            "review_prompt": "Review the delegate output.",
        }
    )

    assert result["status"] == "reviewed"
    assert result["session_id"] == "ss-review-dry-run"
    assert result["delegate_result"]["sessionId"] == "ss-delegate-dry-run"
    assert result["review_result"]["stdout"] == "Verdict: OK"


def test_trace_id_propagated_through_nodes():
    asyncio.run(_assert_trace_id_propagated_through_nodes())


async def _assert_trace_id_propagated_through_nodes():
    gateway = FixtureGatewayClient.from_file(FIXTURES)
    graph = build_delegate_review_graph(gateway_client=gateway)

    await graph.ainvoke(
        {
            "task_id": "ts-test",
            "trace_id": "tr-propagated",
            "repo": "sample-apps",
            "cwd": "/tmp/sample-apps",
        }
    )

    assert [call.args["traceId"] for call in gateway.calls] == [
        "tr-propagated",
        "tr-propagated",
    ]


def test_gateway_tools_called_in_order():
    asyncio.run(_assert_gateway_tools_called_in_order())


async def _assert_gateway_tools_called_in_order():
    gateway = FixtureGatewayClient.from_file(FIXTURES)
    graph = build_delegate_review_graph(gateway_client=gateway)

    await graph.ainvoke(
        {
            "task_id": "ts-test",
            "trace_id": "tr-order",
            "repo": "sample-apps",
            "cwd": "/tmp/sample-apps",
        }
    )

    assert [(call.tool, call.args["role"]) for call in gateway.calls] == [
        ("agent.delegate", "coder"),
        ("agent.delegate", "reviewer"),
    ]
