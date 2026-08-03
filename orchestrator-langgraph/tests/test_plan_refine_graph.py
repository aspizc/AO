import asyncio
import json
import os
from pathlib import Path

import pytest

from orchestrator_langgraph.client.gateway_client import GatewayClient
from orchestrator_langgraph.graphs.delegate_review import FixtureGatewayClient
from orchestrator_langgraph.graphs.plan_refine import build_plan_refine_graph

FIXTURES = Path(__file__).parent / "fixtures" / "plan_refine_responses.json"


def fixture_gateway(name):
    payload = json.loads(FIXTURES.read_text())
    return FixtureGatewayClient(responses=payload[name])


def base_state():
    return {
        "trace_id": "tr-plan-refine",
        "task_id": "ts-root",
        "repo": "agents-orchestrator",
        "cwd": "/tmp/agents-orchestrator",
        "max_refinements": 1,
    }


def test_dry_run_approved_plan_finishes():
    asyncio.run(_assert_dry_run_approved_plan_finishes())


async def _assert_dry_run_approved_plan_finishes():
    gateway = fixture_gateway("approved")
    graph = build_plan_refine_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "approved"
    assert result["refinement_count"] == 0
    assert result["draft_plan"] == "Draft plan v1"
    assert result["plan_artifact"]["artifactId"] == "art-plan-v1"
    assert result["review_notes_artifact"]["artifactId"] == "art-review-v1"


def test_refines_until_plan_is_approved():
    asyncio.run(_assert_refines_until_plan_is_approved())


async def _assert_refines_until_plan_is_approved():
    gateway = fixture_gateway("refine_then_approve")
    graph = build_plan_refine_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "approved"
    assert result["refinement_count"] == 1
    assert result["draft_plan"] == "Draft plan v2"
    assert [(call.tool, call.args.get("role")) for call in gateway.calls].count(
        ("agent.delegate", "planner")
    ) == 4


def test_refinement_limit_stops_graph():
    asyncio.run(_assert_refinement_limit_stops_graph())


async def _assert_refinement_limit_stops_graph():
    gateway = fixture_gateway("limit")
    graph = build_plan_refine_graph(gateway_client=gateway)

    result = await graph.ainvoke(base_state())

    assert result["status"] == "refinement_limit"
    assert result["refinement_count"] == 1
    assert result["review_result"]["decision"] == "changes_requested"


def test_trace_id_propagated_to_all_gateway_calls():
    asyncio.run(_assert_trace_id_propagated_to_all_gateway_calls())


async def _assert_trace_id_propagated_to_all_gateway_calls():
    gateway = fixture_gateway("refine_then_approve")
    graph = build_plan_refine_graph(gateway_client=gateway)

    await graph.ainvoke(base_state())

    assert [call.args["traceId"] for call in gateway.calls] == [
        "tr-plan-refine",
    ] * len(gateway.calls)


def test_gateway_tools_are_real_contract_tools():
    asyncio.run(_assert_gateway_tools_are_real_contract_tools())


async def _assert_gateway_tools_are_real_contract_tools():
    gateway = fixture_gateway("approved")
    graph = build_plan_refine_graph(gateway_client=gateway)

    await graph.ainvoke(base_state())

    tools = [call.tool for call in gateway.calls]
    assert set(tools) == {"task.assign", "agent.delegate", "artifact.put"}
    assert "agent.review" not in tools
    assert "artifact.store" not in tools


@pytest.mark.skipif(os.environ.get("AGENTS_INTEGRATION") != "1", reason="set AGENTS_INTEGRATION=1")
def test_real_gateway_dry_run_smoke():
    asyncio.run(asyncio.wait_for(_assert_real_gateway_dry_run_smoke(), timeout=20))


async def _assert_real_gateway_dry_run_smoke():
    repo_root = Path(__file__).resolve().parents[2]
    client = GatewayClient(
        cwd=repo_root,
        env={
            "AGENTS_DRY_RUN": "1",
            "AGENTS_WORKSPACE": str(repo_root / "workspace"),
            "AGENTS_REPO_ROOTS": str(repo_root),
        },
    )

    async with client as gateway:
        orchestration = await gateway.call_tool(
            "orchestration.create",
            {
                "callerAgent": "claude-code",
                "callerRole": "orchestrator",
                "goal": "plan-refine graph dry-run integration",
            },
        )
        graph = build_plan_refine_graph(gateway_client=gateway)
        result = await graph.ainvoke(
            {
                **base_state(),
                "trace_id": orchestration["traceId"],
                "cwd": str(repo_root),
                "max_refinements": 0,
            }
        )

    assert result["status"] in {"approved", "refinement_limit"}
    assert result["plan_artifact"]["kind"] == "plan"
