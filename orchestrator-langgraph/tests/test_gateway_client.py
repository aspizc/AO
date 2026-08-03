import asyncio
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

import pytest

from orchestrator_langgraph.client.gateway_client import GatewayClient


class FakeSession:
    def __init__(self, result):
        self.result = result
        self.calls = []
        self.initialized = False

    async def initialize(self):
        self.initialized = True

    async def call_tool(self, name, arguments):
        self.calls.append((name, arguments))
        return self.result


class FakeTextContent:
    def __init__(self, text):
        self.text = text


class FakeToolResult:
    def __init__(self, payload):
        self.content = [FakeTextContent(json.dumps(payload))]


def fake_session_factory(session):
    @asynccontextmanager
    async def factory(_settings):
        yield session

    return factory


def test_call_tool_serializes_args():
    asyncio.run(_assert_call_tool_serializes_args())


async def _assert_call_tool_serializes_args():
    session = FakeSession(FakeToolResult({"ok": True}))
    client = GatewayClient(
        trace_id="tr-test",
        session_factory=fake_session_factory(session),
    )

    async with client as gateway:
        await gateway.call_tool("orchestration.create", {"callerRole": "orchestrator"})

    assert session.initialized is True
    assert session.calls == [
        ("orchestration.create", {"callerRole": "orchestrator"}),
    ]


def test_call_tool_deserializes_result():
    asyncio.run(_assert_call_tool_deserializes_result())


async def _assert_call_tool_deserializes_result():
    session = FakeSession(FakeToolResult({"traceId": "tr-test", "status": "active"}))
    client = GatewayClient(
        trace_id="tr-test",
        session_factory=fake_session_factory(session),
    )

    async with client as gateway:
        result = await gateway.call_tool("orchestration.view", {"traceId": "tr-test"})

    assert result == {"traceId": "tr-test", "status": "active"}


def test_gateway_settings_injects_trace_id():
    client = GatewayClient(
        command="node",
        args=["gateway/src/mcp_server.js"],
        cwd=Path("/tmp/project"),
        env={"AGENTS_DRY_RUN": "1"},
        trace_id="tr-test",
    )

    settings = client.settings()

    assert settings.command == "node"
    assert settings.args == ["gateway/src/mcp_server.js"]
    assert settings.cwd == Path("/tmp/project")
    assert settings.env["AGENTS_DRY_RUN"] == "1"
    assert settings.env["AGENTS_TRACE_ID"] == "tr-test"


def test_gateway_client_propagates_trace_id_only_for_supported_tool_arguments():
    asyncio.run(_assert_gateway_client_propagates_trace_id_only_for_supported_tool_arguments())


async def _assert_gateway_client_propagates_trace_id_only_for_supported_tool_arguments():
    session = FakeSession(FakeToolResult({"ok": True}))
    client = GatewayClient(
        trace_id="tr-propagated",
        session_factory=fake_session_factory(session),
    )

    async with client as gateway:
        await gateway.call_tool("agent.delegate", {"taskId": "ts-1"})
        await gateway.call_tool("approval.wait", {"approvalId": "apr-1"})

    assert session.calls == [
        ("agent.delegate", {"taskId": "ts-1", "traceId": "tr-propagated"}),
        ("approval.wait", {"approvalId": "apr-1"}),
    ]


@pytest.mark.skipif(os.environ.get("AGENTS_INTEGRATION") != "1", reason="set AGENTS_INTEGRATION=1")
def test_real_gateway_smoke():
    asyncio.run(_assert_real_gateway_smoke())


async def _assert_real_gateway_smoke():
    repo_root = Path(__file__).resolve().parents[2]
    client = GatewayClient(
        command="node",
        args=["gateway/src/mcp_server.js"],
        cwd=repo_root,
        env={
            "AGENTS_DRY_RUN": "1",
            "AGENTS_WORKSPACE": str(repo_root / "workspace"),
            "AGENTS_REPO_ROOTS": str(repo_root),
        },
        trace_id="tr-integration",
    )

    async with client as gateway:
        result = await gateway.call_tool(
            "orchestration.create",
            {"callerAgent": "claude-code", "callerRole": "orchestrator"},
        )

    assert result["traceId"].startswith("tr-")
