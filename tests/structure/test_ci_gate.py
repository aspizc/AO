from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]
WORKFLOW = REPO / ".github" / "workflows" / "ci.yml"


def load_workflow():
    assert WORKFLOW.is_file()
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))


def test_github_actions_ci_workflow_runs_local_ci_gate():
    workflow = load_workflow()

    assert workflow["permissions"] == {"contents": "read"}
    assert workflow["on"] == {
        "push": {"branches": ["develop", "main"]},
        "pull_request": {"branches": ["develop", "main"]},
    }

    jobs = workflow["jobs"]
    assert list(jobs) == ["ci"]
    job = jobs["ci"]
    assert job["runs-on"] == "ubuntu-latest"
    assert job["strategy"] == {
        "fail-fast": False,
        "matrix": {"node-version": ["22.13.0", "24"]},
    }

    steps = job["steps"]
    assert steps[0]["uses"] == "actions/checkout@v4"

    node_step = next(step for step in steps if step.get("uses") == "actions/setup-node@v4")
    assert node_step["with"] == {
        "node-version": "${{ matrix.node-version }}",
        "cache": "npm",
        "cache-dependency-path": "gateway/package-lock.json",
    }

    python_step = next(
        step for step in steps if step.get("uses") == "actions/setup-python@v5"
    )
    assert python_step["with"] == {"python-version": "3.11"}

    run_commands = "\n".join(step.get("run", "") for step in steps)
    assert "uv pip sync --require-hashes requirements.lock" in run_commands
    assert "npm --prefix gateway ci" in run_commands
    assert ". .venv/bin/activate" in run_commands
    assert "./scripts/ci.sh 2>&1 | tee /tmp/ao-ci-gate.log" in run_commands


def test_github_actions_ci_workflow_does_not_duplicate_test_logic():
    text = WORKFLOW.read_text(encoding="utf-8")

    assert "AGENTS_E2E_REAL" not in text

    forbidden_gate_commands = [
        "ruff check",
        "pytest ",
        "npm --prefix gateway test",
        "npm --prefix gateway run lint",
        "node --test",
        "agent-run policy validate",
        "smoke_mcp",
    ]
    for command in forbidden_gate_commands:
        assert command not in text
