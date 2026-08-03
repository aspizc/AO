"""LangGraph implement -> test -> review -> push-ready workflow."""

from __future__ import annotations

from typing import Any, Mapping, TypedDict

from langgraph.graph import END, START, StateGraph

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state
from orchestrator_langgraph.graphs.delegate_review import (
    FixtureGatewayClient,
    GatewayLike,
)
from orchestrator_langgraph.nodes.approval import approval_granted, approval_node

__all__ = ["FixtureGatewayClient", "build_implement_test_review_push_graph"]


class ImplementTestReviewPushState(TypedDict, total=False):
    trace_id: str
    root_task_id: str
    repo: str
    cwd: str
    target_branch: str
    subtask_ids: dict[str, str]
    plan_result: dict[str, Any]
    implement_result: dict[str, Any]
    test_result: dict[str, Any]
    review_result: dict[str, Any]
    approval_action: str
    approval_reason: str
    approval_timeout_seconds: int
    approval_context: dict[str, Any]
    approval_request: dict[str, Any]
    approval_result: dict[str, Any]
    push_result: dict[str, Any]
    attempt: int
    max_attempts: int
    status: str


def _repo(state: ImplementTestReviewPushState) -> str:
    return state.get("repo", "sample-apps")


def _cwd(state: ImplementTestReviewPushState) -> str:
    return state.get("cwd", ".")


def _subtask_ids(state: ImplementTestReviewPushState, **updates: str) -> dict[str, str]:
    return {**state.get("subtask_ids", {}), **updates}


def _caller() -> dict[str, str]:
    return {"agent": "claude-code", "role": "orchestrator"}


async def plan_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    trace_id = require_state(state, "trace_id")
    result = await gateway_client.call_tool(
        "artifact.put",
        {
            "traceId": trace_id,
            "kind": "plan",
            "classification": "internal",
            "producedBy": state.get("root_task_id", "langgraph"),
            "content": "implement-test-review-push dry-run plan",
        },
    )
    raise_on_tool_error(result, "artifact.put")
    return {"plan_result": result, "status": "planned"}


async def _assign_task(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
    *,
    node: str,
    agent: str,
    role: str,
    action: str,
    brief: str,
) -> dict[str, Any]:
    result = await gateway_client.call_tool(
        "task.assign",
        {
            "traceId": require_state(state, "trace_id"),
            "caller": _caller(),
            "target": {"agent": agent, "role": role, "action": action},
            "repo": _repo(state),
            "brief": brief,
        },
    )
    raise_on_tool_error(result, "task.assign")
    if "taskId" not in result:
        raise RuntimeError(f"task.assign for {node} did not return taskId")
    return result


async def _delegate(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
    *,
    agent: str,
    role: str,
    task_id: str,
    prompt: str,
) -> dict[str, Any]:
    result = await gateway_client.call_tool(
        "agent.delegate",
        {
            "agent": agent,
            "role": role,
            "repo": _repo(state),
            "cwd": _cwd(state),
            "traceId": require_state(state, "trace_id"),
            "taskId": task_id,
            "prompt": prompt,
        },
    )
    raise_on_tool_error(result, "agent.delegate")
    return result


async def implement_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    attempt = int(state.get("attempt", 0)) + 1
    task = await _assign_task(
        state,
        gateway_client,
        node="implement",
        agent="codex",
        role="coder",
        action="code.write",
        brief=f"Implement attempt {attempt} for implement-test-review-push.",
    )
    result = await _delegate(
        state,
        gateway_client,
        agent="codex",
        role="coder",
        task_id=task["taskId"],
        prompt=f"Implement the requested change. Attempt {attempt}.",
    )
    return {
        "attempt": attempt,
        "subtask_ids": _subtask_ids(state, implement=task["taskId"]),
        "implement_result": result,
        "status": "implemented",
    }


async def test_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    task = await _assign_task(
        state,
        gateway_client,
        node="test",
        agent="codex",
        role="tester",
        action="test.run",
        brief=f"Run tests for attempt {state.get('attempt', 1)}.",
    )
    result = await _delegate(
        state,
        gateway_client,
        agent="codex",
        role="tester",
        task_id=task["taskId"],
        prompt="Run the required tests and report pass/fail.",
    )
    status = "tested" if _tests_passed(result) else "tests_failed"
    return {
        "subtask_ids": _subtask_ids(state, test=task["taskId"]),
        "test_result": result,
        "status": status,
    }


async def review_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    task = await _assign_task(
        state,
        gateway_client,
        node="review",
        agent="claude-code",
        role="reviewer",
        action="artifact.put.review_notes",
        brief="Review implementation and test result.",
    )
    result = await _delegate(
        state,
        gateway_client,
        agent="claude-code",
        role="reviewer",
        task_id=task["taskId"],
        prompt="Review the implementation and summarize blockers.",
    )
    return {
        "subtask_ids": _subtask_ids(state, review=task["taskId"]),
        "review_result": result,
        "status": "reviewed",
    }


async def push_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    target_branch = state.get("target_branch", "")
    result = await gateway_client.call_tool(
        "artifact.put",
        {
            "traceId": require_state(state, "trace_id"),
            "kind": "push_intent",
            "classification": "internal",
            "producedBy": state.get("review_result", {}).get("sessionId", "langgraph"),
            "content": f"Dry-run push intent for {target_branch}",
        },
    )
    raise_on_tool_error(result, "artifact.put")
    return {
        "push_result": {
            "status": "push_ready",
            "mode": "dry_run",
            "target_branch": target_branch,
            "artifactId": result.get("artifactId"),
        },
        "status": "push_ready",
    }


async def request_push_approval_node(
    state: ImplementTestReviewPushState,
    gateway_client: GatewayLike,
) -> ImplementTestReviewPushState:
    return await approval_node(
        {
            "trace_id": require_state(state, "trace_id"),
            "task_id": state.get("subtask_ids", {}).get("review", state.get("root_task_id", "")),
            "approval_action": state.get("approval_action", "git.push"),
            "approval_reason": state.get(
                "approval_reason",
                "Allow implement-test-review-push to continue to push intent.",
            ),
            "approval_timeout_seconds": state.get("approval_timeout_seconds", 60),
            "approval_context": {
                "repo": _repo(state),
                "targetBranch": state.get("target_branch", ""),
                **state.get("approval_context", {}),
            },
        },
        gateway_client,
    )


def _tests_passed(result: Mapping[str, Any]) -> bool:
    if "passed" in result:
        return bool(result["passed"])
    return str(result.get("status", "")).lower() in {"passed", "ok", "success"}


def _route_after_test(state: ImplementTestReviewPushState) -> str:
    if _tests_passed(state.get("test_result", {})):
        return "review"
    if int(state.get("attempt", 0)) >= int(state.get("max_attempts", 1)):
        return "failed"
    return "implement"


def _mark_failed_tests(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
    return {"status": "failed_tests"}


def _mark_approval_blocked(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
    return {"status": state.get("status", "approval_pending")}


def _route_after_approval(state: ImplementTestReviewPushState) -> str:
    if approval_granted(state):
        return "push"
    return "approval_blocked"


def build_implement_test_review_push_graph(gateway_client: GatewayLike):
    async def run_plan(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await plan_node(state, gateway_client)

    async def run_implement(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await implement_node(state, gateway_client)

    async def run_test(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await test_node(state, gateway_client)

    async def run_review(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await review_node(state, gateway_client)

    async def run_approval(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await request_push_approval_node(state, gateway_client)

    async def run_push(state: ImplementTestReviewPushState) -> ImplementTestReviewPushState:
        return await push_node(state, gateway_client)

    graph = StateGraph(ImplementTestReviewPushState)
    graph.add_node("plan", run_plan)
    graph.add_node("implement", run_implement)
    graph.add_node("test", run_test)
    graph.add_node("failed_tests", _mark_failed_tests)
    graph.add_node("review", run_review)
    graph.add_node("approval", run_approval)
    graph.add_node("approval_blocked", _mark_approval_blocked)
    graph.add_node("push", run_push)

    graph.add_edge(START, "plan")
    graph.add_edge("plan", "implement")
    graph.add_edge("implement", "test")
    graph.add_conditional_edges(
        "test",
        _route_after_test,
        {"implement": "implement", "review": "review", "failed": "failed_tests"},
    )
    graph.add_edge("failed_tests", END)
    graph.add_edge("review", "approval")
    graph.add_conditional_edges(
        "approval",
        _route_after_approval,
        {"push": "push", "approval_blocked": "approval_blocked"},
    )
    graph.add_edge("approval_blocked", END)
    graph.add_edge("push", END)
    return graph.compile()
