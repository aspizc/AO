import json
from pathlib import Path

import pytest
import yaml


REPO = Path(__file__).resolve().parents[2]
GATEWAY = REPO / "gateway"
PACKAGE = GATEWAY / "package.json"
LOCKFILE = GATEWAY / "package-lock.json"
NPM_CONFIG = GATEWAY / ".npmrc"
WORKFLOW = REPO / ".github" / "workflows" / "ci.yml"
RUNTIME_DOC = REPO / "docs" / "node-runtime.md"
EXPECTED_ENGINE_RANGE = "^22.13.0 || ^24.0.0"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def engine_supports(version: str) -> bool:
    candidate = tuple(int(part) for part in version.split("."))
    engine_range = load_json(PACKAGE)["engines"]["node"]

    for clause in engine_range.split(" || "):
        assert clause.startswith("^"), f"unsupported test parser clause: {clause}"
        lower = tuple(int(part) for part in clause[1:].split("."))
        upper = (lower[0] + 1, 0, 0)
        if lower <= candidate < upper:
            return True
    return False


@pytest.mark.parametrize(
    "version",
    [
        "22.13.0",
        "22.13.1",
        "22.99.0",
        "24.0.0",
        "24.99.0",
    ],
)
def test_node_runtime_contract_accepts_supported_versions(version):
    assert engine_supports(version)


@pytest.mark.parametrize(
    "version",
    [
        "20.19.0",
        "22.12.0",
        "23.0.0",
        "25.0.0",
    ],
)
def test_node_runtime_contract_rejects_unsupported_versions(version):
    assert not engine_supports(version)


def test_node_engine_contract_is_strict_and_lockfile_is_synchronized():
    package = load_json(PACKAGE)
    lockfile = load_json(LOCKFILE)

    assert package["engines"]["node"] == EXPECTED_ENGINE_RANGE
    assert lockfile["packages"][""]["engines"] == package["engines"]
    assert NPM_CONFIG.read_text(encoding="utf-8").splitlines() == [
        "engine-strict=true"
    ]


def test_ci_exercises_each_supported_node_release_line():
    workflow = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    job = workflow["jobs"]["ci"]

    assert job["strategy"]["matrix"] == {
        "node-version": ["22.13.0", "24"],
    }
    node_step = next(
        step for step in job["steps"] if step.get("uses") == "actions/setup-node@v4"
    )
    assert node_step["with"]["node-version"] == "${{ matrix.node-version }}"


def test_gateway_test_command_keeps_serial_process_isolation_without_legacy_flag():
    test_command = load_json(PACKAGE)["scripts"]["test"]

    assert "--test-concurrency=1" in test_command
    assert "--experimental-test-isolation" not in test_command
    assert "--test-isolation" not in test_command


def test_node_runtime_source_of_truth_is_documented_and_linked():
    text = RUNTIME_DOC.read_text(encoding="utf-8")

    assert "`gateway/package.json`" in text
    assert "single source of truth" in text

    linked_surfaces = {
        "README.md": "docs/node-runtime.md",
        "gateway/README.md": "../docs/node-runtime.md",
        "client-config/README.md": "../docs/node-runtime.md",
        "docs/operator-guide.md": "node-runtime.md",
        "docs/mvp2-orchestrator-runbook.md": "node-runtime.md",
        "docs/planning-loop-runbook.md": "node-runtime.md",
        "docs/adr/ADR-007-remote-ci-safety-net.md": "../node-runtime.md",
    }
    for path, link in linked_surfaces.items():
        surface = (REPO / path).read_text(encoding="utf-8")
        assert link in surface, f"{path} does not link the runtime contract"
        assert "Node 20 or newer" not in surface
