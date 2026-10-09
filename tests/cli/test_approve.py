import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

REPO_ROOT = Path(__file__).resolve().parents[2]
runner = CliRunner()


def _node_env(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    env = os.environ.copy()
    env["AGENTS_WORKSPACE"] = str(tmp_path)
    return env


def _node_eval(script, env):
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout or "{}")


def _request_approval(env, trace_id="tr-cli-approve"):
    return _node_eval(
        f"""
        import {{ loadConfig }} from './gateway/src/config.js';
        import {{ configureAudit }} from './gateway/src/core/audit.js';
        import {{ initState }} from './gateway/src/core/state.js';
        import {{ request }} from './gateway/src/services/approval_service.js';
        const config = loadConfig();
        initState({{ stateDb: config.stateDb }});
        configureAudit({{ auditLog: config.auditLog }});
        const result = request({{
          traceId: {json.dumps(trace_id)},
          action: 'git.push',
          requestedBy: 'orchestrator'
        }});
        process.stdout.write(JSON.stringify(result));
        """,
        env,
    )


def _poll_approval(env, approval_id):
    return _node_eval(
        f"""
        import {{ loadConfig }} from './gateway/src/config.js';
        import {{ initState }} from './gateway/src/core/state.js';
        import {{ poll }} from './gateway/src/services/approval_service.js';
        const config = loadConfig();
        initState({{ stateDb: config.stateDb }});
        process.stdout.write(JSON.stringify(poll({{ approvalId: {json.dumps(approval_id)} }})));
        """,
        env,
    )


def test_approve_granted(tmp_path, monkeypatch):
    env = _node_env(tmp_path, monkeypatch)
    pending = _request_approval(env)

    result = runner.invoke(app, ["approve", pending["approvalId"], "--decision", "granted", "--json"])

    assert result.exit_code == 0
    assert json.loads(result.stdout)["status"] == "granted"
    assert _poll_approval(env, pending["approvalId"])["status"] == "granted"


def test_approve_denied_human_output(tmp_path, monkeypatch):
    env = _node_env(tmp_path, monkeypatch)
    pending = _request_approval(env, trace_id="tr-cli-deny")

    result = runner.invoke(app, ["approve", pending["approvalId"], "--decision", "denied", "--note", "no"])

    assert result.exit_code == 0
    assert f"{pending['approvalId']}: denied" in result.stdout
    assert _poll_approval(env, pending["approvalId"])["status"] == "denied"


def test_approve_unknown_id_fails(tmp_path, monkeypatch):
    _node_env(tmp_path, monkeypatch)

    result = runner.invoke(app, ["approve", "apr-missing", "--decision", "granted"])

    assert result.exit_code == 1
    assert "approval apr-missing not found" in result.stderr


def test_approve_rejects_invalid_decision():
    result = runner.invoke(app, ["approve", "apr-x", "--decision", "expired"])

    assert result.exit_code == 2
    assert "--decision must be granted|denied" in result.stderr


@pytest.mark.parametrize("json_mode", [False, True])
@pytest.mark.parametrize("answer,status,returncode,expected", [
    ({"status": "answered", "outcome": "sent"}, "granted", 0, 0),
    ({"status": "answered", "outcome": "refused"}, "granted", 0, 1),
    ({"status": "not_answered", "reason": "prompt_no_longer_bound"}, "granted", 0, 1),
    ({"status": "uncertain", "outcome": "uncertain"}, "granted", 0, 1),
    (None, "granted", 0, 1),
    ({"status": "in_flight", "outcome": "attempting"}, "granted", 0, 1),
    (None, "denied", 0, 0),
    ({"status": "answered", "outcome": "sent"}, "granted", 1, 1),
])
def test_prompt_wrapper_reports_delivery_and_enforces_exit(monkeypatch, json_mode, answer, status, returncode, expected):
    data = {"isSessionPrompt": True, "status": status}
    if answer is not None:
        data["promptAnswer"] = answer

    def respond(args, **kwargs):
        assert args[args.index("--decided-by") + 1] == "operator"
        return subprocess.CompletedProcess(args, returncode, json.dumps(data), "")

    monkeypatch.setattr(subprocess, "run", respond)
    result = runner.invoke(app, ["approve", "apr-prompt", "--decision", "granted"] + (["--json"] if json_mode else []))
    assert result.exit_code == expected
    if json_mode:
        assert json.loads(result.stdout) == data
    elif status == "denied":
        assert "denied" in result.stdout
    else:
        assert "granted" not in result.stdout
        assert (answer or {}).get("status", "not_answered") in result.stdout
        if (answer or {}).get("outcome"):
            assert "/" + answer["outcome"] in result.stdout
        if (answer or {}).get("reason"):
            assert answer["reason"] in result.stdout


@pytest.mark.parametrize("payload", ["not JSON", "[]", "null", '{"error":"script error"}'])
@pytest.mark.parametrize("json_mode", [False, True])
def test_prompt_wrapper_script_error_or_malformed_response_fails(monkeypatch, payload, json_mode):
    monkeypatch.setattr(subprocess, "run", lambda args, **kwargs: subprocess.CompletedProcess(args, 0, payload, ""))
    result = runner.invoke(app, ["approve", "apr-prompt", "--decision", "granted"] + (["--json"] if json_mode else []))
    assert result.exit_code == 1
