import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_readme_runtime_environment_matches_gateway_config():
    config_text = (REPO_ROOT / "gateway/src/config.js").read_text(encoding="utf-8")
    readme_text = (REPO_ROOT / "README.md").read_text(encoding="utf-8")

    config_vars = set(re.findall(r"env\.(AGENTS_[A-Z_]+)", config_text))
    assert len(config_vars) > 10, "config.js env parser found too few AGENTS_* variables"

    readme_match = re.search(
        r"^## Runtime Environment\s*\n(?P<section>.*?)(?=^##\s|\Z)",
        readme_text,
        flags=re.MULTILINE | re.DOTALL,
    )
    assert readme_match, "README.md is missing the Runtime Environment section"

    readme_section = readme_match.group("section")
    readme_vars = set(
        re.findall(r"^\|\s*`(AGENTS_[A-Z_]+)`\s*\|", readme_section, flags=re.MULTILINE)
    )
    assert len(readme_vars) > 10, "README Runtime Environment parser found too few variables"

    missing = sorted(config_vars - readme_vars)
    extra = sorted(readme_vars - config_vars)
    assert not missing, f"README Runtime Environment is missing variables: {missing}"
    assert not extra, f"README Runtime Environment documents unknown variables: {extra}"
