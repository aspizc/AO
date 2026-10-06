from pathlib import Path
import re
import stat

import yaml


REPO = Path(__file__).resolve().parents[2]
LOCK_SCRIPT = REPO / "scripts" / "requirements_lock.sh"
LOCKFILE = REPO / "requirements.lock"
BUILD_REQUIREMENTS = REPO / "ci" / "requirements-build.in"
WORKFLOW = REPO / ".github" / "workflows" / "ci.yml"


def test_python_lock_regeneration_is_portable_and_checkable():
    assert LOCK_SCRIPT.is_file()
    assert LOCK_SCRIPT.stat().st_mode & stat.S_IXUSR

    script = LOCK_SCRIPT.read_text(encoding="utf-8")
    for token in (
        "uv pip compile",
        'EXPECTED_UV_VERSION="0.11.21"',
        "--all-extras",
        "--universal",
        "--python-version 3.11",
        "--generate-hashes",
        "--exclude-newer 2026-10-06T00:00:00Z",
        "--check",
        "--check-inputs",
        "cli/pyproject.toml",
        "orchestrator-langgraph/pyproject.toml",
    ):
        assert token in script

    lock = LOCKFILE.read_text(encoding="utf-8")
    assert BUILD_REQUIREMENTS.read_text(encoding="utf-8").splitlines() == [
        "# Build backends required for no-network editable installs.",
        "hatchling==1.27.0",
        "editables==0.5",
    ]
    assert "ci/requirements-build.in" in script
    assert "hatchling==1.27.0" in lock
    assert "editables==0.5" in lock
    assert "./scripts/requirements_lock.sh" in lock.splitlines()[1]
    assert re.fullmatch(r"# inputs-sha256: [0-9a-f]{64}", lock.splitlines()[2])
    assert "--hash=sha256:" in lock
    assert "/home/" not in lock
    assert "/tmp/" not in lock


def test_ci_installs_exact_locks_without_regeneration():
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    steps = workflow["jobs"]["ci"]["steps"]
    run_commands = "\n".join(step.get("run", "") for step in steps)
    uv_step = next(
        step for step in steps if step.get("uses") == "astral-sh/setup-uv@v6"
    )

    assert uv_step["with"]["version"] == "0.11.21"
    assert "uv pip sync --require-hashes requirements.lock" in run_commands
    assert (
        "uv pip install --no-deps --no-build-isolation "
        "-e cli -e orchestrator-langgraph"
    ) in run_commands
    assert "npm --prefix gateway ci" in run_commands
    assert "pip install -e" not in run_commands
    assert "npm --prefix gateway install" not in run_commands
    assert "requirements_lock.sh" not in run_commands
