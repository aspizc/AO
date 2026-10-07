"""Closed, input-blind errors shared by local wave components."""

from __future__ import annotations

import re
from typing import TypedDict

LOCAL_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}\Z")
SCHEMA_ID = re.compile(r"[A-Za-z][A-Za-z0-9]{0,63}\Z")
OUTCOME_CODE = re.compile(r"[A-Z][A-Z0-9_]{0,63}\Z")


class Counters(TypedDict):
    limit: int
    used: int
    requested: int


def local_id(value: object) -> bool:
    return type(value) is str and LOCAL_ID.fullmatch(value) is not None


class WaveError(Exception):
    """An outcome code and validated schema identifiers; never raw exceptions."""

    def __init__(
        self,
        outcome_code: str,
        *,
        field: str | None = None,
        resource: str | None = None,
        task_id: str | None = None,
        run_id: str | None = None,
        counters: Counters | None = None,
        exit_code: int | None = None,
    ) -> None:
        if type(outcome_code) is not str or not OUTCOME_CODE.fullmatch(outcome_code):
            raise ValueError("invalid wave outcome code")
        for value in (field, resource):
            if value is not None and (type(value) is not str or not SCHEMA_ID.fullmatch(value)):
                raise ValueError("invalid wave schema identifier")
        if any(value is not None and not local_id(value) for value in (task_id, run_id)):
            raise ValueError("invalid wave local identifier")
        if counters is not None and (
            type(counters) is not dict
            or set(counters) != {"limit", "used", "requested"}
            or any(type(value) is not int or value < 0 for value in counters.values())
        ):
            raise ValueError("invalid wave counters")
        if exit_code is None:
            exit_code = {
                "CAPACITY_UNSUPPORTED": 3,
                "CAPACITY_STATE_INVALID": 3,
                "CAPACITY_STATE_UNAVAILABLE": 3,
                "CAPACITY_EXHAUSTED": 4,
                "CAPACITY_BUSY": 4,
                "CAPACITY_STATE_FULL": 4,
                "CAPACITY_RECOVERY_REQUIRED": 5,
            }.get(outcome_code, 2)
        if type(exit_code) is not int or exit_code not in (2, 3, 4, 5):
            raise ValueError("invalid wave exit code")
        super().__init__(outcome_code)
        self.outcome_code = outcome_code
        self.exit_code = exit_code
        self._dto: dict[str, object] = {"schemaVersion": "wave-error/v1", "outcomeCode": outcome_code}
        for key, value in (("field", field), ("resource", resource), ("taskId", task_id), ("runId", run_id)):
            if value is not None:
                self._dto[key] = value
        if counters is not None:
            self._dto["counters"] = dict(counters)

    def to_dict(self) -> dict[str, object]:
        result = dict(self._dto)
        if "counters" in result:
            result["counters"] = dict(result["counters"])
        return result
