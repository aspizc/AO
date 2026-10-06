from __future__ import annotations

import importlib
import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator
from typer.testing import CliRunner

from agents_cli.main import app

REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "schemas" / "doctor-result-v1.schema.json"
CHECK_IDS = (
    "config",
    "dependency",
    "policy",
    "profile",
    "repository",
    "runtime",
    "claude-login",
    "codex-login",
    "coordination",
    "coordination-scope",
    "isolation",
    "state-ownership",
)
CLEAN_STATUS_CODES = (
    ("pass", "CONFIG_VALID"),
    ("pass", "DEPENDENCIES_READY"),
    ("pass", "POLICY_VALID"),
    ("pass", "PROFILE_VALID"),
    ("pass", "REPOSITORY_CANONICAL"),
    ("pass", "RUNTIME_SUPPORTED"),
    ("pass", "CLAUDE_LOGIN_READY"),
    ("pass", "CODEX_LOGIN_READY"),
    ("pass", "COORDINATION_READY"),
    ("pass", "COORDINATION_SCOPE_MATCH"),
    ("fail", "ISOLATION_UNAVAILABLE"),
    ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
)
RAW_CANARIES = (
    "tok_live_doctor_command_canary",
    "secret=doctor-command-canary",
    "/home/doctor-owner/private/config.json",
    "/workspace/private-doctor-repository",
    "raw provider output doctor canary",
)
AVAILABLE_PROVIDERS = {
    "claude-code": {
        "execution": "available",
        "raw": RAW_CANARIES[0],
    },
    "codex": {
        "execution": "available",
        "raw": RAW_CANARIES[1],
    },
}
READY_COORDINATION = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_MATCH",
}

runner = CliRunner()


class SuccessfulRunner:
    raw_output = RAW_CANARIES

    def __init__(self, probes):
        self._probes = probes

    def __call__(self, _argv, *, timeout_seconds):
        assert timeout_seconds > 0
        return self._probes.CommandStatus.SUCCESS


def _command_module():
    try:
        module = importlib.import_module("agents_cli.doctor_command")
    except ModuleNotFoundError:
        pytest.fail("the registered agent-run doctor command is absent")
    assert callable(getattr(module, "create_production_dependencies", None))
    return module


def _clean_dependencies(command):
    doctor = importlib.import_module("agents_cli.doctor")
    probes = importlib.import_module("agents_cli.doctor_probes")
    core = importlib.import_module("agents_cli.doctor_core_probes")
    return command.DoctorCommandDependencies(
        profile_id=doctor.CANONICAL_PROFILE_ID,
        core_inputs=core.CoreProbeInputs(
            config_valid=True,
            dependencies_ready=True,
            policy_valid=True,
            profile_valid=True,
            repository_canonical=True,
            runtime_supported=True,
        ),
        providers=AVAILABLE_PROVIDERS,
        runner=SuccessfulRunner(probes),
        coordination_snapshot=READY_COORDINATION,
        authority_capability=None,
    )


def test_registered_doctor_json_composes_exact_safe_twelve_check_result(monkeypatch):
    command = _command_module()
    dependencies = _clean_dependencies(command)
    monkeypatch.setattr(
        command,
        "create_production_dependencies",
        lambda: dependencies,
    )

    result = runner.invoke(app, ["doctor", "--json"])

    assert result.exit_code == 1
    assert result.stderr == ""
    projection = json.loads(result.stdout)
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    Draft202012Validator(schema).validate(projection)
    assert tuple(check["id"] for check in projection["checks"]) == CHECK_IDS
    assert (
        tuple((check["status"], check["code"]) for check in projection["checks"])
        == CLEAN_STATUS_CODES
    )
    assert [
        check["code"] for check in projection["checks"] if check["status"] == "fail"
    ] == [
        "ISOLATION_UNAVAILABLE",
        "STATE_OWNERSHIP_UNVERIFIABLE",
    ]

    rendered = result.stdout + result.stderr + json.dumps(projection, sort_keys=True)
    for canary in RAW_CANARIES:
        assert canary not in rendered


def test_doctor_invalid_invocation_exits_two_without_building_dependencies(monkeypatch):
    command = _command_module()
    calls = []

    def unexpected_dependencies():
        calls.append("called")
        return _clean_dependencies(command)

    monkeypatch.setattr(
        command,
        "create_production_dependencies",
        unexpected_dependencies,
    )

    result = runner.invoke(app, ["doctor", "--unsupported-option"])

    assert result.exit_code == 2
    assert calls == []
    assert result.stdout == ""
    assert result.stderr


def test_doctor_contract_failure_exits_two_without_raw_input(monkeypatch):
    command = _command_module()
    dependencies = _clean_dependencies(command)
    invalid = command.DoctorCommandDependencies(
        profile_id=dependencies.profile_id,
        core_inputs={"raw": RAW_CANARIES},
        providers=dependencies.providers,
        runner=dependencies.runner,
        coordination_snapshot=dependencies.coordination_snapshot,
        authority_capability=dependencies.authority_capability,
    )
    monkeypatch.setattr(
        command,
        "create_production_dependencies",
        lambda: invalid,
    )

    result = runner.invoke(app, ["doctor", "--json"])

    assert result.exit_code == 2
    assert result.stdout == ""
    assert result.stderr == "error: doctor contract validation failed\n"
    for canary in RAW_CANARIES:
        assert canary not in result.stderr
