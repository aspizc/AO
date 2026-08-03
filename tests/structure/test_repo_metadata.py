import json
import re
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_readme_exists():
    assert (REPO_ROOT / "README.md").is_file()


def test_readme_mentions_v4_plan():
    text = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    assert "plan_proyecto_v4.md" in text


def test_gitignore_ignores_runtime_artifacts():
    text = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    for pattern in (
        "node_modules/",
        "*.db",
        ".env",
        ".mcp.json",
        ".claude/projects/",
        "workspace/state/*",
        "workspace/audit/*",
    ):
        assert pattern in text, f"missing pattern: {pattern}"


def test_changelog_has_unreleased_section():
    text = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    assert "## Unreleased" in text


def test_changelog_has_v0_1_0_release_section():
    text = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    marker = "## [0.1.0] - 2026-06-11\n\n"
    assert marker in text
    release = text.split(marker, 1)[1]

    assert re.search(
        r"^MVP2\.0 / PROJECT_V0 A-Y closed with .+\n"
        r"PROJECT_V1 A-E remains experimental .+\n"
        r"PROJECT_V3 A-D hardening .+\n\n"
        r"- Hardened approval wait timing tests against scheduler jitter\. Closes V3 D/0/2\.",
        release,
    )


def test_repository_has_mit_license():
    text = (REPO_ROOT / "LICENSE").read_text(encoding="utf-8")
    assert "MIT License" in text
    assert "Copyright (c) 2026 Carlos Asensio Pizarro" in text


def test_public_project_metadata_names_the_author():
    author = "Carlos Asensio Pizarro"
    readme = (REPO_ROOT / "README.md").read_text(encoding="utf-8")
    package = json.loads(
        (REPO_ROOT / "gateway" / "package.json").read_text(encoding="utf-8")
    )
    cli = tomllib.loads(
        (REPO_ROOT / "cli" / "pyproject.toml").read_text(encoding="utf-8")
    )
    orchestrator = tomllib.loads(
        (REPO_ROOT / "orchestrator-langgraph" / "pyproject.toml").read_text(
            encoding="utf-8"
        )
    )

    assert f"maintained by **{author}**" in readme
    assert package["author"] == author
    assert cli["project"]["authors"] == [{"name": author}]
    assert orchestrator["project"]["authors"] == [{"name": author}]
