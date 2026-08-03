import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CI_MANIFEST = ROOT / "ci" / "suites.json"
SMOKE = ROOT / "scripts" / "smoke_mcp.mjs"


def load_suites():
    manifest = json.loads(CI_MANIFEST.read_text(encoding="utf-8"))
    return {suite["id"]: suite for suite in manifest["suites"]}


def test_smoke_mcp_script_exists():
    assert SMOKE.is_file()


def test_ci_runs_policy_validate_and_mcp_smoke():
    suites = load_suites()

    assert suites["policy.registry"]["argv"] == [
        "agent-run",
        "policy",
        "validate",
    ]
    assert suites["smoke.mcp"]["argv"] == ["node", "scripts/smoke_mcp.mjs"]


def test_ci_runs_e2e_tests():
    suites = load_suites()

    assert suites["test.e2e"]["include"] == ["tests/e2e/**/*.test.js"]
