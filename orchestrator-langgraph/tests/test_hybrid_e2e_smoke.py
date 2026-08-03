import asyncio
import json
from pathlib import Path

from orchestrator_langgraph.graphs.delegate_review import FixtureGatewayClient
from orchestrator_langgraph.hybrid_smoke import run_hybrid_smoke
from orchestrator_langgraph.selector import FLOW_IMPLEMENT_TEST_REVIEW_PUSH

FIXTURES = Path(__file__).parent / "fixtures" / "hybrid_smoke_responses.json"


def fixture_gateway(name):
    payload = json.loads(FIXTURES.read_text())
    return FixtureGatewayClient(responses=payload[name])


def base_state():
    return {
        "root_task_id": "ts-root",
        "trace_id": "tr-hybrid",
        "repo": "sample-apps",
        "cwd": "/tmp/sample-apps",
        "target_branch": "feature/hybrid",
        "max_attempts": 1,
    }


def test_langgraph_selection_runs_graph_with_gateway_tools_and_approvals():
    asyncio.run(_assert_langgraph_selection_runs_graph_with_gateway_tools_and_approvals())


async def _assert_langgraph_selection_runs_graph_with_gateway_tools_and_approvals():
    gateway = fixture_gateway("langgraph_push")

    result = await run_hybrid_smoke(
        FLOW_IMPLEMENT_TEST_REVIEW_PUSH,
        gateway_client=gateway,
        state=base_state(),
        env={"AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH": "langgraph"},
    )

    assert result["selection"]["selected"] == "langgraph"
    assert result["status"] == "push_ready"
    assert result["graph_result"]["push_result"]["mode"] == "dry_run"
    assert [call.tool for call in gateway.calls] == [
        "artifact.put",
        "artifact.put",
        "task.assign",
        "agent.delegate",
        "task.assign",
        "agent.delegate",
        "task.assign",
        "agent.delegate",
        "approval.request",
        "approval.wait",
        "artifact.put",
    ]
    assert "approval.request" in [call.tool for call in gateway.calls]
    assert "approval.wait" in [call.tool for call in gateway.calls]
    assert not any("push" in call.tool for call in gateway.calls)


def test_default_llm_selection_records_selection_without_running_graph():
    asyncio.run(_assert_default_llm_selection_records_selection_without_running_graph())


async def _assert_default_llm_selection_records_selection_without_running_graph():
    gateway = fixture_gateway("llm_default")

    result = await run_hybrid_smoke(
        FLOW_IMPLEMENT_TEST_REVIEW_PUSH,
        gateway_client=gateway,
        state=base_state(),
        env={},
    )

    assert result["selection"]["selected"] == "llm"
    assert result["status"] == "llm_selected"
    assert "graph_result" not in result
    assert [call.tool for call in gateway.calls] == ["artifact.put"]
    assert json.loads(gateway.calls[0].args["content"]) == result["selection"]
