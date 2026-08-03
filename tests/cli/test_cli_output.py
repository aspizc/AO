import json
import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def _write_audit(tmp_path, events):
  audit = tmp_path / "audit" / "events.jsonl"
  audit.parent.mkdir(parents=True, exist_ok=True)
  audit.write_text("".join(f"{json.dumps(event)}\n" for event in events), encoding="utf-8")
  return audit


def test_output_helper_is_importable():
    import agents_cli.output as output

    assert hasattr(output, "emit")
    assert hasattr(output, "fail")
    assert hasattr(output, "render_audit_table")
    assert hasattr(output, "render_decision")


def test_json_mode_outputs_valid_json_for_relevant_commands(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))

    commands = [
        ["policy", "validate", "--json"],
        [
            "policy",
            "check",
            "--agent",
            "claude-code",
            "--role",
            "orchestrator",
            "--action",
            "policy.check",
            "--json",
        ],
        ["audit", "show", "--json"],
    ]

    for command in commands:
        result = runner.invoke(app, command)
        assert result.exit_code == 0
        json.loads(result.stdout)


def test_policy_validate_errors_go_to_stderr(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(app, ["policy", "validate", "--policies-dir", str(tmp_path)])

    assert result.exit_code != 0
    assert result.stderr
    assert "FAIL" in result.stderr or "error:" in result.stderr


def test_policy_check_human_output_contains_decision():
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(
        app,
        [
            "policy",
            "check",
            "--agent",
            "claude-code",
            "--role",
            "orchestrator",
            "--action",
            "policy.check",
        ],
    )

    assert result.exit_code == 0
    assert "ALLOW" in result.stdout
    assert "ruleId=ok" in result.stdout


def test_audit_show_human_output_uses_table(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    _write_audit(
        tmp_path,
        [
            {
                "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "timestamp": "2026-01-01T00:00:00.000Z",
                "type": "TYPE_A",
                "traceId": "t1",
            }
        ],
    )

    result = runner.invoke(app, ["audit", "show"])

    assert result.exit_code == 0
    assert "ts" in result.stdout
    assert "traceId" in result.stdout
    assert "TYPE_A" in result.stdout
