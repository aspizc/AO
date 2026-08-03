"""MCP stdio client for agents-gateway."""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncContextManager, Callable, Mapping, Sequence

TRACE_ID_ARGUMENT_TOOLS = {
    "agent.delegate",
    "approval.request",
    "artifact.put",
    "orchestration.view",
    "task.assign",
}


@dataclass(frozen=True)
class GatewaySettings:
    """Resolved subprocess settings for an agents-gateway MCP session."""

    command: str
    args: list[str]
    cwd: Path | None
    env: dict[str, str]


SessionFactory = Callable[[GatewaySettings], AsyncContextManager[Any]]


@asynccontextmanager
async def mcp_stdio_session(settings: GatewaySettings):
    """Open a real MCP stdio session against agents-gateway.

    The MCP SDK is imported lazily so unit tests can run without the optional
    runtime dependency installed in the repository venv.
    """

    from mcp import ClientSession
    from mcp.client.stdio import StdioServerParameters, stdio_client

    server_params = StdioServerParameters(
        command=settings.command,
        args=settings.args,
        env=settings.env,
        cwd=str(settings.cwd) if settings.cwd else None,
    )
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            yield session


@dataclass
class GatewayClient:
    """Async context manager for calling agents-gateway MCP tools over stdio."""

    command: str = "node"
    args: Sequence[str] = field(default_factory=lambda: ("gateway/src/mcp_server.js",))
    cwd: str | Path | None = None
    env: Mapping[str, str] | None = None
    trace_id: str | None = None
    session_factory: SessionFactory = mcp_stdio_session

    _session_cm: AsyncContextManager[Any] | None = field(init=False, default=None)
    _session: Any | None = field(init=False, default=None)

    def settings(self) -> GatewaySettings:
        resolved_env = dict(os.environ)
        if self.env:
            resolved_env.update({key: str(value) for key, value in self.env.items()})
        if self.trace_id:
            resolved_env["AGENTS_TRACE_ID"] = self.trace_id

        return GatewaySettings(
            command=self.command,
            args=[str(arg) for arg in self.args],
            cwd=Path(self.cwd) if self.cwd is not None else None,
            env=resolved_env,
        )

    async def __aenter__(self) -> GatewayClient:
        self._session_cm = self.session_factory(self.settings())
        self._session = await self._session_cm.__aenter__()
        await self._session.initialize()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if self._session_cm is not None:
            await self._session_cm.__aexit__(exc_type, exc, tb)
        self._session_cm = None
        self._session = None

    async def call_tool(self, name: str, args: Mapping[str, Any] | None = None) -> dict[str, Any]:
        if self._session is None:
            raise RuntimeError("GatewayClient must be used as an async context manager")

        result = await self._session.call_tool(name, self._args_with_trace_id(name, args))
        if getattr(result, "isError", False):
            raise RuntimeError(f"Gateway tool {name} returned an error: {result!r}")
        return self._decode_tool_result(result)

    def _args_with_trace_id(self, name: str, args: Mapping[str, Any] | None) -> dict[str, Any]:
        resolved = dict(args or {})
        if (
            self.trace_id
            and name in TRACE_ID_ARGUMENT_TOOLS
            and "traceId" not in resolved
            and "trace_id" not in resolved
        ):
            resolved["traceId"] = self.trace_id
        return resolved

    @staticmethod
    def _decode_tool_result(result: Any) -> dict[str, Any]:
        if isinstance(result, dict):
            return result

        content = getattr(result, "content", None)
        if not content:
            raise RuntimeError("Gateway tool result has no content")

        text = getattr(content[0], "text", None)
        if text is None:
            raise RuntimeError("Gateway tool result content is not text")

        decoded = json.loads(text)
        if not isinstance(decoded, dict):
            raise RuntimeError("Gateway tool result JSON is not an object")
        return decoded
