import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def test_help_shows_subcommands():
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    assert "policy" in result.stdout
    assert "audit" in result.stdout
    assert "approve" in result.stdout


def test_version_flag():
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert result.stdout.strip()


def test_policy_check_requires_flags():
    result = runner.invoke(app, ["policy", "check"])
    assert result.exit_code == 2


def test_audit_show_command_is_wired(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    result = runner.invoke(app, ["audit", "show"])
    assert result.exit_code == 0


def test_approve_requires_arguments():
    result = runner.invoke(app, ["approve"])
    assert result.exit_code == 2
