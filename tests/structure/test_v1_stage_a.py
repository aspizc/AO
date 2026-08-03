import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ADR = ROOT / "docs" / "adr" / "ADR-V1-01-langgraph-gateway-client.md"


def test_adr_v1_01_exists():
    text = ADR.read_text()

    assert "# ADR-V1-01" in text
    for section in ["## Contexto", "## Decision", "## Consecuencias", "## Estado"]:
        assert section in text
    assert "LangGraph" in text
    assert "cliente del Gateway" in text
    assert "contrato MCP" in text
    assert "inmutable" in text


def test_orchestrator_langgraph_package_importable():
    env = dict(os.environ)
    env["PYTHONPATH"] = str(ROOT / "orchestrator-langgraph" / "src")

    result = subprocess.run(
        [sys.executable, "-c", "import orchestrator_langgraph"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr


def test_no_gateway_modification_in_stage_a():
    commits = subprocess.check_output(
        [
            "git",
            "log",
            "--format=%H%x00%s",
            "--regexp-ignore-case",
            "--grep",
            r"PROJECT_V1 A/0/",
        ],
        cwd=ROOT,
        text=True,
    )
    stage_commits = [
        line.split("\0", 1)[0]
        for line in commits.splitlines()
        if line and not line.split("\0", 1)[1].startswith("docs(reviews):")
    ]

    changed_paths = set()
    for commit in stage_commits:
        names = subprocess.check_output(
            ["git", "show", "--format=", "--name-only", commit],
            cwd=ROOT,
            text=True,
        )
        changed_paths.update(path for path in names.splitlines() if path)

    gateway_paths = sorted(
        path
        for path in changed_paths
        if path.startswith("gateway/") or path.startswith("tests/gateway/")
    )
    assert gateway_paths == []
