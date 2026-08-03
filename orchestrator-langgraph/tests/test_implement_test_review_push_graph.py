import asyncio
import json
from pathlib import Path

from orchestrator_langgraph.graphs.implement_test_review_push import (
    FixtureGatewayClient,
    build_implement_test_review_push_graph,
)

FIXTURES = Path(__file__).parent / "fixtures" / "implement_test_review_push_responses.json"


def fixture_gateway(name):
    payload = json.loads(FIXTURES.read_text())
    return FixtureGatewayClient(responses=payload[name])


def base_state():
    return {
        "root_task_id": "ts-root",
        "trace_id": "tr-itrp",
        "repo": "sample-apps",
        "cwd": "/tmp/sample-apps",
        "target_branch": "feature/test",
        "max_attempts": 2,
    }


def test_dry_run_completes_to_push_ready():
    asyncio.run(_assert_dry_run_completes_to_push_ready())


async def _assert_dry_run_completes_to_push_ready():
    gateway = fixture_gateway("happy_path")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "push_ready"
    assert result["attempt"] == 1
    assert result["plan_result"]["artifactId"] == "art-plan"
    assert result["implement_result"]["sessionId"] == "ss-implement"
    assert result["test_result"]["passed"] is True
    assert result["review_result"]["stdout"] == "Verdict: OK"
    assert result["approval_result"]["status"] == "granted"
    assert result["push_result"] == {
        "status": "push_ready",
        "mode": "dry_run",
        "target_branch": "feature/test",
        "artifactId": "art-push-intent",
    }


def test_gateway_tools_called_in_order():
    asyncio.run(_assert_gateway_tools_called_in_order())


async def _assert_gateway_tools_called_in_order():
    gateway = fixture_gateway("happy_path")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    await graph.ainvoke(base_state())

    assert [(call.tool, call.args.get("role")) for call in gateway.calls] == [
        ("artifact.put", None),
        ("task.assign", None),
        ("agent.delegate", "coder"),
        ("task.assign", None),
        ("agent.delegate", "tester"),
        ("task.assign", None),
        ("agent.delegate", "reviewer"),
        ("approval.request", None),
        ("approval.wait", None),
        ("artifact.put", None),
    ]


def test_trace_id_propagated_to_gateway_calls():
    asyncio.run(_assert_trace_id_propagated_to_gateway_calls())


async def _assert_trace_id_propagated_to_gateway_calls():
    gateway = fixture_gateway("happy_path")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    await graph.ainvoke(base_state())

    calls_with_trace = [call for call in gateway.calls if "traceId" in call.args]
    assert [call.args["traceId"] for call in calls_with_trace] == ["tr-itrp"] * len(
        calls_with_trace
    )
    assert any(
        call.tool == "approval.request" and call.args["traceId"] == "tr-itrp"
        for call in gateway.calls
    )


def test_retry_loop_runs_until_tests_pass():
    asyncio.run(_assert_retry_loop_runs_until_tests_pass())


async def _assert_retry_loop_runs_until_tests_pass():
    gateway = fixture_gateway("retry_then_pass")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "push_ready"
    assert result["attempt"] == 2
    assert [(call.tool, call.args.get("role")) for call in gateway.calls].count(
        ("agent.delegate", "coder")
    ) == 2
    assert [(call.tool, call.args.get("role")) for call in gateway.calls].count(
        ("agent.delegate", "tester")
    ) == 2


def test_max_attempts_stops_before_review_and_push():
    asyncio.run(_assert_max_attempts_stops_before_review_and_push())


async def _assert_max_attempts_stops_before_review_and_push():
    gateway = fixture_gateway("max_attempts_exhausted")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "failed_tests"
    assert result["attempt"] == 2
    assert "review_result" not in result
    assert "push_result" not in result
    assert ("agent.delegate", "reviewer") not in [
        (call.tool, call.args.get("role")) for call in gateway.calls
    ]


def test_pending_approval_blocks_push_node():
    asyncio.run(_assert_pending_approval_blocks_push_node())


async def _assert_pending_approval_blocks_push_node():
    gateway = fixture_gateway("approval_pending")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "approval_pending"
    assert result["approval_request"]["approvalId"] == "apr-push"
    assert result["approval_result"]["status"] == "pending"
    assert "push_result" not in result
    assert [call.tool for call in gateway.calls].count("artifact.put") == 1


def test_does_not_use_ghost_gateway_tools_or_real_git_push():
    asyncio.run(_assert_does_not_use_ghost_gateway_tools_or_real_git_push())


async def _assert_does_not_use_ghost_gateway_tools_or_real_git_push():
    gateway = fixture_gateway("happy_path")
    graph = build_implement_test_review_push_graph(gateway_client=gateway)

    await graph.ainvoke(base_state())

    tools = [call.tool for call in gateway.calls]
    assert "agent.review" not in tools
    assert "artifact.store" not in tools
    assert not any("push" in tool for tool in tools)
