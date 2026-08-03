from __future__ import annotations

import asyncio
import importlib
import io
import json
import tomllib
import types
from pathlib import Path

import pytest

from orchestrator_langgraph.activities import (
    APPROVAL_REQUEST_ACTIVITY,
    CHECKPOINT_ACTIVITY,
    DELEGATE_ACTIVITY,
    PUSH_ACTIVITY,
    REVIEW_ACTIVITY,
)
from orchestrator_langgraph.worker import (
    DEFAULT_TEMPORAL_ADDRESS,
    DEFAULT_TEMPORAL_TASK_QUEUE,
    WORKER_HEALTH_CHECK_ACTIVITY,
    TemporalWorkerConfig,
    _load_temporal_modules,
    build_worker_activities,
    log_json,
    run_worker,
)
from orchestrator_langgraph.workflows import ImplementTestReviewPushWorkflow

COMPONENT_ROOT = Path(__file__).resolve().parents[1]


def test_pyproject_declares_temporal_python_dependency():
    pyproject = tomllib.loads((COMPONENT_ROOT / "pyproject.toml").read_text(encoding="utf-8"))

    assert any(
        dependency.startswith("temporalio>=")
        for dependency in pyproject["project"]["dependencies"]
    )


def test_temporal_worker_config_uses_stable_defaults():
    config = TemporalWorkerConfig.from_env({})

    assert config.address == DEFAULT_TEMPORAL_ADDRESS
    assert config.address == "localhost:7233"
    assert config.task_queue == DEFAULT_TEMPORAL_TASK_QUEUE
    assert config.task_queue == "orchestrator-langgraph"


def test_temporal_worker_config_reads_environment_values():
    config = TemporalWorkerConfig.from_env(
        {
            "TEMPORAL_ADDRESS": "temporal.example:7233",
            "TEMPORAL_TASK_QUEUE": "project-v1",
        }
    )

    assert config.address == "temporal.example:7233"
    assert config.task_queue == "project-v1"


def test_log_json_writes_single_json_line_to_stderr():
    class FlushingStringIO(io.StringIO):
        flushed = False

        def flush(self):
            self.flushed = True
            super().flush()

    stderr = FlushingStringIO()

    log_json("configured", stderr=stderr, address="localhost:7233")

    lines = stderr.getvalue().splitlines()
    assert len(lines) == 1
    assert json.loads(lines[0]) == {
        "address": "localhost:7233",
        "component": "temporal_worker",
        "event": "configured",
        "level": "info",
    }
    assert stderr.flushed


def test_temporal_modules_are_loaded_only_for_runtime_path(monkeypatch):
    real_import_module = importlib.import_module

    def fake_import_module(name):
        if name.startswith("temporalio"):
            raise ImportError("missing temporalio")
        return real_import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    config = TemporalWorkerConfig.from_env({})
    assert config.address == "localhost:7233"
    with pytest.raises(RuntimeError, match="temporalio Python dependency is required"):
        _load_temporal_modules()


def test_worker_activity_is_decorated_when_temporalio_is_available():
    activity_module = pytest.importorskip("temporalio.activity")

    activities = build_worker_activities(activity_module)

    definitions = [getattr(activity, "__temporal_activity_definition") for activity in activities]
    assert [definition.name for definition in definitions] == [
        WORKER_HEALTH_CHECK_ACTIVITY,
        DELEGATE_ACTIVITY,
        REVIEW_ACTIVITY,
        APPROVAL_REQUEST_ACTIVITY,
        PUSH_ACTIVITY,
        CHECKPOINT_ACTIVITY,
    ]


def test_run_worker_connects_and_starts_temporal_worker(monkeypatch, capsys):
    events = []

    class FakeClient:
        @classmethod
        async def connect(cls, address):
            events.append(("connect", address))
            return cls()

    class FakeWorker:
        def __init__(self, client, *, task_queue, workflows, activities):
            if not activities:
                raise ValueError("At least one activity or workflow must be specified")
            activity_names = [getattr(activity, "_activity_name") for activity in activities]
            events.append(
                (
                    "worker",
                    isinstance(client, FakeClient),
                    task_queue,
                    workflows,
                    activity_names,
                )
            )

        async def run(self):
            events.append(("run",))

    def fake_activity_defn(*, name):
        def decorate(fn):
            fn._activity_name = name
            return fn

        return decorate

    def fake_import_module(name):
        if name == "temporalio.client":
            return types.SimpleNamespace(Client=FakeClient)
        if name == "temporalio.worker":
            return types.SimpleNamespace(Worker=FakeWorker)
        if name == "temporalio.activity":
            return types.SimpleNamespace(defn=fake_activity_defn)
        return importlib.import_module(name)

    monkeypatch.setattr(importlib, "import_module", fake_import_module)

    asyncio.run(
        run_worker(
            TemporalWorkerConfig(
                address="temporal.local:7233",
                task_queue="project-v1",
            )
        )
    )

    assert events == [
        ("connect", "temporal.local:7233"),
        (
            "worker",
            True,
            "project-v1",
            [ImplementTestReviewPushWorkflow],
            [
                WORKER_HEALTH_CHECK_ACTIVITY,
                DELEGATE_ACTIVITY,
                REVIEW_ACTIVITY,
                APPROVAL_REQUEST_ACTIVITY,
                PUSH_ACTIVITY,
                CHECKPOINT_ACTIVITY,
            ],
        ),
        ("run",),
    ]
    log_events = [json.loads(line)["event"] for line in capsys.readouterr().err.splitlines()]
    assert log_events == ["connect", "run"]
