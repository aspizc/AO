"""Local orchestrator selector for hybrid V1 flows."""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from typing import Literal, Mapping, cast

FLOW_IMPLEMENT_TEST_REVIEW_PUSH = "implement-test-review-push"
FLOW_PLAN_REFINE = "plan-refine"

SUPPORTED_FLOWS = frozenset({FLOW_IMPLEMENT_TEST_REVIEW_PUSH, FLOW_PLAN_REFINE})
SUPPORTED_SELECTIONS = frozenset({"llm", "langgraph"})

Selection = Literal["llm", "langgraph"]
Source = Literal["default", "env"]


@dataclass(frozen=True)
class OrchestratorSelection:
    flow: str
    selected: Selection
    source: Source
    env_var: str

    def to_artifact(self) -> dict[str, str]:
        return asdict(self)


def env_var_for_flow(flow: str) -> str:
    _assert_supported_flow(flow)
    normalized = flow.upper().replace("-", "_")
    return f"AGENTS_ORCHESTRATOR_{normalized}"


def select_orchestrator(
    flow: str,
    *,
    env: Mapping[str, str] | None = None,
) -> OrchestratorSelection:
    _assert_supported_flow(flow)
    source_env = os.environ if env is None else env
    env_var = env_var_for_flow(flow)
    raw_value = source_env.get(env_var)

    if raw_value is None or raw_value == "":
        return OrchestratorSelection(
            flow=flow,
            selected="llm",
            source="default",
            env_var=env_var,
        )

    selected = raw_value.strip().lower()
    if selected not in SUPPORTED_SELECTIONS:
        allowed = ", ".join(sorted(SUPPORTED_SELECTIONS))
        raise ValueError(f"{env_var} must be one of: {allowed}; got {raw_value!r}")

    return OrchestratorSelection(
        flow=flow,
        selected=cast(Selection, selected),
        source="env",
        env_var=env_var,
    )


def _assert_supported_flow(flow: str) -> None:
    if flow not in SUPPORTED_FLOWS:
        allowed = ", ".join(sorted(SUPPORTED_FLOWS))
        raise ValueError(f"unknown orchestrator flow {flow!r}; expected one of: {allowed}")
