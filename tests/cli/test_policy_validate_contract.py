import json
import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def test_valid_registries_exit_zero():
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(app, ["policy", "validate"])

    assert result.exit_code == 0


def test_invalid_registries_exit_nonzero(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(app, ["policy", "validate", "--policies-dir", str(tmp_path)])

    assert result.exit_code != 0


def test_policy_validate_json_contract_success_shape():
    if shutil.which("node") is None:
        pytest.skip("node not available")

    result = runner.invoke(app, ["policy", "validate", "--json"])
    parsed = json.loads(result.stdout)

    assert result.exit_code == 0
    assert parsed["ok"] is True
    assert "counts" in parsed
    assert {"agents", "repositories", "roles"}.issubset(parsed["counts"])
