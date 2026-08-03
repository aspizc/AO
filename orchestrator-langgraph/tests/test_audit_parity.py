import asyncio
import json
from pathlib import Path

from orchestrator_langgraph.graphs.delegate_review import (
    FixtureGatewayClient,
    build_delegate_review_graph,
)

FIXTURES = Path(__file__).parent / "fixtures"


class AuditRecordingGatewayClient:
    def __init__(self, gateway):
        self.gateway = gateway
        self.audit_events = []

    @property
    def calls(self):
        return self.gateway.calls

    async def call_tool(self, name, args=None):
        call_args = dict(args or {})
        result = await self.gateway.call_tool(name, call_args)
        self.audit_events.append(
            {
                "event_type": "gateway_tool_call",
                "tool_name": name,
                "actor_role": call_args.get("role"),
                "trace_id": call_args.get("traceId"),
                "session_id": result.get("sessionId"),
                "task_id": call_args.get("taskId"),
                "timestamp": "generated-by-test",
            }
        )
        return result


def load_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text().splitlines() if line.strip()]


def normalize_audit_event(event):
    """Normalize non-comparable audit fields before parity comparison.

    Timestamps, generated ids, sessions, and task ids differ between LLM and
    LangGraph executions. The parity contract here is the comparable downstream
    shape: event type, Gateway tool, actor role, and trace presence.
    """

    trace_id = event.get("trace_id") or event.get("traceId")
    return {
        "event_type": event.get("event_type") or event.get("type"),
        "tool_name": event.get("tool_name") or event.get("toolName"),
        "actor_role": event.get("actor_role") or event.get("role"),
        "trace_id": "<present>" if trace_id else None,
    }


def test_langgraph_audit_matches_llm_path():
    asyncio.run(_assert_langgraph_audit_matches_llm_path())


async def _assert_langgraph_audit_matches_llm_path():
    llm_events = load_jsonl(FIXTURES / "llm_audit_delegate_review.jsonl")
    gateway = AuditRecordingGatewayClient(
        FixtureGatewayClient.from_file(FIXTURES / "gateway_responses.json")
    )
    graph = build_delegate_review_graph(gateway_client=gateway)

    await graph.ainvoke(
        {
            "task_id": "ts-langgraph",
            "trace_id": "tr-langgraph",
            "repo": "sample-apps",
            "cwd": "/tmp/sample-apps",
        }
    )

    assert [normalize_audit_event(event) for event in gateway.audit_events] == [
        normalize_audit_event(event) for event in llm_events
    ]


def test_trace_id_present_in_all_events():
    asyncio.run(_assert_trace_id_present_in_all_events())


async def _assert_trace_id_present_in_all_events():
    gateway = AuditRecordingGatewayClient(
        FixtureGatewayClient.from_file(FIXTURES / "gateway_responses.json")
    )
    graph = build_delegate_review_graph(gateway_client=gateway)

    await graph.ainvoke(
        {
            "task_id": "ts-langgraph",
            "trace_id": "tr-langgraph",
            "repo": "sample-apps",
            "cwd": "/tmp/sample-apps",
        }
    )

    normalized_events = [normalize_audit_event(event) for event in gateway.audit_events]
    assert normalized_events
    assert all(event["trace_id"] == "<present>" for event in normalized_events)
