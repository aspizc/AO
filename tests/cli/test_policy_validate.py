import json
import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def test_policy_validate_success():
    if shutil.which("node") is None:
        pytest.skip("node not available")
    result = runner.invoke(app, ["policy", "validate"])
    assert result.exit_code == 0
    assert "OK" in result.stdout


def test_policy_validate_failure_for_missing_registry(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    result = runner.invoke(app, ["policy", "validate", "--policies-dir", str(tmp_path)])
    assert result.exit_code != 0
    assert "FAIL" in result.stdout or "FAIL" in result.output


def test_policy_validate_json_mode_emits_valid_json():
    if shutil.which("node") is None:
        pytest.skip("node not available")
    result = runner.invoke(app, ["policy", "validate", "--json"])
    assert result.exit_code == 0
    parsed = json.loads(result.stdout)
    assert parsed.get("ok") is True
