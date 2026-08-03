import json
import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "ci" / "suites.json"


def load_suites():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {suite["id"]: suite for suite in manifest["suites"]}


def test_ci_script_exists():
    assert (REPO / "scripts" / "ci.sh").is_file()


def test_ci_script_mentions_gateway_and_cli_tests():
    text = (REPO / "scripts" / "ci.sh").read_text(encoding="utf-8")
    assert "scripts/ci_gate.py" in text

    suites = load_suites()
    assert "test.gateway" in suites
    assert suites["test.cli"]["include"] == ["tests/cli/test_*.py"]
    assert suites["test.structure"]["include"] == ["tests/structure/test_*.py"]
    assert suites["test.langgraph"]["include"] == [
        "orchestrator-langgraph/tests/**/test_*.py"
    ]


def test_ci_script_runs_lint_gate():
    suites = load_suites()
    assert suites["lint.python"]["argv"] == [
        "ruff",
        "check",
        "cli",
        "orchestrator-langgraph",
        "scripts/ci_gate.py",
        "tests/structure",
    ]
    assert suites["lint.gateway"]["argv"] == [
        "npm",
        "--prefix",
        "gateway",
        "run",
        "lint",
    ]


def test_ci_script_is_executable():
    path = REPO / "scripts" / "ci.sh"
    assert os.access(path, os.X_OK)


def test_remote_ci_installs_tmux_for_the_required_session_test():
    workflow = (REPO / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )

    assert "sudo apt-get install --yes tmux" in workflow


def test_remote_ci_surfaces_the_aggregate_gate_summary():
    workflow = (REPO / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )

    assert "${PIPESTATUS[0]}" in workflow
    assert "::error title=Local CI gate summary::" in workflow
