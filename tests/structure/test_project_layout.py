from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

REQUIRED_DIRS = [
    "docs", "docs/adr",
    "policies", "schemas",
    "gateway/src/tools", "gateway/src/services",
    "gateway/src/core", "gateway/src/adapters",
    "gateway/src/infra", "gateway/migrations",
    "prompts", "client-config",
    "cli/src/agents_cli",
    "workspace/artifacts", "workspace/audit", "workspace/state",
    "tests/structure", "tests/gateway", "tests/cli",
    "tests/fixtures", "tests/e2e",
    "docker", "scripts",
]


def test_required_top_level_dirs_exist():
    for d in REQUIRED_DIRS:
        assert (REPO_ROOT / d).is_dir(), f"missing dir: {d}"


def test_required_gateway_dirs_exist():
    for d in ("gateway/src/tools", "gateway/src/services",
              "gateway/src/core", "gateway/src/adapters", "gateway/src/infra"):
        assert (REPO_ROOT / d).is_dir(), f"missing gateway dir: {d}"


def test_required_dirs_are_not_empty():
    for d in REQUIRED_DIRS:
        path = REPO_ROOT / d
        assert any(path.iterdir()), f"empty dir without .keep: {d}"
