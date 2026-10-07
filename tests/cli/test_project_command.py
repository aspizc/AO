"""Production project commands validate inputs without launching project effects."""

import importlib
import json
import shutil
from pathlib import Path

import pytest
import typer
from typer.testing import CliRunner


@pytest.fixture
def command_app():
    command = importlib.import_module("agents_cli.project_command")
    app = typer.Typer()
    app.add_typer(command.project_app, name="project")
    return app


def example(tmp_path, shape):
    checkout = Path(__file__).resolve().parents[2]
    root = tmp_path / "sample-apps"
    shutil.copytree(checkout / "examples/projects" / shape, root)
    value = json.loads((root / "profile.json").read_text())
    value["projectRoot"] = str(root)
    path = root / "profile.json"
    path.write_text(json.dumps(value))
    runtime = tmp_path / "runtime"
    runtime.mkdir()
    args = ["--profile", str(path), "--gateway-root", str(checkout / "gateway"),
            "--policies-dir", str(checkout / "policies"), "--allowed-root", str(tmp_path),
            "--runtime-root", str(runtime), "--json"]
    return value, args, root


def test_two_shapes_preserve_their_commands_and_plan_layouts(command_app, tmp_path):
    seen = []
    for shape in ("javascript-service", "python-cli"):
        folder = tmp_path / shape
        folder.mkdir()
        value, args, _ = example(folder, shape)
        result = CliRunner().invoke(command_app, ["project", "validate", *args])
        assert result.exit_code == 0, result.output
        dto = json.loads(result.stdout)
        assert dto["status"] == "ready" and dto["selections"] == []
        from orchestrator_langgraph.project_profile import load_project_profile
        profile = load_project_profile(Path(args[1]), allowed_roots=[folder], runtime_root=Path(args[-2]))
        assert profile.to_dict()["checks"] == value["checks"]
        seen.append(profile.to_dict()["planDirectory"])
    assert seen == ["plan/stories", "docs/work-items"]


def test_preflight_does_not_launch_gateway_provider_or_project_checks(command_app, tmp_path, monkeypatch):
    import subprocess
    command = importlib.import_module("agents_cli.project_command")
    assert command._client_runtime_available()
    _, args, root = example(tmp_path, "javascript-service")
    original = subprocess.Popen
    calls = []
    def guarded(argv, *a, **k):
        assert Path(argv[0]).name == "node" and Path(argv[1]).name == "project-preflight.mjs"
        assert k.get("shell", False) is False
        calls.append(argv)
        return original(argv, *a, **k)
    monkeypatch.setattr(subprocess, "Popen", guarded)
    before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()}
    result = CliRunner().invoke(command_app, ["project", "preflight", *args])
    # The actual operator PATH may lack codex; either readiness or honest unavailability.
    assert result.exit_code in (0, 3), result.output
    assert len(calls) == 1
    assert {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()} == before
    dto = json.loads(result.stdout)
    assert len(dto["selections"]) == 2
    assert dto["selections"][0]["model"] == "gpt-6.1-sol"


def test_preflight_errors_do_not_echo_secret_paths_or_prompt_canaries(command_app, tmp_path, monkeypatch):
    import subprocess
    value, args, _ = example(tmp_path, "python-cli")
    value["secret-key-canary"] = "prompt-canary"
    Path(args[1]).write_text(json.dumps(value))
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: pytest.fail("bad input launched work"))
    result = CliRunner().invoke(command_app, ["project", "preflight", *args])
    assert result.exit_code == 2
    assert "canary" not in result.stdout + result.stderr and str(tmp_path) not in result.stdout
    assert json.loads(result.stdout)["checks"][0]["outcomeCode"] == "PROFILE_INVALID"


def test_missing_sdk_and_client_report_unavailable_without_node(command_app, tmp_path, monkeypatch):
    command = importlib.import_module("agents_cli.project_command")
    _, args, _ = example(tmp_path, "python-cli")
    monkeypatch.setattr(command, "_client_runtime_available", lambda: False)
    import subprocess
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: pytest.fail("missing runtime launched work"))
    result = CliRunner().invoke(command_app, ["project", "preflight", *args])
    assert result.exit_code == 3
    assert json.loads(result.stdout)["checks"][-1]["outcomeCode"] == "PROFILE_RUNTIME_UNAVAILABLE"


@pytest.mark.parametrize("shape", ["javascript-service", "python-cli"])
def test_both_shapes_emit_identical_production_preflight_semantics(command_app, tmp_path, shape):
    _, args, _ = example(tmp_path, shape)
    result = CliRunner().invoke(command_app, ["project", "preflight", *args])
    assert result.exit_code in (0, 3), result.output
    dto = json.loads(result.stdout)
    assert dto["projectId"] == shape
    assert dto["status"] in ("ready", "unavailable")
    assert [s["model"] for s in dto["selections"]] == ["gpt-6.1-sol", "gpt-6.1-sol"]
