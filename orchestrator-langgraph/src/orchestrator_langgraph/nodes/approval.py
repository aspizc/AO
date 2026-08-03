"""Reusable approval node for LangGraph workflows."""

from __future__ import annotations

from typing import Any, Mapping, TypedDict

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state
from orchestrator_langgraph.graphs.delegate_review import GatewayLike


class ApprovalState(TypedDict, total=False):
    trace_id: str
    task_id: str
    approval_action: str
    approval_reason: str
    approval_timeout_seconds: int
    approval_context: dict[str, Any]
    approval_request: dict[str, Any]
    approval_result: dict[str, Any]
    status: str


async def approval_node(state: ApprovalState, gateway_client: GatewayLike) -> ApprovalState:
    trace_id = require_state(state, "trace_id")
    action = state.get("approval_action", "git.push")
    context = {
        **state.get("approval_context", {}),
        "taskId": state.get("task_id"),
        "reason": state.get("approval_reason", "Approval required by LangGraph workflow."),
    }
    request = await gateway_client.call_tool(
        "approval.request",
        {
            "traceId": trace_id,
            "action": action,
            "requestedBy": "langgraph",
            "context": context,
        },
    )
    raise_on_tool_error(request, "approval.request")
    approval_id = request.get("approvalId")
    if not approval_id:
        raise RuntimeError("approval.request did not return approvalId")

    wait = await gateway_client.call_tool(
        "approval.wait",
        {
            "approvalId": approval_id,
            "timeoutMs": int(state.get("approval_timeout_seconds", 60)) * 1000,
        },
    )
    raise_on_tool_error(wait, "approval.wait")

    status = str(wait.get("status", request.get("status", "pending")))
    return {
        "approval_request": request,
        "approval_result": wait,
        "status": f"approval_{status}",
    }


def approval_granted(state: Mapping[str, Any]) -> bool:
    result = state.get("approval_result", {})
    return isinstance(result, Mapping) and result.get("status") == "granted"
