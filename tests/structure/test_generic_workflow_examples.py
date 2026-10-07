import json
import os
from pathlib import Path
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]
EXAMPLES = ROOT / "examples/generic-workflows"


@pytest.mark.parametrize("project", ["service", "cli-library"])
def test_generic_project_profile_exercises_its_commands_and_gateway_policy(project, tmp_path):
    directory = EXAMPLES / project
    profile = json.loads((directory / "profile.json").read_text())
    outputs = []
    for command in profile["verificationCommands"]:
        result = subprocess.run(command, cwd=directory, capture_output=True, text=True, check=False)
        assert result.returncode == 0, result.stdout + result.stderr
        outputs.append(result.stdout + result.stderr)
    assert profile["verificationWitness"] in "\n".join(outputs)
    file = tmp_path / "overlay.json"
    file.write_text(json.dumps({"version": 1, "repositories": {
        profile["repositoryId"]: profile["repositoryRegistration"],
    }}))
    result = subprocess.run([
        "node", str(ROOT / "gateway/scripts/policy-check.mjs"), "--agent", "codex",
        "--role", "coder", "--repo", profile["repositoryId"], "--action", "code.write",
    ], env={**os.environ, "AGENTS_REPOSITORIES_OVERLAY": str(file)},
        capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["decision"] == "allow"


def test_legacy_runner_missing_inputs_fails_before_starting_gateway():
    env = {key: value for key, value in os.environ.items()
           if key not in ("AGENTS_REPO_ROOTS", "KYA_REPO_CWD")}
    for inputs, missing in [({}, "AGENTS_REPO_ROOTS"), ({"AGENTS_REPO_ROOTS": "/srv/example"}, "KYA_REPO_CWD")]:
        result = subprocess.run(["node", str(ROOT / "scripts/kya_mcp_task_runner.mjs")],
                                env={**env, **inputs}, capture_output=True, text=True, check=False)
        assert result.returncode == 2
        assert missing in result.stderr
        assert not result.stdout
