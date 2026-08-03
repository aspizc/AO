"""Hybrid orchestrator smoke runner for Stage B."""

from __future__ import annotations

import json
from typing import Any, Mapping, TypedDict

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state
from orchestrator_langgraph.graphs.delegate_review import (
    GatewayLike,
)
from orchestrator_langgraph.graphs.implement_test_review_push import (
    build_implement_test_review_push_graph,
)
from orchestrator_langgraph.selector import (
    FLOW_IMPLEMENT_TEST_REVIEW_PUSH,
    select_orchestrator,
)


class HybridSmokeResult(TypedDict, total=False):
    selection: dict[str, str]
    selection_artifact: dict[str, Any]
    graph_result: dict[str, Any]
    status: str


async def run_hybrid_smoke(
    flow: str,
    *,
    gateway_client: GatewayLike,
    state: Mapping[str, Any],
    env: Mapping[str, str] | None = None,
) -> HybridSmokeResult:
    selection = select_orchestrator(flow, env=env)
    selection_payload = selection.to_artifact()
    selection_artifact = await gateway_client.call_tool(
        "artifact.put",
        {
            "traceId": require_state(state, "trace_id"),
            "kind": "orchestrator_selection",
            "classification": "internal",
            "producedBy": state.get("root_task_id", "hybrid-smoke"),
            "content": json.dumps(selection_payload, sort_keys=True),
        },
    )
    raise_on_tool_error(selection_artifact, "artifact.put")

    if selection.selected == "llm":
        return {
            "selection": selection_payload,
            "selection_artifact": selection_artifact,
            "status": "llm_selected",
        }

    if flow == FLOW_IMPLEMENT_TEST_REVIEW_PUSH:
        graph = build_implement_test_review_push_graph(gateway_client=gateway_client)
        graph_result = await graph.ainvoke(dict(state))
        return {
            "selection": selection_payload,
            "selection_artifact": selection_artifact,
            "graph_result": graph_result,
            "status": graph_result.get("status", "unknown"),
        }

    raise ValueError(f"LangGraph smoke is not implemented for flow {flow!r}")
