from __future__ import annotations

import importlib
import inspect
import json
from pathlib import Path

from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "schemas" / "doctor-result-v1.schema.json"

CORE_CHECK_IDS = (
    "config",
    "dependency",
    "policy",
    "profile",
    "repository",
    "runtime",
)
READY_MATCH = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_MATCH",
}
AVAILABLE_PROVIDERS = {
    "claude-code": {"execution": "available"},
    "codex": {"execution": "available"},
}


class RecordingRunner:
    def __init__(self, success):
        self.success = success
        self.calls = []

    def __call__(self, argv, *, timeout_seconds):
        self.calls.append((argv, timeout_seconds))
        return self.success


def passing_core_bindings(doctor):
    bindings = []
    for definition in doctor.CHECK_REGISTRY[: len(CORE_CHECK_IDS)]:
        passing = next(
            outcome
            for outcome in definition.outcomes
            if outcome.result_status is doctor.ResultStatus.PASS
        )
        observation = doctor.ProbeObservation(
            passing.probe_status,
            passing.code,
        )
        bindings.append(
            doctor.ProbeBinding(
                definition.id,
                lambda observation=observation: observation,
            )
        )
    return tuple(bindings)


def projected_status_codes(projection):
    return [
        (check["id"], check["status"], check["code"]) for check in projection["checks"]
    ]


def test_six_probe_factories_form_one_lazy_schema_valid_doctor_composition():
    doctor = importlib.reload(importlib.import_module("agents_cli.doctor"))
    probes = importlib.reload(importlib.import_module("agents_cli.doctor_probes"))
    factory = getattr(probes, "create_doctor_probe_bindings", None)

    assert callable(factory), "the six-probe Doctor composition factory is absent"

    parameters = inspect.signature(factory).parameters
    assert tuple(parameters) == (
        "providers",
        "runner",
        "coordination_snapshot",
        "authority_capability",
    )
    assert all(
        parameter.kind is inspect.Parameter.KEYWORD_ONLY
        for parameter in parameters.values()
    )
    assert all(
        parameters[name].default is inspect.Parameter.empty
        for name in ("providers", "runner", "coordination_snapshot")
    )
    assert parameters["authority_capability"].default is None

    authority_calls = []

    def ready_owned_authority():
        authority_calls.append("authority")
        return (
            probes.IsolationStatus.READY,
            probes.StateOwnershipStatus.OWNED,
        )

    runner = RecordingRunner(probes.CommandStatus.SUCCESS)
    bindings = factory(
        providers=AVAILABLE_PROVIDERS,
        runner=runner,
        coordination_snapshot=READY_MATCH,
        authority_capability=ready_owned_authority,
    )

    assert type(bindings) is tuple
    assert tuple(binding.check_id.value for binding in bindings) == (
        probes.FINAL_PROBE_CHECK_ORDER
    )
    assert runner.calls == []
    assert authority_calls == []

    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (*passing_core_bindings(doctor), *bindings),
    )
    projection = doctor.project_result(run.result)
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(projection)

    expected_runner_calls = [
        (
            ("claude", "--version"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("claude", "auth", "status"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("codex", "--version"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("codex", "login", "status"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
    ]
    assert runner.calls == expected_runner_calls
    assert authority_calls == ["authority"]
    assert run.exit_code == 0
    assert run.result.status is doctor.ResultStatus.PASS
    assert tuple(check["id"] for check in projection["checks"]) == (
        *CORE_CHECK_IDS,
        *probes.FINAL_PROBE_CHECK_ORDER,
    )
    assert projected_status_codes(projection)[len(CORE_CHECK_IDS) :] == [
        ("claude-login", "pass", "CLAUDE_LOGIN_READY"),
        ("codex-login", "pass", "CODEX_LOGIN_READY"),
        ("coordination", "pass", "COORDINATION_READY"),
        ("coordination-scope", "pass", "COORDINATION_SCOPE_MATCH"),
        ("isolation", "pass", "ISOLATION_READY"),
        ("state-ownership", "pass", "STATE_OWNERSHIP_OWNED"),
    ]

    absent_runner = RecordingRunner(probes.CommandStatus.SUCCESS)
    absent_bindings = factory(
        providers=AVAILABLE_PROVIDERS,
        runner=absent_runner,
        coordination_snapshot=READY_MATCH,
    )
    assert absent_runner.calls == []

    absent_run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (*passing_core_bindings(doctor), *absent_bindings),
    )
    absent_projection = doctor.project_result(absent_run.result)
    Draft202012Validator(schema).validate(absent_projection)

    assert absent_runner.calls == expected_runner_calls
    assert absent_run.exit_code == 1
    assert absent_run.result.status is doctor.ResultStatus.FAIL
    assert tuple(check["id"] for check in absent_projection["checks"]) == (
        *CORE_CHECK_IDS,
        *probes.FINAL_PROBE_CHECK_ORDER,
    )
    assert projected_status_codes(absent_projection)[-2:] == [
        ("isolation", "fail", "ISOLATION_UNAVAILABLE"),
        (
            "state-ownership",
            "fail",
            "STATE_OWNERSHIP_UNVERIFIABLE",
        ),
    ]
