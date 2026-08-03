"""LangGraph plan -> review -> refine workflow."""

from __future__ import annotations

from typing import Any, Mapping, TypedDict

from langgraph.graph import END, START, StateGraph

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state
from orchestrator_langgraph.graphs.delegate_review import GatewayLike


class PlanRefineState(TypedDict, total=False):
    trace_id: str
    task_id: str
    repo: str
    cwd: str
    draft_plan: str
    review_result: dict[str, Any]
    plan_artifact: dict[str, Any]
    review_notes_artifact: dict[str, Any]
    refinement_count: int
    max_refinements: int
    status: str


def _repo(state: PlanRefineState) -> str:
    return state.get("repo", "agents-orchestrator")


def _cwd(state: PlanRefineState) -> str:
    return state.get("cwd", ".")


def _caller() -> dict[str, str]:
    return {"agent": "claude-code", "role": "orchestrator"}


async def _assign_planner_task(
    state: PlanRefineState,
    gateway_client: GatewayLike,
    *,
    action: str,
    brief: str,
) -> dict[str, Any]:
    result = await gateway_client.call_tool(
        "task.assign",
        {
            "traceId": require_state(state, "trace_id"),
            "caller": _caller(),
            "target": {"agent": "claude-code", "role": "planner", "action": action},
            "repo": _repo(state),
            "brief": brief,
        },
    )
    raise_on_tool_error(result, "task.assign")
    if "taskId" not in result:
        raise RuntimeError("task.assign did not return taskId")
    return result


async def _delegate_planner(
    state: PlanRefineState,
    gateway_client: GatewayLike,
    *,
    task_id: str,
    prompt: str,
) -> dict[str, Any]:
    result = await gateway_client.call_tool(
        "agent.delegate",
        {
            "agent": "claude-code",
            "role": "planner",
            "repo": _repo(state),
            "cwd": _cwd(state),
            "traceId": require_state(state, "trace_id"),
            "taskId": task_id,
            "prompt": prompt,
        },
    )
    raise_on_tool_error(result, "agent.delegate")
    return result


async def _put_artifact(
    state: PlanRefineState,
    gateway_client: GatewayLike,
    *,
    kind: str,
    produced_by: str,
    content: str,
) -> dict[str, Any]:
    result = await gateway_client.call_tool(
        "artifact.put",
        {
            "traceId": require_state(state, "trace_id"),
            "kind": kind,
            "classification": "internal",
            "producedBy": produced_by,
            "content": content,
        },
    )
    raise_on_tool_error(result, "artifact.put")
    return result


async def plan_node(state: PlanRefineState, gateway_client: GatewayLike) -> PlanRefineState:
    task = await _assign_planner_task(
        state,
        gateway_client,
        action="artifact.put.plan",
        brief="Draft a plan proposal.",
    )
    result = await _delegate_planner(
        state,
        gateway_client,
        task_id=task["taskId"],
        prompt="Draft a concise implementation plan proposal.",
    )
    draft_plan = str(result.get("stdout") or result.get("result") or "")
    artifact = await _put_artifact(
        state,
        gateway_client,
        kind="plan",
        produced_by=result.get("sessionId", task["taskId"]),
        content=draft_plan,
    )
    return {
        "draft_plan": draft_plan,
        "plan_artifact": artifact,
        "refinement_count": int(state.get("refinement_count", 0)),
        "status": "planned",
    }


async def review_plan_node(state: PlanRefineState, gateway_client: GatewayLike) -> PlanRefineState:
    task = await _assign_planner_task(
        state,
        gateway_client,
        action="artifact.put.review_notes",
        brief="Review the plan proposal.",
    )
    result = await _delegate_planner(
        state,
        gateway_client,
        task_id=task["taskId"],
        prompt=f"Review this plan and return approved or changes_requested:\n{state.get('draft_plan', '')}",
    )
    notes = str(result.get("stdout") or result.get("result") or "")
    artifact = await _put_artifact(
        state,
        gateway_client,
        kind="review_notes",
        produced_by=result.get("sessionId", task["taskId"]),
        content=notes,
    )
    return {
        "review_result": result,
        "review_notes_artifact": artifact,
        "status": "reviewed",
    }


async def refine_node(state: PlanRefineState, gateway_client: GatewayLike) -> PlanRefineState:
    next_count = int(state.get("refinement_count", 0)) + 1
    task = await _assign_planner_task(
        state,
        gateway_client,
        action="artifact.put.plan",
        brief=f"Refine plan proposal iteration {next_count}.",
    )
    result = await _delegate_planner(
        state,
        gateway_client,
        task_id=task["taskId"],
        prompt=f"Refine the plan using these review notes:\n{state.get('review_result', {}).get('stdout', '')}",
    )
    draft_plan = str(result.get("stdout") or result.get("result") or "")
    artifact = await _put_artifact(
        state,
        gateway_client,
        kind="plan",
        produced_by=result.get("sessionId", task["taskId"]),
        content=draft_plan,
    )
    return {
        "draft_plan": draft_plan,
        "plan_artifact": artifact,
        "refinement_count": next_count,
        "status": "refined",
    }


def _review_approved(result: Mapping[str, Any]) -> bool:
    decision = str(result.get("decision", "")).lower()
    text = str(result.get("stdout", "")).lower()
    return decision == "approved" or "approved" in text


def _route_after_review(state: PlanRefineState) -> str:
    if _review_approved(state.get("review_result", {})):
        return "approved"
    if int(state.get("refinement_count", 0)) >= int(state.get("max_refinements", 1)):
        return "limit"
    return "refine"


def _mark_approved(state: PlanRefineState) -> PlanRefineState:
    return {"status": "approved"}


def _mark_refinement_limit(state: PlanRefineState) -> PlanRefineState:
    return {"status": "refinement_limit"}


def build_plan_refine_graph(gateway_client: GatewayLike):
    async def run_plan(state: PlanRefineState) -> PlanRefineState:
        return await plan_node(state, gateway_client)

    async def run_review(state: PlanRefineState) -> PlanRefineState:
        return await review_plan_node(state, gateway_client)

    async def run_refine(state: PlanRefineState) -> PlanRefineState:
        return await refine_node(state, gateway_client)

    graph = StateGraph(PlanRefineState)
    graph.add_node("plan", run_plan)
    graph.add_node("review", run_review)
    graph.add_node("refine", run_refine)
    graph.add_node("approved", _mark_approved)
    graph.add_node("refinement_limit", _mark_refinement_limit)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "review")
    graph.add_conditional_edges(
        "review",
        _route_after_review,
        {"approved": "approved", "refine": "refine", "limit": "refinement_limit"},
    )
    graph.add_edge("refine", "review")
    graph.add_edge("approved", END)
    graph.add_edge("refinement_limit", END)
    return graph.compile()
