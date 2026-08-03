from pathlib import Path
import tomllib


REPO_ROOT = Path(__file__).resolve().parents[2]


def load_pyproject(path: str) -> dict:
    return tomllib.loads((REPO_ROOT / path).read_text(encoding="utf-8"))


def test_python_manifests_bound_runtime_dependencies():
    orchestrator = load_pyproject("orchestrator-langgraph/pyproject.toml")
    cli = load_pyproject("cli/pyproject.toml")

    assert orchestrator["project"]["dependencies"] == [
        "langgraph>=1.2.1,<1.2.2",
        "mcp>=1.27.2,<2",
        "temporalio>=1.28.0,<2",
    ]
    assert orchestrator["project"]["optional-dependencies"]["redis"] == [
        "redis>=5,<6",
    ]
    assert cli["project"]["dependencies"] == [
        "typer>=0.12,<1",
        "rich>=13.7,<16",
        "jsonschema>=4.21,<5",
    ]


def test_python_lockfile_and_quickstart_reproducible_install_exist():
    lockfile = REPO_ROOT / "requirements.lock"
    assert lockfile.is_file()

    lock_text = lockfile.read_text(encoding="utf-8")
    for package in ("langgraph==1.2.1", "mcp==1.27.2", "temporalio==1.28.0"):
        assert package in lock_text
    assert "langgraph==1.2.4" not in lock_text

    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    assert "uv pip sync requirements.lock" in readme
    assert "pip install --no-deps -e" in readme


def test_metrics_consumer_mentions_redis_extra_for_lazy_import():
    text = (
        REPO_ROOT
        / "orchestrator-langgraph/src/orchestrator_langgraph/consumers/metrics.py"
    ).read_text(encoding="utf-8")
    assert 'pip install "orchestrator-langgraph[redis]"' in text
