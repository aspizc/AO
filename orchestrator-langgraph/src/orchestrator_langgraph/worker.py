"""Temporal worker scaffold for orchestrator-langgraph."""

from __future__ import annotations

import asyncio
import importlib
import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Mapping, TextIO

from orchestrator_langgraph.activities import build_temporal_activity_wrappers
from orchestrator_langgraph.workflows import ImplementTestReviewPushWorkflow

DEFAULT_TEMPORAL_ADDRESS = "localhost:7233"
DEFAULT_TEMPORAL_TASK_QUEUE = "orchestrator-langgraph"
WORKER_HEALTH_CHECK_ACTIVITY = "orchestrator_langgraph_worker_health_check"


@dataclass(frozen=True)
class TemporalWorkerConfig:
    address: str = DEFAULT_TEMPORAL_ADDRESS
    task_queue: str = DEFAULT_TEMPORAL_TASK_QUEUE

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> TemporalWorkerConfig:
        source = os.environ if env is None else env
        return cls(
            address=source.get("TEMPORAL_ADDRESS") or DEFAULT_TEMPORAL_ADDRESS,
            task_queue=source.get("TEMPORAL_TASK_QUEUE") or DEFAULT_TEMPORAL_TASK_QUEUE,
        )


def log_json(
    event: str,
    *,
    level: str = "info",
    stderr: TextIO | None = None,
    **fields: Any,
) -> None:
    out = stderr or sys.stderr
    payload = {
        "component": "temporal_worker",
        "level": level,
        "event": event,
        **fields,
    }
    out.write(json.dumps(payload, sort_keys=True) + "\n")
    out.flush()


async def run_worker(config: TemporalWorkerConfig | None = None) -> None:
    resolved = config or TemporalWorkerConfig.from_env()
    client_module, worker_module, activity_module = _load_temporal_modules()
    activities = build_worker_activities(activity_module)

    log_json("connect", address=resolved.address, task_queue=resolved.task_queue)
    client = await client_module.Client.connect(resolved.address)
    worker = worker_module.Worker(
        client,
        task_queue=resolved.task_queue,
        workflows=build_worker_workflows(),
        activities=activities,
    )
    log_json("run", task_queue=resolved.task_queue)
    await worker.run()


def build_worker_activities(activity_module: Any) -> list[Any]:
    async def worker_health_check() -> str:
        return "ok"

    return [
        activity_module.defn(name=WORKER_HEALTH_CHECK_ACTIVITY)(worker_health_check),
        *build_temporal_activity_wrappers(activity_module),
    ]


def build_worker_workflows() -> list[Any]:
    return [ImplementTestReviewPushWorkflow]


def main() -> int:
    asyncio.run(run_worker())
    return 0


def _load_temporal_modules() -> tuple[Any, Any, Any]:
    try:
        client_module = importlib.import_module("temporalio.client")
        worker_module = importlib.import_module("temporalio.worker")
        activity_module = importlib.import_module("temporalio.activity")
    except ImportError as err:
        raise RuntimeError(
            "temporalio Python dependency is required to start the Temporal worker; "
            "pure configuration helpers remain importable without it"
        ) from err
    return client_module, worker_module, activity_module


if __name__ == "__main__":
    raise SystemExit(main())
