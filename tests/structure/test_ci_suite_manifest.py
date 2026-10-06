import copy
import errno
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import threading
import time

import pytest


REPO = Path(__file__).resolve().parents[2]
GATE_PATH = REPO / "scripts" / "ci_gate.py"
MANIFEST_PATH = REPO / "ci" / "suites.json"
CONTRACT_PATH = REPO / "ci" / "suites-contract.json"
CI_DOC = REPO / "docs" / "ci-contract.md"
OPERATOR_GUIDE = REPO / "docs" / "operator-guide.md"
CI_ADR = REPO / "docs" / "adr" / "ADR-007-remote-ci-safety-net.md"
WORKFLOW_PATH = REPO / ".github" / "workflows" / "ci.yml"

EXPECTED_REQUIRED = {
    "lock.python",
    "release.candidate",
    "lint.python",
    "lint.gateway",
    "test.structure",
    "test.gateway",
    "test.e2e",
    "smoke.mcp",
    "policy.registry",
    "test.cli",
    "test.langgraph",
    "test.redis-live",
}
EXPECTED_OPTIONAL = {
    "test.real-agents",
}
EXPECTED_INFRASTRUCTURE_SKIPS = {
    "live postgres repository contract: create and read repository aggregate",
    "live postgres repository contract: status updates report one changed row",
    "live postgres repository contract: foreign key violation fails",
    "live postgres repository contract: policy decisions are append only",
    "live postgres literals round-trip adversarial strings",
    "live postgres literals preserve NULL separately from string null",
    "live postgres literals support named and positional params",
    "live postgres reports changes for insert update and delete",
    "live postgres rejects non-finite numeric literals before execution",
    "tests.test_gateway_client::test_real_gateway_smoke",
    "tests.test_plan_refine_graph::test_real_gateway_dry_run_smoke",
    (
        "tests.test_temporal_crash_recovery::"
        "test_temporal_worker_restart_replays_without_duplicate_implement_or_implicit_approval"
    ),
}


def load_gate():
    assert GATE_PATH.is_file(), "the authoritative CI gate does not exist"
    spec = importlib.util.spec_from_file_location("ci_gate", GATE_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def manifest_for(suites):
    required = [
        suite["id"] for suite in suites if suite["classification"] == "required"
    ]
    return {
        "schemaVersion": 1,
        "requiredSuiteIds": required,
        "suites": suites,
    }


def write_manifest(path: Path, manifest: dict) -> None:
    path.write_text(json.dumps(manifest), encoding="utf-8")


def contract_for(manifest: dict) -> dict:
    suites = []
    for suite in manifest["suites"]:
        topology = {
            "id": suite["id"],
            "classification": suite["classification"],
            "runner": suite["runner"],
            "argv": suite["argv"],
            "include": suite["include"],
            "exclude": suite.get("exclude", []),
            "allowedSkips": suite.get("allowedSkips", []),
            "timeoutSeconds": suite["timeoutSeconds"],
        }
        if "minimumTests" in suite:
            topology["minimumTests"] = suite["minimumTests"]
        if "readiness" in suite:
            topology["readiness"] = suite["readiness"]
        suites.append(topology)
    return {
        "schemaVersion": 1,
        "requiredSuiteIds": manifest["requiredSuiteIds"],
        "optionalSuiteIds": [
            suite["id"]
            for suite in manifest["suites"]
            if suite["classification"] == "optional-service"
        ],
        "suites": suites,
    }


def write_synthetic_contract(repo_root: Path, manifest: dict) -> None:
    contract_path = repo_root / "ci" / "suites-contract.json"
    contract_path.parent.mkdir(exist_ok=True)
    write_manifest(contract_path, contract_for(manifest))


def pid_is_running(pid: int) -> bool:
    try:
        status = Path(f"/proc/{pid}/status").read_text(encoding="utf-8")
    except (FileNotFoundError, ProcessLookupError):
        return False
    return "\nState:\tZ" not in f"\n{status}"


def wait_for_pid_file(path: Path, process: subprocess.Popen, timeout: float = 5):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
        if process.poll() is not None:
            raise AssertionError(
                f"gate exited before its fixture started: {process.returncode}"
            )
        time.sleep(0.02)
    raise AssertionError("timed out waiting for fixture process ids")


def stop_exact_processes(pids: list[int]) -> None:
    for pid in pids:
        if pid_is_running(pid):
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    deadline = time.monotonic() + 3
    while any(pid_is_running(pid) for pid in pids) and time.monotonic() < deadline:
        time.sleep(0.02)


def write_process_tree_fixture(path: Path, pid_path: Path, sleep_seconds: int) -> None:
    path.write_text(
        "\n".join(
            [
                "import json",
                "import os",
                "from pathlib import Path",
                "import signal",
                "import subprocess",
                "import sys",
                "import time",
                "signal.signal(signal.SIGTERM, signal.SIG_IGN)",
                "child = subprocess.Popen(",
                "    [sys.executable, '-c', "
                "\"import signal,time; signal.signal(signal.SIGTERM, "
                "signal.SIG_IGN); time.sleep(60)\"],",
                "    stdin=subprocess.DEVNULL,",
                "    stdout=subprocess.DEVNULL,",
                "    stderr=subprocess.DEVNULL,",
                ")",
                f"Path({str(pid_path)!r}).write_text(",
                "    json.dumps({",
                "        'runner': os.getpid(),",
                "        'descendant': child.pid,",
                "        'runnerPgid': os.getpgrp(),",
                "        'descendantPgid': os.getpgid(child.pid),",
                "    }),",
                "    encoding='utf-8',",
                ")",
                f"time.sleep({sleep_seconds})",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def write_late_detached_process_fixture(path: Path, pid_path: Path) -> None:
    path.write_text(
        "\n".join(
            [
                "import json",
                "import os",
                "from pathlib import Path",
                "import signal",
                "import subprocess",
                "import sys",
                "import time",
                "def terminate(_signal_number, _frame):",
                "    child = subprocess.Popen(",
                "        [sys.executable, '-c',",
                "         \"import signal,time; signal.signal(signal.SIGTERM, \"",
                "         \"signal.SIG_IGN); time.sleep(60)\"],",
                "        stdin=subprocess.DEVNULL,",
                "        stdout=subprocess.DEVNULL,",
                "        stderr=subprocess.DEVNULL,",
                "        start_new_session=True,",
                "    )",
                f"    Path({str(pid_path)!r}).write_text(",
                "        json.dumps({",
                "            'runner': os.getpid(),",
                "            'runnerPgid': os.getpgrp(),",
                "            'lateDescendant': child.pid,",
                "            'lateDescendantPgid': os.getpgid(child.pid),",
                "        }),",
                "        encoding='utf-8',",
                "    )",
                "    os._exit(0)",
                "signal.signal(signal.SIGTERM, terminate)",
                "time.sleep(60)",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def command_manifest(script_name: str, timeout_seconds: int = 30) -> dict:
    return manifest_for(
        [
            {
                "id": "check.required",
                "classification": "required",
                "runner": "command",
                "argv": [sys.executable, script_name],
                "include": [script_name],
                "exclude": [],
                "inventorySha256": "",
                "allowedSkips": [],
                "timeoutSeconds": timeout_seconds,
            }
        ]
    )


def finalize_inventory(gate, manifest: dict, repo_root: Path) -> None:
    for suite in manifest["suites"]:
        suite["inventorySha256"] = gate.inventory_digest(
            gate.discover_files(repo_root, suite)
        )


def test_repository_manifest_is_authoritative_and_complete():
    gate = load_gate()
    manifest = gate.load_manifest(MANIFEST_PATH)
    contract = gate.load_manifest(CONTRACT_PATH)

    assert manifest["schemaVersion"] == 1
    assert set(manifest["requiredSuiteIds"]) == EXPECTED_REQUIRED

    suites = {suite["id"]: suite for suite in manifest["suites"]}
    assert set(suites) == EXPECTED_REQUIRED | EXPECTED_OPTIONAL
    assert {
        suite_id
        for suite_id, suite in suites.items()
        if suite["classification"] == "required"
    } == EXPECTED_REQUIRED
    assert {
        suite_id
        for suite_id, suite in suites.items()
        if suite["classification"] == "optional-service"
    } == EXPECTED_OPTIONAL

    for suite in suites.values():
        assert isinstance(suite["argv"], list)
        assert suite["argv"]
        assert "shell" not in suite
        assert suite["include"]
        assert suite["inventorySha256"].startswith("sha256:")

    skips = {
        skip["id"]
        for suite in suites.values()
        for skip in suite.get("allowedSkips", [])
        if skip["classification"] == "infrastructure_unavailable"
    }
    assert skips == EXPECTED_INFRASTRUCTURE_SKIPS

    assert gate.validate_manifest(manifest, REPO, contract) == []

    assert suites["lock.python"]["argv"] == [
        "./scripts/requirements_lock.sh",
        "--check-inputs",
    ]
    redis_live = suites["test.redis-live"]
    assert redis_live["classification"] == "required"
    assert redis_live["allowedSkips"] == []
    assert redis_live["readiness"] == {
        "service": "redis",
        "environmentPresent": ["AGENTS_TEST_REDIS_URL"],
    }
    assert redis_live["include"] == ["tests/gateway/*_live.test.js"]


def test_manifest_validation_rejects_missing_glob_and_stale_inventory(tmp_path):
    gate = load_gate()
    source = tmp_path / "tests" / "test_sample.py"
    source.parent.mkdir()
    source.write_text("def test_sample(): pass\n", encoding="utf-8")
    suite = {
        "id": "test.sample",
        "classification": "required",
        "runner": "pytest",
        "argv": [sys.executable, "-m", "pytest", "-q"],
        "include": ["tests/test_*.py"],
        "inventorySha256": "sha256:stale",
        "minimumTests": 1,
        "allowedSkips": [],
        "timeoutSeconds": 30,
    }
    manifest = manifest_for([suite])

    errors = gate.validate_manifest(manifest, tmp_path)

    assert any("stale inventorySha256" in error for error in errors)

    suite["include"] = ["tests/removed_*.py"]
    errors = gate.validate_manifest(manifest, tmp_path)
    assert any("matched zero files" in error for error in errors)


def test_manifest_validation_rejects_removed_required_lane_and_shell_commands(
    tmp_path,
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    suite = {
        "id": "check.sample",
        "classification": "required",
        "runner": "command",
        "argv": f"{sys.executable} check.py",
        "shell": True,
        "include": ["check.py"],
        "inventorySha256": "sha256:stale",
        "timeoutSeconds": 30,
    }
    manifest = {
        "schemaVersion": 1,
        "requiredSuiteIds": ["check.sample", "check.removed"],
        "suites": [suite],
    }

    errors = gate.validate_manifest(manifest, tmp_path)

    assert any("required suite ids do not match" in error for error in errors)
    assert any("argv must be a non-empty string array" in error for error in errors)
    assert any("unsupported keys" in error and "shell" in error for error in errors)


def test_test_result_sentinels_reject_zero_and_unexpected_skips():
    gate = load_gate()
    suite = {
        "id": "test.sample",
        "minimumTests": 1,
        "allowedSkips": [
            {
                "id": "test_known_skip",
                "classification": "infrastructure_unavailable",
                "service": "fixture",
            }
        ],
    }

    zero_errors, _ = gate.assess_test_result(
        suite,
        gate.TestCounts(tests=0, passed=0, failed=0, skipped=0),
        [],
    )
    assert any("collected zero tests" in error for error in zero_errors)

    skip_errors, unavailable = gate.assess_test_result(
        suite,
        gate.TestCounts(tests=2, passed=1, failed=0, skipped=1),
        ["test_new_skip"],
    )
    assert any("unexpected skip ids: test_new_skip" in error for error in skip_errors)
    assert unavailable == []

    ok_errors, unavailable = gate.assess_test_result(
        suite,
        gate.TestCounts(tests=2, passed=1, failed=0, skipped=1),
        ["test_known_skip"],
    )
    assert ok_errors == []
    assert unavailable == [
        {"id": "test_known_skip", "service": "fixture"}
    ]

    accounting_errors, _ = gate.assess_test_result(
        suite,
        gate.TestCounts(tests=2, passed=1, failed=0, skipped=0),
        [],
    )
    assert any("result counts do not reconcile" in error for error in accounting_errors)


def test_node_tap_parser_returns_counts_and_exact_skip_ids():
    gate = load_gate()
    counts, skips = gate.parse_node_tap(
        "\n".join(
            [
                "TAP version 13",
                "ok 1 - deterministic behavior",
                "ok 2 - live service case # SKIP service URL is not set",
                "1..2",
                "# tests 2",
                "# pass 1",
                "# fail 0",
                "# skipped 1",
            ]
        )
    )

    assert counts == gate.TestCounts(tests=2, passed=1, failed=0, skipped=1)
    assert skips == ["live service case"]


def test_optional_service_absence_is_machine_readable_not_a_pass(tmp_path):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('required command ran')\n", encoding="utf-8")
    required = {
        "id": "check.required",
        "classification": "required",
        "runner": "command",
        "argv": [sys.executable, "check.py"],
        "include": ["check.py"],
        "exclude": [],
        "inventorySha256": gate.inventory_digest(["check.py"]),
        "allowedSkips": [],
        "timeoutSeconds": 30,
    }
    optional = {
        "id": "check.service",
        "classification": "optional-service",
        "runner": "command",
        "argv": [sys.executable, "check.py"],
        "include": ["check.py"],
        "exclude": [],
        "inventorySha256": gate.inventory_digest(["check.py"]),
        "allowedSkips": [],
        "timeoutSeconds": 30,
        "readiness": {
            "service": "synthetic",
            "environmentEquals": {"RUN_SYNTHETIC_SERVICE": "1"},
        },
    }
    path = tmp_path / "suites.json"
    manifest = manifest_for([required, optional])
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
        env={},
    )

    assert completed.returncode == 0, completed.stderr
    report = json.loads(completed.stdout)
    assert report["status"] == "infrastructure_unavailable"
    results = {result["id"]: result for result in report["suites"]}
    assert results["check.required"]["status"] == "passed"
    assert results["check.service"]["status"] == "infrastructure_unavailable"
    assert results["check.service"]["service"] == "synthetic"


def test_required_service_absence_is_machine_readable_and_fails_gate(tmp_path):
    gate = load_gate()
    marker = tmp_path / "ran"
    source = tmp_path / "check.py"
    source.write_text(
        f"from pathlib import Path\nPath({str(marker)!r}).touch()\n",
        encoding="utf-8",
    )
    required_service = {
        "id": "check.required-service",
        "classification": "required",
        "runner": "command",
        "argv": [sys.executable, source.name],
        "include": [source.name],
        "exclude": [],
        "inventorySha256": gate.inventory_digest([source.name]),
        "allowedSkips": [],
        "timeoutSeconds": 30,
        "readiness": {
            "service": "synthetic",
            "environmentEquals": {"RUN_SYNTHETIC_SERVICE": "1"},
        },
    }
    manifest = manifest_for([required_service])

    report, exit_code = gate.run_gate(tmp_path, manifest, env={})

    assert exit_code == 1
    assert report["status"] == "infrastructure_unavailable"
    assert report["counts"] == {
        "tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
    }
    assert report["errors"] == []
    assert report["suites"] == [
        {
            "id": "check.required-service",
            "classification": "required",
            "status": "infrastructure_unavailable",
            "service": "synthetic",
            "counts": {
                "tests": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
            },
            "infrastructureUnavailable": [],
            "errors": [],
        }
    ]
    assert not marker.exists()


def test_inventory_refresh_does_not_rewrite_an_invalid_manifest(tmp_path):
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    path = tmp_path / "suites.json"
    manifest = manifest_for(
        [
            {
                "id": "check.required",
                "classification": "required",
                "runner": "command",
                "argv": [sys.executable, "check.py"],
                "shell": True,
                "include": ["check.py"],
                "exclude": [],
                "inventorySha256": "sha256:stale",
                "allowedSkips": [],
                "timeoutSeconds": 30,
            }
        ]
    )
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    original = path.read_bytes()

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
            "--refresh-inventory",
        ],
        cwd=tmp_path,
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert path.read_bytes() == original


def test_ci_contract_is_documented_from_operator_and_architecture_surfaces():
    assert CI_DOC.is_file()
    contract = CI_DOC.read_text(encoding="utf-8")
    for token in (
        "`ci/suites.json`",
        "`scripts/ci_gate.py`",
        "`infrastructure_unavailable`",
        "`./scripts/requirements_lock.sh --check`",
        "`npm --prefix gateway ci`",
        "`uv pip sync --require-hashes requirements.lock`",
    ):
        assert token in contract

    operator = OPERATOR_GUIDE.read_text(encoding="utf-8")
    assert "ci-contract.md" in operator
    assert "uv pip sync --require-hashes requirements.lock" in operator
    assert "npm --prefix gateway ci" in operator

    adr = CI_ADR.read_text(encoding="utf-8")
    assert "`ci/suites.json` is the authoritative suite contract" in adr


def test_repository_manifest_has_finite_timeouts_and_workflow_backstop():
    gate = load_gate()
    manifest = gate.load_manifest(MANIFEST_PATH)

    for suite in manifest["suites"]:
        assert isinstance(suite["timeoutSeconds"], int)
        assert 0 < suite["timeoutSeconds"] <= 3600

    workflow = WORKFLOW_PATH.read_text(encoding="utf-8")
    assert "timeout-minutes:" in workflow


@pytest.mark.parametrize("invalid_timeout", [True, 0, 3601, 1.5])
def test_manifest_rejects_non_finite_suite_timeout(tmp_path, invalid_timeout):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest["suites"][0]["timeoutSeconds"] = invalid_timeout

    errors = gate.validate_manifest(manifest, tmp_path)

    assert any("timeoutSeconds must be an integer" in error for error in errors)


def test_suite_timeout_terminates_and_reaps_its_process_tree(tmp_path):
    gate = load_gate()
    script = tmp_path / "tree.py"
    pid_path = tmp_path / "pids.json"
    write_process_tree_fixture(script, pid_path, sleep_seconds=3)
    manifest = command_manifest(script.name, timeout_seconds=1)
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    started = time.monotonic()
    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        env={},
        timeout=8,
    )
    elapsed = time.monotonic() - started
    process_ids = json.loads(pid_path.read_text(encoding="utf-8"))
    pids = [process_ids["runner"], process_ids["descendant"]]
    try:
        report = json.loads(completed.stdout)
        assert completed.returncode == 1
        assert elapsed < 2.5
        assert report["status"] == "timed_out"
        assert report["suites"][0]["status"] == "timed_out"
        assert process_ids["runnerPgid"] == process_ids["runner"]
        assert process_ids["descendantPgid"] == process_ids["runner"]
        assert all(not pid_is_running(pid) for pid in pids)
    finally:
        stop_exact_processes(pids)


def test_timeout_reaps_late_detached_descendant_created_by_term_handler(tmp_path):
    gate = load_gate()
    script = tmp_path / "late_detached.py"
    pid_path = tmp_path / "late-pids.json"
    write_late_detached_process_fixture(script, pid_path)
    manifest = command_manifest(script.name, timeout_seconds=1)
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        env={},
        timeout=8,
    )
    process_ids = json.loads(pid_path.read_text(encoding="utf-8"))
    pids = [process_ids["runner"], process_ids["lateDescendant"]]
    try:
        report = json.loads(completed.stdout)
        assert completed.returncode == 1
        assert report["status"] == "timed_out"
        assert process_ids["runnerPgid"] == process_ids["runner"]
        assert (
            process_ids["lateDescendantPgid"]
            == process_ids["lateDescendant"]
        )
        assert all(not pid_is_running(pid) for pid in pids)
    finally:
        stop_exact_processes(pids)


def test_post_popen_communication_error_reaps_process_tree(tmp_path, monkeypatch):
    gate = load_gate()
    script = tmp_path / "tree.py"
    pid_path = tmp_path / "pids.json"
    write_process_tree_fixture(script, pid_path, sleep_seconds=60)
    manifest = command_manifest(script.name)
    finalize_inventory(gate, manifest, tmp_path)

    real_popen = subprocess.Popen
    started: dict[str, subprocess.Popen] = {}

    class BrokenCommunicateProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

        def communicate(self, *args, **kwargs):
            deadline = time.monotonic() + 5
            while not pid_path.is_file() and time.monotonic() < deadline:
                if self._process.poll() is not None:
                    break
                time.sleep(0.02)
            raise OSError("synthetic pipe read failure after Popen")

    monkeypatch.setattr(gate.subprocess, "Popen", BrokenCommunicateProcess)
    monkeypatch.setattr(
        gate, "_execute_command", gate._execute_command_serial
    )

    result = gate._run_suite(manifest["suites"][0], tmp_path, {})
    process_ids = json.loads(pid_path.read_text(encoding="utf-8"))
    pids = [process_ids["runner"], process_ids["descendant"]]
    try:
        assert result["status"] == "failed"
        assert result["errors"] == [
            (
                f"check.required: cannot execute {sys.executable!r}: "
                "synthetic pipe read failure after Popen"
            )
        ]
        assert started["process"].returncode is not None
        assert process_ids["runnerPgid"] == process_ids["runner"]
        assert process_ids["descendantPgid"] == process_ids["runner"]
        assert all(not pid_is_running(pid) for pid in pids)
        with pytest.raises(ProcessLookupError):
            os.killpg(process_ids["runnerPgid"], 0)
    finally:
        stop_exact_processes(pids)


def test_pidfd_cleanup_does_not_use_legacy_popen_kill_or_wait(
    tmp_path, monkeypatch
):
    gate = load_gate()
    script = tmp_path / "tree.py"
    pid_path = tmp_path / "pids.json"
    write_process_tree_fixture(script, pid_path, sleep_seconds=60)
    manifest = command_manifest(script.name)
    finalize_inventory(gate, manifest, tmp_path)

    real_popen = subprocess.Popen
    started: dict[str, subprocess.Popen] = {}

    class BrokenCleanupProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

        def communicate(self, *args, **kwargs):
            deadline = time.monotonic() + 5
            while not pid_path.is_file() and time.monotonic() < deadline:
                if self._process.poll() is not None:
                    break
                time.sleep(0.02)
            raise OSError("synthetic communication failure")

        def wait(self, *args, **kwargs):
            raise OSError("legacy direct wait must not be used")

        def kill(self):
            raise OSError("legacy direct kill must not be used")

    monkeypatch.setattr(gate.subprocess, "Popen", BrokenCleanupProcess)
    monkeypatch.setattr(
        gate, "_execute_command", gate._execute_command_serial
    )

    result = gate._run_suite(manifest["suites"][0], tmp_path, {})
    process_ids = json.loads(pid_path.read_text(encoding="utf-8"))
    pids = [process_ids["runner"], process_ids["descendant"]]
    try:
        assert result["status"] == "failed"
        assert all(not pid_is_running(pid) for pid in pids)
        assert not pid_is_running(started["process"].pid)
        with pytest.raises(ProcessLookupError):
            os.killpg(process_ids["runnerPgid"], 0)
    finally:
        stop_exact_processes(pids)


def test_process_inventory_uncertainty_is_fatal(monkeypatch):
    gate = load_gate()
    monkeypatch.setattr(
        gate,
        "_read_process_record",
        lambda _process_id: (_ for _ in ()).throw(
            OSError("synthetic exact identity read failure")
        ),
    )

    with pytest.raises(
        gate.ProcessCleanupError, match="cannot establish process identity"
    ):
        gate._process_records()


def test_descendant_pidfd_binding_rejects_reuse_during_discovery(
    monkeypatch,
):
    gate = load_gate()
    owned = gate.ProcessRecord(
        identity=gate.ProcessIdentity(
            pid=987_654,
            process_group=987_654,
            start_time=111,
        ),
        parent_pid=os.getpid(),
        state="R",
    )
    replacement = gate.ProcessRecord(
        identity=gate.ProcessIdentity(
            pid=owned.identity.pid,
            process_group=123_456,
            start_time=222,
        ),
        parent_pid=1,
        state="R",
    )
    records = iter((owned, replacement))
    closed: list[int] = []
    monkeypatch.setattr(
        gate, "_read_process_record", lambda _process_id: next(records)
    )
    monkeypatch.setattr(gate, "_pidfd_open", lambda _process_id: 77)
    monkeypatch.setattr(gate.os, "close", closed.append)

    with pytest.raises(gate.ProcessCleanupError, match="changed while binding"):
        gate._bind_process_handle(
            owned.identity.pid,
            expected_identity=owned.identity,
        )

    assert closed == [77]


def test_execute_binds_root_pidfd_immediately_before_child_interaction(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    real_read_process_record = gate._read_process_record
    events: list[str] = []
    root_pid: list[int] = []

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            root_pid.append(self._process.pid)

        def __getattr__(self, name):
            return getattr(self._process, name)

        def communicate(self, *args, **kwargs):
            events.append("communicate")
            return self._process.communicate(*args, **kwargs)

        def poll(self, *args, **kwargs):
            events.append("poll")
            return self._process.poll(*args, **kwargs)

        def wait(self, *args, **kwargs):
            events.append("wait")
            return self._process.wait(*args, **kwargs)

    def observe_pidfd_open(process_id):
        if root_pid and process_id == root_pid[0]:
            events.append("root_pidfd")
        return real_pidfd_open(process_id)

    def observe_process_record(process_id):
        if root_pid and process_id == root_pid[0]:
            events.append("root_proc_snapshot")
        return real_read_process_record(process_id)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    monkeypatch.setattr(gate, "_pidfd_open", observe_pidfd_open)
    monkeypatch.setattr(
        gate, "_read_process_record", observe_process_record
    )

    outcome = gate._execute_command_serial(
        [sys.executable, "-c", "pass"],
        tmp_path,
        {},
        timeout_seconds=5,
    )

    assert outcome.status == "completed"
    assert events[0] == "root_pidfd"
    assert events.count("root_pidfd") == 1
    assert events.index("root_pidfd") < events.index("root_proc_snapshot")
    assert events.index("root_proc_snapshot") < events.index("communicate")


def test_second_concurrent_execution_fails_before_its_popen(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_popen = subprocess.Popen
    first_spawned = threading.Event()
    calls: list[subprocess.Popen] = []
    first_outcomes: list[object] = []

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            calls.append(self._process)
            if len(calls) == 1:
                first_spawned.set()

        def __getattr__(self, name):
            return getattr(self._process, name)

    def run_first():
        try:
            first_outcomes.append(
                gate._execute_command(
                    [
                        sys.executable,
                        "-c",
                        "import time; time.sleep(0.5)",
                    ],
                    tmp_path,
                    {},
                    timeout_seconds=5,
                )
            )
        except BaseException as exc:
            first_outcomes.append(exc)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    first_thread = threading.Thread(target=run_first)
    first_thread.start()
    try:
        assert first_spawned.wait(timeout=3)
        with pytest.raises(
            gate.ProcessCleanupError, match="already active"
        ):
            gate._execute_command(
                [sys.executable, "-c", "pass"],
                tmp_path,
                {},
                timeout_seconds=5,
            )
        first_thread.join(timeout=5)

        assert not first_thread.is_alive()
        assert len(calls) == 1
        assert len(first_outcomes) == 1
        assert first_outcomes[0].status == "completed"
    finally:
        first_thread.join(timeout=5)
        for process in calls:
            if process.poll() is None:
                process.kill()
            try:
                process.communicate(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate()


def test_fresh_supervisor_does_not_claim_parent_child_created_after_ready(
    tmp_path,
):
    gate = load_gate()
    entry_subreaper = gate._get_child_subreaper()
    foreign: dict[str, subprocess.Popen] = {}
    ready_states: list[bool] = []

    def create_foreign_child_after_ready():
        ready_states.append(gate._get_child_subreaper())
        foreign["process"] = subprocess.Popen(
            [sys.executable, "-c", "import time; time.sleep(60)"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    try:
        outcome = gate._execute_command(
            [sys.executable, "-c", "pass"],
            tmp_path,
            {},
            timeout_seconds=5,
            _after_supervisor_ready=create_foreign_child_after_ready,
        )

        assert outcome.status == "completed"
        assert ready_states == [entry_subreaper]
        assert gate._get_child_subreaper() is entry_subreaper
        assert foreign["process"].poll() is None
        foreign["process"].terminate()
        assert foreign["process"].wait(timeout=3) == -signal.SIGTERM
    finally:
        if "process" in foreign and foreign["process"].poll() is None:
            foreign["process"].kill()
            foreign["process"].wait(timeout=3)


def test_supervisor_result_includes_complete_cleanup_proof(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_decode = gate._decode_command_outcome
    cleanup_proofs: list[dict[str, object]] = []

    def observe_decode(frame, request_id):
        cleanup_proofs.append(frame["cleanup"])
        return real_decode(frame, request_id)

    monkeypatch.setattr(gate, "_decode_command_outcome", observe_decode)

    outcome = gate._execute_command(
        [sys.executable, "-c", "pass"],
        tmp_path,
        {},
        timeout_seconds=5,
    )

    assert outcome.status == "completed"
    assert cleanup_proofs == [
        {
            "quiescent": True,
            "rootReaped": True,
            "subreaperRestored": True,
            "openPidfds": 0,
        }
    ]


def test_supervisor_reap_precedes_cleanup_proof_decode(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_decode = gate._decode_command_outcome
    real_wait = gate._wait_pidfd_child
    events: list[str] = []

    def observe_decode(frame, request_id):
        events.append("decode-proof")
        return real_decode(frame, request_id)

    def observe_wait(process, pidfd, *, timeout_seconds):
        reaped = real_wait(
            process,
            pidfd,
            timeout_seconds=timeout_seconds,
        )
        if reaped:
            events.append("helper-reaped")
        return reaped

    monkeypatch.setattr(gate, "_decode_command_outcome", observe_decode)
    monkeypatch.setattr(gate, "_wait_pidfd_child", observe_wait)

    outcome = gate._execute_command(
        [sys.executable, "-c", "pass"],
        tmp_path,
        {},
        timeout_seconds=5,
    )

    assert outcome.status == "completed"
    assert events == ["helper-reaped", "decode-proof"]


def test_helper_pidfd_close_failure_after_reap_has_no_json(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest_path = tmp_path / "suites.json"
    write_manifest(manifest_path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    real_execute = gate._execute_command
    real_pidfd_open = gate._pidfd_open
    real_wait = gate._wait_pidfd_child
    real_close = os.close
    helper_pids: list[int] = []
    helper_pidfds: list[int] = []
    close_attempts: list[int] = []
    events: list[str] = []

    def observe_helper_pidfd(process_id):
        pidfd = real_pidfd_open(process_id)
        helper_pids.append(process_id)
        helper_pidfds.append(pidfd)
        return pidfd

    def observe_helper_wait(process, pidfd, *, timeout_seconds):
        reaped = real_wait(
            process,
            pidfd,
            timeout_seconds=timeout_seconds,
        )
        if pidfd in helper_pidfds and reaped:
            assert process.returncode == 0
            events.append("helper-reaped")
        return reaped

    def fail_after_real_helper_pidfd_close(file_descriptor):
        if file_descriptor in helper_pidfds:
            close_attempts.append(file_descriptor)
            events.append("helper-pidfd-close")
            real_close(file_descriptor)
            raise OSError(
                errno.EIO,
                "synthetic helper pidfd close failure",
            )
        real_close(file_descriptor)

    def run_real_command(repo_root, _manifest, env=None, contract=None):
        del env, contract
        outcome = real_execute(
            [sys.executable, "-c", "pass"],
            repo_root,
            {},
            timeout_seconds=5,
        )
        raise AssertionError(f"close fault did not propagate: {outcome}")

    monkeypatch.setattr(gate, "run_gate", run_real_command)
    monkeypatch.setattr(gate, "_pidfd_open", observe_helper_pidfd)
    monkeypatch.setattr(gate, "_wait_pidfd_child", observe_helper_wait)
    monkeypatch.setattr(gate.os, "close", fail_after_real_helper_pidfd_close)

    with pytest.raises(
        gate.ProcessCleanupError,
        match="cannot close suite supervisor pidfd",
    ):
        gate.main(
            [
                "--repo-root",
                str(tmp_path),
                "--manifest",
                str(manifest_path),
            ]
        )

    assert len(helper_pidfds) == 1
    assert close_attempts == helper_pidfds
    assert events == ["helper-reaped", "helper-pidfd-close"]
    assert not pid_is_running(helper_pids[0])
    with pytest.raises(OSError, match="Bad file descriptor"):
        os.fstat(helper_pidfds[0])
    assert capsys.readouterr().out == ""


def test_helper_pidfd_close_failure_keeps_primary_cleanup_causality(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('must not run')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest_path = tmp_path / "suites.json"
    write_manifest(manifest_path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    real_execute = gate._execute_command
    real_pidfd_open = gate._pidfd_open
    real_shutdown = gate._shutdown_suite_supervisor
    real_close = os.close
    helper_pids: list[int] = []
    helper_pidfds: list[int] = []
    close_attempts: list[int] = []
    events: list[str] = []

    def observe_helper_pidfd(process_id):
        pidfd = real_pidfd_open(process_id)
        helper_pids.append(process_id)
        helper_pidfds.append(pidfd)
        return pidfd

    def raise_after_helper_shutdown(process, pidfd):
        real_shutdown(process, pidfd)
        assert process.returncode == 0
        events.append("primary-cleanup-error")
        raise gate.ProcessCleanupError(
            "synthetic primary supervisor cleanup failure"
        )

    def fail_after_real_helper_pidfd_close(file_descriptor):
        if file_descriptor in helper_pidfds:
            close_attempts.append(file_descriptor)
            events.append("helper-pidfd-close")
            real_close(file_descriptor)
            raise OSError(
                errno.EIO,
                "synthetic helper pidfd close failure",
            )
        real_close(file_descriptor)

    def fail_after_ready():
        raise RuntimeError("synthetic pre-run parent failure")

    def execute_with_pre_run_failure(
        argv,
        repo_root,
        env,
        timeout_seconds,
    ):
        return real_execute(
            argv,
            repo_root,
            env,
            timeout_seconds,
            _after_supervisor_ready=fail_after_ready,
        )

    monkeypatch.setattr(gate, "_execute_command", execute_with_pre_run_failure)
    monkeypatch.setattr(gate, "_pidfd_open", observe_helper_pidfd)
    monkeypatch.setattr(
        gate,
        "_shutdown_suite_supervisor",
        raise_after_helper_shutdown,
    )
    monkeypatch.setattr(gate.os, "close", fail_after_real_helper_pidfd_close)

    with pytest.raises(
        gate.ProcessCleanupError,
        match="cannot close suite supervisor pidfd",
    ) as raised:
        gate.main(
            [
                "--repo-root",
                str(tmp_path),
                "--manifest",
                str(manifest_path),
            ]
        )

    close_error = raised.value.__cause__
    assert isinstance(close_error, OSError)
    assert close_error.errno == errno.EIO
    primary_cleanup_error = close_error.__context__
    assert isinstance(primary_cleanup_error, gate.ProcessCleanupError)
    assert (
        str(primary_cleanup_error)
        == "synthetic primary supervisor cleanup failure"
    )
    assert isinstance(primary_cleanup_error.__context__, RuntimeError)
    assert len(helper_pidfds) == 1
    assert close_attempts == helper_pidfds
    assert events == ["primary-cleanup-error", "helper-pidfd-close"]
    assert not pid_is_running(helper_pids[0])
    with pytest.raises(OSError, match="Bad file descriptor"):
        os.fstat(helper_pidfds[0])
    assert capsys.readouterr().out == ""


def test_helper_pidfd_failure_kills_term_ignoring_exact_child_without_json(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('must not run')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest_path = tmp_path / "suites.json"
    write_manifest(manifest_path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    ready_path = tmp_path / "term-ignoring-helper.ready"
    real_popen = subprocess.Popen
    started: dict[str, subprocess.Popen] = {}

    def launch_term_ignoring_helper(_argv, **kwargs):
        process = real_popen(
            [
                sys.executable,
                "-c",
                (
                    "from pathlib import Path\n"
                    "import signal\n"
                    "import time\n"
                    "import sys\n"
                    "signal.signal(signal.SIGTERM, signal.SIG_IGN)\n"
                    "Path(sys.argv[1]).write_text('ready', encoding='utf-8')\n"
                    "time.sleep(60)\n"
                ),
                str(ready_path),
            ],
            **kwargs,
        )
        started["helper"] = process
        deadline = time.monotonic() + 3
        while not ready_path.is_file():
            if process.poll() is not None:
                raise AssertionError("synthetic helper exited before setup")
            if time.monotonic() >= deadline:
                raise AssertionError("synthetic helper setup timed out")
            time.sleep(0.01)
        return process

    def fail_helper_pidfd(_process_id):
        raise OSError(errno.EMFILE, "synthetic helper pidfd failure")

    monkeypatch.setattr(gate.subprocess, "Popen", launch_term_ignoring_helper)
    monkeypatch.setattr(gate, "_pidfd_open", fail_helper_pidfd)
    monkeypatch.setattr(gate, "SUPERVISOR_EXIT_SECONDS", 0.05)

    try:
        with pytest.raises(gate.ProcessCleanupError):
            gate.main(
                [
                    "--repo-root",
                    str(tmp_path),
                    "--manifest",
                    str(manifest_path),
                ]
            )

        helper = started["helper"]
        assert helper.returncode == -signal.SIGKILL
        assert not pid_is_running(helper.pid)
        assert capsys.readouterr().out == ""
    finally:
        if "helper" in started and started["helper"].poll() is None:
            started["helper"].kill()
            started["helper"].wait(timeout=3)


def test_pre_run_parent_failure_reaps_fresh_supervisor(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_popen = subprocess.Popen
    started: dict[str, subprocess.Popen] = {}

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["helper"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

    def fail_after_ready():
        raise RuntimeError("synthetic pre-run parent failure")

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)

    with pytest.raises(
        RuntimeError, match="synthetic pre-run parent failure"
    ):
        gate._execute_command(
            [sys.executable, "-c", "pass"],
            tmp_path,
            {},
            timeout_seconds=5,
            _after_supervisor_ready=fail_after_ready,
        )

    assert started["helper"].returncode == 0
    assert not pid_is_running(started["helper"].pid)


def test_pre_run_parent_failure_kills_term_ignoring_helper_and_closes_pidfd(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    started: dict[str, subprocess.Popen] = {}
    helper_pidfds: list[int] = []

    def launch_term_ignoring_helper(_argv, **kwargs):
        helper_fd = kwargs["pass_fds"][0]
        process = real_popen(
            [
                sys.executable,
                "-c",
                (
                    "import json\n"
                    "import signal\n"
                    "import socket\n"
                    "import struct\n"
                    "import sys\n"
                    "import time\n"
                    "channel = socket.socket(fileno=int(sys.argv[1]))\n"
                    "signal.signal(signal.SIGTERM, signal.SIG_IGN)\n"
                    "payload = json.dumps("
                    "{'type': 'ready', 'version': 1}, "
                    "separators=(',', ':'), sort_keys=True).encode()\n"
                    "channel.sendall(struct.pack('!I', len(payload)) + payload)\n"
                    "time.sleep(60)\n"
                ),
                str(helper_fd),
            ],
            **kwargs,
        )
        started["helper"] = process
        return process

    def observe_helper_pidfd(process_id):
        pidfd = real_pidfd_open(process_id)
        helper_pidfds.append(pidfd)
        return pidfd

    def fail_after_ready():
        raise RuntimeError("synthetic pre-run parent failure")

    monkeypatch.setattr(gate.subprocess, "Popen", launch_term_ignoring_helper)
    monkeypatch.setattr(gate, "_pidfd_open", observe_helper_pidfd)
    monkeypatch.setattr(gate, "TERMINATION_GRACE_SECONDS", 0.05)
    monkeypatch.setattr(gate, "KILL_REAP_SECONDS", 0.2)
    monkeypatch.setattr(gate, "SUPERVISOR_EXIT_SECONDS", 0.05)

    try:
        with pytest.raises(
            RuntimeError, match="synthetic pre-run parent failure"
        ):
            gate._execute_command(
                [sys.executable, "-c", "pass"],
                tmp_path,
                {},
                timeout_seconds=5,
                _after_supervisor_ready=fail_after_ready,
            )

        helper = started["helper"]
        assert helper.returncode == -signal.SIGKILL
        assert not pid_is_running(helper.pid)
        assert helper_pidfds
        with pytest.raises(OSError, match="Bad file descriptor"):
            os.fstat(helper_pidfds[0])
        assert capsys.readouterr().out == ""
    finally:
        if "helper" in started and started["helper"].poll() is None:
            started["helper"].kill()
            started["helper"].wait(timeout=3)
        for pidfd in helper_pidfds:
            try:
                os.close(pidfd)
            except OSError:
                pass


def test_valid_result_then_hang_is_killed_reaped_and_never_decoded(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('must not run')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest_path = tmp_path / "suites.json"
    write_manifest(manifest_path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    real_decode = gate._decode_command_outcome
    started: dict[str, subprocess.Popen] = {}
    helper_pidfds: list[int] = []
    decode_calls: list[str] = []

    def launch_result_then_hang_helper(_argv, **kwargs):
        helper_fd = kwargs["pass_fds"][0]
        process = real_popen(
            [
                sys.executable,
                "-c",
                (
                    "import json\n"
                    "import signal\n"
                    "import socket\n"
                    "import struct\n"
                    "import sys\n"
                    "import time\n"
                    "channel = socket.socket(fileno=int(sys.argv[1]))\n"
                    "signal.signal(signal.SIGTERM, signal.SIG_IGN)\n"
                    "def receive():\n"
                    "    size = struct.unpack('!I', channel.recv(4))[0]\n"
                    "    payload = b''\n"
                    "    while len(payload) < size:\n"
                    "        payload += channel.recv(size - len(payload))\n"
                    "    return json.loads(payload)\n"
                    "def send(frame):\n"
                    "    payload = json.dumps(frame, separators=(',', ':'), "
                    "sort_keys=True).encode()\n"
                    "    channel.sendall(struct.pack('!I', len(payload)) "
                    "+ payload)\n"
                    "send({'type': 'ready', 'version': 1})\n"
                    "request = receive()\n"
                    "send({\n"
                    "    'cleanup': {'openPidfds': 0, 'quiescent': True, "
                    "'rootReaped': True, 'subreaperRestored': True},\n"
                    "    'requestId': request['requestId'],\n"
                    "    'returncode': 0,\n"
                    "    'signalNumber': None,\n"
                    "    'status': 'completed',\n"
                    "    'stderr': '',\n"
                    "    'stdout': '',\n"
                    "    'type': 'result',\n"
                    "    'version': 1,\n"
                    "})\n"
                    "time.sleep(60)\n"
                ),
                str(helper_fd),
            ],
            **kwargs,
        )
        started["helper"] = process
        return process

    def observe_helper_pidfd(process_id):
        pidfd = real_pidfd_open(process_id)
        helper_pidfds.append(pidfd)
        return pidfd

    def observe_decode(frame, request_id):
        decode_calls.append(request_id)
        return real_decode(frame, request_id)

    monkeypatch.setattr(
        gate.subprocess, "Popen", launch_result_then_hang_helper
    )
    monkeypatch.setattr(gate, "_pidfd_open", observe_helper_pidfd)
    monkeypatch.setattr(gate, "_decode_command_outcome", observe_decode)
    monkeypatch.setattr(gate, "TERMINATION_GRACE_SECONDS", 0.05)
    monkeypatch.setattr(gate, "KILL_REAP_SECONDS", 0.2)
    monkeypatch.setattr(gate, "SUPERVISOR_EXIT_SECONDS", 0.05)

    try:
        with pytest.raises(gate.ProcessCleanupError):
            gate.main(
                [
                    "--repo-root",
                    str(tmp_path),
                    "--manifest",
                    str(manifest_path),
                ]
            )

        helper = started["helper"]
        assert decode_calls == []
        assert helper.returncode == -signal.SIGKILL
        assert not pid_is_running(helper.pid)
        assert helper_pidfds
        with pytest.raises(OSError, match="Bad file descriptor"):
            os.fstat(helper_pidfds[0])
        assert capsys.readouterr().out == ""
    finally:
        if "helper" in started and started["helper"].poll() is None:
            started["helper"].kill()
            started["helper"].wait(timeout=3)
        for pidfd in helper_pidfds:
            try:
                os.close(pidfd)
            except OSError:
                pass


def test_invalid_pre_run_protocol_exits_without_public_output(tmp_path):
    gate = load_gate()
    parent_channel, child_channel = socket.socketpair(
        socket.AF_UNIX,
        socket.SOCK_STREAM,
    )
    helper = subprocess.Popen(
        [
            sys.executable,
            str(GATE_PATH),
            "--_suite-supervisor-fd",
            str(child_channel.fileno()),
        ],
        cwd=tmp_path,
        env={},
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
        pass_fds=(child_channel.fileno(),),
    )
    child_channel.close()
    try:
        ready = gate._receive_supervisor_frame(parent_channel)
        assert ready == {
            "version": gate.SUPERVISOR_PROTOCOL_VERSION,
            "type": "ready",
        }

        gate._send_supervisor_frame(
            parent_channel,
            {
                "version": gate.SUPERVISOR_PROTOCOL_VERSION + 1,
                "type": "run",
                "requestId": "invalid",
                "argv": [sys.executable, "-c", "pass"],
                "cwd": str(tmp_path),
                "timeoutSeconds": 5,
            },
        )
        fatal = gate._receive_supervisor_frame(parent_channel)
        stdout, stderr = helper.communicate(timeout=3)

        assert fatal == {
            "version": gate.SUPERVISOR_PROTOCOL_VERSION,
            "type": "fatal",
            "requestId": None,
            "message": "invalid run supervisor protocol frame",
        }
        assert helper.returncode == 4
        assert stdout == b""
        assert stderr == b""
        assert not pid_is_running(helper.pid)
    finally:
        parent_channel.close()
        child_channel.close()
        if helper.poll() is None:
            helper.terminate()
            helper.wait(timeout=3)


def test_preexisting_direct_child_fails_before_suite_spawn(
    tmp_path, monkeypatch
):
    gate = load_gate()
    child = subprocess.Popen(
        [sys.executable, "-c", "import time; time.sleep(60)"]
    )
    popen_called = False

    def unexpected_popen(*_args, **_kwargs):
        nonlocal popen_called
        popen_called = True
        raise AssertionError("suite Popen must not run with an existing child")

    monkeypatch.setattr(gate.subprocess, "Popen", unexpected_popen)
    try:
        with pytest.raises(
            gate.ProcessCleanupError, match="pre-existing direct child"
        ):
            gate._execute_command_serial(
                [sys.executable, "-c", "pass"],
                tmp_path,
                {},
                timeout_seconds=5,
            )
        assert not popen_called
        assert child.poll() is None
    finally:
        if child.poll() is None:
            child.kill()
        child.communicate(timeout=3)


@pytest.mark.parametrize("missing_capability", ["pidfd", "subreaper"])
def test_missing_linux_containment_capability_fails_before_spawn(
    tmp_path, monkeypatch, missing_capability
):
    gate = load_gate()
    popen_called = False

    def unexpected_popen(*_args, **_kwargs):
        nonlocal popen_called
        popen_called = True
        raise AssertionError("Popen must not run without containment")

    monkeypatch.setattr(gate.subprocess, "Popen", unexpected_popen)
    if missing_capability == "pidfd":
        monkeypatch.setattr(
            gate,
            "_pidfd_open",
            lambda _process_id: (_ for _ in ()).throw(
                OSError(errno.ENOSYS, "pidfd unavailable")
            ),
        )
    else:
        monkeypatch.setattr(gate, "_get_child_subreaper", lambda: False)
        monkeypatch.setattr(
            gate,
            "_set_child_subreaper",
            lambda _enabled: (_ for _ in ()).throw(
                gate.ProcessCleanupError("subreaper unavailable")
            ),
        )

    with pytest.raises(gate.ProcessCleanupError):
        gate._execute_command_serial(
            [sys.executable, "-c", "pass"],
            tmp_path,
            {},
            timeout_seconds=5,
        )

    assert not popen_called


def test_command_restores_exact_entry_subreaper_state(tmp_path):
    gate = load_gate()
    original_subreaper = gate._get_child_subreaper()
    try:
        for entry_subreaper in (False, True):
            gate._set_child_subreaper(entry_subreaper)

            outcome = gate._execute_command(
                [sys.executable, "-c", "pass"],
                tmp_path,
                {},
                timeout_seconds=5,
            )

            assert outcome.status == "completed"
            assert gate._get_child_subreaper() is entry_subreaper
    finally:
        gate._set_child_subreaper(original_subreaper)


def test_root_binding_validation_failure_still_reaps_child_and_closes_pidfd(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    real_read_process_record = gate._read_process_record
    real_close = gate.os.close
    started: dict[str, subprocess.Popen] = {}
    root_pidfd: list[int] = []
    closed_root_pidfds: list[int] = []
    read_failure_injected = False

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

    def observe_pidfd_open(process_id):
        pidfd = real_pidfd_open(process_id)
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            root_pidfd.append(pidfd)
        return pidfd

    def fail_first_root_identity_read(process_id):
        nonlocal read_failure_injected
        if (
            not read_failure_injected
            and "process" in started
            and process_id == started["process"].pid
        ):
            read_failure_injected = True
            raise OSError("synthetic root stat failure")
        return real_read_process_record(process_id)

    def observe_close(file_descriptor):
        if file_descriptor in root_pidfd:
            closed_root_pidfds.append(file_descriptor)
        return real_close(file_descriptor)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    monkeypatch.setattr(gate, "_pidfd_open", observe_pidfd_open)
    monkeypatch.setattr(
        gate, "_read_process_record", fail_first_root_identity_read
    )
    monkeypatch.setattr(gate.os, "close", observe_close)

    try:
        with pytest.raises(
            OSError, match="synthetic root stat failure"
        ):
            gate._execute_command_serial(
                [sys.executable, "-c", "import time; time.sleep(60)"],
                tmp_path,
                {},
                timeout_seconds=5,
            )

        process = started["process"]
        assert not pid_is_running(process.pid)
        assert process.returncode is not None
        assert read_failure_injected
        assert len(root_pidfd) == 1
        assert closed_root_pidfds == root_pidfd
    finally:
        if "process" in started:
            stop_exact_processes([started["process"].pid])
            try:
                started["process"].wait(timeout=3)
            except (subprocess.TimeoutExpired, ChildProcessError):
                pass


def test_persistent_root_stat_failure_after_pidfd_open_uses_provisional_handle(
    tmp_path, monkeypatch
):
    gate = load_gate()
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    real_read_process_record = gate._read_process_record
    real_close = gate.os.close
    entry_subreaper = gate._get_child_subreaper()
    started: dict[str, subprocess.Popen] = {}
    root_pidfds: list[int] = []
    closed_root_pidfds: list[int] = []

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

    def observe_pidfd_open(process_id):
        pidfd = real_pidfd_open(process_id)
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            root_pidfds.append(pidfd)
        return pidfd

    def fail_root_stat_persistently(process_id):
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            raise OSError("synthetic persistent root stat failure")
        return real_read_process_record(process_id)

    def observe_close(file_descriptor):
        if file_descriptor in root_pidfds:
            closed_root_pidfds.append(file_descriptor)
        return real_close(file_descriptor)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    monkeypatch.setattr(gate, "_pidfd_open", observe_pidfd_open)
    monkeypatch.setattr(
        gate, "_read_process_record", fail_root_stat_persistently
    )
    monkeypatch.setattr(gate.os, "close", observe_close)

    try:
        with pytest.raises(
            OSError, match="synthetic persistent root stat failure"
        ):
            gate._execute_command_serial(
                [sys.executable, "-c", "import time; time.sleep(60)"],
                tmp_path,
                {},
                timeout_seconds=5,
            )

        process = started["process"]
        assert not pid_is_running(process.pid)
        assert process.returncode is not None
        assert root_pidfds
        assert closed_root_pidfds == root_pidfds
        assert gate._get_child_subreaper() is entry_subreaper
    finally:
        if "process" in started:
            process = started["process"]
            stop_exact_processes([process.pid])
            for stream in (process.stdout, process.stderr):
                if stream is not None and not stream.closed:
                    stream.close()
            try:
                process.wait(timeout=3)
            except (subprocess.TimeoutExpired, ChildProcessError):
                pass
        gate._set_child_subreaper(entry_subreaper)


def test_persistent_root_pidfd_failure_after_spawn_cleans_and_restores(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    script = tmp_path / "hang.py"
    script.write_text("import time\ntime.sleep(60)\n", encoding="utf-8")
    manifest = command_manifest(script.name)
    finalize_inventory(gate, manifest, tmp_path)
    manifest_path = tmp_path / "suites.json"
    write_manifest(manifest_path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    entry_subreaper = gate._get_child_subreaper()
    started: dict[str, subprocess.Popen] = {}
    root_open_attempts = 0

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

    def fail_root_pidfd_persistently(process_id):
        nonlocal root_open_attempts
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            root_open_attempts += 1
            raise OSError(errno.EMFILE, "synthetic persistent root pidfd failure")
        return real_pidfd_open(process_id)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    monkeypatch.setattr(gate, "_pidfd_open", fail_root_pidfd_persistently)
    monkeypatch.setattr(
        gate, "_execute_command", gate._execute_command_serial
    )

    try:
        with pytest.raises(gate.ProcessCleanupError):
            gate.main(
                [
                    "--repo-root",
                    str(tmp_path),
                    "--manifest",
                    str(manifest_path),
                ]
            )

        process = started["process"]
        assert root_open_attempts >= 2
        assert not pid_is_running(process.pid)
        assert process.returncode is not None
        assert process.stdout is not None and process.stdout.closed
        assert process.stderr is not None and process.stderr.closed
        assert gate._get_child_subreaper() is entry_subreaper
        assert capsys.readouterr().out == ""
    finally:
        if "process" in started:
            process = started["process"]
            stop_exact_processes([process.pid])
            for stream in (process.stdout, process.stderr):
                if stream is not None and not stream.closed:
                    stream.close()
            try:
                process.wait(timeout=3)
            except (subprocess.TimeoutExpired, ChildProcessError):
                pass
        gate._set_child_subreaper(entry_subreaper)


def test_root_pidfd_failure_with_opaque_stat_reaps_adopted_descendant(
    tmp_path, monkeypatch
):
    gate = load_gate()
    script = tmp_path / "tree.py"
    pid_path = tmp_path / "pids.json"
    write_process_tree_fixture(script, pid_path, sleep_seconds=60)
    real_popen = subprocess.Popen
    real_pidfd_open = gate._pidfd_open
    real_read_process_record = gate._read_process_record
    entry_subreaper = gate._get_child_subreaper()
    started: dict[str, subprocess.Popen] = {}
    root_open_attempts = 0

    class ObservedProcess:
        def __init__(self, *args, **kwargs):
            self._process = real_popen(*args, **kwargs)
            started["process"] = self._process

        def __getattr__(self, name):
            return getattr(self._process, name)

    def fail_root_pidfd_persistently(process_id):
        nonlocal root_open_attempts
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            deadline = time.monotonic() + 5
            while not pid_path.is_file() and time.monotonic() < deadline:
                time.sleep(0.02)
            if not pid_path.is_file():
                raise AssertionError("fixture did not create its descendant")
            root_open_attempts += 1
            raise OSError(
                errno.EMFILE,
                "synthetic persistent root pidfd failure",
            )
        return real_pidfd_open(process_id)

    def fail_root_stat_persistently(process_id):
        if (
            "process" in started
            and process_id == started["process"].pid
        ):
            raise OSError("synthetic persistent root stat failure")
        return real_read_process_record(process_id)

    monkeypatch.setattr(gate.subprocess, "Popen", ObservedProcess)
    monkeypatch.setattr(
        gate, "_pidfd_open", fail_root_pidfd_persistently
    )
    monkeypatch.setattr(
        gate, "_read_process_record", fail_root_stat_persistently
    )

    process_ids: dict[str, int] = {}
    try:
        with pytest.raises(
            gate.ProcessCleanupError,
            match="root pidfd acquisition failed after spawn",
        ):
            gate._execute_command_serial(
                [sys.executable, str(script)],
                tmp_path,
                {},
                timeout_seconds=5,
            )

        process_ids = json.loads(pid_path.read_text(encoding="utf-8"))
        process = started["process"]
        assert root_open_attempts >= 2
        assert process_ids["runner"] == process.pid
        assert all(
            not pid_is_running(process_id)
            for process_id in (
                process_ids["runner"],
                process_ids["descendant"],
            )
        )
        assert process.returncode is not None
        assert process.stdout is not None and process.stdout.closed
        assert process.stderr is not None and process.stderr.closed
        assert gate._get_child_subreaper() is entry_subreaper
    finally:
        stop_exact_processes(
            [
                process_ids[key]
                for key in ("runner", "descendant")
                if key in process_ids
            ]
        )
        if "process" in started:
            process = started["process"]
            for stream in (process.stdout, process.stderr):
                if stream is not None and not stream.closed:
                    stream.close()
            try:
                process.wait(timeout=3)
            except (subprocess.TimeoutExpired, ChildProcessError):
                pass
        gate._set_child_subreaper(entry_subreaper)


def test_supervisor_protocol_preserves_arbitrary_stream_bytes(tmp_path):
    gate = load_gate()

    outcome = gate._execute_command(
        [
            sys.executable,
            "-c",
            (
                "import os; "
                "os.write(1, bytes([0, 255, 10])); "
                "os.write(2, bytes([254, 0]))"
            ),
        ],
        tmp_path,
        {},
        timeout_seconds=5,
    )

    assert outcome.status == "completed"
    assert outcome.stdout == b"\x00\xff\n"
    assert outcome.stderr == b"\xfe\x00"


def test_h001_bootstrap_fixture_exits_without_detached_git_maintenance():
    gate = load_gate()
    target = (
        REPO
        / "tests"
        / "structure"
        / "test_h001_bootstrap.py"
    )

    outcome = gate._execute_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "-p",
            "no:cacheprovider",
            (
                f"{target}::"
                "test_bootstrap_is_portable_idempotent_and_clean_with_"
                "injected_installers"
            ),
        ],
        REPO,
        gate._command_environment(REPO, dict(os.environ)),
        timeout_seconds=30,
    )

    assert outcome.status == "completed"
    assert outcome.returncode == 0


def test_pid_reuse_between_validation_and_signal_cannot_redirect_signal(
    monkeypatch,
):
    gate = load_gate()
    owned = gate.ProcessIdentity(
        pid=987_654,
        process_group=987_654,
        start_time=111,
    )
    replacement = gate.ProcessRecord(
        identity=gate.ProcessIdentity(
            pid=owned.pid,
            process_group=123_456,
            start_time=222,
        ),
        parent_pid=1,
        state="R",
    )
    pidfd_signals: list[tuple[int, int]] = []
    numeric_signals: list[tuple[int, int]] = []
    handle = gate.ProcessHandle(identity=owned, pidfd=77)
    monkeypatch.setattr(
        gate, "_read_process_record", lambda _process_id: replacement
    )
    monkeypatch.setattr(
        gate,
        "_pidfd_send_signal",
        lambda pidfd, signal_number: pidfd_signals.append(
            (pidfd, signal_number)
        ),
    )
    monkeypatch.setattr(
        gate.os,
        "kill",
        lambda process_id, signal_number: numeric_signals.append(
            (process_id, signal_number)
        ),
    )

    gate._signal_process_handle(handle, signal.SIGKILL)

    assert pidfd_signals == [(77, signal.SIGKILL)]
    assert numeric_signals == []


def test_numeric_fallback_is_limited_to_unreaped_direct_helper_children():
    source = GATE_PATH.read_text(encoding="utf-8")

    assert "os.kill(" not in source
    assert "os.killpg(" not in source
    assert "process.kill(" not in source
    assert "def _signal_unreaped_direct_child(" in source
    assert "parent_pid != containment.parent_pid" in source
    assert "ctypes.c_int(process_id)" in source


def test_pidfd_signal_uncertainty_is_fatal(monkeypatch):
    gate = load_gate()
    handle = gate.ProcessHandle(
        identity=gate.ProcessIdentity(
            pid=987_654,
            process_group=987_654,
            start_time=111,
        ),
        pidfd=77,
    )
    monkeypatch.setattr(
        gate,
        "_pidfd_send_signal",
        lambda _pidfd, _signal_number: (_ for _ in ()).throw(
            PermissionError(errno.EPERM, "synthetic pidfd denial")
        ),
    )

    with pytest.raises(PermissionError, match="synthetic pidfd denial"):
        gate._signal_process_handle(handle, signal.SIGKILL)


def test_process_cleanup_error_crosses_suite_and_main_without_a_json_result(
    tmp_path, monkeypatch, capsys
):
    gate = load_gate()
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    manifest = command_manifest(source.name)
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    def fail_cleanup(*_args, **_kwargs):
        raise gate.ProcessCleanupError("synthetic cleanup uncertainty")

    monkeypatch.setattr(gate, "_execute_command", fail_cleanup)
    with pytest.raises(gate.ProcessCleanupError):
        gate._run_suite(manifest["suites"][0], tmp_path, {})

    previous_handlers = {
        handled_signal: signal.getsignal(handled_signal)
        for handled_signal in gate.HANDLED_SIGNALS
    }
    with pytest.raises(gate.ProcessCleanupError):
        gate.main(
            [
                "--repo-root",
                str(tmp_path),
                "--manifest",
                str(path),
            ]
        )

    assert capsys.readouterr().out == ""
    assert {
        handled_signal: signal.getsignal(handled_signal)
        for handled_signal in gate.HANDLED_SIGNALS
    } == previous_handlers


@pytest.mark.parametrize(
    ("cancel_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
def test_gate_signal_emits_one_json_and_reaps_process_tree(
    tmp_path, cancel_signal, expected_exit
):
    gate = load_gate()
    script = tmp_path / "tree.py"
    pid_path = tmp_path / "pids.json"
    write_process_tree_fixture(script, pid_path, sleep_seconds=60)
    manifest = command_manifest(script.name)
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    process = subprocess.Popen(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env={},
    )
    pids: list[int] = []
    try:
        process_ids = wait_for_pid_file(pid_path, process)
        pids = [process_ids["runner"], process_ids["descendant"]]
        os.kill(process.pid, cancel_signal)
        stdout, stderr = process.communicate(timeout=8)

        report = json.loads(stdout)
        assert process.returncode == expected_exit
        assert stderr.count(b"Traceback") == 0
        assert report["status"] == "cancelled"
        assert report["suites"][0]["status"] == "cancelled"
        assert process_ids["runnerPgid"] == process_ids["runner"]
        assert process_ids["descendantPgid"] == process_ids["runner"]
        assert all(not pid_is_running(pid) for pid in pids)
    finally:
        if process.poll() is None:
            process.kill()
            process.communicate()
        stop_exact_processes(pids)


@pytest.mark.parametrize(
    ("cancel_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
def test_gate_signal_during_final_serialization_emits_one_cancelled_json(
    tmp_path, cancel_signal, expected_exit
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "serialization_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import signal",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "real_dumps = gate.json.dumps",
                "delivered = False",
                "def signal_during_dumps(*args, **kwargs):",
                "    global delivered",
                "    if not delivered:",
                "        delivered = True",
                f"        os.kill(os.getpid(), {cancel_signal})",
                "    return real_dumps(*args, **kwargs)",
                "gate.json.dumps = signal_during_dumps",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == expected_exit
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "cancelled"
    assert report["signal"] == signal.Signals(cancel_signal).name


@pytest.mark.parametrize("precommit_phase", ["after_final_render", "before_write_all"])
@pytest.mark.parametrize(
    ("cancel_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
def test_gate_signal_immediately_before_low_level_commit_is_captured(
    tmp_path, precommit_phase, cancel_signal, expected_exit
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / f"{precommit_phase}_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "if " + repr(precommit_phase) + " == 'after_final_render':",
                "    real_render = gate._render_final_payload",
                "    render_calls = 0",
                "    def inject_after_final_render(*args, **kwargs):",
                "        global render_calls",
                "        result = real_render(*args, **kwargs)",
                "        render_calls += 1",
                "        if render_calls == 2:",
                f"            os.kill(os.getpid(), {cancel_signal})",
                "        return result",
                "    gate._render_final_payload = inject_after_final_render",
                "else:",
                "    real_write_all = gate._write_all",
                "    def inject_before_write_all(*args, **kwargs):",
                f"        os.kill(os.getpid(), {cancel_signal})",
                "        return real_write_all(*args, **kwargs)",
                "    gate._write_all = inject_before_write_all",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == expected_exit
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "cancelled"
    assert report["signal"] == signal.Signals(cancel_signal).name


@pytest.mark.parametrize("cancel_signal", [signal.SIGINT, signal.SIGTERM])
def test_gate_signal_after_logical_commit_keeps_the_frozen_result(
    tmp_path, cancel_signal
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "post_commit_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "real_write = gate.os.write",
                "delivered = False",
                "def inject_after_freeze(file_descriptor, payload):",
                "    global delivered",
                "    if not delivered:",
                "        delivered = True",
                f"        os.kill(os.getpid(), {cancel_signal})",
                "    return real_write(file_descriptor, payload)",
                "gate.os.write = inject_after_freeze",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == 0
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    assert json.loads(completed.stdout)["status"] == "passed"


@pytest.mark.parametrize("cancel_signal", [signal.SIGINT, signal.SIGTERM])
def test_signal_immediately_before_final_unmask_preserves_frozen_result_and_state(
    tmp_path, cancel_signal
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "final_unmask_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import signal",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "handler_calls = []",
                "def original_int(signum, _frame):",
                "    handler_calls.append(signum)",
                "def original_term(signum, _frame):",
                "    handler_calls.append(signum)",
                "original_handlers = {",
                "    signal.SIGINT: original_int,",
                "    signal.SIGTERM: original_term,",
                "}",
                "for signum, handler in original_handlers.items():",
                "    signal.signal(signum, handler)",
                "entry_mask = signal.pthread_sigmask(signal.SIG_BLOCK, {signal.SIGUSR1})",
                "expected_mask = set(entry_mask) | {signal.SIGUSR1}",
                "real_write = gate.os.write",
                "real_sigmask = gate.signal.pthread_sigmask",
                "committed = False",
                "injected = False",
                "def observe_commit(file_descriptor, payload):",
                "    global committed",
                "    result = real_write(file_descriptor, payload)",
                "    committed = True",
                "    return result",
                "def inject_before_unmask(operation, mask):",
                "    global injected",
                "    if (committed and not injected",
                "            and operation == signal.SIG_SETMASK):",
                "        injected = True",
                f"        os.kill(os.getpid(), {cancel_signal})",
                "    return real_sigmask(operation, mask)",
                "gate.os.write = observe_commit",
                "gate.signal.pthread_sigmask = inject_before_unmask",
                "status = gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "])",
                "restored_handlers = {",
                "    signum: signal.getsignal(signum)",
                "    for signum in gate.HANDLED_SIGNALS",
                "}",
                "restored_mask = real_sigmask(signal.SIG_BLOCK, set())",
                "if not injected:",
                "    status = 91",
                "elif handler_calls:",
                "    status = 92",
                "elif restored_handlers != original_handlers:",
                "    status = 93",
                "elif set(restored_mask) != expected_mask:",
                "    status = 94",
                "raise SystemExit(status)",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == 0
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    assert json.loads(completed.stdout)["status"] == "passed"


def test_partial_low_level_commit_never_replays_the_complete_payload(monkeypatch):
    gate = load_gate()
    committed = bytearray()
    calls = 0

    def partial_then_fail(_file_descriptor, payload):
        nonlocal calls
        calls += 1
        if calls == 1:
            prefix_length = max(1, len(payload) // 2)
            committed.extend(bytes(payload[:prefix_length]))
            return prefix_length
        raise OSError("synthetic output failure after partial commit")

    monkeypatch.setattr(gate.os, "write", partial_then_fail)
    with pytest.raises(OSError, match="partial commit"):
        gate._write_all(
            1,
            gate._empty_report("passed", []),
            0,
            gate.CancellationState(finalizing=True),
        )

    assert calls == 2
    assert committed
    assert not bytes(committed).endswith(b"\n")


def test_gate_signal_during_post_freeze_ignore_transition_keeps_result(tmp_path):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "restoration_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import signal",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "real_signal = gate.signal.signal",
                "handler_calls = 0",
                "def signal_during_restoration(*args, **kwargs):",
                "    global handler_calls",
                "    result = real_signal(*args, **kwargs)",
                "    handler_calls += 1",
                "    if handler_calls == 4:",
                "        os.kill(os.getpid(), signal.SIGTERM)",
                "    return result",
                "gate.signal.signal = signal_during_restoration",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == 0
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "passed"


@pytest.mark.parametrize(
    ("cancel_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
@pytest.mark.parametrize("handler_call", [1, 2])
def test_gate_signal_during_initial_handler_install_is_captured(
    tmp_path, cancel_signal, expected_exit, handler_call
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "initial_handler_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "real_signal = gate.signal.signal",
                "handler_calls = 0",
                "def signal_during_install(*args, **kwargs):",
                "    global handler_calls",
                "    result = real_signal(*args, **kwargs)",
                "    handler_calls += 1",
                f"    if handler_calls == {handler_call}:",
                f"        os.kill(os.getpid(), {cancel_signal})",
                "    return result",
                "gate.signal.signal = signal_during_install",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == expected_exit
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "cancelled"
    assert report["signal"] == signal.Signals(cancel_signal).name


@pytest.mark.parametrize("emission_phase", ["write", "flush"])
@pytest.mark.parametrize(
    ("cancel_signal", "expected_exit"),
    [(signal.SIGINT, 130), (signal.SIGTERM, 143)],
)
def test_gate_signal_during_final_emission_is_captured(
    tmp_path, emission_phase, cancel_signal, expected_exit
):
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / f"{emission_phase}_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                "class SignalStdout:",
                "    def __init__(self, wrapped):",
                "        self.wrapped = wrapped",
                "        self.delivered = False",
                "    def __getattr__(self, name):",
                "        return getattr(self.wrapped, name)",
                "    def deliver(self):",
                "        if not self.delivered:",
                "            self.delivered = True",
                f"            os.kill(os.getpid(), {cancel_signal})",
                "    def write(self, value):",
                (
                    "        self.deliver()"
                    if emission_phase == "write"
                    else "        pass"
                ),
                "        return self.wrapped.write(value)",
                "    def flush(self):",
                (
                    "        self.deliver()"
                    if emission_phase == "flush"
                    else "        pass"
                ),
                "        return self.wrapped.flush()",
                "gate.sys.stdout = SignalStdout(sys.stdout)",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "    '--validate-only',",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=8,
        env={},
    )

    assert completed.returncode == expected_exit
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "cancelled"
    assert report["signal"] == signal.Signals(cancel_signal).name


def test_gate_signal_during_pytest_final_flush_leaves_no_junit_tempdir(tmp_path):
    source = tmp_path / "test_sample.py"
    source.write_text("def test_sample():\n    assert True\n", encoding="utf-8")
    junit_root = tmp_path / "junit-root"
    junit_root.mkdir()
    manifest = manifest_for(
        [
            {
                "id": "check.pytest",
                "classification": "required",
                "runner": "pytest",
                "argv": [
                    sys.executable,
                    "-m",
                    "pytest",
                    "-q",
                    "-p",
                    "no:cacheprovider",
                ],
                "include": [source.name],
                "exclude": [],
                "inventorySha256": "",
                "minimumTests": 1,
                "allowedSkips": [],
                "timeoutSeconds": 30,
            }
        ]
    )
    finalize_inventory(load_gate(), manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    probe = tmp_path / "pytest_flush_probe.py"
    probe.write_text(
        "\n".join(
            [
                "import importlib.util",
                "import os",
                "import sys",
                f"spec = importlib.util.spec_from_file_location('gate_probe', {str(GATE_PATH)!r})",
                "gate = importlib.util.module_from_spec(spec)",
                "sys.modules[spec.name] = gate",
                "spec.loader.exec_module(gate)",
                f"gate.tempfile.tempdir = {str(junit_root)!r}",
                "class SignalStdout:",
                "    def __init__(self, wrapped):",
                "        self.wrapped = wrapped",
                "        self.delivered = False",
                "    def __getattr__(self, name):",
                "        return getattr(self.wrapped, name)",
                "    def write(self, value):",
                "        return self.wrapped.write(value)",
                "    def flush(self):",
                "        if not self.delivered:",
                "            self.delivered = True",
                "            os.kill(os.getpid(), 15)",
                "        return self.wrapped.flush()",
                "gate.sys.stdout = SignalStdout(sys.stdout)",
                "raise SystemExit(gate.main([",
                f"    '--repo-root', {str(tmp_path)!r},",
                f"    '--manifest', {str(path)!r},",
                "]))",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    completed = subprocess.run(
        [sys.executable, str(probe)],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        timeout=15,
        env={},
    )

    assert completed.returncode == 143
    assert completed.stderr.count(b"Traceback") == 0
    assert completed.stdout.count(b"\n") == 1
    report = json.loads(completed.stdout)
    assert report["status"] == "cancelled"
    assert report["signal"] == "SIGTERM"
    assert not list(junit_root.glob("agents-ci-junit-*"))


def test_gate_main_restores_original_signal_handlers(tmp_path):
    gate = load_gate()
    manifest = command_manifest("check.py")
    source = tmp_path / "check.py"
    source.write_text("print('ok')\n", encoding="utf-8")
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)
    previous_handlers = {
        handled_signal: signal.getsignal(handled_signal)
        for handled_signal in gate.HANDLED_SIGNALS
    }

    try:
        assert gate.main(
            [
                "--repo-root",
                str(tmp_path),
                "--manifest",
                str(path),
                "--validate-only",
            ]
        ) == 0
        installed_handlers = {
            handled_signal: signal.getsignal(handled_signal)
            for handled_signal in gate.HANDLED_SIGNALS
        }
    finally:
        for handled_signal, previous_handler in previous_handlers.items():
            signal.signal(handled_signal, previous_handler)

    assert installed_handlers == previous_handlers


def test_refresh_cannot_self_authorize_required_or_optional_suite_deletion(tmp_path):
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    for removed_id in ("test.cli", "test.redis-live"):
        candidate = copy.deepcopy(manifest)
        candidate["requiredSuiteIds"] = [
            suite_id
            for suite_id in candidate["requiredSuiteIds"]
            if suite_id != removed_id
        ]
        candidate["suites"] = [
            suite for suite in candidate["suites"] if suite["id"] != removed_id
        ]
        path = tmp_path / f"{removed_id}.json"
        write_manifest(path, candidate)
        original = path.read_bytes()

        completed = subprocess.run(
            [
                sys.executable,
                str(GATE_PATH),
                "--repo-root",
                str(REPO),
                "--manifest",
                str(path),
                "--refresh-inventory",
            ],
            cwd=REPO,
            text=True,
            capture_output=True,
            check=False,
        )

        assert completed.returncode == 2
        assert path.read_bytes() == original
        assert "suite contract" in completed.stdout


def test_refresh_cannot_self_authorize_suite_topology_narrowing(tmp_path):
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    structure = next(
        suite for suite in manifest["suites"] if suite["id"] == "test.structure"
    )
    structure["include"] = ["tests/structure/test_ci_suite_manifest.py"]
    structure["minimumTests"] = 1
    path = tmp_path / "narrowed.json"
    write_manifest(path, manifest)
    original = path.read_bytes()

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(REPO),
            "--manifest",
            str(path),
            "--refresh-inventory",
        ],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert path.read_bytes() == original
    assert "suite contract" in completed.stdout


@pytest.mark.parametrize("mutation", ["allowedSkips", "readiness"])
def test_refresh_cannot_self_authorize_skip_or_readiness_policy(tmp_path, mutation):
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if mutation == "allowedSkips":
        gateway = next(
            suite for suite in manifest["suites"] if suite["id"] == "test.gateway"
        )
        gateway["allowedSkips"].append(
            {
                "id": "newly self-authorized skip",
                "classification": "infrastructure_unavailable",
                "service": "synthetic",
            }
        )
    else:
        redis = next(
            suite for suite in manifest["suites"] if suite["id"] == "test.redis-live"
        )
        redis["readiness"] = {
            "service": "redis",
            "environmentEquals": {"RUN_ANY_REDIS": "1"},
        }
    path = tmp_path / f"{mutation}.json"
    write_manifest(path, manifest)
    original = path.read_bytes()

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(REPO),
            "--manifest",
            str(path),
            "--refresh-inventory",
        ],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 2
    assert path.read_bytes() == original
    assert "suite contract" in completed.stdout


def test_node_tap_rejects_duplicate_summary_fields():
    gate = load_gate()
    output = "\n".join(
        [
            "TAP version 13",
            "ok 1 - deterministic behavior",
            "1..1",
            "# tests 1",
            "# pass 0",
            "# fail 1",
            "# skipped 0",
            "# tests 1",
            "# pass 1",
            "# fail 0",
            "# skipped 0",
        ]
    )

    with pytest.raises(ValueError, match="exactly one"):
        gate.parse_node_tap(output)


def test_test_result_rejects_duplicate_observed_skip_ids():
    gate = load_gate()
    suite = {
        "id": "test.sample",
        "minimumTests": 2,
        "allowedSkips": [
            {
                "id": "infra case",
                "classification": "infrastructure_unavailable",
                "service": "synthetic",
            }
        ],
    }

    errors, unavailable = gate.assess_test_result(
        suite,
        gate.TestCounts(tests=2, passed=0, failed=0, skipped=2),
        ["infra case", "infra case"],
    )

    assert any("duplicate observed skip ids: infra case" in error for error in errors)
    assert unavailable == [{"id": "infra case", "service": "synthetic"}]


def test_allowlisted_required_skip_has_honest_suite_and_aggregate_status(tmp_path):
    gate = load_gate()
    script = tmp_path / "tap.py"
    script.write_text(
        "print('TAP version 13')\n"
        "print('ok 1 - infra case # SKIP service is unavailable')\n"
        "print('1..1')\n"
        "print('# tests 1')\n"
        "print('# pass 0')\n"
        "print('# fail 0')\n"
        "print('# skipped 1')\n",
        encoding="utf-8",
    )
    suite = {
        "id": "test.required-infra",
        "classification": "required",
        "runner": "node-test",
        "argv": [sys.executable, script.name],
        "include": [script.name],
        "exclude": [],
        "inventorySha256": gate.inventory_digest([script.name]),
        "minimumTests": 1,
        "timeoutSeconds": 30,
        "allowedSkips": [
            {
                "id": "infra case",
                "classification": "infrastructure_unavailable",
                "service": "synthetic",
            }
        ],
    }
    manifest = manifest_for([suite])

    report, exit_code = gate.run_gate(tmp_path, manifest, env={})

    assert exit_code == 0
    assert report["status"] == "infrastructure_unavailable"
    assert report["suites"][0]["status"] == "infrastructure_unavailable"


def test_non_utf8_child_output_is_one_json_failure_without_traceback(tmp_path):
    gate = load_gate()
    script = tmp_path / "invalid_output.py"
    script.write_text(
        "import sys\nsys.stdout.buffer.write(bytes([255]))\n",
        encoding="utf-8",
    )
    manifest = command_manifest(script.name)
    finalize_inventory(gate, manifest, tmp_path)
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        env={},
    )

    report = json.loads(completed.stdout)
    assert completed.returncode == 1
    assert completed.stderr.count(b"Traceback") == 0
    assert report["status"] == "failed"
    assert report["suites"][0]["status"] == "failed"
    assert any("non-UTF-8 stdout" in error for error in report["errors"])


def test_valid_tap_cannot_overwrite_a_non_utf8_output_failure(tmp_path):
    gate = load_gate()
    script = tmp_path / "tap_invalid_output.py"
    script.write_text(
        "import sys\n"
        "sys.stdout.buffer.write("
        "b'TAP version 13\\nok 1 - valid case\\n1..1\\n"
        "# tests 1\\n# pass 1\\n# fail 0\\n# skipped 0\\n' + bytes([255]))\n",
        encoding="utf-8",
    )
    suite = {
        "id": "test.invalid-output",
        "classification": "required",
        "runner": "node-test",
        "argv": [sys.executable, script.name],
        "include": [script.name],
        "exclude": [],
        "inventorySha256": gate.inventory_digest([script.name]),
        "minimumTests": 1,
        "allowedSkips": [],
        "timeoutSeconds": 30,
    }
    manifest = manifest_for([suite])
    path = tmp_path / "suites.json"
    write_manifest(path, manifest)
    write_synthetic_contract(tmp_path, manifest)

    completed = subprocess.run(
        [
            sys.executable,
            str(GATE_PATH),
            "--repo-root",
            str(tmp_path),
            "--manifest",
            str(path),
        ],
        cwd=tmp_path,
        capture_output=True,
        check=False,
        env={},
    )

    report = json.loads(completed.stdout)
    assert completed.returncode == 1
    assert report["status"] == "failed"
    assert any("non-UTF-8 stdout" in error for error in report["errors"])
