"""Operator budget initialization must never replace host configuration."""

from __future__ import annotations

import importlib
import json

import pytest
import typer
from typer.testing import CliRunner


@pytest.fixture
def app():
    # Root owns agents_cli.main registration; use the real wave command group.
    command = importlib.import_module("agents_cli.wave_budget_command")
    root = typer.Typer()
    root.add_typer(command.wave_app, name="wave")
    return root


def config():
    return {"gatewayInstances": 1, "agentSessions": 1, "checkProcesses": 1,
            "providerSessions": {"codex": 1}, "memoryMiB": 1024, "memoryHeadroomMiB": 128}


def invoke(app, tmp_path, value):
    path = tmp_path / "budget.json"
    limits = tmp_path / "limits.json"
    limits.write_text(json.dumps(value))
    result = CliRunner().invoke(app, ["wave", "budget-init", "--budget", str(path), "--limits", str(limits), "--json"])
    return path, result


def test_budget_init_creates_private_closed_ledger_without_launching_work(app, tmp_path, monkeypatch):
    import subprocess
    monkeypatch.setattr(subprocess, "Popen", lambda *_args, **_kwargs: pytest.fail("initialization launched work"))
    path, result = invoke(app, tmp_path, config())
    assert result.exit_code == 0, result.output
    assert result.stderr == ""
    dto = json.loads(result.stdout)
    assert dto == json.loads(path.read_text())
    assert dto["schemaVersion"] == "wave-budget/v1"
    assert dto["limits"] == config()
    assert dto["revision"] == 0 and dto["reservations"] == []
    assert path.stat().st_mode & 0o777 == 0o600
    assert str(tmp_path) not in result.stdout


def test_budget_init_cannot_raise_existing_limits(app, tmp_path):
    path, result = invoke(app, tmp_path, config())
    assert result.exit_code == 0
    before = path.read_bytes()
    _, result = invoke(app, tmp_path, {**config(), "agentSessions": 2})
    assert result.exit_code == 2
    assert json.loads(result.stdout)["outcomeCode"] == "CAPACITY_CONFIG_CONFLICT"
    assert path.read_bytes() == before


@pytest.mark.parametrize("damage", ["malformed", "unknown", "missing", "boolean"])
def test_budget_init_errors_are_safe_wave_dtos(app, tmp_path, damage):
    limits = tmp_path / "secret-path-canary.json"
    value = config()
    if damage == "unknown":
        value["secret-token-canary"] = "private-output-canary"
    elif damage == "missing":
        del value["memoryMiB"]
    elif damage == "boolean":
        value["agentSessions"] = True
    limits.write_text("{secret-token-canary" if damage == "malformed" else json.dumps(value))
    path = tmp_path / "budget.json"
    result = CliRunner().invoke(app, ["wave", "budget-init", "--budget", str(path), "--limits", str(limits), "--json"])
    assert result.exit_code == 2
    dto = json.loads(result.stdout)
    assert dto == {"schemaVersion": "wave-error/v1", "outcomeCode": "CAPACITY_CONFIG_INVALID", "field": "limits"}
    assert result.stderr == ""
    assert "canary" not in result.stdout + result.stderr
    assert not path.exists()


def test_missing_limits_file_has_safe_unavailable_exit(app, tmp_path):
    result = CliRunner().invoke(app, ["wave", "budget-init", "--budget", str(tmp_path / "budget.json"), "--limits", str(tmp_path / "secret-file-canary"), "--json"])
    assert result.exit_code == 3
    assert json.loads(result.stdout)["outcomeCode"] == "CAPACITY_STATE_UNAVAILABLE"
    assert "canary" not in result.stdout + result.stderr


def test_operator_cli_registers_budget_initialization(tmp_path):
    from agents_cli.main import app as operator_app

    path, result = invoke(operator_app, tmp_path, config())
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout) == json.loads(path.read_text())
    assert json.loads(result.stdout)["limits"] == config()
