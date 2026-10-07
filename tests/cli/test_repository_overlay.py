import importlib
import json

from typer.testing import CliRunner
from agents_cli.main import app

doctor_command = importlib.import_module("agents_cli.doctor_command")


def set_overlay(tmp_path, monkeypatch, repositories):
    file = tmp_path / "repositories.json"
    file.write_text(json.dumps({"version": 1, "repositories": repositories}))
    monkeypatch.setenv("AGENTS_REPOSITORIES_OVERLAY", str(file))
    return file


def test_doctor_sees_overlay_ids_and_keeps_base_ids(tmp_path, monkeypatch):
    entry = {"classification": "internal", "allowedAgents": ["codex"]}
    set_overlay(tmp_path, monkeypatch, {"local-project": entry})
    registry = doctor_command._load_repositories()
    assert registry["local-project"] == entry
    assert "agents-orchestrator" in registry
    assert doctor_command._policy_valid()
    assert doctor_command._repository_canonical()


def test_policy_validate_counts_overlay_and_policy_check_uses_it(tmp_path, monkeypatch):
    runner = CliRunner()
    monkeypatch.delenv("AGENTS_REPOSITORIES_OVERLAY", raising=False)
    base = json.loads(runner.invoke(app, ["policy", "validate", "--json"]).stdout)
    set_overlay(tmp_path, monkeypatch, {"local-project": {"classification": "internal", "allowedAgents": ["codex"]}})
    result = runner.invoke(app, ["policy", "validate", "--json"])
    assert result.exit_code == 0, result.output
    assert json.loads(result.stdout)["counts"]["repositories"] == base["counts"]["repositories"] + 1
    checked = runner.invoke(app, ["policy", "check", "--agent", "codex", "--role", "coder", "--repo", "local-project", "--action", "code.write", "--json"])
    assert checked.exit_code == 0, checked.output
    assert json.loads(checked.stdout)["decision"] == "allow"


def test_doctor_and_validator_fail_closed_on_collision(tmp_path, monkeypatch):
    set_overlay(tmp_path, monkeypatch, {"sample-apps": {"classification": "internal", "allowedAgents": ["codex"]}})
    result = CliRunner().invoke(app, ["policy", "validate", "--json"])
    assert result.exit_code != 0
    assert json.loads(result.stdout)["code"] == "REGISTRY_OVERLAY_COLLISION"
    assert not doctor_command._policy_valid()
    assert doctor_command._load_repositories() is None


def test_missing_overlay_fails_doctor_and_validator(tmp_path, monkeypatch):
    monkeypatch.setenv("AGENTS_REPOSITORIES_OVERLAY", str(tmp_path / "missing.json"))
    assert not doctor_command._policy_valid()
    assert CliRunner().invoke(app, ["policy", "validate"]).exit_code != 0
