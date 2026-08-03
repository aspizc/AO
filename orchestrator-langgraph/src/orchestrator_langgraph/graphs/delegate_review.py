"""Minimal LangGraph delegate -> review workflow."""

from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping, Protocol, TypedDict

from langgraph.graph import END, START, StateGraph

from orchestrator_langgraph._contracts import raise_on_tool_error, require_state


class DelegateReviewState(TypedDict, total=False):
    task_id: str
    session_id: str
    trace_id: str
    delegate_result: dict[str, Any]
    review_result: dict[str, Any]
    status: str
    repo: str
    cwd: str
    delegate_prompt: str
    review_prompt: str


class GatewayLike(Protocol):
    async def call_tool(self, name: str, args: Mapping[str, Any] | None = None) -> dict[str, Any]:
        ...


@dataclass(frozen=True)
class GatewayCall:
    tool: str
    args: dict[str, Any]


@dataclass
class FixtureGatewayClient:
    responses: dict[str, list[dict[str, Any]]]
    calls: list[GatewayCall] = field(default_factory=list)
    _cursor: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    @classmethod
    def from_file(cls, path: str | Path) -> FixtureGatewayClient:
        payload = json.loads(Path(path).read_text())
        return cls(responses={key: list(value) for key, value in payload.items()})

    async def call_tool(self, name: str, args: Mapping[str, Any] | None = None) -> dict[str, Any]:
        call_args = dict(args or {})
        self.calls.append(GatewayCall(tool=name, args=call_args))

        index = self._cursor[name]
        self._cursor[name] += 1
        try:
            return dict(self.responses[name][index])
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"missing fixture response for {name} call {index + 1}") from exc


async def delegate_node(state: DelegateReviewState, gateway_client: GatewayLike) -> DelegateReviewState:
    trace_id = require_state(state, "trace_id")
    task_id = require_state(state, "task_id")
    result = await gateway_client.call_tool(
        "agent.delegate",
        {
            "agent": "codex",
            "role": "coder",
            "repo": state.get("repo", "sample-apps"),
            "cwd": state.get("cwd", "."),
            "traceId": trace_id,
            "taskId": task_id,
            "prompt": state.get("delegate_prompt", "Implement the assigned task."),
        },
    )
    raise_on_tool_error(result, "agent.delegate")
    return {
        "delegate_result": result,
        "session_id": result.get("sessionId", state.get("session_id", "")),
        "status": "delegated",
    }


async def review_node(state: DelegateReviewState, gateway_client: GatewayLike) -> DelegateReviewState:
    trace_id = require_state(state, "trace_id")
    task_id = require_state(state, "task_id")
    result = await gateway_client.call_tool(
        "agent.delegate",
        {
            "agent": "claude-code",
            "role": "reviewer",
            "repo": state.get("repo", "sample-apps"),
            "cwd": state.get("cwd", "."),
            "traceId": trace_id,
            "taskId": task_id,
            "prompt": state.get("review_prompt", "Review the delegate output."),
        },
    )
    raise_on_tool_error(result, "agent.delegate")
    return {
        "review_result": result,
        "session_id": result.get("sessionId", state.get("session_id", "")),
        "status": "reviewed",
    }


def build_delegate_review_graph(gateway_client: GatewayLike):
    async def run_delegate(state: DelegateReviewState) -> DelegateReviewState:
        return await delegate_node(state, gateway_client)

    async def run_review(state: DelegateReviewState) -> DelegateReviewState:
        return await review_node(state, gateway_client)

    graph = StateGraph(DelegateReviewState)
    graph.add_node("delegate", run_delegate)
    graph.add_node("review", run_review)
    graph.add_edge(START, "delegate")
    graph.add_edge("delegate", "review")
    graph.add_edge("review", END)
    return graph.compile()
