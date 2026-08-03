import json
import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def _check(*extra):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    return runner.invoke(app, ["policy", "check", *extra, "--json"])


def test_canonical_raw_restricted_denied():
    result = _check(
        "--agent",
        "claude-code",
        "--role",
        "orchestrator",
        "--action",
        "artifact.get",
        "--artifact-kind",
        "raw_diff",
        "--artifact-classification",
        "restricted",
    )
    data = json.loads(result.stdout)

    assert result.exit_code != 0
    assert data["decision"] == "deny"
    assert data["ruleId"]
    assert data["reason"]


def test_canonical_task_assign_allowed():
    result = _check(
        "--agent",
        "claude-code",
        "--role",
        "orchestrator",
        "--action",
        "task.assign",
        "--target-agent",
        "gemini-cli",
        "--target-role",
        "restricted-coder",
    )
    data = json.loads(result.stdout)

    assert result.exit_code == 0
    assert data["decision"] == "allow"
    assert data["ruleId"] == "ok"


def test_protected_push_requires_approval_and_nonzero_exit():
    result = _check(
        "--agent",
        "gemini-cli",
        "--role",
        "coder",
        "--repo",
        "cvision",
        "--action",
        "git.push",
        "--target-branch",
        "main",
    )
    data = json.loads(result.stdout)

    assert result.exit_code != 0
    assert data["decision"] == "require_approval"
    assert data["ruleId"] == "approval.git_push_protected"


def test_reviewer_raw_restricted_requires_sanitization_and_nonzero_exit():
    result = _check(
        "--agent",
        "claude-code",
        "--role",
        "reviewer",
        "--repo",
        "sample-apps",
        "--action",
        "artifact.get",
        "--artifact-kind",
        "raw_diff",
        "--artifact-classification",
        "restricted",
    )
    data = json.loads(result.stdout)

    assert result.exit_code != 0
    assert data["decision"] == "allow_with_sanitization"
    assert data["ruleId"] == "sanitization.required"


def test_human_output_includes_decision_rule_and_reason():
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(
        app,
        [
            "policy",
            "check",
            "--agent",
            "gemini-cli",
            "--role",
            "restricted-coder",
            "--repo",
            "cvision",
            "--action",
            "code.write",
        ],
    )

    assert result.exit_code == 0
    assert "ALLOW" in result.stdout
    assert "ruleId=ok" in result.stdout
    assert "reason=" in result.stdout
