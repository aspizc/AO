#!/usr/bin/env python3
"""Run the repository CI contract from one strict, machine-readable manifest."""

from __future__ import annotations

import argparse
import base64
import binascii
from collections import Counter
import ctypes
from dataclasses import asdict, dataclass, field
import errno
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import select
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
from typing import Any
import xml.etree.ElementTree as ET


SCHEMA_VERSION = 1
CLASSIFICATIONS = {"required", "optional-service"}
RUNNERS = {"command", "node-test", "pytest"}
MANIFEST_KEYS = {"schemaVersion", "requiredSuiteIds", "suites"}
CONTRACT_KEYS = {
    "schemaVersion",
    "requiredSuiteIds",
    "optionalSuiteIds",
    "suites",
}
SUITE_KEYS = {
    "id",
    "classification",
    "runner",
    "argv",
    "include",
    "exclude",
    "inventorySha256",
    "minimumTests",
    "allowedSkips",
    "readiness",
    "timeoutSeconds",
}
CONTRACT_SUITE_KEYS = {
    "id",
    "classification",
    "runner",
    "argv",
    "include",
    "exclude",
    "minimumTests",
    "allowedSkips",
    "readiness",
    "timeoutSeconds",
}
SKIP_KEYS = {"id", "classification", "service"}
READINESS_KEYS = {"service", "environmentPresent", "environmentEquals"}
SUITE_ID = re.compile(r"^[a-z][a-z0-9.-]*$")
SHA256 = re.compile(r"^sha256:[0-9a-f]{64}$")
NODE_COUNT = re.compile(r"^# (tests|pass|fail|skipped) ([0-9]+)$", re.MULTILINE)
NODE_SKIP = re.compile(r"^\s*ok [0-9]+ - (.*?) # SKIP(?: .*)?$", re.MULTILINE)
MIN_TIMEOUT_SECONDS = 1
MAX_TIMEOUT_SECONDS = 3600
TERMINATION_GRACE_SECONDS = 0.5
KILL_REAP_SECONDS = 2.0
HANDLED_SIGNALS = (signal.SIGINT, signal.SIGTERM)
PR_SET_CHILD_SUBREAPER = 36
PR_GET_CHILD_SUBREAPER = 37
# Linux waitid(2) idtype; Python 3.11 does not export os.P_PIDFD.
P_PIDFD = 3
QUIESCENT_SCANS_REQUIRED = 2
SUPERVISOR_PROTOCOL_VERSION = 1
SUPERVISOR_MAX_FRAME_BYTES = 64 * 1024 * 1024
SUPERVISOR_EXIT_SECONDS = 3.0
_LIBC = ctypes.CDLL(None, use_errno=True)
_PROCESS_CONTAINMENT_LOCK = threading.Lock()


@dataclass(frozen=True)
class TestCounts:
    tests: int
    passed: int
    failed: int
    skipped: int


@dataclass(frozen=True)
class CommandOutcome:
    returncode: int
    stdout: bytes
    stderr: bytes
    status: str
    signal_number: int | None = None


@dataclass(frozen=True)
class ProcessIdentity:
    """Linux process identity stable across PID reuse."""

    pid: int
    process_group: int
    start_time: int


@dataclass(frozen=True)
class ProcessHandle:
    """A process identity bound to a kernel-stable Linux pidfd."""

    identity: ProcessIdentity
    pidfd: int


@dataclass(frozen=True)
class ProcessRecord:
    identity: ProcessIdentity
    parent_pid: int
    state: str


@dataclass
class ProcessContainment:
    """Per-command subreaper state and every pidfd owned by the command."""

    parent_pid: int
    previous_subreaper: bool
    baseline_children: set[ProcessIdentity]
    handles: dict[ProcessIdentity, ProcessHandle] = field(default_factory=dict)
    root_handle: ProcessHandle | None = None
    root_process_id: int | None = None
    root_reaped: bool = False
    quiescent: bool = False


class GateCancelled(Exception):
    """Raised by the CLI signal handler so the active process tree is stopped."""

    def __init__(self, signal_number: int):
        super().__init__(signal.Signals(signal_number).name)
        self.signal_number = signal_number


class ProcessCleanupError(OSError):
    """Raised when an owned subreaper domain cannot be proven absent."""


@dataclass
class CancellationState:
    """Keep the first CLI cancellation signal through final JSON emission."""

    signal_number: int | None = None
    finalizing: bool = False

    def handle(self, signal_number: int, _frame: Any) -> None:
        first_signal = self.signal_number is None
        if first_signal:
            self.signal_number = signal_number
        if self.finalizing or not first_signal:
            return
        raise GateCancelled(signal_number)


def inventory_digest(paths: list[str]) -> str:
    payload = "\n".join(sorted(paths)).encode("utf-8")
    return f"sha256:{hashlib.sha256(payload).hexdigest()}"


def load_manifest(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise ValueError("manifest root must be an object")
    return value


def _valid_relative_pattern(pattern: Any) -> bool:
    if not isinstance(pattern, str) or not pattern:
        return False
    path = Path(pattern)
    return not path.is_absolute() and ".." not in path.parts


def discover_files(repo_root: Path, suite: dict[str, Any]) -> list[str]:
    includes = suite.get("include", [])
    excludes = suite.get("exclude", [])
    if not isinstance(includes, list) or not all(
        _valid_relative_pattern(pattern) for pattern in includes
    ):
        return []
    if not isinstance(excludes, list) or not all(
        _valid_relative_pattern(pattern) for pattern in excludes
    ):
        return []

    matched: set[str] = set()
    for pattern in includes:
        matched.update(
            path.relative_to(repo_root).as_posix()
            for path in repo_root.glob(pattern)
            if path.is_file()
        )
    return sorted(
        path
        for path in matched
        if not any(fnmatch.fnmatchcase(path, pattern) for pattern in excludes)
    )


def _validate_string_array(
    value: Any, field: str, suite_id: str, errors: list[str], *, nonempty: bool
) -> bool:
    valid = isinstance(value, list) and all(
        isinstance(item, str) and item for item in value
    )
    if valid and nonempty:
        valid = bool(value)
    if not valid:
        qualifier = "non-empty " if nonempty else ""
        errors.append(f"{suite_id}: {field} must be a {qualifier}string array")
    return valid


def validate_suite_contract(contract: dict[str, Any]) -> list[str]:
    """Validate the non-refreshable suite IDs and execution topology baseline."""
    errors: list[str] = []
    extra_keys = sorted(set(contract) - CONTRACT_KEYS)
    if extra_keys:
        errors.append(
            f"suite contract has unsupported keys: {', '.join(extra_keys)}"
        )
    if contract.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"suite contract schemaVersion must be {SCHEMA_VERSION}")

    required_ids = contract.get("requiredSuiteIds")
    optional_ids = contract.get("optionalSuiteIds")
    required_valid = _validate_string_array(
        required_ids,
        "requiredSuiteIds",
        "suite contract",
        errors,
        nonempty=True,
    )
    optional_valid = _validate_string_array(
        optional_ids,
        "optionalSuiteIds",
        "suite contract",
        errors,
        nonempty=False,
    )
    if required_valid and len(required_ids) != len(set(required_ids)):
        errors.append("suite contract: requiredSuiteIds contains duplicates")
    if optional_valid and len(optional_ids) != len(set(optional_ids)):
        errors.append("suite contract: optionalSuiteIds contains duplicates")
    if required_valid and optional_valid and set(required_ids) & set(optional_ids):
        errors.append("suite contract: required and optional suite IDs overlap")

    suites = contract.get("suites")
    if not isinstance(suites, list) or not suites:
        errors.append("suite contract: suites must be a non-empty array")
        return errors

    seen: set[str] = set()
    classified_required: set[str] = set()
    classified_optional: set[str] = set()
    for position, suite in enumerate(suites):
        label = f"suite contract suites[{position}]"
        if not isinstance(suite, dict):
            errors.append(f"{label}: suite must be an object")
            continue
        suite_id = suite.get("id")
        if not isinstance(suite_id, str) or not SUITE_ID.fullmatch(suite_id):
            errors.append(f"{label}: id must match {SUITE_ID.pattern}")
            suite_id = label
        elif suite_id in seen:
            errors.append(f"suite contract: duplicate suite id: {suite_id}")
        else:
            seen.add(suite_id)

        extra_suite_keys = sorted(set(suite) - CONTRACT_SUITE_KEYS)
        if extra_suite_keys:
            errors.append(
                f"suite contract {suite_id}: unsupported keys: "
                f"{', '.join(extra_suite_keys)}"
            )
        required_suite_keys = {
            "id",
            "classification",
            "runner",
            "argv",
            "include",
            "exclude",
            "allowedSkips",
            "timeoutSeconds",
        }
        missing_suite_keys = sorted(required_suite_keys - set(suite))
        if missing_suite_keys:
            errors.append(
                f"suite contract {suite_id}: missing keys: "
                f"{', '.join(missing_suite_keys)}"
            )

        classification = suite.get("classification")
        if classification == "required":
            classified_required.add(suite_id)
        elif classification == "optional-service":
            classified_optional.add(suite_id)
        else:
            errors.append(
                f"suite contract {suite_id}: invalid classification"
            )

        runner = suite.get("runner")
        if runner not in RUNNERS:
            errors.append(f"suite contract {suite_id}: invalid runner")
        _validate_string_array(
            suite.get("argv"),
            "argv",
            f"suite contract {suite_id}",
            errors,
            nonempty=True,
        )
        _validate_string_array(
            suite.get("include"),
            "include",
            f"suite contract {suite_id}",
            errors,
            nonempty=True,
        )
        _validate_string_array(
            suite.get("exclude", []),
            "exclude",
            f"suite contract {suite_id}",
            errors,
            nonempty=False,
        )

        minimum = suite.get("minimumTests")
        if runner in {"node-test", "pytest"}:
            if (
                not isinstance(minimum, int)
                or isinstance(minimum, bool)
                or minimum < 1
            ):
                errors.append(
                    f"suite contract {suite_id}: minimumTests must be positive"
                )
        elif minimum is not None:
            errors.append(
                f"suite contract {suite_id}: command cannot set minimumTests"
            )

        allowed_skips = suite.get("allowedSkips", [])
        if not isinstance(allowed_skips, list) or not all(
            isinstance(item, dict)
            and set(item) == SKIP_KEYS
            and isinstance(item.get("id"), str)
            and item["id"]
            and item.get("classification") == "infrastructure_unavailable"
            and isinstance(item.get("service"), str)
            and item["service"]
            for item in allowed_skips
        ):
            errors.append(
                f"suite contract {suite_id}: allowedSkips must contain exact "
                "infrastructure skip records"
            )
        elif len({item["id"] for item in allowed_skips}) != len(allowed_skips):
            errors.append(
                f"suite contract {suite_id}: allowedSkips contains duplicate IDs"
            )

        readiness = suite.get("readiness")
        if classification == "optional-service":
            if not isinstance(readiness, dict):
                errors.append(
                    f"suite contract {suite_id}: optional suite requires readiness"
                )
            else:
                extra_readiness_keys = sorted(set(readiness) - READINESS_KEYS)
                if extra_readiness_keys:
                    errors.append(
                        f"suite contract {suite_id}: readiness has unsupported "
                        f"keys: {', '.join(extra_readiness_keys)}"
                    )
                service = readiness.get("service")
                present = readiness.get("environmentPresent", [])
                equals = readiness.get("environmentEquals", {})
                if not isinstance(service, str) or not service:
                    errors.append(
                        f"suite contract {suite_id}: readiness must name service"
                    )
                if not isinstance(present, list) or not all(
                    isinstance(item, str) and item for item in present
                ):
                    errors.append(
                        f"suite contract {suite_id}: readiness present "
                        "conditions must be strings"
                    )
                if not isinstance(equals, dict) or not all(
                    isinstance(key, str)
                    and key
                    and isinstance(value, str)
                    for key, value in equals.items()
                ):
                    errors.append(
                        f"suite contract {suite_id}: readiness equality "
                        "conditions must be strings"
                    )
                if not present and not equals:
                    errors.append(
                        f"suite contract {suite_id}: readiness needs a condition"
                    )
        elif readiness is not None:
            errors.append(
                f"suite contract {suite_id}: required suite cannot set readiness"
            )

        timeout = suite.get("timeoutSeconds")
        if (
            not isinstance(timeout, int)
            or isinstance(timeout, bool)
            or not MIN_TIMEOUT_SECONDS <= timeout <= MAX_TIMEOUT_SECONDS
        ):
            errors.append(
                f"suite contract {suite_id}: timeoutSeconds must be an integer "
                f"from {MIN_TIMEOUT_SECONDS} to {MAX_TIMEOUT_SECONDS}"
            )

    if required_valid and set(required_ids) != classified_required:
        errors.append(
            "suite contract: requiredSuiteIds do not match required suites"
        )
    if optional_valid and set(optional_ids) != classified_optional:
        errors.append(
            "suite contract: optionalSuiteIds do not match optional suites"
        )
    return errors


def _validate_manifest_contract(
    manifest: dict[str, Any], contract: dict[str, Any]
) -> list[str]:
    errors = validate_suite_contract(contract)
    if errors:
        return errors

    manifest_suites = manifest.get("suites")
    if not isinstance(manifest_suites, list):
        return errors
    actual_by_id = {
        suite.get("id"): suite
        for suite in manifest_suites
        if isinstance(suite, dict) and isinstance(suite.get("id"), str)
    }
    expected_by_id = {suite["id"]: suite for suite in contract["suites"]}
    actual_id_order = [
        suite.get("id")
        for suite in manifest_suites
        if isinstance(suite, dict) and isinstance(suite.get("id"), str)
    ]
    expected_id_order = [suite["id"] for suite in contract["suites"]]
    actual_ids = set(actual_id_order)
    expected_ids = set(expected_id_order)
    missing = sorted(expected_ids - actual_ids)
    extra = sorted(actual_ids - expected_ids)
    if missing:
        errors.append(
            f"suite contract: manifest removed suite IDs: {', '.join(missing)}"
        )
    if extra:
        errors.append(
            f"suite contract: manifest added suite IDs without a contract "
            f"change: {', '.join(extra)}"
        )
    if not missing and not extra and actual_id_order != expected_id_order:
        errors.append("suite contract: manifest suite order differs from baseline")

    manifest_required = manifest.get("requiredSuiteIds")
    if isinstance(manifest_required, list):
        if manifest_required != contract["requiredSuiteIds"]:
            errors.append(
                "suite contract: manifest requiredSuiteIds differs from baseline"
            )
    manifest_optional = [
        suite_id
        for suite_id in actual_id_order
        if actual_by_id[suite_id].get("classification") == "optional-service"
    ]
    if manifest_optional != contract["optionalSuiteIds"]:
        errors.append(
            "suite contract: manifest optional suite IDs differ from baseline"
        )

    for suite_id in sorted(actual_ids & expected_ids):
        actual = actual_by_id[suite_id]
        expected = expected_by_id[suite_id]
        actual_topology = {
            key: value
            for key, value in actual.items()
            if key != "inventorySha256"
        }
        actual_keys = set(actual_topology)
        expected_keys = set(expected)
        for key in sorted(actual_keys ^ expected_keys):
            errors.append(
                f"suite contract: {suite_id}.{key} presence differs from baseline"
            )
        for key in sorted(actual_keys & expected_keys):
            if actual_topology[key] != expected[key]:
                errors.append(
                    f"suite contract: {suite_id}.{key} differs from baseline"
                )
    return errors


def validate_manifest(
    manifest: dict[str, Any],
    repo_root: Path,
    contract: dict[str, Any] | None = None,
) -> list[str]:
    errors: list[str] = []
    if contract is None:
        default_contract_path = repo_root / "ci" / "suites-contract.json"
        if default_contract_path.is_file():
            try:
                contract = load_manifest(default_contract_path)
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                errors.append(f"suite contract cannot be loaded: {exc}")
    extra_manifest_keys = sorted(set(manifest) - MANIFEST_KEYS)
    if extra_manifest_keys:
        errors.append(f"manifest has unsupported keys: {', '.join(extra_manifest_keys)}")
    if manifest.get("schemaVersion") != SCHEMA_VERSION:
        errors.append(f"schemaVersion must be {SCHEMA_VERSION}")

    required_ids = manifest.get("requiredSuiteIds")
    required_ids_valid = _validate_string_array(
        required_ids, "requiredSuiteIds", "manifest", errors, nonempty=True
    )
    if required_ids_valid and len(required_ids) != len(set(required_ids)):
        errors.append("manifest: requiredSuiteIds contains duplicates")

    suites = manifest.get("suites")
    if not isinstance(suites, list) or not suites:
        errors.append("manifest: suites must be a non-empty array")
        return errors

    seen: set[str] = set()
    actual_required: set[str] = set()
    for position, suite in enumerate(suites):
        label = f"suites[{position}]"
        if not isinstance(suite, dict):
            errors.append(f"{label}: suite must be an object")
            continue
        suite_id = suite.get("id")
        if not isinstance(suite_id, str) or not SUITE_ID.fullmatch(suite_id):
            errors.append(f"{label}: id must match {SUITE_ID.pattern}")
            suite_id = label
        elif suite_id in seen:
            errors.append(f"{suite_id}: duplicate suite id")
        else:
            seen.add(suite_id)

        extra_suite_keys = sorted(set(suite) - SUITE_KEYS)
        if extra_suite_keys:
            errors.append(
                f"{suite_id}: unsupported keys: {', '.join(extra_suite_keys)}"
            )

        classification = suite.get("classification")
        if classification not in CLASSIFICATIONS:
            errors.append(
                f"{suite_id}: classification must be required or optional-service"
            )
        elif classification == "required":
            actual_required.add(suite_id)

        runner = suite.get("runner")
        if runner not in RUNNERS:
            errors.append(
                f"{suite_id}: runner must be one of {', '.join(sorted(RUNNERS))}"
            )
        _validate_string_array(
            suite.get("argv"), "argv", suite_id, errors, nonempty=True
        )
        timeout = suite.get("timeoutSeconds")
        if (
            not isinstance(timeout, int)
            or isinstance(timeout, bool)
            or not MIN_TIMEOUT_SECONDS <= timeout <= MAX_TIMEOUT_SECONDS
        ):
            errors.append(
                f"{suite_id}: timeoutSeconds must be an integer from "
                f"{MIN_TIMEOUT_SECONDS} to {MAX_TIMEOUT_SECONDS}"
            )

        include_valid = _validate_string_array(
            suite.get("include"), "include", suite_id, errors, nonempty=True
        )
        excludes = suite.get("exclude", [])
        exclude_valid = _validate_string_array(
            excludes, "exclude", suite_id, errors, nonempty=False
        )
        if include_valid and not all(
            _valid_relative_pattern(pattern) for pattern in suite["include"]
        ):
            errors.append(f"{suite_id}: include patterns must be repository-relative")
            include_valid = False
        if exclude_valid and not all(
            _valid_relative_pattern(pattern) for pattern in excludes
        ):
            errors.append(f"{suite_id}: exclude patterns must be repository-relative")
            exclude_valid = False

        if runner in {"node-test", "pytest"}:
            minimum = suite.get("minimumTests")
            if not isinstance(minimum, int) or isinstance(minimum, bool) or minimum < 1:
                errors.append(f"{suite_id}: minimumTests must be a positive integer")
        elif "minimumTests" in suite:
            errors.append(f"{suite_id}: command suites cannot declare minimumTests")

        allowed_skips = suite.get("allowedSkips", [])
        if not isinstance(allowed_skips, list):
            errors.append(f"{suite_id}: allowedSkips must be an array")
        else:
            skip_ids: set[str] = set()
            for skip in allowed_skips:
                if not isinstance(skip, dict):
                    errors.append(f"{suite_id}: allowed skip must be an object")
                    continue
                extra_skip_keys = sorted(set(skip) - SKIP_KEYS)
                if extra_skip_keys:
                    errors.append(
                        f"{suite_id}: allowed skip has unsupported keys: "
                        f"{', '.join(extra_skip_keys)}"
                    )
                skip_id = skip.get("id")
                if not isinstance(skip_id, str) or not skip_id:
                    errors.append(f"{suite_id}: allowed skip id must be non-empty")
                elif skip_id in skip_ids:
                    errors.append(f"{suite_id}: duplicate allowed skip id: {skip_id}")
                else:
                    skip_ids.add(skip_id)
                if skip.get("classification") != "infrastructure_unavailable":
                    errors.append(
                        f"{suite_id}: skip {skip_id!r} must be classified "
                        "infrastructure_unavailable"
                    )
                if not isinstance(skip.get("service"), str) or not skip["service"]:
                    errors.append(
                        f"{suite_id}: skip {skip_id!r} must name its service"
                    )

        readiness = suite.get("readiness")
        if classification == "optional-service":
            if not isinstance(readiness, dict):
                errors.append(f"{suite_id}: optional-service requires readiness")
            else:
                extra_readiness_keys = sorted(set(readiness) - READINESS_KEYS)
                if extra_readiness_keys:
                    errors.append(
                        f"{suite_id}: readiness has unsupported keys: "
                        f"{', '.join(extra_readiness_keys)}"
                    )
                if not isinstance(readiness.get("service"), str) or not readiness[
                    "service"
                ]:
                    errors.append(f"{suite_id}: readiness must name its service")
                present = readiness.get("environmentPresent", [])
                equals = readiness.get("environmentEquals", {})
                if not isinstance(present, list) or not all(
                    isinstance(item, str) and item for item in present
                ):
                    errors.append(
                        f"{suite_id}: readiness.environmentPresent must be a string array"
                    )
                if not isinstance(equals, dict) or not all(
                    isinstance(key, str)
                    and key
                    and isinstance(value, str)
                    for key, value in equals.items()
                ):
                    errors.append(
                        f"{suite_id}: readiness.environmentEquals must be a string map"
                    )
                if not present and not equals:
                    errors.append(
                        f"{suite_id}: readiness must declare an environment condition"
                    )
        elif readiness is not None:
            errors.append(f"{suite_id}: only optional-service may declare readiness")

        if include_valid and exclude_valid:
            files = discover_files(repo_root, suite)
            if not files:
                errors.append(f"{suite_id}: include/exclude patterns matched zero files")
            expected_digest = inventory_digest(files)
            actual_digest = suite.get("inventorySha256")
            if actual_digest != expected_digest:
                errors.append(
                    f"{suite_id}: stale inventorySha256; expected {expected_digest}"
                )
            if not isinstance(actual_digest, str) or not SHA256.fullmatch(
                actual_digest
            ):
                errors.append(f"{suite_id}: inventorySha256 must be sha256:<64 hex>")

    if required_ids_valid and set(required_ids) != actual_required:
        missing = sorted(set(required_ids) - actual_required)
        undeclared = sorted(actual_required - set(required_ids))
        detail = []
        if missing:
            detail.append(f"missing={','.join(missing)}")
        if undeclared:
            detail.append(f"undeclared={','.join(undeclared)}")
        errors.append(f"required suite ids do not match ({'; '.join(detail)})")
    if contract is not None:
        errors.extend(_validate_manifest_contract(manifest, contract))
    return errors


def parse_node_tap(output: str) -> tuple[TestCounts, list[str]]:
    matches = NODE_COUNT.findall(output)
    occurrences = Counter(name for name, _ in matches)
    invalid = sorted(
        name
        for name in ("tests", "pass", "fail", "skipped")
        if occurrences[name] != 1
    )
    if invalid:
        raise ValueError(
            "Node TAP summary must contain exactly one of each field; "
            f"invalid: {', '.join(invalid)}"
        )
    values = {name: int(value) for name, value in matches}
    accounted = values["pass"] + values["fail"] + values["skipped"]
    if accounted != values["tests"]:
        raise ValueError(
            "Node TAP summary does not reconcile "
            f"({accounted} accounted for {values['tests']} tests)"
        )
    skips = NODE_SKIP.findall(output)
    return (
        TestCounts(
            tests=values["tests"],
            passed=values["pass"],
            failed=values["fail"],
            skipped=values["skipped"],
        ),
        skips,
    )


def parse_junit(path: Path) -> tuple[TestCounts, list[str]]:
    root = ET.parse(path).getroot()
    testcases = list(root.iter("testcase"))
    skipped: list[str] = []
    failed = 0
    passed = 0
    for testcase in testcases:
        if testcase.find("skipped") is not None:
            skipped.append(
                f"{testcase.attrib.get('classname', '')}::"
                f"{testcase.attrib.get('name', '')}"
            )
        elif testcase.find("failure") is not None or testcase.find("error") is not None:
            failed += 1
        else:
            passed += 1
    return (
        TestCounts(
            tests=len(testcases),
            passed=passed,
            failed=failed,
            skipped=len(skipped),
        ),
        skipped,
    )


def assess_test_result(
    suite: dict[str, Any], counts: TestCounts, skip_ids: list[str]
) -> tuple[list[str], list[dict[str, str]]]:
    errors: list[str] = []
    if counts.tests < suite["minimumTests"]:
        if counts.tests == 0:
            errors.append(f"{suite['id']}: collected zero tests")
        else:
            errors.append(
                f"{suite['id']}: collected {counts.tests} tests below minimum "
                f"{suite['minimumTests']}"
            )
    if counts.failed:
        errors.append(f"{suite['id']}: {counts.failed} tests failed")
    accounted = counts.passed + counts.failed + counts.skipped
    if accounted != counts.tests:
        errors.append(
            f"{suite['id']}: result counts do not reconcile "
            f"({accounted} accounted for {counts.tests} tests)"
        )
    if counts.skipped != len(skip_ids):
        errors.append(
            f"{suite['id']}: parser found {len(skip_ids)} skip ids for "
            f"{counts.skipped} skipped tests"
        )

    allowed = {item["id"]: item for item in suite.get("allowedSkips", [])}
    duplicate_skips = sorted(
        skip_id
        for skip_id, count in Counter(skip_ids).items()
        if count > 1
    )
    if duplicate_skips:
        errors.append(
            f"{suite['id']}: duplicate observed skip ids: "
            f"{', '.join(duplicate_skips)}"
        )
    unexpected = sorted(set(skip_ids) - set(allowed))
    if unexpected:
        errors.append(f"{suite['id']}: unexpected skip ids: {', '.join(unexpected)}")
    unavailable = [
        {"id": skip_id, "service": allowed[skip_id]["service"]}
        for skip_id in dict.fromkeys(skip_ids)
        if skip_id in allowed
    ]
    return errors, unavailable


def _service_is_ready(readiness: dict[str, Any], env: dict[str, str]) -> bool:
    return all(env.get(name) for name in readiness.get("environmentPresent", [])) and all(
        env.get(name) == value
        for name, value in readiness.get("environmentEquals", {}).items()
    )


def _command_environment(repo_root: Path, env: dict[str, str]) -> dict[str, str]:
    result = dict(env)
    source_paths = [
        str(repo_root / "cli" / "src"),
        str(repo_root / "orchestrator-langgraph" / "src"),
    ]
    if result.get("PYTHONPATH"):
        source_paths.append(result["PYTHONPATH"])
    result["PYTHONPATH"] = os.pathsep.join(source_paths)
    return result


def _libc_function(name: str) -> Any:
    try:
        return getattr(_LIBC, name)
    except AttributeError as exc:
        raise ProcessCleanupError(
            f"Linux process containment requires libc {name}()"
        ) from exc


def _pidfd_open(process_id: int) -> int:
    """Open a CLOEXEC pidfd without relying on Python-version wrappers."""
    function = _libc_function("pidfd_open")
    function.restype = ctypes.c_int
    ctypes.set_errno(0)
    pidfd = function(ctypes.c_int(process_id), ctypes.c_uint(0))
    if pidfd < 0:
        error_number = ctypes.get_errno()
        raise OSError(
            error_number,
            f"pidfd_open({process_id}) failed: {os.strerror(error_number)}",
        )
    return pidfd


def _pidfd_send_signal(pidfd: int, signal_number: int) -> None:
    """Signal the process bound to pidfd, never a mutable numeric PID."""
    function = _libc_function("pidfd_send_signal")
    function.restype = ctypes.c_int
    ctypes.set_errno(0)
    result = function(
        ctypes.c_int(pidfd),
        ctypes.c_int(signal_number),
        ctypes.c_void_p(),
        ctypes.c_uint(0),
    )
    if result != 0:
        error_number = ctypes.get_errno()
        raise OSError(
            error_number,
            (
                f"pidfd_send_signal({pidfd}, {signal_number}) failed: "
                f"{os.strerror(error_number)}"
            ),
        )


def _get_child_subreaper() -> bool:
    function = _libc_function("prctl")
    function.restype = ctypes.c_int
    enabled = ctypes.c_int()
    ctypes.set_errno(0)
    result = function(
        ctypes.c_int(PR_GET_CHILD_SUBREAPER),
        ctypes.byref(enabled),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
    )
    if result != 0:
        error_number = ctypes.get_errno()
        raise ProcessCleanupError(
            f"PR_GET_CHILD_SUBREAPER failed: {os.strerror(error_number)}"
        )
    return bool(enabled.value)


def _set_child_subreaper(enabled: bool) -> None:
    function = _libc_function("prctl")
    function.restype = ctypes.c_int
    ctypes.set_errno(0)
    result = function(
        ctypes.c_int(PR_SET_CHILD_SUBREAPER),
        ctypes.c_ulong(int(enabled)),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
    )
    if result != 0:
        error_number = ctypes.get_errno()
        raise ProcessCleanupError(
            f"PR_SET_CHILD_SUBREAPER failed: {os.strerror(error_number)}"
        )


def _bind_process_handle(
    process_id: int,
    *,
    expected_identity: ProcessIdentity | None = None,
) -> ProcessHandle | None:
    """Bind one observed identity to a pidfd, rejecting discovery races."""
    before = _read_process_record(process_id)
    if before is None:
        return None
    if (
        expected_identity is not None
        and before.identity != expected_identity
    ):
        raise ProcessCleanupError(
            f"process identity changed while binding PID {process_id}"
        )
    try:
        pidfd = _pidfd_open(process_id)
    except ProcessLookupError:
        if _read_process_record(process_id) is None:
            return None
        raise ProcessCleanupError(
            f"process identity changed while binding PID {process_id}"
        )
    try:
        after = _read_process_record(process_id)
        if after is None:
            os.close(pidfd)
            return None
        if before.identity != after.identity:
            raise ProcessCleanupError(
                f"process identity changed while binding PID {process_id}"
            )
        return ProcessHandle(identity=after.identity, pidfd=pidfd)
    except BaseException:
        os.close(pidfd)
        raise


def _bind_root_process_handle(
    containment: ProcessContainment,
    process_id: int,
) -> ProcessHandle:
    """Bind and register the unreaped direct child immediately after spawn."""
    pidfd = _pidfd_open(process_id)
    provisional_identity = ProcessIdentity(
        pid=process_id,
        process_group=process_id,
        start_time=-1,
    )
    provisional_handle = ProcessHandle(
        identity=provisional_identity,
        pidfd=pidfd,
    )
    containment.root_handle = provisional_handle
    containment.handles[provisional_identity] = provisional_handle

    before = _read_process_record(process_id)
    if before is None:
        raise ProcessCleanupError(
            f"direct child {process_id} vanished while binding its pidfd"
        )
    after = _read_process_record(process_id)
    if after is None or before.identity != after.identity:
        raise ProcessCleanupError(
            f"direct child {process_id} changed while binding its pidfd"
        )
    handle = ProcessHandle(identity=after.identity, pidfd=pidfd)
    del containment.handles[provisional_identity]
    containment.root_handle = handle
    containment.handles[handle.identity] = handle
    return handle


def _signal_process_handle(
    handle: ProcessHandle, signal_number: int
) -> None:
    """Signal through the bound pidfd without a `/proc` check-to-use gap."""
    try:
        _pidfd_send_signal(handle.pidfd, signal_number)
    except ProcessLookupError:
        pass


def _process_handle_has_exited(handle: ProcessHandle) -> bool:
    try:
        poller = select.poll()
        poller.register(
            handle.pidfd,
            select.POLLIN | select.POLLHUP | select.POLLERR,
        )
        return bool(poller.poll(0))
    except (OSError, ValueError) as exc:
        raise ProcessCleanupError(
            f"cannot poll pidfd for PID {handle.identity.pid}"
        ) from exc


def _read_process_record(process_id: int) -> ProcessRecord | None:
    """Read one exact Linux identity, returning None only for a vanished PID."""
    try:
        raw_stat = Path(f"/proc/{process_id}/stat").read_text(encoding="utf-8")
    except (FileNotFoundError, ProcessLookupError):
        return None
    closing_parenthesis = raw_stat.rfind(")")
    fields = raw_stat[closing_parenthesis + 2 :].split()
    if closing_parenthesis <= 0 or len(fields) <= 19:
        raise ProcessCleanupError(
            f"cannot parse process identity for PID {process_id}"
        )
    return ProcessRecord(
        identity=ProcessIdentity(
            pid=process_id,
            process_group=int(fields[2]),
            start_time=int(fields[19]),
        ),
        parent_pid=int(fields[1]),
        state=fields[0],
    )


def _process_records(
    *,
    tolerated_unreadable_pids: frozenset[int] = frozenset(),
) -> dict[int, ProcessRecord]:
    """Take one direct `/proc` snapshot for identity-safe cleanup and proof."""
    proc_root = Path("/proc")
    if not proc_root.is_dir():
        raise ProcessCleanupError("/proc is required for owned-process cleanup")
    try:
        candidates = list(proc_root.iterdir())
    except BaseException as exc:
        raise ProcessCleanupError("cannot enumerate /proc") from exc

    records: dict[int, ProcessRecord] = {}
    for candidate in candidates:
        if not candidate.name.isdigit():
            continue
        process_id = int(candidate.name)
        try:
            record = _read_process_record(process_id)
        except (FileNotFoundError, ProcessLookupError):
            continue
        except (OSError, ValueError, ProcessCleanupError) as exc:
            if process_id in tolerated_unreadable_pids:
                continue
            raise ProcessCleanupError(
                f"cannot establish process identity for PID {process_id}"
            ) from exc
        if record is not None:
            records[process_id] = record
    return records


def _begin_process_containment() -> ProcessContainment:
    """Enable serial Linux subreaper containment before a command is spawned."""
    if signal.getsignal(signal.SIGCHLD) != signal.SIG_DFL:
        raise ProcessCleanupError(
            "process containment requires the default SIGCHLD disposition"
        )

    probe_pidfd: int | None = None
    try:
        probe_pidfd = _pidfd_open(os.getpid())
        _pidfd_send_signal(probe_pidfd, 0)
    except (OSError, ProcessCleanupError) as exc:
        raise ProcessCleanupError(
            "Linux pidfd support is required for process containment"
        ) from exc
    finally:
        if probe_pidfd is not None:
            os.close(probe_pidfd)

    records = _process_records()
    parent_pid = os.getpid()
    baseline_children = {
        record.identity
        for record in records.values()
        if record.parent_pid == parent_pid
    }
    if baseline_children:
        raise ProcessCleanupError(
            "process containment requires no pre-existing direct child"
        )
    previous_subreaper = _get_child_subreaper()
    changed = False
    try:
        if not previous_subreaper:
            _set_child_subreaper(True)
            changed = True
        if not _get_child_subreaper():
            raise ProcessCleanupError(
                "PR_SET_CHILD_SUBREAPER did not enable containment"
            )
    except BaseException:
        if changed:
            _set_child_subreaper(previous_subreaper)
        raise
    return ProcessContainment(
        parent_pid=parent_pid,
        previous_subreaper=previous_subreaper,
        baseline_children=baseline_children,
    )


def _owned_process_records(
    containment: ProcessContainment,
    records: dict[int, ProcessRecord],
) -> dict[int, ProcessRecord]:
    """Find known trees and newly adopted children from one `/proc` snapshot."""
    owned_ids = {
        process_id
        for process_id, record in records.items()
        if (
            record.parent_pid == containment.parent_pid
            and record.identity not in containment.baseline_children
        )
    }
    root_handle = containment.root_handle
    if (
        root_handle is not None
        and root_handle.identity.start_time == -1
        and not containment.root_reaped
    ):
        # This PID cannot be reused while the pidfd-bound direct child remains
        # unreaped. It is only an ancestry anchor; signals still use the pidfd.
        owned_ids.add(root_handle.identity.pid)
    owned_ids.update(
        identity.pid
        for identity in containment.handles
        if (
            identity.pid in records
            and records[identity.pid].identity == identity
        )
    )
    changed = True
    while changed:
        changed = False
        for process_id, record in records.items():
            if record.parent_pid in owned_ids and process_id not in owned_ids:
                owned_ids.add(process_id)
                changed = True
    return {
        process_id: records[process_id]
        for process_id in owned_ids
        if process_id in records
    }


def _discover_process_handles(
    containment: ProcessContainment,
) -> int:
    """Bind every newly observed owned identity before it can be signalled."""
    root_handle = containment.root_handle
    tolerated_unreadable_pids = (
        frozenset({root_handle.identity.pid})
        if (
            root_handle is not None
            and root_handle.identity.start_time == -1
            and not containment.root_reaped
        )
        else frozenset()
    )
    records = _process_records(
        tolerated_unreadable_pids=tolerated_unreadable_pids,
    )
    owned_records = _owned_process_records(containment, records)
    discovered = 0
    if (
        root_handle is not None
        and root_handle.identity.start_time == -1
        and root_handle.identity.pid in owned_records
    ):
        root_record = owned_records[root_handle.identity.pid]
        promoted_root = ProcessHandle(
            identity=root_record.identity,
            pidfd=root_handle.pidfd,
        )
        del containment.handles[root_handle.identity]
        containment.handles[promoted_root.identity] = promoted_root
        containment.root_handle = promoted_root

    for process_id in sorted(owned_records):
        record = owned_records[process_id]
        if record.identity in containment.handles:
            continue
        handle = _bind_process_handle(
            process_id,
            expected_identity=record.identity,
        )
        if handle is None:
            continue
        containment.handles[handle.identity] = handle
        discovered += 1
    return discovered


def _set_root_returncode(
    process: subprocess.Popen[bytes],
    result: os.waitid_result,
) -> None:
    returncode = (
        result.si_status
        if result.si_code == os.CLD_EXITED
        else -result.si_status
    )
    try:
        process.returncode = returncode
    except BaseException:
        pass
    wrapped_process = getattr(process, "_process", None)
    if wrapped_process is not None:
        try:
            wrapped_process.returncode = returncode
        except BaseException:
            pass


def _reap_owned_children(
    containment: ProcessContainment,
    process: subprocess.Popen[bytes] | None,
) -> None:
    """Reap only children addressed through their stable pidfds."""
    for handle in tuple(containment.handles.values()):
        is_provisional_root = (
            containment.root_handle == handle
            and handle.identity.start_time == -1
            and not containment.root_reaped
        )
        options = os.WEXITED | os.WNOHANG
        if is_provisional_root:
            options |= os.WNOWAIT
        try:
            result = os.waitid(
                P_PIDFD,
                handle.pidfd,
                options,
            )
        except ChildProcessError:
            if containment.root_handle == handle:
                containment.root_reaped = True
            continue
        except OSError as exc:
            raise ProcessCleanupError(
                f"cannot reap owned PID {handle.identity.pid} through pidfd"
            ) from exc
        if (
            result is not None
            and process is not None
            and containment.root_handle == handle
        ):
            if not is_provisional_root:
                containment.root_reaped = True
            _set_root_returncode(process, result)


def _reap_provisional_root(
    containment: ProcessContainment,
    process: subprocess.Popen[bytes] | None,
) -> None:
    handle = containment.root_handle
    if (
        handle is None
        or handle.identity.start_time != -1
        or containment.root_reaped
    ):
        return
    try:
        result = os.waitid(P_PIDFD, handle.pidfd, os.WEXITED)
    except ChildProcessError:
        containment.root_reaped = True
        return
    except OSError as exc:
        raise ProcessCleanupError(
            f"cannot reap owned PID {handle.identity.pid} through pidfd"
        ) from exc
    containment.root_reaped = True
    if result is not None and process is not None:
        _set_root_returncode(process, result)


def _containment_is_absent(
    containment: ProcessContainment,
) -> bool:
    root_handle = containment.root_handle
    tolerated_unreadable_pids = (
        frozenset({root_handle.identity.pid})
        if (
            root_handle is not None
            and root_handle.identity.start_time == -1
            and not containment.root_reaped
        )
        else frozenset()
    )
    records = _process_records(
        tolerated_unreadable_pids=tolerated_unreadable_pids,
    )
    if _owned_process_records(containment, records):
        return False
    return all(
        _process_handle_has_exited(handle)
        for handle in containment.handles.values()
    )


def _await_containment_quiescence(
    containment: ProcessContainment,
    process: subprocess.Popen[bytes] | None,
    *,
    deadline: float,
    signal_number: int | None,
) -> bool:
    """Rescan to a two-pass fixed point, optionally signalling each new pidfd."""
    quiet_scans = 0
    signalled: set[ProcessIdentity] = set()
    while True:
        discovered = _discover_process_handles(containment)
        if signal_number is not None:
            for identity, handle in tuple(containment.handles.items()):
                if identity in signalled or _process_handle_has_exited(handle):
                    continue
                _signal_process_handle(handle, signal_number)
                signalled.add(identity)
        _reap_owned_children(containment, process)
        absent = _containment_is_absent(containment)
        if absent and discovered == 0:
            quiet_scans += 1
            if quiet_scans >= QUIESCENT_SCANS_REQUIRED:
                _reap_provisional_root(containment, process)
                containment.quiescent = True
                return True
        else:
            quiet_scans = 0
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.02)


def _close_process_containment(
    containment: ProcessContainment,
) -> None:
    """Close every pidfd and restore subreaper state only after proof."""
    errors: list[BaseException] = []
    for handle in tuple(containment.handles.values()):
        try:
            os.close(handle.pidfd)
        except OSError as exc:
            errors.append(exc)
    containment.handles.clear()

    if containment.quiescent:
        try:
            if _get_child_subreaper() != containment.previous_subreaper:
                _set_child_subreaper(containment.previous_subreaper)
            if _get_child_subreaper() != containment.previous_subreaper:
                raise ProcessCleanupError(
                    "could not restore the caller's subreaper state"
                )
        except BaseException as exc:
            errors.append(exc)
    else:
        errors.append(
            ProcessCleanupError(
                "owned process containment was not proven quiescent"
            )
        )
    if errors:
        raise ProcessCleanupError(
            "could not close process containment cleanly"
        ) from errors[0]


def _signal_unreaped_direct_child(
    containment: ProcessContainment,
    process_id: int,
    parent_pid: int,
    signal_number: int,
) -> None:
    """Narrow fallback for a verified, unreaped child of the fresh helper."""
    if parent_pid != containment.parent_pid:
        raise ProcessCleanupError(
            f"PID {process_id} is not a direct supervisor child"
        )
    function = _libc_function("kill")
    function.restype = ctypes.c_int
    ctypes.set_errno(0)
    result = function(
        ctypes.c_int(process_id),
        ctypes.c_int(signal_number),
    )
    if result != 0:
        error_number = ctypes.get_errno()
        if error_number == errno.ESRCH:
            return
        raise ProcessCleanupError(
            (
                f"cannot signal unreaped direct child {process_id}: "
                f"{os.strerror(error_number)}"
            )
        )


def _reap_unbound_direct_child(
    containment: ProcessContainment,
    process: subprocess.Popen[bytes],
    process_id: int,
) -> None:
    try:
        result = os.waitid(
            os.P_PID,
            process_id,
            os.WEXITED | os.WNOHANG,
        )
    except ChildProcessError:
        return
    except OSError as exc:
        raise ProcessCleanupError(
            f"cannot reap direct child PID {process_id}"
        ) from exc
    if result is None:
        return
    if process_id == containment.root_process_id:
        containment.root_reaped = True
        _set_root_returncode(process, result)


def _await_unbound_domain_quiescence(
    containment: ProcessContainment,
    process: subprocess.Popen[bytes],
    *,
    deadline: float,
    signal_number: int,
) -> bool:
    """Signal only exact direct/adopted children until the helper is childless."""
    quiet_scans = 0
    while True:
        root_process_id = containment.root_process_id
        root_is_unreaped = (
            root_process_id is not None and not containment.root_reaped
        )
        records = _process_records(
            tolerated_unreadable_pids=(
                frozenset({root_process_id})
                if root_is_unreaped
                else frozenset()
            ),
        )
        direct_children = {
            process_id: record
            for process_id, record in records.items()
            if record.parent_pid == containment.parent_pid
        }
        if root_is_unreaped:
            # Popen created this exact direct child and nothing has waited for
            # it, so its numeric PID cannot be reused even if stat is opaque.
            _signal_unreaped_direct_child(
                containment,
                root_process_id,
                containment.parent_pid,
                signal_number,
            )
            _reap_unbound_direct_child(
                containment,
                process,
                root_process_id,
            )
        for process_id, record in direct_children.items():
            if process_id == root_process_id:
                continue
            _signal_unreaped_direct_child(
                containment,
                process_id,
                record.parent_pid,
                signal_number,
            )
            _reap_unbound_direct_child(
                containment,
                process,
                process_id,
            )
        if direct_children or not containment.root_reaped:
            quiet_scans = 0
        else:
            quiet_scans += 1
            if quiet_scans >= QUIESCENT_SCANS_REQUIRED:
                containment.quiescent = True
                return True
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.02)


def _drain_process_pipes(
    process: subprocess.Popen[bytes],
) -> tuple[bytes, bytes]:
    stdout = b""
    stderr = b""
    try:
        stdout, stderr = process.communicate(timeout=0.2)
    except BaseException as exc:
        stdout = getattr(exc, "output", None) or b""
        stderr = getattr(exc, "stderr", None) or b""
        for stream in (process.stdout, process.stderr):
            if stream is not None:
                try:
                    stream.close()
                except BaseException:
                    pass
    return stdout or b"", stderr or b""


def _terminate_unbound_process_domain(
    process: subprocess.Popen[bytes],
    containment: ProcessContainment,
) -> tuple[bytes, bytes]:
    """Clean a pidfd-less root using only fresh-helper direct-child authority."""
    terminated = _await_unbound_domain_quiescence(
        containment,
        process,
        deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
        signal_number=signal.SIGTERM,
    )
    if not terminated:
        killed = _await_unbound_domain_quiescence(
            containment,
            process,
            deadline=time.monotonic() + KILL_REAP_SECONDS,
            signal_number=signal.SIGKILL,
        )
        if not killed:
            raise ProcessCleanupError(
                "unbound direct-child domain survived bounded cleanup"
            )
    return _drain_process_pipes(process)


def _terminate_process_domain(
    process: subprocess.Popen[bytes],
    containment: ProcessContainment,
) -> tuple[bytes, bytes]:
    """Terminate the complete subreaper domain through pidfds and prove absence."""
    terminated = _await_containment_quiescence(
        containment,
        process,
        deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
        signal_number=signal.SIGTERM,
    )
    if not terminated:
        killed = _await_containment_quiescence(
            containment,
            process,
            deadline=time.monotonic() + KILL_REAP_SECONDS,
            signal_number=signal.SIGKILL,
        )
        if not killed:
            raise ProcessCleanupError(
                "owned process domain survived bounded pidfd cleanup"
            )

    return _drain_process_pipes(process)


def _receive_exact(
    channel: socket.socket,
    size: int,
    *,
    allow_initial_eof: bool = False,
) -> bytes | None:
    chunks: list[bytes] = []
    remaining = size
    while remaining:
        chunk = channel.recv(remaining)
        if not chunk:
            if allow_initial_eof and not chunks:
                return None
            raise ProcessCleanupError("truncated supervisor protocol frame")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def _receive_supervisor_frame(
    channel: socket.socket,
    *,
    allow_eof: bool = False,
) -> dict[str, Any] | None:
    header = _receive_exact(
        channel,
        4,
        allow_initial_eof=allow_eof,
    )
    if header is None:
        return None
    (length,) = struct.unpack("!I", header)
    if length <= 0 or length > SUPERVISOR_MAX_FRAME_BYTES:
        raise ProcessCleanupError("invalid supervisor protocol frame size")
    payload = _receive_exact(channel, length)
    if payload is None:
        raise ProcessCleanupError("missing supervisor protocol payload")
    try:
        frame = json.loads(payload)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProcessCleanupError("invalid supervisor protocol JSON") from exc
    if not isinstance(frame, dict):
        raise ProcessCleanupError("supervisor protocol frame must be an object")
    return frame


def _send_supervisor_frame(
    channel: socket.socket,
    frame: dict[str, Any],
) -> None:
    payload = json.dumps(
        frame,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    if not payload or len(payload) > SUPERVISOR_MAX_FRAME_BYTES:
        raise ProcessCleanupError("supervisor protocol frame exceeds limit")
    channel.sendall(struct.pack("!I", len(payload)) + payload)


def _validate_supervisor_frame(
    frame: dict[str, Any],
    *,
    frame_type: str,
    keys: set[str],
) -> None:
    if set(frame) != keys:
        raise ProcessCleanupError(
            f"invalid {frame_type} supervisor protocol fields"
        )
    if (
        frame.get("version") != SUPERVISOR_PROTOCOL_VERSION
        or frame.get("type") != frame_type
    ):
        raise ProcessCleanupError(
            f"invalid {frame_type} supervisor protocol frame"
        )


def _command_outcome_frame(
    request_id: str,
    outcome: CommandOutcome,
    containment: ProcessContainment,
) -> dict[str, Any]:
    return {
        "version": SUPERVISOR_PROTOCOL_VERSION,
        "type": "result",
        "requestId": request_id,
        "status": outcome.status,
        "returncode": outcome.returncode,
        "signalNumber": outcome.signal_number,
        "stdout": base64.b64encode(outcome.stdout).decode("ascii"),
        "stderr": base64.b64encode(outcome.stderr).decode("ascii"),
        "cleanup": {
            "quiescent": containment.quiescent,
            "rootReaped": containment.root_reaped,
            "subreaperRestored": (
                _get_child_subreaper()
                == containment.previous_subreaper
            ),
            "openPidfds": len(containment.handles),
        },
    }


def _decode_command_outcome(
    frame: dict[str, Any],
    request_id: str,
) -> CommandOutcome:
    _validate_supervisor_frame(
        frame,
        frame_type="result",
        keys={
            "version",
            "type",
            "requestId",
            "status",
            "returncode",
            "signalNumber",
            "stdout",
            "stderr",
            "cleanup",
        },
    )
    if frame["requestId"] != request_id:
        raise ProcessCleanupError("supervisor result request ID mismatch")
    cleanup = frame["cleanup"]
    if cleanup != {
        "quiescent": True,
        "rootReaped": True,
        "subreaperRestored": True,
        "openPidfds": 0,
    }:
        raise ProcessCleanupError("supervisor result lacks cleanup proof")
    if (
        not isinstance(frame["returncode"], int)
        or isinstance(frame["returncode"], bool)
        or frame["status"]
        not in {
            "completed",
            "timed_out",
            "cancelled",
            "process_tree_leak",
        }
        or (
            frame["signalNumber"] is not None
            and frame["signalNumber"] not in HANDLED_SIGNALS
        )
        or not isinstance(frame["stdout"], str)
        or not isinstance(frame["stderr"], str)
    ):
        raise ProcessCleanupError("invalid supervisor command outcome")
    try:
        stdout = base64.b64decode(frame["stdout"], validate=True)
        stderr = base64.b64decode(frame["stderr"], validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ProcessCleanupError("invalid supervisor output bytes") from exc
    return CommandOutcome(
        returncode=frame["returncode"],
        stdout=stdout,
        stderr=stderr,
        status=frame["status"],
        signal_number=frame["signalNumber"],
    )


def _wait_pidfd_child(
    process: subprocess.Popen[bytes],
    pidfd: int,
    *,
    timeout_seconds: float,
) -> bool:
    poller = select.poll()
    poller.register(pidfd, select.POLLIN | select.POLLHUP | select.POLLERR)
    if not poller.poll(max(0, round(timeout_seconds * 1000))):
        return False
    try:
        result = os.waitid(P_PIDFD, pidfd, os.WEXITED)
    except ChildProcessError:
        return process.returncode is not None
    except OSError as exc:
        raise ProcessCleanupError("cannot reap suite supervisor") from exc
    if result is not None:
        _set_root_returncode(process, result)
    return True


def _wait_direct_helper(
    process: subprocess.Popen[bytes],
    *,
    timeout_seconds: float,
) -> bool:
    try:
        process.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        return False
    except ChildProcessError as exc:
        if process.returncode is None:
            raise ProcessCleanupError(
                "cannot reap exact suite supervisor child"
            ) from exc
    return True


def _wait_suite_supervisor(
    process: subprocess.Popen[bytes],
    pidfd: int | None,
    *,
    timeout_seconds: float,
) -> bool:
    if pidfd is None:
        return _wait_direct_helper(
            process,
            timeout_seconds=timeout_seconds,
        )
    return _wait_pidfd_child(
        process,
        pidfd,
        timeout_seconds=timeout_seconds,
    )


def _signal_suite_supervisor(
    process: subprocess.Popen[bytes],
    pidfd: int | None,
    signal_number: int,
) -> None:
    try:
        if pidfd is not None:
            _pidfd_send_signal(pidfd, signal_number)
        elif signal_number == signal.SIGTERM:
            # An unreaped direct child retains its exact PID identity. Popen is
            # the only safe fallback authority before a helper pidfd exists.
            process.terminate()
        else:
            process.send_signal(signal.SIGKILL)
    except ProcessLookupError:
        pass
    except OSError as exc:
        raise ProcessCleanupError(
            "cannot signal suite supervisor during cleanup"
        ) from exc


def _shutdown_suite_supervisor(
    process: subprocess.Popen[bytes],
    pidfd: int | None,
) -> None:
    if process.returncode is not None:
        return
    if _wait_suite_supervisor(
        process,
        pidfd,
        timeout_seconds=SUPERVISOR_EXIT_SECONDS,
    ):
        return

    _signal_suite_supervisor(process, pidfd, signal.SIGTERM)
    if _wait_suite_supervisor(
        process,
        pidfd,
        timeout_seconds=TERMINATION_GRACE_SECONDS,
    ):
        return

    _signal_suite_supervisor(process, pidfd, signal.SIGKILL)
    if not _wait_suite_supervisor(
        process,
        pidfd,
        timeout_seconds=KILL_REAP_SECONDS,
    ):
        raise ProcessCleanupError(
            "suite supervisor survived bounded TERM/KILL cleanup"
        )


def _close_supervisor_channel(channel: socket.socket) -> None:
    try:
        channel.shutdown(socket.SHUT_RDWR)
    except OSError:
        pass
    try:
        channel.close()
    except OSError:
        pass


def _close_suite_supervisor_pidfd(pidfd: int) -> None:
    """Close once; after any error the numeric descriptor may be reusable."""
    try:
        os.close(pidfd)
    except OSError as exc:
        raise ProcessCleanupError(
            "cannot close suite supervisor pidfd"
        ) from exc


def _receive_supervisor_terminal(
    channel: socket.socket,
    helper_pidfd: int,
) -> dict[str, Any]:
    while True:
        try:
            frame = _receive_supervisor_frame(channel)
        except GateCancelled as exc:
            _pidfd_send_signal(helper_pidfd, exc.signal_number)
            continue
        if frame is None:
            raise ProcessCleanupError("supervisor exited without a result")
        return frame


def _execute_command_via_supervisor(
    argv: list[str],
    repo_root: Path,
    env: dict[str, str],
    timeout_seconds: int,
    *,
    after_ready: Any = None,
) -> CommandOutcome:
    parent_channel, child_channel = socket.socketpair(
        socket.AF_UNIX,
        socket.SOCK_STREAM,
    )
    helper: subprocess.Popen[bytes] | None = None
    helper_pidfd: int | None = None
    request_id = os.urandom(16).hex()
    try:
        helper = subprocess.Popen(
            [
                sys.executable,
                str(Path(__file__).resolve()),
                "--_suite-supervisor-fd",
                str(child_channel.fileno()),
            ],
            cwd=repo_root,
            env=env,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=False,
            start_new_session=True,
            pass_fds=(child_channel.fileno(),),
        )
        child_channel.close()
        try:
            helper_pidfd = _pidfd_open(helper.pid)
        except BaseException as exc:
            _close_supervisor_channel(parent_channel)
            _shutdown_suite_supervisor(helper, None)
            raise ProcessCleanupError(
                "cannot acquire suite supervisor pidfd"
            ) from exc

        ready = _receive_supervisor_frame(parent_channel)
        if ready is None:
            raise ProcessCleanupError("suite supervisor did not become ready")
        _validate_supervisor_frame(
            ready,
            frame_type="ready",
            keys={"version", "type"},
        )
        if after_ready is not None:
            after_ready()

        _send_supervisor_frame(
            parent_channel,
            {
                "version": SUPERVISOR_PROTOCOL_VERSION,
                "type": "run",
                "requestId": request_id,
                "argv": argv,
                "cwd": str(repo_root),
                "timeoutSeconds": timeout_seconds,
            },
        )
        frame = _receive_supervisor_terminal(
            parent_channel,
            helper_pidfd,
        )
        frame_type = frame.get("type")
        expected_helper_returncode = {
            "result": 0,
            "error": 0,
            "fatal": 4,
        }.get(frame_type)
        if expected_helper_returncode is None:
            raise ProcessCleanupError(
                "invalid supervisor terminal frame type"
            )
        if not _wait_pidfd_child(
            helper,
            helper_pidfd,
            timeout_seconds=SUPERVISOR_EXIT_SECONDS,
        ):
            raise ProcessCleanupError("suite supervisor did not exit")
        if helper.returncode != expected_helper_returncode:
            raise ProcessCleanupError(
                "suite supervisor exit status does not match terminal frame"
            )

        if frame_type == "fatal":
            _validate_supervisor_frame(
                frame,
                frame_type="fatal",
                keys={
                    "version",
                    "type",
                    "requestId",
                    "message",
                },
            )
            if (
                frame["requestId"] != request_id
                or not isinstance(frame["message"], str)
                or not frame["message"]
            ):
                raise ProcessCleanupError(
                    "invalid supervisor fatal outcome"
                )
            raise ProcessCleanupError(
                frame["message"]
            )
        if frame_type == "error":
            _validate_supervisor_frame(
                frame,
                frame_type="error",
                keys={
                    "version",
                    "type",
                    "requestId",
                    "errno",
                    "message",
                },
            )
            if frame["requestId"] != request_id:
                raise ProcessCleanupError(
                    "supervisor error request ID mismatch"
                )
            if (
                not isinstance(frame["errno"], int)
                or isinstance(frame["errno"], bool)
                or not isinstance(frame["message"], str)
                or not frame["message"]
            ):
                raise ProcessCleanupError(
                    "invalid supervisor execution error"
                )
            raise OSError(frame["errno"], frame["message"])
        outcome = _decode_command_outcome(frame, request_id)
        return outcome
    finally:
        _close_supervisor_channel(parent_channel)
        _close_supervisor_channel(child_channel)
        if helper is not None:
            if helper_pidfd is None:
                if helper.returncode is None:
                    _shutdown_suite_supervisor(helper, None)
            else:
                try:
                    if helper.returncode is None:
                        _shutdown_suite_supervisor(helper, helper_pidfd)
                finally:
                    _close_suite_supervisor_pidfd(helper_pidfd)


def _execute_command(
    argv: list[str],
    repo_root: Path,
    env: dict[str, str],
    timeout_seconds: int,
    *,
    _after_supervisor_ready: Any = None,
) -> CommandOutcome:
    if not _PROCESS_CONTAINMENT_LOCK.acquire(blocking=False):
        raise ProcessCleanupError(
            "serial process containment is already active"
        )
    try:
        return _execute_command_via_supervisor(
            argv,
            repo_root,
            env,
            timeout_seconds,
            after_ready=_after_supervisor_ready,
        )
    finally:
        _PROCESS_CONTAINMENT_LOCK.release()


def _execute_command_serial(
    argv: list[str],
    repo_root: Path,
    env: dict[str, str],
    timeout_seconds: int,
    *,
    containment: ProcessContainment | None = None,
) -> CommandOutcome:
    containment = containment or _begin_process_containment()
    process: subprocess.Popen[bytes] | None = None
    try:
        try:
            process = subprocess.Popen(
                argv,
                cwd=repo_root,
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False,
                start_new_session=True,
            )
            containment.root_process_id = process.pid
        except BaseException:
            _await_containment_quiescence(
                containment,
                None,
                deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
                signal_number=None,
            )
            raise

        try:
            try:
                _bind_root_process_handle(containment, process.pid)
            except OSError:
                if containment.root_handle is not None:
                    raise
                _bind_root_process_handle(containment, process.pid)
        except BaseException as bind_error:
            # The direct child cannot be reused while it remains unreaped.
            # If post-open validation fails, its already-registered pidfd is
            # still the safe cleanup authority.
            if containment.handles:
                _terminate_process_domain(process, containment)
            else:
                _terminate_unbound_process_domain(process, containment)
                raise ProcessCleanupError(
                    "root pidfd acquisition failed after spawn"
                ) from bind_error
            raise

        try:
            stdout, stderr = process.communicate(timeout=timeout_seconds)
        except subprocess.TimeoutExpired:
            stdout, stderr = _terminate_process_domain(process, containment)
            return CommandOutcome(
                returncode=process.returncode
                if process.returncode is not None
                else -signal.SIGKILL,
                stdout=stdout,
                stderr=stderr,
                status="timed_out",
            )
        except GateCancelled as exc:
            stdout, stderr = _terminate_process_domain(process, containment)
            return CommandOutcome(
                returncode=process.returncode
                if process.returncode is not None
                else -signal.SIGKILL,
                stdout=stdout,
                stderr=stderr,
                status="cancelled",
                signal_number=exc.signal_number,
            )
        except BaseException:
            _terminate_process_domain(process, containment)
            raise

        completed_with_only_root = len(containment.handles) == 1
        quiet = _await_containment_quiescence(
            containment,
            process,
            deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
            signal_number=None,
        )
        leaked = (
            not completed_with_only_root
            or len(containment.handles) != 1
            or not quiet
        )
        if leaked:
            if not quiet:
                _terminate_process_domain(process, containment)
            return CommandOutcome(
                returncode=process.returncode,
                stdout=stdout or b"",
                stderr=stderr or b"",
                status="process_tree_leak",
            )
        return CommandOutcome(
            returncode=process.returncode
            if process.returncode is not None
            else 0,
            stdout=stdout or b"",
            stderr=stderr or b"",
            status="completed",
        )
    finally:
        _close_process_containment(containment)


def _decode_output(
    suite_id: str, stream_name: str, output: bytes
) -> tuple[str, str | None]:
    try:
        return output.decode("utf-8"), None
    except UnicodeDecodeError as exc:
        decoded = output.decode("utf-8", errors="backslashreplace")
        return (
            decoded,
            f"{suite_id}: non-UTF-8 {stream_name} at byte {exc.start}",
        )


def _emit_command_output(suite_id: str, stdout: str, stderr: str) -> None:
    sys.stderr.write(f"==> {suite_id}\n")
    if stdout:
        sys.stderr.write(stdout)
        if not stdout.endswith("\n"):
            sys.stderr.write("\n")
    if stderr:
        sys.stderr.write(stderr)
        if not stderr.endswith("\n"):
            sys.stderr.write("\n")


def _run_suite(
    suite: dict[str, Any],
    repo_root: Path,
    env: dict[str, str],
) -> dict[str, Any]:
    if suite["classification"] == "optional-service" and not _service_is_ready(
        suite["readiness"], env
    ):
        return {
            "id": suite["id"],
            "classification": suite["classification"],
            "status": "infrastructure_unavailable",
            "service": suite["readiness"]["service"],
            "counts": asdict(TestCounts(0, 0, 0, 0)),
            "infrastructureUnavailable": [],
            "errors": [],
        }

    files = discover_files(repo_root, suite)
    argv = list(suite["argv"])
    junit_path: Path | None = None
    tempdir: tempfile.TemporaryDirectory[str] | None = None
    if suite["runner"] == "node-test":
        argv.extend(files)
    elif suite["runner"] == "pytest":
        tempdir = tempfile.TemporaryDirectory(prefix="agents-ci-junit-")
        junit_path = Path(tempdir.name) / "results.xml"
        argv.extend(files)
        argv.append(f"--junitxml={junit_path}")

    try:
        completed = _execute_command(
            argv,
            repo_root,
            _command_environment(repo_root, env),
            suite["timeoutSeconds"],
        )
    except ProcessCleanupError:
        if tempdir:
            tempdir.cleanup()
        raise
    except OSError as exc:
        if tempdir:
            tempdir.cleanup()
        return {
            "id": suite["id"],
            "classification": suite["classification"],
            "status": "failed",
            "counts": asdict(TestCounts(1, 0, 1, 0)),
            "infrastructureUnavailable": [],
            "errors": [f"{suite['id']}: cannot execute {argv[0]!r}: {exc}"],
        }

    stdout, stdout_error = _decode_output(
        suite["id"], "stdout", completed.stdout
    )
    stderr, stderr_error = _decode_output(
        suite["id"], "stderr", completed.stderr
    )
    _emit_command_output(suite["id"], stdout, stderr)
    errors = [
        error for error in (stdout_error, stderr_error) if error is not None
    ]
    unavailable: list[dict[str, str]] = []
    if completed.status == "timed_out":
        counts = TestCounts(tests=1, passed=0, failed=1, skipped=0)
        errors.append(
            f"{suite['id']}: command timed out after "
            f"{suite['timeoutSeconds']} seconds"
        )
    elif completed.status == "cancelled":
        counts = TestCounts(tests=1, passed=0, failed=1, skipped=0)
        signal_name = signal.Signals(completed.signal_number).name
        errors.append(f"{suite['id']}: gate cancelled by {signal_name}")
    elif completed.status == "process_tree_leak":
        counts = TestCounts(tests=1, passed=0, failed=1, skipped=0)
        errors.append(
            f"{suite['id']}: command left processes in its owned process group"
        )
    elif suite["runner"] == "command":
        command_failed = completed.returncode != 0 or bool(errors)
        counts = TestCounts(
            tests=1,
            passed=int(not command_failed),
            failed=int(command_failed),
            skipped=0,
        )
    else:
        try:
            if suite["runner"] == "node-test":
                counts, skips = parse_node_tap(stdout + stderr)
            else:
                if junit_path is None or not junit_path.is_file():
                    raise ValueError("pytest did not produce JUnit XML")
                counts, skips = parse_junit(junit_path)
            assessment_errors, unavailable = assess_test_result(
                suite, counts, skips
            )
            errors.extend(assessment_errors)
        except (ET.ParseError, OSError, ValueError) as exc:
            counts = TestCounts(tests=0, passed=0, failed=1, skipped=0)
            errors.append(f"{suite['id']}: cannot account for test results: {exc}")
    if tempdir:
        tempdir.cleanup()
    if completed.status == "completed" and completed.returncode != 0:
        errors.append(
            f"{suite['id']}: command exited with status {completed.returncode}"
        )

    if completed.status == "cancelled":
        status = "cancelled"
    elif completed.status == "timed_out":
        status = "timed_out"
    elif errors:
        status = "failed"
    elif unavailable:
        status = "infrastructure_unavailable"
    else:
        status = "passed"
    return {
        "id": suite["id"],
        "classification": suite["classification"],
        "status": status,
        "counts": asdict(counts),
        "infrastructureUnavailable": unavailable,
        "errors": errors,
        **(
            {"signal": signal.Signals(completed.signal_number).name}
            if completed.signal_number is not None
            else {}
        ),
        **(
            {"timeoutSeconds": suite["timeoutSeconds"]}
            if completed.status == "timed_out"
            else {}
        ),
    }


def run_gate(
    repo_root: Path,
    manifest: dict[str, Any],
    env: dict[str, str] | None = None,
    contract: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], int]:
    errors = validate_manifest(manifest, repo_root, contract)
    if errors:
        return (
            {
                "schemaVersion": SCHEMA_VERSION,
                "status": "invalid_manifest",
                "suites": [],
                "counts": asdict(TestCounts(0, 0, 0, 0)),
                "errors": errors,
            },
            2,
        )

    results: list[dict[str, Any]] = []
    command_env = dict(os.environ if env is None else env)
    for suite in manifest["suites"]:
        result = _run_suite(suite, repo_root, command_env)
        results.append(result)
        if result["status"] == "cancelled":
            break
    aggregate = TestCounts(
        tests=sum(result["counts"]["tests"] for result in results),
        passed=sum(result["counts"]["passed"] for result in results),
        failed=sum(result["counts"]["failed"] for result in results),
        skipped=sum(result["counts"]["skipped"] for result in results),
    )
    statuses = {result["status"] for result in results}
    if "cancelled" in statuses:
        aggregate_status = "cancelled"
    elif "timed_out" in statuses:
        aggregate_status = "timed_out"
    elif "failed" in statuses:
        aggregate_status = "failed"
    elif "infrastructure_unavailable" in statuses:
        aggregate_status = "infrastructure_unavailable"
    else:
        aggregate_status = "passed"
    report = {
        "schemaVersion": SCHEMA_VERSION,
        "status": aggregate_status,
        "suites": results,
        "counts": asdict(aggregate),
        "errors": [
            error for result in results for error in result.get("errors", [])
        ],
    }
    if aggregate_status == "cancelled":
        cancelled = next(
            result for result in results if result["status"] == "cancelled"
        )
        return report, 128 + signal.Signals[cancelled["signal"]].value
    return report, int(aggregate_status in {"failed", "timed_out"})


def refresh_inventory(manifest: dict[str, Any], repo_root: Path) -> None:
    suites = manifest.get("suites", [])
    if not isinstance(suites, list):
        raise ValueError("manifest suites must be an array")
    for suite in suites:
        if not isinstance(suite, dict):
            raise ValueError("each manifest suite must be an object")
        files = discover_files(repo_root, suite)
        if not files:
            raise ValueError(f"{suite.get('id', '<unknown>')}: matched zero files")
        suite["inventorySha256"] = inventory_digest(files)


def _write_manifest_atomic(path: Path, manifest: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    ) as stream:
        json.dump(manifest, stream, indent=2)
        stream.write("\n")
        temporary = Path(stream.name)
    temporary.replace(path)


def _empty_report(status: str, errors: list[str]) -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "status": status,
        "suites": [],
        "counts": asdict(TestCounts(0, 0, 0, 0)),
        "errors": errors,
    }


def _record_pending_signals(state: CancellationState) -> None:
    """Consume blocked handled signals so restoring handlers cannot terminate."""
    if not hasattr(signal, "sigpending") or not hasattr(signal, "sigwait"):
        return
    pending = set(signal.sigpending())
    for handled_signal in HANDLED_SIGNALS:
        if handled_signal not in pending:
            continue
        signal.sigwait({handled_signal})
        if state.signal_number is None:
            state.signal_number = handled_signal


def _install_cancellation_handlers(
    state: CancellationState,
) -> dict[int, Any]:
    """Install both handlers with their signals blocked during the transition."""
    previous_mask = (
        signal.pthread_sigmask(signal.SIG_BLOCK, HANDLED_SIGNALS)
        if hasattr(signal, "pthread_sigmask")
        else None
    )
    previous_handlers: dict[int, Any] = {}
    try:
        for handled_signal in HANDLED_SIGNALS:
            previous_handlers[handled_signal] = signal.signal(
                handled_signal, state.handle
            )
        _record_pending_signals(state)
    finally:
        if previous_mask is not None:
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)
    return previous_handlers


def _apply_final_cancellation(
    report: dict[str, Any],
    status: int,
    state: CancellationState,
) -> tuple[dict[str, Any], int]:
    if state.signal_number is None:
        return report, status
    signal_name = signal.Signals(state.signal_number).name
    if report.get("status") != "cancelled":
        report = _empty_report(
            "cancelled", [f"gate cancelled by {signal_name}"]
        )
    else:
        report = dict(report)
    report["signal"] = signal_name
    return report, 128 + state.signal_number


def _render_final_payload(
    report: dict[str, Any],
    status: int,
    state: CancellationState,
) -> tuple[bytes, int]:
    report, status = _apply_final_cancellation(report, status, state)
    payload = json.dumps(report, sort_keys=True)
    _record_pending_signals(state)
    final_report, final_status = _apply_final_cancellation(
        report, status, state
    )
    if final_report != report:
        payload = json.dumps(final_report, sort_keys=True)
        _record_pending_signals(state)
        _, final_status = _apply_final_cancellation(
            final_report, final_status, state
        )
    return f"{payload}\n".encode("utf-8"), final_status


def _freeze_final_output(
    report: dict[str, Any],
    status: int,
    state: CancellationState,
) -> tuple[bytes, int]:
    """Freeze payload/status at the final pending-signal drain boundary."""
    # Keep the two-stage render used by the finalization handshake, then make
    # one authoritative render inside the commit primitive. Signals which
    # arrive after either preview are consumed before this payload is frozen.
    _render_final_payload(report, status, state)
    _render_final_payload(report, status, state)
    while True:
        signal_before_render = state.signal_number
        _record_pending_signals(state)
        payload, final_status = _render_final_payload(
            report, status, state
        )
        _record_pending_signals(state)
        if (
            signal_before_render is not None
            or state.signal_number == signal_before_render
        ):
            return payload, final_status


def _write_all(
    file_descriptor: int,
    report: dict[str, Any],
    status: int,
    state: CancellationState,
) -> int:
    """Freeze once, then commit bytes without a duplicate fallback."""
    payload, final_status = _freeze_final_output(report, status, state)
    remaining = memoryview(payload)
    while remaining:
        written = os.write(file_descriptor, remaining)
        if written <= 0:
            raise OSError("stdout write returned no progress")
        remaining = remaining[written:]
    return final_status


def _emit_final_output(
    report: dict[str, Any],
    status: int,
    state: CancellationState,
    previous_handlers: dict[int, Any],
) -> int:
    """Commit one frozen record, then hand signals back to the caller."""
    state.finalizing = True

    # These zero-byte operations are part of the cancellable output handshake.
    # They expose buffered write/flush failures and signals before any report
    # byte becomes externally visible.
    sys.stdout.write("")
    sys.stdout.flush()

    previous_mask = (
        signal.pthread_sigmask(signal.SIG_BLOCK, HANDLED_SIGNALS)
        if hasattr(signal, "pthread_sigmask")
        else None
    )
    try:
        try:
            file_descriptor = sys.stdout.fileno()
        except (AttributeError, OSError, ValueError):
            payload, status = _freeze_final_output(report, status, state)
            sys.stdout.write(payload.decode("utf-8"))
            sys.stdout.flush()
        else:
            status = _write_all(
                file_descriptor, report, status, state
            )
        # The payload and exit are frozen. Record anything already pending,
        # then discard only post-freeze arrivals while the exact caller mask
        # is restored. Once each caller handler is restored, later delivery
        # belongs to the caller rather than this completed gate invocation.
        _record_pending_signals(state)
    finally:
        for handled_signal in HANDLED_SIGNALS:
            signal.signal(handled_signal, signal.SIG_IGN)
        _record_pending_signals(state)
        if previous_mask is not None:
            signal.pthread_sigmask(signal.SIG_SETMASK, previous_mask)
        for handled_signal, previous_handler in previous_handlers.items():
            signal.signal(handled_signal, previous_handler)
    return status


def _supervisor_main(file_descriptor: int) -> int:
    channel = socket.socket(fileno=file_descriptor)
    os.set_inheritable(file_descriptor, False)
    cancellation = CancellationState()
    previous_handlers = _install_cancellation_handlers(cancellation)
    containment: ProcessContainment | None = None
    containment_open = False
    request_id: str | None = None
    try:
        containment = _begin_process_containment()
        containment_open = True
        _send_supervisor_frame(
            channel,
            {
                "version": SUPERVISOR_PROTOCOL_VERSION,
                "type": "ready",
            },
        )
        request = _receive_supervisor_frame(channel, allow_eof=True)
        if request is None:
            quiet = _await_containment_quiescence(
                containment,
                None,
                deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
                signal_number=None,
            )
            if not quiet:
                raise ProcessCleanupError(
                    "prelaunch supervisor did not become quiescent"
                )
            _close_process_containment(containment)
            containment_open = False
            return 0

        _validate_supervisor_frame(
            request,
            frame_type="run",
            keys={
                "version",
                "type",
                "requestId",
                "argv",
                "cwd",
                "timeoutSeconds",
            },
        )
        request_id = request["requestId"]
        argv = request["argv"]
        cwd = request["cwd"]
        timeout_seconds = request["timeoutSeconds"]
        if (
            not isinstance(request_id, str)
            or not request_id
            or not isinstance(argv, list)
            or not argv
            or not all(isinstance(value, str) and value for value in argv)
            or not isinstance(cwd, str)
            or not Path(cwd).is_absolute()
            or not isinstance(timeout_seconds, int)
            or isinstance(timeout_seconds, bool)
            or not MIN_TIMEOUT_SECONDS
            <= timeout_seconds
            <= MAX_TIMEOUT_SECONDS
        ):
            raise ProcessCleanupError("invalid supervisor run request")

        try:
            try:
                outcome = _execute_command_serial(
                    argv,
                    Path(cwd),
                    dict(os.environ),
                    timeout_seconds,
                    containment=containment,
                )
            finally:
                containment_open = False
        except ProcessCleanupError as exc:
            _send_supervisor_frame(
                channel,
                {
                    "version": SUPERVISOR_PROTOCOL_VERSION,
                    "type": "fatal",
                    "requestId": request_id,
                    "message": str(exc),
                },
            )
            return 4
        except OSError as exc:
            _send_supervisor_frame(
                channel,
                {
                    "version": SUPERVISOR_PROTOCOL_VERSION,
                    "type": "error",
                    "requestId": request_id,
                    "errno": exc.errno or errno.EIO,
                    "message": str(exc),
                },
            )
            return 0

        _send_supervisor_frame(
            channel,
            _command_outcome_frame(request_id, outcome, containment),
        )
        return 0
    except (GateCancelled, ProcessCleanupError, OSError, ValueError) as exc:
        if containment_open and containment is not None:
            try:
                quiet = _await_containment_quiescence(
                    containment,
                    None,
                    deadline=time.monotonic() + TERMINATION_GRACE_SECONDS,
                    signal_number=None,
                )
                if quiet:
                    _close_process_containment(containment)
                    containment_open = False
            except BaseException:
                pass
        try:
            _send_supervisor_frame(
                channel,
                {
                    "version": SUPERVISOR_PROTOCOL_VERSION,
                    "type": "fatal",
                    "requestId": request_id,
                    "message": str(exc),
                },
            )
        except BaseException:
            pass
        return 4
    finally:
        if containment_open and containment is not None:
            try:
                _close_process_containment(containment)
            except BaseException:
                pass
        for handled_signal, previous_handler in previous_handlers.items():
            signal.signal(handled_signal, previous_handler)
        channel.close()


def main(argv: list[str] | None = None) -> int:
    default_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=default_root)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--refresh-inventory", action="store_true")
    parser.add_argument(
        "--_suite-supervisor-fd",
        type=int,
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args(argv)

    if args._suite_supervisor_fd is not None:
        return _supervisor_main(args._suite_supervisor_fd)

    repo_root = args.repo_root.resolve()
    manifest_path = (
        args.manifest.resolve()
        if args.manifest
        else repo_root / "ci" / "suites.json"
    )
    contract_path = repo_root / "ci" / "suites-contract.json"
    cancellation = CancellationState()
    previous_handlers = _install_cancellation_handlers(cancellation)

    try:
        if cancellation.signal_number is not None:
            raise GateCancelled(cancellation.signal_number)
        manifest = load_manifest(manifest_path)
        contract = load_manifest(contract_path)
        if args.refresh_inventory:
            refresh_inventory(manifest, repo_root)
        errors = validate_manifest(manifest, repo_root, contract)
        if args.refresh_inventory and not errors:
            _write_manifest_atomic(manifest_path, manifest)
        if args.validate_only or args.refresh_inventory:
            report = _empty_report(
                "passed" if not errors else "invalid_manifest", errors
            )
            status = 0 if not errors else 2
        else:
            report, status = run_gate(
                repo_root,
                manifest,
                contract=contract,
            )
    except ProcessCleanupError:
        # A cleanup uncertainty is deliberately not serialized as a gate
        # result. Publishing any report could let a live owned process escape.
        blocked_mask = (
            signal.pthread_sigmask(signal.SIG_BLOCK, HANDLED_SIGNALS)
            if hasattr(signal, "pthread_sigmask")
            else None
        )
        try:
            for handled_signal, previous_handler in previous_handlers.items():
                signal.signal(handled_signal, previous_handler)
            _record_pending_signals(cancellation)
        finally:
            if blocked_mask is not None:
                signal.pthread_sigmask(signal.SIG_SETMASK, blocked_mask)
        raise
    except GateCancelled as exc:
        signal_name = signal.Signals(exc.signal_number).name
        report = _empty_report(
            "cancelled", [f"gate cancelled by {signal_name}"]
        )
        report["signal"] = signal_name
        status = 128 + exc.signal_number
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        report = _empty_report("invalid_manifest", [str(exc)])
        status = 2
    except Exception as exc:
        report = _empty_report(
            "internal_error",
            [f"{type(exc).__name__}: {exc}"],
        )
        status = 3
    return _emit_final_output(
        report,
        status,
        cancellation,
        previous_handlers,
    )


if __name__ == "__main__":
    raise SystemExit(main())
