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
        "scripts/refresh_advisory_snapshot.py",
        "scripts/release_candidate.py",
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


def test_remote_ci_builds_pinned_tmux_for_required_retained_control_tests():
    workflow = (REPO / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )

    assert 'docker pull "$tmux_builder_image"' in workflow
    assert "gateway/vendor/tmux-agents/manifest.json" in workflow
    assert "https://github.com/tmux/tmux/releases/download/3.6a/tmux-3.6a.tar.gz" in workflow
    assert "gateway/vendor/tmux-agents/build-offline.sh" in workflow
    assert workflow.index("build-offline.sh") < workflow.index("tmux new-session")
    assert 'echo "$RUNNER_TEMP/ao-tools/bin" >> "$GITHUB_PATH"' in workflow
    assert 'echo "D007C_TEST_TMUX_PATH=$RUNNER_TEMP/ao-tools/bin" >> "$GITHUB_ENV"' in workflow
    assert 'D007C_RUN_REAL_TMUX_PROBE: "1"' in workflow
    assert "sudo apt-get install --yes tmux" not in workflow
    assert 'echo "TMUX_TMPDIR=$RUNNER_TEMP/ao-tmux" >> "$GITHUB_ENV"' in workflow
    assert "tmux new-session -d -s ao-ci-bootstrap" in workflow
    assert "if: always()" in workflow
    assert "run: tmux kill-server" in workflow


def test_remote_ci_surfaces_the_aggregate_gate_summary():
    workflow = (REPO / ".github" / "workflows" / "ci.yml").read_text(
        encoding="utf-8"
    )

    assert "${PIPESTATUS[0]}" in workflow
    assert "::error title=Local CI gate summary::" in workflow
