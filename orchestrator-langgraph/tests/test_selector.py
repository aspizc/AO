import json

import pytest

from orchestrator_langgraph.selector import (
    FLOW_IMPLEMENT_TEST_REVIEW_PUSH,
    FLOW_PLAN_REFINE,
    OrchestratorSelection,
    select_orchestrator,
)


def test_default_selection_is_llm(monkeypatch):
    monkeypatch.delenv("AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH", raising=False)

    selection = select_orchestrator(FLOW_IMPLEMENT_TEST_REVIEW_PUSH)

    assert selection == OrchestratorSelection(
        flow=FLOW_IMPLEMENT_TEST_REVIEW_PUSH,
        selected="llm",
        source="default",
        env_var="AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH",
    )


def test_valid_env_override_selects_langgraph(monkeypatch):
    monkeypatch.setenv("AGENTS_ORCHESTRATOR_PLAN_REFINE", "langgraph")

    selection = select_orchestrator(FLOW_PLAN_REFINE)

    assert selection.selected == "langgraph"
    assert selection.source == "env"
    assert selection.env_var == "AGENTS_ORCHESTRATOR_PLAN_REFINE"


def test_invalid_env_value_fails_visibly(monkeypatch):
    monkeypatch.setenv("AGENTS_ORCHESTRATOR_PLAN_REFINE", "temporal")

    with pytest.raises(ValueError, match="AGENTS_ORCHESTRATOR_PLAN_REFINE"):
        select_orchestrator(FLOW_PLAN_REFINE)


def test_unknown_flow_fails_visibly():
    with pytest.raises(ValueError, match="unknown orchestrator flow"):
        select_orchestrator("unknown-flow")


def test_selection_is_json_serializable_for_external_audit(monkeypatch):
    monkeypatch.setenv("AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH", "langgraph")

    payload = select_orchestrator(FLOW_IMPLEMENT_TEST_REVIEW_PUSH).to_artifact()

    assert json.loads(json.dumps(payload)) == {
        "flow": "implement-test-review-push",
        "selected": "langgraph",
        "source": "env",
        "env_var": "AGENTS_ORCHESTRATOR_IMPLEMENT_TEST_REVIEW_PUSH",
    }
