#!/usr/bin/env python3
"""Collect and verify external, content-addressed release-candidate evidence."""

from __future__ import annotations

import argparse
import base64
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from email.parser import Parser
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path, PurePosixPath
import re
import signal
import stat
import subprocess
import sys
import time
import tomllib
from typing import Any
from urllib.parse import quote

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from packaging.markers import InvalidMarker, Marker
from packaging.requirements import InvalidRequirement, Requirement
from packaging.utils import canonicalize_name


CANDIDATE_SCHEMA = "release-candidate/v1"
STATE_SCHEMA = "release-state/v1"
SBOM_SCHEMA = "production-sbom/v1"
LICENSE_SCHEMA = "production-licenses/v1"
LICENSE_POLICY_SCHEMA = "license-allowlist/v1"
ADVISORY_SCHEMA = "production-advisories/v1"
ADVISORY_DATABASE_SCHEMA = "offline-advisory-database/v2"
WAIVER_SCHEMA = "advisory-waivers/v1"
SCANNER_NAME = "agents-release-sca"
SCANNER_VERSION = "1"
MAX_DATABASE_VALIDITY = timedelta(days=31)
MAX_SCAN_AGE = timedelta(days=31)
MAX_WAIVER_VALIDITY = timedelta(days=30)
CLI_CLOCK_SKEW = timedelta(minutes=5)
GIT_TIMEOUT_SECONDS = 30.0
GIT_TERMINATION_GRACE_SECONDS = 1.0
FULL_GIT_ID = re.compile(r"^[0-9a-f]{40}$")
SHA256_ID = re.compile(r"^sha256:[0-9a-f]{64}$")
NORMALIZED_MAILTO = re.compile(
    r"^mailto:[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$"
)
REVIEW_ONLY_PATH = re.compile(
    r"^plan/PROJECT_V[0-9]+/reviews/"
    r"[A-Za-z0-9_.-]+_(?:to_review|reviewed_(?:OK|KO))\.md$"
)
PACKAGE_NAME = re.compile(
    r"^([A-Za-z0-9_.-]+)==([^ ;\\]+)"
    r"(?:\s*;\s*(.*?))?\s*\\?\s*$"
)
UTC_TIMESTAMP = re.compile(
    r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"
)
SEMVER_TAG = re.compile(
    r"^refs/tags/v?(0|[1-9][0-9]*)\."
    r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)"
    r"(?:-[0-9A-Za-z.-]+)?$"
)
STATES = (
    "planned",
    "implemented",
    "reviewed",
    "integrated",
    "promoted",
    "released",
)
STATE_EVIDENCE_KINDS = {
    "planned": "plan",
    "implemented": "implementation",
    "reviewed": "review",
    "integrated": "integration-ref",
    "promoted": "promotion-ref",
    "released": "release-tag",
}
SEVERITIES = {"low", "moderate", "high", "critical"}
HIGH_SEVERITIES = {"high", "critical"}
INPUT_PATHS = (
    ".github/workflows/ci.yml",
    "ci/release-environments.json",
    "ci/requirements-build.in",
    "ci/reviewer-trust-roots.json",
    "cli/pyproject.toml",
    "gateway/package.json",
    "orchestrator-langgraph/pyproject.toml",
    "schemas/release-candidate-v1.schema.json",
    "schemas/release-state-v1.schema.json",
    "scripts/ci.sh",
    "scripts/ci_gate.py",
    "scripts/refresh_advisory_snapshot.py",
    "scripts/requirements_lock.sh",
    "scripts/release_candidate.py",
)
LOCK_PATHS = ("gateway/package-lock.json", "requirements.lock")
SUITE_MANIFEST_PATH = "ci/suites.json"
SUITE_CONTRACT_PATH = "ci/suites-contract.json"
SBOM_PATH = "ci/production-sbom.json"
LICENSES_PATH = "ci/production-licenses.json"
LICENSE_POLICY_PATH = "ci/license-allowlist.json"
ADVISORIES_PATH = "ci/production-advisories.json"
ADVISORY_DATABASE_PATH = "ci/offline-advisory-database.json"
WAIVERS_PATH = "ci/advisory-waivers.json"
ENVIRONMENT_MATRIX_PATH = "ci/release-environments.json"
ENVIRONMENT_MATRIX_SCHEMA = "release-environments/v1"
REVIEW_TRUST_ROOTS_PATH = "ci/reviewer-trust-roots.json"
REVIEW_TRUST_ROOTS_SCHEMA = "reviewer-trust-roots/v1"
GIT_CONFIG_ARGUMENTS = (
    "-c",
    "gc.auto=0",
    "-c",
    "gc.autoDetach=false",
    "-c",
    "maintenance.auto=false",
    "-c",
    "maintenance.autoDetach=false",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.fsmonitor=false",
    "-c",
    "credential.interactive=never",
)


class DuplicateKeyError(ValueError):
    """Raised when JSON contains a duplicate object key."""


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f"duplicate key: {key}")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise ValueError(f"non-finite JSON number is not allowed: {value}")


def _validate_json_value(value: Any, location: str = "$") -> None:
    if isinstance(value, float):
        raise ValueError(f"{location}: floating-point values are not canonical")
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                raise ValueError(f"{location}: object keys must be strings")
            _validate_json_value(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _validate_json_value(child, f"{location}[{index}]")
    elif value is not None and not isinstance(value, (str, int, bool)):
        raise ValueError(f"{location}: unsupported JSON value")


def canonical_json_bytes(document: Any) -> bytes:
    """Return the sole accepted UTF-8 representation, including final newline."""
    _validate_json_value(document)
    return (
        json.dumps(
            document,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        ).encode("utf-8")
        + b"\n"
    )


def read_canonical_json(path: Path) -> Any:
    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("JSON document must be UTF-8") from exc
    value = json.loads(
        text,
        object_pairs_hook=_reject_duplicate_keys,
        parse_constant=_reject_constant,
    )
    if raw != canonical_json_bytes(value):
        raise ValueError("document is not canonical JSON")
    return value


def document_digest(document: Any) -> str:
    return f"sha256:{hashlib.sha256(canonical_json_bytes(document)).hexdigest()}"


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return f"sha256:{digest.hexdigest()}"


def _safe_relative_path(value: Any) -> bool:
    if not isinstance(value, str) or not value or "\\" in value:
        return False
    path = PurePosixPath(value)
    return (
        not path.is_absolute()
        and value == path.as_posix()
        and all(part not in {"", ".", ".."} for part in path.parts)
    )


def _check_exact_keys(
    value: Any,
    *,
    location: str,
    required: set[str],
    optional: set[str] | None = None,
) -> list[str]:
    if not isinstance(value, dict):
        return [f"{location}: must be an object"]
    optional = optional or set()
    errors: list[str] = []
    missing = sorted(required - set(value))
    extra = sorted(set(value) - required - optional)
    if missing:
        errors.append(f"{location}: missing fields: {', '.join(missing)}")
    if extra:
        errors.append(f"{location}: unsupported fields: {', '.join(extra)}")
    return errors


def _validate_git_identity(value: Any, location: str) -> list[str]:
    errors = _check_exact_keys(
        value,
        location=location,
        required={"commit", "tree"},
    )
    if not isinstance(value, dict):
        return errors
    for field in ("commit", "tree"):
        if not FULL_GIT_ID.fullmatch(str(value.get(field, ""))):
            errors.append(
                f"{location}.{field}: must be a full 40-character lowercase Git ID"
            )
    return errors


def _validate_file_records(
    records: Any,
    location: str,
    *,
    require_nonempty: bool = True,
) -> list[str]:
    if not isinstance(records, list) or (require_nonempty and not records):
        qualifier = "non-empty " if require_nonempty else ""
        return [f"{location}: must be a {qualifier}array"]
    errors: list[str] = []
    seen: set[str] = set()
    for index, record in enumerate(records):
        label = f"{location}[{index}]"
        errors.extend(
            _check_exact_keys(
                record,
                location=label,
                required={"path", "sha256"},
            )
        )
        if not isinstance(record, dict):
            continue
        path = record.get("path")
        if not _safe_relative_path(path):
            errors.append(f"{label}.path: must be a safe repository-relative path")
        elif path in seen:
            errors.append(f"{location}: duplicate path: {path}")
        else:
            seen.add(path)
        if not SHA256_ID.fullmatch(str(record.get("sha256", ""))):
            errors.append(f"{label}.sha256: must be a sha256 content digest")
    return errors


def _review_signature_material(review: dict[str, Any]) -> dict[str, Any]:
    return {
        key: review.get(key)
        for key in (
            "schemaVersion",
            "verdict",
            "reviewer",
            "reviewerRole",
            "keyId",
            "subject",
            "issuedAt",
            "signatureAlgorithm",
        )
    }


def build_release_provenance(candidate: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": "release-provenance/v1",
        "candidateDigest": document_digest(candidate),
        "technicalSubject": candidate["repository"]["candidate"],
        "evidenceHead": {
            "commit": candidate["repository"]["branch"]["commit"],
            "tree": candidate["repository"]["branch"]["tree"],
        },
        "materialsDigest": document_digest(
            {"materials": candidate["provenance"]["materials"]}
        ),
    }


def build_release_checklist(
    candidate: dict[str, Any],
    *,
    provenance_digest: str,
    review_digest: str,
    integration_digest: str,
    promotion_digest: str,
) -> dict[str, Any]:
    return {
        "schemaVersion": "release-checklist/v1",
        "candidateDigest": document_digest(candidate),
        "technicalSubject": candidate["repository"]["candidate"],
        "evidenceHead": {
            "commit": candidate["repository"]["branch"]["commit"],
            "tree": candidate["repository"]["branch"]["tree"],
        },
        "items": [
            {
                "id": "candidate-provenance",
                "complete": True,
                "evidenceDigest": provenance_digest,
            },
            {
                "id": "independent-review",
                "complete": True,
                "evidenceDigest": review_digest,
            },
            {
                "id": "integration",
                "complete": True,
                "evidenceDigest": integration_digest,
            },
            {
                "id": "promotion",
                "complete": True,
                "evidenceDigest": promotion_digest,
            },
        ],
    }


def validate_candidate_shape(candidate: Any) -> list[str]:
    """Validate release-candidate/v1 without reading the repository."""
    errors = _check_exact_keys(
        candidate,
        location="candidate",
        required={
            "schemaVersion",
            "repository",
            "runtimes",
            "inputs",
            "locks",
            "suiteManifest",
            "suiteContract",
            "supplyChain",
            "reviewEvidence",
            "provenance",
        },
    )
    if not isinstance(candidate, dict):
        return errors
    if candidate.get("schemaVersion") != CANDIDATE_SCHEMA:
        errors.append(f"candidate.schemaVersion: must be {CANDIDATE_SCHEMA}")

    repository = candidate.get("repository")
    errors.extend(
        _check_exact_keys(
            repository,
            location="candidate.repository",
            required={"base", "branch", "candidate", "mergeBase"},
        )
    )
    if isinstance(repository, dict):
        for name in ("base", "branch"):
            identity = repository.get(name)
            errors.extend(
                _check_exact_keys(
                    identity,
                    location=f"candidate.repository.{name}",
                    required={"ref", "commit", "tree"},
                )
            )
            if isinstance(identity, dict):
                ref = identity.get("ref")
                if (
                    not isinstance(ref, str)
                    or not ref.startswith("refs/heads/")
                    or any(character.isspace() for character in ref)
                    or any(character in ref for character in "~^:?*[\\")
                    or ".." in ref
                    or "@{" in ref
                ):
                    errors.append(
                        f"candidate.repository.{name}.ref: "
                        "must be a full refs/heads/ reference"
                    )
                errors.extend(
                    _validate_git_identity(
                        {
                            "commit": identity.get("commit"),
                            "tree": identity.get("tree"),
                        },
                        f"candidate.repository.{name}",
                    )
                )
        subject = repository.get("candidate")
        errors.extend(
            _validate_git_identity(subject, "candidate.repository.candidate")
        )
        if not FULL_GIT_ID.fullmatch(str(repository.get("mergeBase", ""))):
            errors.append(
                "candidate.repository.mergeBase: "
                "must be a full 40-character lowercase Git ID"
            )
        branch = repository.get("branch")
        base = repository.get("base")
        if isinstance(base, dict) and isinstance(branch, dict):
            if (
                base.get("ref") == branch.get("ref")
                or base.get("commit") == branch.get("commit")
            ):
                errors.append(
                    "candidate.repository: "
                    "base and candidate branch must be distinct"
                )

    runtimes = candidate.get("runtimes")
    if not isinstance(runtimes, list) or not runtimes:
        errors.append("candidate.runtimes: must be a non-empty array")
    else:
        seen_runtimes: set[str] = set()
        for index, runtime in enumerate(runtimes):
            label = f"candidate.runtimes[{index}]"
            errors.extend(
                _check_exact_keys(
                    runtime,
                    location=label,
                    required={"name", "constraint", "source"},
                )
            )
            if not isinstance(runtime, dict):
                continue
            name = runtime.get("name")
            if name not in {"node", "python"}:
                errors.append(f"{label}.name: unsupported runtime")
            elif name in seen_runtimes:
                errors.append(f"candidate.runtimes: duplicate runtime: {name}")
            else:
                seen_runtimes.add(name)
            if not isinstance(runtime.get("constraint"), str) or not runtime.get(
                "constraint"
            ):
                errors.append(f"{label}.constraint: must be a non-empty string")
            errors.extend(
                _validate_file_records(
                    [runtime.get("source")],
                    f"{label}.source",
                )
            )
            expected_runtime_source = {
                "node": "gateway/package.json",
                "python": "cli/pyproject.toml",
            }.get(name)
            if (
                expected_runtime_source is not None
                and isinstance(runtime.get("source"), dict)
                and runtime["source"].get("path") != expected_runtime_source
            ):
                errors.append(
                    f"{label}.source: must use {expected_runtime_source}"
                )
        if seen_runtimes != {"node", "python"}:
            errors.append("candidate.runtimes: node and python are both required")

    errors.extend(_validate_file_records(candidate.get("inputs"), "candidate.inputs"))
    input_paths = {
        item.get("path")
        for item in candidate.get("inputs", [])
        if isinstance(item, dict)
    }
    if input_paths != set(INPUT_PATHS):
        errors.append(
            "candidate.inputs: governed input set is incomplete or substituted"
        )
    errors.extend(_validate_file_records(candidate.get("locks"), "candidate.locks"))
    lock_paths = {
        item.get("path")
        for item in candidate.get("locks", [])
        if isinstance(item, dict)
    }
    if lock_paths != set(LOCK_PATHS):
        errors.append(
            "candidate.locks: must contain exactly the Python and npm lockfiles"
        )
    errors.extend(
        _validate_file_records(
            [candidate.get("suiteManifest")],
            "candidate.suiteManifest",
        )
    )
    if (
        isinstance(candidate.get("suiteManifest"), dict)
        and candidate["suiteManifest"].get("path") != SUITE_MANIFEST_PATH
    ):
        errors.append(
            "candidate.suiteManifest: "
            "must use the authoritative CI suite manifest"
        )
    errors.extend(
        _validate_file_records(
            [candidate.get("suiteContract")],
            "candidate.suiteContract",
        )
    )
    if (
        isinstance(candidate.get("suiteContract"), dict)
        and candidate["suiteContract"].get("path") != SUITE_CONTRACT_PATH
    ):
        errors.append(
            "candidate.suiteContract: "
            "must use the non-refreshable CI suite contract"
        )

    supply_chain = candidate.get("supplyChain")
    errors.extend(
        _check_exact_keys(
            supply_chain,
            location="candidate.supplyChain",
            required={
                "sbom",
                "licenses",
                "licensePolicy",
                "advisories",
                "advisoryDatabase",
                "waiverRegistryDigest",
                "waivers",
            },
        )
    )
    if isinstance(supply_chain, dict):
        expected_supply_paths = {
            "sbom": SBOM_PATH,
            "licenses": LICENSES_PATH,
            "licensePolicy": LICENSE_POLICY_PATH,
            "advisories": ADVISORIES_PATH,
            "advisoryDatabase": ADVISORY_DATABASE_PATH,
        }
        for name, expected_path in expected_supply_paths.items():
            errors.extend(
                _validate_file_records(
                    [supply_chain.get(name)],
                    f"candidate.supplyChain.{name}",
                )
            )
            record = supply_chain.get(name)
            if isinstance(record, dict) and record.get("path") != expected_path:
                label = {
                    "sbom": "authoritative production SBOM",
                    "licenses": "authoritative production license registry",
                    "licensePolicy": "independent license allowlist",
                    "advisories": "authoritative production advisory snapshot",
                    "advisoryDatabase": "reviewed offline advisory database",
                }[name]
                errors.append(
                    f"candidate.supplyChain.{name}: must use the {label}"
                )
        waivers = supply_chain.get("waivers")
        if not isinstance(waivers, list):
            errors.append("candidate.supplyChain.waivers: must be an array")
        registry_digest = supply_chain.get("waiverRegistryDigest")
        if not SHA256_ID.fullmatch(str(registry_digest or "")):
            errors.append(
                "candidate.supplyChain.waiverRegistryDigest: "
                "must be a sha256 content digest"
            )
        elif isinstance(waivers, list):
            expected_registry_digest = document_digest(
                {"schemaVersion": WAIVER_SCHEMA, "waivers": waivers}
            )
            if registry_digest != expected_registry_digest:
                errors.append(
                    "candidate.supplyChain.waiverRegistryDigest: "
                    "waiver registry digest is stale"
                )

    review_evidence = candidate.get("reviewEvidence")
    if not isinstance(review_evidence, list):
        errors.append("candidate.reviewEvidence: must be an array")
    else:
        seen_reviews: set[str] = set()
        for index, review in enumerate(review_evidence):
            label = f"candidate.reviewEvidence[{index}]"
            errors.extend(
                _check_exact_keys(
                    review,
                    location=label,
                    required={
                        "schemaVersion",
                        "digest",
                        "verdict",
                        "reviewer",
                        "reviewerRole",
                        "keyId",
                        "subject",
                        "issuedAt",
                        "signatureAlgorithm",
                        "signature",
                    },
                )
            )
            if not isinstance(review, dict):
                continue
            digest = review.get("digest")
            if not SHA256_ID.fullmatch(str(digest or "")):
                errors.append(f"{label}.digest: must be a sha256 content digest")
            elif digest in seen_reviews:
                errors.append(f"candidate.reviewEvidence: duplicate digest: {digest}")
            else:
                seen_reviews.add(digest)
            if review.get("schemaVersion") != "release-review/v1":
                errors.append(f"{label}.schemaVersion: must be release-review/v1")
            if review.get("verdict") != "OK":
                errors.append(f"{label}.verdict: only OK review evidence is accepted")
            reviewer = review.get("reviewer")
            if (
                not isinstance(reviewer, str)
                or not NORMALIZED_MAILTO.fullmatch(reviewer)
            ):
                errors.append(
                    f"{label}.reviewer: must be one normalized mailto identity"
                )
            if review.get("reviewerRole") != "independent-reviewer":
                errors.append(
                    f"{label}.reviewerRole: must be independent-reviewer"
                )
            key_id = review.get("keyId")
            if (
                not isinstance(key_id, str)
                or not key_id
                or len(key_id) > 128
                or any(character.isspace() for character in key_id)
            ):
                errors.append(f"{label}.keyId: invalid trust-root key identity")
            if review.get("signatureAlgorithm") != "ed25519":
                errors.append(
                    f"{label}.signatureAlgorithm: must be ed25519"
                )
            try:
                signature = base64.b64decode(
                    review.get("signature", ""),
                    validate=True,
                )
                if len(signature) != 64:
                    raise ValueError
            except (ValueError, TypeError):
                errors.append(
                    f"{label}.signature: must be one base64 Ed25519 signature"
                )
            try:
                _parse_timestamp(review.get("issuedAt"), f"{label}.issuedAt")
            except ValueError as exc:
                errors.append(str(exc))
            errors.extend(
                _validate_git_identity(
                    review.get("subject"),
                    f"{label}.subject",
                )
            )
            if (
                isinstance(repository, dict)
                and review.get("subject") != repository.get("candidate")
            ):
                errors.append(f"{label}.subject: must equal the candidate identity")
            attestation = {
                **_review_signature_material(review),
                "signature": review.get("signature"),
            }
            if review.get("digest") != document_digest(attestation):
                errors.append(
                    f"{label}.digest: review attestation digest is stale or detached"
                )

    provenance = candidate.get("provenance")
    errors.extend(
        _check_exact_keys(
            provenance,
            location="candidate.provenance",
            required={"predicateType", "subject", "materials"},
        )
    )
    if isinstance(provenance, dict):
        if provenance.get("predicateType") != (
            "https://agents.example/release-candidate/v1"
        ):
            errors.append("candidate.provenance.predicateType: unsupported value")
        provenance_subject = provenance.get("subject")
        errors.extend(
            _check_exact_keys(
                provenance_subject,
                location="candidate.provenance.subject",
                required={"name", "digest"},
            )
        )
        if isinstance(provenance_subject, dict):
            if provenance_subject.get("name") != "repository-tree":
                errors.append(
                    "candidate.provenance.subject.name: must be repository-tree"
                )
            digest = provenance_subject.get("digest")
            errors.extend(
                _check_exact_keys(
                    digest,
                    location="candidate.provenance.subject.digest",
                    required={"gitTree"},
                )
            )
            candidate_tree = (
                repository.get("candidate", {}).get("tree")
                if isinstance(repository, dict)
                and isinstance(repository.get("candidate"), dict)
                else None
            )
            if isinstance(digest, dict) and digest.get("gitTree") != candidate_tree:
                errors.append(
                    "candidate.provenance.subject.digest: "
                    "must bind the candidate tree"
                )
        errors.extend(
            _validate_file_records(
                provenance.get("materials"),
                "candidate.provenance.materials",
            )
        )
    return errors


def validate_state_ledger_shape(ledger: Any, candidate: dict[str, Any]) -> list[str]:
    """Validate the explicit ordered state-transition prefix."""
    errors = _check_exact_keys(
        ledger,
        location="stateLedger",
        required={
            "schemaVersion",
            "candidateDigest",
            "subject",
            "currentState",
            "transitions",
        },
    )
    if not isinstance(ledger, dict):
        return errors
    if ledger.get("schemaVersion") != STATE_SCHEMA:
        errors.append(f"stateLedger.schemaVersion: must be {STATE_SCHEMA}")
    expected_digest = document_digest(candidate)
    if ledger.get("candidateDigest") != expected_digest:
        errors.append("stateLedger.candidateDigest: stale or mixed candidate digest")
    subject = ledger.get("subject")
    errors.extend(_validate_git_identity(subject, "stateLedger.subject"))
    if subject != candidate.get("repository", {}).get("candidate"):
        errors.append("stateLedger.subject: must equal the candidate identity")

    transitions = ledger.get("transitions")
    if not isinstance(transitions, list) or not transitions:
        errors.append("stateLedger.transitions: must be a non-empty array")
        return errors
    seen: set[tuple[Any, Any]] = set()
    expected_from: str | None = None
    reached: list[str] = []
    for index, transition in enumerate(transitions):
        label = f"stateLedger.transitions[{index}]"
        errors.extend(
            _check_exact_keys(
                transition,
                location=label,
                required={"from", "to", "evidence"},
            )
        )
        if not isinstance(transition, dict):
            continue
        source = transition.get("from")
        target = transition.get("to")
        key = (source, target)
        if key in seen:
            errors.append(
                f"{label}: duplicate transition: {source!r} -> {target!r}"
            )
        seen.add(key)
        expected_target = (
            STATES[index] if index < len(STATES) else None
        )
        if source != expected_from or target != expected_target:
            errors.append(
                f"{label}: impossible transition: {source!r} -> {target!r}"
            )
        if target in STATES:
            reached.append(target)
            expected_from = target
        evidence = transition.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            errors.append(f"{label}.evidence: must be a non-empty array")
            continue
        required_kind = STATE_EVIDENCE_KINDS.get(str(target))
        kinds: list[Any] = []
        for evidence_index, item in enumerate(evidence):
            evidence_label = f"{label}.evidence[{evidence_index}]"
            kind = item.get("kind") if isinstance(item, dict) else None
            kind_fields = {
                "plan": set(),
                "implementation": set(),
                "review": {"verdict", "attestationDigest"},
                "integration-ref": {"ref", "refIdentity"},
                "promotion-ref": {"ref", "refIdentity"},
                "release-tag": {
                    "ref",
                    "refIdentity",
                    "checklist",
                    "checklistDigest",
                    "provenance",
                    "provenanceDigest",
                },
            }
            errors.extend(
                _check_exact_keys(
                    item,
                    location=evidence_label,
                    required={
                        "kind",
                        "digest",
                        "subject",
                        "issuedAt",
                    }
                    | kind_fields.get(kind, set()),
                )
            )
            if not isinstance(item, dict):
                continue
            kinds.append(kind)
            if kind not in kind_fields:
                errors.append(f"{evidence_label}.kind: unsupported evidence kind")
            if not SHA256_ID.fullmatch(str(item.get("digest", ""))):
                errors.append(
                    f"{evidence_label}.digest: must be a sha256 content digest"
                )
            else:
                evidence_material = {
                    key: value for key, value in item.items() if key != "digest"
                }
                if item["digest"] != document_digest(evidence_material):
                    errors.append(
                        f"{evidence_label}.digest: evidence digest is stale"
                    )
            try:
                _parse_timestamp(item.get("issuedAt"), f"{evidence_label}.issuedAt")
            except ValueError as exc:
                errors.append(str(exc))
            if item.get("subject") != candidate.get("repository", {}).get(
                "candidate"
            ):
                errors.append(
                    f"{evidence_label}.subject: must equal the candidate identity"
                )
            if kind in {"integration-ref", "promotion-ref", "release-tag"}:
                errors.extend(
                    _validate_git_identity(
                        item.get("refIdentity"),
                        f"{evidence_label}.refIdentity",
                    )
                )
            if kind == "review" and not SHA256_ID.fullmatch(
                str(item.get("attestationDigest", ""))
            ):
                errors.append(
                    f"{evidence_label}.attestationDigest: "
                    "must be a sha256 content digest"
                )
            if kind == "release-tag":
                provenance = item.get("provenance")
                if not isinstance(provenance, dict):
                    errors.append(
                        f"{evidence_label}.provenance: "
                        "canonical provenance artifact is required"
                    )
                errors.extend(
                    _check_exact_keys(
                        provenance,
                        location=f"{evidence_label}.provenance",
                        required={
                            "schemaVersion",
                            "candidateDigest",
                            "technicalSubject",
                            "evidenceHead",
                            "materialsDigest",
                        },
                    )
                )
                if isinstance(provenance, dict):
                    if provenance.get("schemaVersion") != "release-provenance/v1":
                        errors.append(
                            f"{evidence_label}.provenance.schemaVersion: "
                            "must be release-provenance/v1"
                        )
                    if item.get("provenanceDigest") != document_digest(
                        provenance
                    ):
                        errors.append(
                            f"{evidence_label}.provenanceDigest: "
                            "must bind the canonical provenance artifact"
                        )
                checklist = item.get("checklist")
                if not isinstance(checklist, dict):
                    errors.append(
                        f"{evidence_label}.checklist: "
                        "canonical checklist artifact is required"
                    )
                errors.extend(
                    _check_exact_keys(
                        checklist,
                        location=f"{evidence_label}.checklist",
                        required={
                            "schemaVersion",
                            "candidateDigest",
                            "technicalSubject",
                            "evidenceHead",
                            "items",
                        },
                    )
                )
                if isinstance(checklist, dict):
                    if checklist.get("schemaVersion") != "release-checklist/v1":
                        errors.append(
                            f"{evidence_label}.checklist.schemaVersion: "
                            "must be release-checklist/v1"
                        )
                    checklist_items = checklist.get("items")
                    if (
                        not isinstance(checklist_items, list)
                        or len(checklist_items) != 4
                    ):
                        errors.append(
                            f"{evidence_label}.checklist.items: "
                            "canonical checklist requires four items"
                        )
                    else:
                        for checklist_index, checklist_item in enumerate(
                            checklist_items
                        ):
                            checklist_label = (
                                f"{evidence_label}.checklist.items"
                                f"[{checklist_index}]"
                            )
                            errors.extend(
                                _check_exact_keys(
                                    checklist_item,
                                    location=checklist_label,
                                    required={
                                        "id",
                                        "complete",
                                        "evidenceDigest",
                                    },
                                )
                            )
                            if (
                                not isinstance(checklist_item, dict)
                                or checklist_item.get("complete") is not True
                                or not SHA256_ID.fullmatch(
                                    str(
                                        checklist_item.get(
                                            "evidenceDigest",
                                            "",
                                        )
                                    )
                                )
                            ):
                                errors.append(
                                    f"{checklist_label}: "
                                    "canonical checklist item is incomplete"
                                )
                    if item.get("checklistDigest") != document_digest(checklist):
                        errors.append(
                            f"{evidence_label}.checklistDigest: "
                            "must bind the canonical checklist artifact"
                        )
        if required_kind not in kinds:
            errors.append(
                f"{label}.evidence: missing independent {required_kind!r} evidence"
            )

    if ledger.get("currentState") != (reached[-1] if reached else None):
        errors.append(
            "stateLedger.currentState: must equal the last explicit transition"
        )
    return errors


def _parse_timestamp(value: Any, location: str) -> datetime:
    if not isinstance(value, str) or not UTC_TIMESTAMP.fullmatch(value):
        raise ValueError(f"{location}: must be an RFC3339 UTC timestamp")
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=timezone.utc
    )


def _candidate_lock_digests(candidate: dict[str, Any]) -> dict[str, str]:
    return {
        item["path"]: item["sha256"]
        for item in candidate.get("locks", [])
        if isinstance(item, dict)
        and isinstance(item.get("path"), str)
        and isinstance(item.get("sha256"), str)
    }


def validate_advisory_waivers(
    candidate: dict[str, Any],
    advisories: list[dict[str, Any]],
    waivers: list[dict[str, Any]],
    *,
    now: str,
) -> list[str]:
    """Fail closed for every high/critical candidate finding."""
    errors: list[str] = []
    try:
        current_time = _parse_timestamp(now, "now")
    except ValueError as exc:
        return [str(exc)]
    candidate_subject = candidate.get("repository", {}).get("candidate")
    expected_locks = _candidate_lock_digests(candidate)
    finding_keys: set[tuple[Any, Any]] = set()
    for index, advisory in enumerate(advisories):
        label = f"advisories[{index}]"
        if not isinstance(advisory, dict):
            errors.append(f"{label}: must be an object")
            continue
        advisory_id = advisory.get("id")
        component = advisory.get("component")
        severity = advisory.get("severity")
        if (
            not isinstance(advisory_id, str)
            or not advisory_id
            or "*" in advisory_id
        ):
            errors.append(f"{label}.id: must be an exact advisory identity")
        if (
            not isinstance(component, str)
            or not component.startswith("pkg:")
            or "*" in component
        ):
            errors.append(f"{label}.component: must be one exact package purl")
        if severity not in SEVERITIES:
            errors.append(f"{label}.severity: unsupported severity")
        key = (advisory_id, component)
        if key in finding_keys:
            errors.append(f"{label}: duplicate advisory/package finding")
        finding_keys.add(key)

    waiver_by_finding: dict[tuple[Any, Any], list[dict[str, Any]]] = defaultdict(list)
    seen_waiver_ids: set[str] = set()
    for index, waiver in enumerate(waivers):
        label = f"waivers[{index}]"
        if not isinstance(waiver, dict):
            errors.append(f"{label}: must be an object")
            continue
        required = {
            "id",
            "advisoryId",
            "component",
            "severity",
            "candidate",
            "lockDigests",
            "owner",
            "reachability",
            "compensatingControls",
            "evidence",
            "issuedAt",
            "expiresAt",
            "provenance",
        }
        errors.extend(
            _check_exact_keys(waiver, location=label, required=required)
        )
        waiver_id = waiver.get("id")
        if (
            not isinstance(waiver_id, str)
            or not waiver_id.startswith("WAIVER-")
            or "*" in waiver_id
        ):
            errors.append(f"{label}.id: must be a narrow stable waiver identity")
        elif waiver_id in seen_waiver_ids:
            errors.append(f"{label}.id: duplicate waiver identity")
        else:
            seen_waiver_ids.add(waiver_id)
        key = (waiver.get("advisoryId"), waiver.get("component"))
        waiver_by_finding[key].append(waiver)
        if key not in finding_keys:
            errors.append(f"{label}: package/advisory does not match a finding")
        if any(
            "*" in str(waiver.get(field, ""))
            for field in ("advisoryId", "component")
        ):
            errors.append(f"{label}: package and advisory must not be overbroad")
        if waiver.get("severity") not in HIGH_SEVERITIES:
            errors.append(
                f"{label}.severity: only high or critical findings are waivable"
            )
        if waiver.get("candidate") != candidate_subject:
            errors.append(f"{label}.candidate: stale or mixed candidate identity")
        if waiver.get("lockDigests") != expected_locks:
            errors.append(
                f"{label}.lockDigests: stale or incomplete lock digest binding"
            )
        owner = waiver.get("owner")
        if not isinstance(owner, str) or not owner.strip():
            errors.append(f"{label}.owner: owner is required")
        reachability = waiver.get("reachability")
        if not isinstance(reachability, str) or len(reachability.strip()) < 20:
            errors.append(f"{label}.reachability: specific rationale is required")
        controls = waiver.get("compensatingControls")
        if (
            not isinstance(controls, list)
            or not controls
            or not all(isinstance(item, str) and item.strip() for item in controls)
        ):
            errors.append(
                f"{label}.compensatingControls: at least one control is required"
            )
        errors.extend(
            _validate_file_records(waiver.get("evidence"), f"{label}.evidence")
        )
        try:
            issued_at = _parse_timestamp(waiver.get("issuedAt"), f"{label}.issuedAt")
            expires_at = _parse_timestamp(
                waiver.get("expiresAt"), f"{label}.expiresAt"
            )
            if expires_at <= issued_at:
                errors.append(f"{label}.expiresAt: must be after issuance")
            elif expires_at - issued_at > MAX_WAIVER_VALIDITY:
                errors.append(
                    f"{label}.expiresAt: waiver validity exceeds 30 days"
                )
            if issued_at > current_time:
                errors.append(f"{label}.issuedAt: waiver issuance is in the future")
            if expires_at <= current_time:
                errors.append(f"{label}.expiresAt: waiver is expired")
        except ValueError as exc:
            errors.append(str(exc))
        provenance = waiver.get("provenance")
        errors.extend(
            _check_exact_keys(
                provenance,
                location=f"{label}.provenance",
                required={"issuer", "subjectDigest"},
            )
        )
        if isinstance(provenance, dict):
            if provenance.get("issuer") != owner:
                errors.append(f"{label}.provenance.issuer: must equal owner")
            expected_subject = (
                candidate_subject.get("tree")
                if isinstance(candidate_subject, dict)
                else None
            )
            if provenance.get("subjectDigest") != expected_subject:
                errors.append(
                    f"{label}.provenance.subjectDigest: "
                    "must bind the candidate tree"
                )

    for advisory in advisories:
        if advisory.get("severity") not in HIGH_SEVERITIES:
            continue
        key = (advisory.get("id"), advisory.get("component"))
        matching = waiver_by_finding.get(key, [])
        if len(matching) != 1:
            errors.append(
                "unaccepted high/critical advisory: "
                f"{advisory.get('id')} for {advisory.get('component')}"
            )
        elif matching[0].get("severity") != advisory.get("severity"):
            errors.append(
                f"waiver {matching[0].get('id')}: severity does not match advisory"
            )
    return errors


def _git_environment() -> dict[str, str]:
    executable_path = os.environ.get("PATH")
    if not executable_path:
        raise ValueError("Git executable search path is unavailable")
    environment = {
        "PATH": executable_path,
        "HOME": os.devnull,
        "XDG_CONFIG_HOME": os.devnull,
        "LC_ALL": "C",
        "LANG": "C",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_CONFIG_SYSTEM": os.devnull,
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_NO_REPLACE_OBJECTS": "1",
    }
    expected_keys = {
        "GIT_CONFIG_GLOBAL",
        "GIT_CONFIG_NOSYSTEM",
        "GIT_CONFIG_SYSTEM",
        "GIT_NO_REPLACE_OBJECTS",
        "GIT_OPTIONAL_LOCKS",
        "GIT_TERMINAL_PROMPT",
        "HOME",
        "LANG",
        "LC_ALL",
        "PATH",
        "XDG_CONFIG_HOME",
    }
    if set(environment) != expected_keys:
        raise ValueError("Git subprocess environment is not hermetic")
    return environment


def _process_group_has_live_members(process_group: int) -> bool:
    proc_root = Path("/proc")
    if proc_root.is_dir():
        for stat_path in proc_root.glob("[0-9]*/stat"):
            try:
                raw = stat_path.read_text(encoding="ascii")
                fields = raw[raw.rfind(")") + 2 :].split()
                state = fields[0]
                observed_group = int(fields[2])
            except (OSError, ValueError, IndexError):
                continue
            if observed_group == process_group and state != "Z":
                return True
        return False
    try:
        os.killpg(process_group, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _wait_for_process_group_exit(process_group: int, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while _process_group_has_live_members(process_group):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return False
        time.sleep(min(0.01, remaining))
    return True


def _terminate_process_group(process: subprocess.Popen[Any]) -> None:
    process_group = process.pid
    try:
        os.killpg(process_group, signal.SIGTERM)
    except ProcessLookupError:
        pass
    if not _wait_for_process_group_exit(
        process_group,
        GIT_TERMINATION_GRACE_SECONDS,
    ):
        try:
            os.killpg(process_group, signal.SIGKILL)
        except ProcessLookupError:
            pass
        if not _wait_for_process_group_exit(
            process_group,
            GIT_TERMINATION_GRACE_SECONDS,
        ):
            raise ValueError("git process group cleanup failed")
    process.wait(timeout=GIT_TERMINATION_GRACE_SECONDS)


def _run_git(
    repo_root: Path,
    arguments: tuple[str, ...],
    *,
    timeout_seconds: float = GIT_TIMEOUT_SECONDS,
) -> tuple[int, bytes, bytes]:
    if (
        not isinstance(timeout_seconds, (int, float))
        or isinstance(timeout_seconds, bool)
        or timeout_seconds <= 0
        or timeout_seconds > GIT_TIMEOUT_SECONDS
    ):
        raise ValueError("git timeout must be positive and bounded")
    if not all(isinstance(argument, str) for argument in arguments):
        raise ValueError("git arguments must be strings")
    command = [
        "git",
        "--no-replace-objects",
        *GIT_CONFIG_ARGUMENTS,
        "-C",
        str(repo_root),
        *arguments,
    ]
    process = subprocess.Popen(
        command,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=False,
        start_new_session=True,
        env=_git_environment(),
    )
    try:
        stdout, stderr = process.communicate(timeout=timeout_seconds)
    except subprocess.TimeoutExpired as exc:
        _terminate_process_group(process)
        raise ValueError("git command timed out") from exc
    return process.returncode, stdout, stderr


def _git(
    repo_root: Path,
    *arguments: str,
    check: bool = True,
    timeout_seconds: float = GIT_TIMEOUT_SECONDS,
) -> str:
    returncode, stdout, _ = _run_git(
        repo_root,
        tuple(arguments),
        timeout_seconds=timeout_seconds,
    )
    if check and returncode != 0:
        raise ValueError("git command failed")
    try:
        return stdout.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ValueError("git command returned non-UTF-8 output") from exc


def _git_bytes(
    repo_root: Path,
    *arguments: str,
    timeout_seconds: float = GIT_TIMEOUT_SECONDS,
) -> bytes:
    returncode, stdout, _ = _run_git(
        repo_root,
        tuple(arguments),
        timeout_seconds=timeout_seconds,
    )
    if returncode != 0:
        raise ValueError("git command failed")
    return stdout


def _git_succeeds(repo_root: Path, *arguments: str) -> bool:
    return _run_git(repo_root, tuple(arguments))[0] == 0


def _reject_legacy_grafts(repo_root: Path) -> None:
    common_directory = Path(
        _git(
            repo_root,
            "rev-parse",
            "--path-format=absolute",
            "--git-common-dir",
        )
    )
    graft_file = common_directory / "info/grafts"
    try:
        graft_present = graft_file.is_symlink() or (
            graft_file.is_file() and bool(graft_file.read_bytes().strip())
        )
    except OSError as exc:
        raise ValueError("legacy Git graft state cannot be inspected") from exc
    if graft_present:
        raise ValueError("legacy Git graft substitution is not accepted")


def _validate_exact_ref_name(
    repo_root: Path,
    ref: Any,
    *,
    allowed_prefixes: tuple[str, ...],
) -> str:
    if (
        not isinstance(ref, str)
        or not ref.startswith(allowed_prefixes)
        or any(character.isspace() for character in ref)
        or not _git_succeeds(repo_root, "check-ref-format", ref)
        or not _git_succeeds(repo_root, "show-ref", "--verify", "--quiet", ref)
    ):
        raise ValueError("exact existing Git reference is required")
    return ref


def _resolve_exact_ref_identity(
    repo_root: Path,
    ref: Any,
    *,
    allowed_prefixes: tuple[str, ...],
) -> dict[str, str]:
    exact_ref = _validate_exact_ref_name(
        repo_root,
        ref,
        allowed_prefixes=allowed_prefixes,
    )
    object_id = _git(repo_root, "show-ref", "--hash", "--verify", exact_ref)
    if not FULL_GIT_ID.fullmatch(object_id):
        raise ValueError("exact Git reference did not resolve to a full object ID")
    commit = _git(repo_root, "rev-parse", "--verify", f"{object_id}^{{commit}}")
    tree = _git(repo_root, "rev-parse", "--verify", f"{commit}^{{tree}}")
    if not FULL_GIT_ID.fullmatch(commit) or not FULL_GIT_ID.fullmatch(tree):
        raise ValueError("exact Git reference resolved to an invalid identity")
    return {"ref": exact_ref, "commit": commit, "tree": tree}


def _git_commit_identity(repo_root: Path, commit: Any) -> dict[str, str]:
    if not isinstance(commit, str) or not FULL_GIT_ID.fullmatch(commit):
        raise ValueError("technical candidate must be one full commit ID")
    if _git(repo_root, "cat-file", "-t", commit) != "commit":
        raise ValueError("technical candidate object must be a commit")
    tree = _git(repo_root, "rev-parse", "--verify", f"{commit}^{{tree}}")
    if not FULL_GIT_ID.fullmatch(tree):
        raise ValueError("technical candidate tree identity is invalid")
    return {"commit": commit, "tree": tree}


def _git_is_ancestor(repo_root: Path, ancestor: str, descendant: str) -> bool:
    if not FULL_GIT_ID.fullmatch(ancestor) or not FULL_GIT_ID.fullmatch(descendant):
        raise ValueError("ancestry requires full immutable commit IDs")
    return _git_succeeds(
        repo_root,
        "merge-base",
        "--is-ancestor",
        ancestor,
        descendant,
    )


def _tree_blob_identity(
    repo_root: Path,
    commit: str,
    relative: str,
) -> tuple[str, bytes]:
    if not _safe_relative_path(relative) or ":" in relative:
        raise ValueError(f"{relative!r}: path is not safe repository-relative")
    if not FULL_GIT_ID.fullmatch(commit):
        raise ValueError("tree lookup requires a full immutable commit ID")
    raw = _git_bytes(repo_root, "ls-tree", "-z", commit, "--", relative)
    records = [record for record in raw.split(b"\0") if record]
    if len(records) != 1:
        raise ValueError(f"{relative}: required regular blob is absent from tree")
    try:
        metadata, observed_path = records[0].split(b"\t", 1)
        mode, kind, object_id = metadata.decode("ascii").split(" ")
        decoded_path = observed_path.decode("utf-8")
    except (UnicodeDecodeError, ValueError) as exc:
        raise ValueError(f"{relative}: invalid Git tree record") from exc
    if (
        decoded_path != relative
        or kind != "blob"
        or not mode.startswith("100")
        or not FULL_GIT_ID.fullmatch(object_id)
    ):
        raise ValueError(f"{relative}: tree entry must be one regular blob")
    return object_id, _git_bytes(repo_root, "cat-file", "blob", object_id)


def _assert_clean_material_path(
    repo_root: Path,
    commit: str,
    relative: str,
) -> bytes:
    object_id, blob = _tree_blob_identity(repo_root, commit, relative)
    path = _repository_file(repo_root, relative, require_tracked=False)
    index_flag = _git(repo_root, "ls-files", "-v", "--", relative)
    if index_flag != f"H {relative}":
        raise ValueError(f"{relative}: unsupported index flag")
    stage = _git(repo_root, "ls-files", "--stage", "--", relative)
    stage_fields = stage.split(None, 3)
    if (
        len(stage_fields) != 4
        or stage_fields[0] not in {"100644", "100755"}
        or stage_fields[1] != object_id
        or stage_fields[2] != "0"
        or stage_fields[3] != relative
    ):
        raise ValueError(f"{relative}: index blob differs from pinned tree")
    if path.read_bytes() != blob:
        raise ValueError(f"{relative}: checkout bytes differ from pinned tree")
    return blob


def _review_only_advancement_errors(
    repo_root: Path,
    technical_commit: str,
    evidence_commit: str,
) -> list[str]:
    if technical_commit == evidence_commit:
        return []
    if not _git_is_ancestor(repo_root, technical_commit, evidence_commit):
        return ["repository.branch: evidence head does not contain candidate"]
    errors: list[str] = []
    commit_ids = _git(
        repo_root,
        "rev-list",
        "--reverse",
        f"{technical_commit}..{evidence_commit}",
    ).splitlines()
    for commit_id in commit_ids:
        if not FULL_GIT_ID.fullmatch(commit_id):
            errors.append("repository.branch: invalid review advancement commit")
            continue
        changed_paths = _git(
            repo_root,
            "diff-tree",
            "--no-commit-id",
            "--name-only",
            "-r",
            "--root",
            commit_id,
        ).splitlines()
        if not changed_paths or any(
            not REVIEW_ONLY_PATH.fullmatch(path) for path in changed_paths
        ):
            errors.append(
                "repository.branch: post-freeze commits may change only "
                "canonical review artifacts"
            )
    return errors


def _repository_file(
    repo_root: Path, relative: str, *, require_tracked: bool = True
) -> Path:
    if not _safe_relative_path(relative):
        raise ValueError(f"{relative!r}: path is not safe repository-relative")
    root = repo_root.resolve()
    current = root
    for part in PurePosixPath(relative).parts:
        current = current / part
        try:
            mode = current.lstat().st_mode
        except FileNotFoundError as exc:
            raise ValueError(f"{relative}: required file is missing") from exc
        if stat.S_ISLNK(mode):
            raise ValueError(f"{relative}: symlinks are not accepted")
    if not current.is_file():
        raise ValueError(f"{relative}: must be a regular file")
    resolved = current.resolve()
    if resolved.parent != root and root not in resolved.parents:
        raise ValueError(f"{relative}: path escapes the repository")
    if require_tracked:
        tracked = _git(
            root,
            "ls-files",
            "--error-unmatch",
            "--",
            relative,
            check=False,
        )
        if tracked != relative:
            raise ValueError(f"{relative}: evidence file must be tracked")
        mode_and_type = _git(root, "ls-tree", "HEAD", "--", relative)
        if not mode_and_type or not mode_and_type.startswith("100"):
            raise ValueError(f"{relative}: tracked entry must be a regular blob")
    return current


def _file_record(
    repo_root: Path, relative: str, *, require_tracked: bool = True
) -> dict[str, str]:
    path = _repository_file(
        repo_root, relative, require_tracked=require_tracked
    )
    return {"path": relative, "sha256": file_digest(path)}


def _blob_digest(blob: bytes) -> str:
    return f"sha256:{hashlib.sha256(blob).hexdigest()}"


def _file_record_at_commit(
    repo_root: Path,
    commit: str,
    relative: str,
) -> dict[str, str]:
    blob = _assert_clean_material_path(repo_root, commit, relative)
    return {"path": relative, "sha256": _blob_digest(blob)}


def _validate_environment_matrix(
    document: Any,
) -> tuple[list[str], list[dict[str, Any]]]:
    errors = _check_exact_keys(
        document,
        location="environmentMatrix",
        required={"schemaVersion", "environments"},
    )
    if not isinstance(document, dict):
        return errors, []
    if document.get("schemaVersion") != ENVIRONMENT_MATRIX_SCHEMA:
        errors.append(
            "environmentMatrix.schemaVersion: "
            f"must be {ENVIRONMENT_MATRIX_SCHEMA}"
        )
    environments = document.get("environments")
    if not isinstance(environments, list) or not environments:
        return errors + ["environmentMatrix.environments: must be non-empty"], []
    expected_marker_keys = {
        "implementation_name",
        "implementation_version",
        "os_name",
        "platform_machine",
        "platform_python_implementation",
        "platform_release",
        "platform_system",
        "platform_version",
        "python_full_version",
        "python_version",
        "sys_platform",
    }
    seen: set[str] = set()
    valid: list[dict[str, Any]] = []
    for index, environment in enumerate(environments):
        label = f"environmentMatrix.environments[{index}]"
        errors.extend(
            _check_exact_keys(
                environment,
                location=label,
                required={"id", "markers"},
            )
        )
        if not isinstance(environment, dict):
            continue
        environment_id = environment.get("id")
        if (
            not isinstance(environment_id, str)
            or not environment_id
            or environment_id in seen
        ):
            errors.append(f"{label}.id: must be a unique non-empty identity")
        else:
            seen.add(environment_id)
        markers = environment.get("markers")
        if not isinstance(markers, dict) or set(markers) != expected_marker_keys:
            errors.append(
                f"{label}.markers: must contain the complete marker environment"
            )
        elif not all(
            isinstance(value, str) and value for value in markers.values()
        ):
            errors.append(f"{label}.markers: every marker value must be non-empty")
        else:
            valid.append(environment)
    if [item.get("id") for item in environments if isinstance(item, dict)] != sorted(
        seen
    ):
        errors.append("environmentMatrix.environments: identities must be sorted")
    platforms = {
        item["markers"]["sys_platform"] for item in valid if "markers" in item
    }
    if not {"darwin", "linux", "win32"}.issubset(platforms):
        errors.append(
            "environmentMatrix.environments: linux, macOS, and Windows are required"
        )
    full_versions = {
        item["markers"]["python_full_version"] for item in valid if "markers" in item
    }
    if not any(version < "3.11.3" for version in full_versions) or not any(
        version >= "3.11.3" for version in full_versions
    ):
        errors.append(
            "environmentMatrix.environments: both sides of the Python 3.11.3 "
            "marker boundary are required"
        )
    return errors, valid


def _load_environment_matrix(repo_root: Path) -> list[dict[str, Any]]:
    document = read_canonical_json(
        _repository_file(
            repo_root,
            ENVIRONMENT_MATRIX_PATH,
            require_tracked=False,
        )
    )
    errors, environments = _validate_environment_matrix(document)
    if errors:
        raise ValueError("; ".join(errors))
    return environments


def _production_python_roots(repo_root: Path) -> set[str]:
    roots: set[str] = set()
    for relative in (
        "cli/pyproject.toml",
        "orchestrator-langgraph/pyproject.toml",
    ):
        try:
            document = tomllib.loads(
                _repository_file(repo_root, relative).read_text(encoding="utf-8")
            )
        except (OSError, UnicodeError, tomllib.TOMLDecodeError) as exc:
            raise ValueError(f"{relative}: invalid production manifest") from exc
        project = document.get("project")
        if not isinstance(project, dict):
            raise ValueError(f"{relative}: project table is required")
        dependency_groups: list[Any] = [project.get("dependencies", [])]
        optional = project.get("optional-dependencies", {})
        if not isinstance(optional, dict):
            raise ValueError(f"{relative}: optional-dependencies must be a table")
        dependency_groups.extend(
            value for name, value in optional.items() if name != "dev"
        )
        for group in dependency_groups:
            if not isinstance(group, list):
                raise ValueError(f"{relative}: dependency group must be an array")
            for raw_requirement in group:
                if not isinstance(raw_requirement, str):
                    raise ValueError(f"{relative}: dependency must be a string")
                try:
                    requirement = Requirement(raw_requirement)
                except InvalidRequirement as exc:
                    raise ValueError(
                        f"{relative}: invalid production dependency"
                    ) from exc
                roots.add(canonicalize_name(requirement.name))
    if not roots:
        raise ValueError("production Python dependency roots are empty")
    return roots


def _parse_python_lock(
    path: Path,
    *,
    production_roots: set[str],
    environments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    raw_lines = path.read_text(encoding="utf-8").splitlines()
    parsed: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    hash_pattern = re.compile(r"--hash=sha256:([0-9a-f]{64})(?:\s*\\)?$")
    for raw_line in raw_lines:
        match = PACKAGE_NAME.fullmatch(raw_line)
        if match:
            name = canonicalize_name(match.group(1))
            marker_text = match.group(3)
            active_environments: list[str] = []
            if marker_text:
                try:
                    marker = Marker(marker_text)
                except InvalidMarker as exc:
                    raise ValueError(
                        "requirements.lock has an invalid environment marker"
                    ) from exc
                for environment in environments:
                    if marker.evaluate(environment=environment["markers"]):
                        active_environments.append(environment["id"])
            else:
                active_environments = [
                    environment["id"] for environment in environments
                ]
            current = {
                "name": name,
                "version": match.group(2),
                "marker": marker_text,
                "environments": sorted(active_environments),
                "hashes": set(),
            }
            parsed.append(current)
            continue
        if current is None:
            continue
        hash_match = hash_pattern.search(raw_line.strip())
        if hash_match:
            current["hashes"].add(hash_match.group(1))

    active_entries = [item for item in parsed if item["environments"]]
    by_name: dict[str, dict[str, Any]] = {}
    for entry in active_entries:
        if not entry["hashes"]:
            raise ValueError(
                f"requirements.lock entry {entry['name']} lacks a sha256 hash"
            )
        previous = by_name.get(entry["name"])
        if previous is not None:
            if previous["version"] != entry["version"]:
                raise ValueError(
                    "requirements.lock contains conflicting active versions"
                )
            previous["hashes"].update(entry["hashes"])
            previous["environments"] = sorted(
                set(previous["environments"]) | set(entry["environments"])
            )
            continue
        by_name[entry["name"]] = entry
    missing = sorted(production_roots - set(by_name))
    if missing:
        raise ValueError(
            f"requirements.lock misses production roots: {', '.join(missing)}"
        )
    components: list[dict[str, Any]] = []
    for name in sorted(by_name):
        entry = by_name[name]
        version = entry["version"]
        purl = f"pkg:pypi/{quote(name, safe='')}@{quote(version, safe='')}"
        lock_material = {
            "name": name,
            "version": version,
            "hashes": sorted(entry["hashes"]),
            "environments": entry["environments"],
        }
        components.append(
            {
                "purl": purl,
                "ecosystem": "pypi",
                "name": name,
                "version": version,
                "direct": name in production_roots,
                "dependencies": [],
                "environments": entry["environments"],
                "lockEntryDigest": document_digest(lock_material),
            }
        )
    return components


def _npm_name_from_path(package_path: str) -> str:
    marker = "node_modules/"
    if marker not in package_path:
        raise ValueError(f"invalid npm lock package path: {package_path}")
    return package_path.rsplit(marker, 1)[1]


def _npm_purl(name: str, version: str) -> str:
    encoded = quote(name, safe="/")
    if encoded.startswith("@"):
        encoded = "%40" + encoded[1:]
    return f"pkg:npm/{encoded}@{quote(version, safe='')}"


def _parse_npm_lock(path: Path) -> list[dict[str, Any]]:
    data = json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=_reject_duplicate_keys,
        parse_constant=_reject_constant,
    )
    if data.get("lockfileVersion") != 3 or not isinstance(data.get("packages"), dict):
        raise ValueError("gateway/package-lock.json must be lockfileVersion 3")
    root = data["packages"].get("")
    if not isinstance(root, dict) or not isinstance(root.get("dependencies"), dict):
        raise ValueError(
            "gateway/package-lock.json misses root production dependencies"
        )
    direct_names = set(root["dependencies"])
    by_path: dict[str, dict[str, Any]] = {}
    for package_path, package in data["packages"].items():
        if not package_path or package.get("dev", False):
            continue
        name = _npm_name_from_path(package_path)
        version = package.get("version")
        integrity = package.get("integrity")
        if not isinstance(version, str) or not version:
            raise ValueError(f"{package_path}: locked version is missing")
        if not isinstance(integrity, str) or not integrity.startswith("sha512-"):
            raise ValueError(f"{package_path}: sha512 integrity is missing")
        by_path[package_path] = {
            "purl": _npm_purl(name, version),
            "ecosystem": "npm",
            "name": name,
            "version": version,
            "direct": name in direct_names,
            "dependencyNames": sorted((package.get("dependencies") or {}).keys()),
            "integrity": integrity,
        }
    locked_names = {component["name"] for component in by_path.values()}
    missing = sorted(direct_names - locked_names)
    if missing:
        raise ValueError(
            f"gateway/package-lock.json misses production roots: {', '.join(missing)}"
        )
    for package_path, component in by_path.items():
        resolved_dependencies: list[str] = []
        unresolved: list[str] = []
        for dependency in component.pop("dependencyNames"):
            current = package_path
            dependency_path: str | None = None
            while current:
                candidate_path = f"{current}/node_modules/{dependency}"
                if candidate_path in by_path:
                    dependency_path = candidate_path
                    break
                marker = current.rfind("/node_modules/")
                if marker < 0:
                    current = ""
                else:
                    current = current[:marker]
            if dependency_path is None:
                root_dependency = f"node_modules/{dependency}"
                if root_dependency in by_path:
                    dependency_path = root_dependency
            if dependency_path is None:
                unresolved.append(dependency)
            else:
                resolved_dependencies.append(by_path[dependency_path]["purl"])
        if unresolved:
            raise ValueError(
                f"{component['name']}: production dependencies are not locked: "
                f"{', '.join(unresolved)}"
            )
        component["dependencies"] = sorted(resolved_dependencies)
    by_purl: dict[str, dict[str, Any]] = {}
    for component in by_path.values():
        existing = by_purl.get(component["purl"])
        if existing is None:
            by_purl[component["purl"]] = component
            continue
        if existing["integrity"] != component["integrity"]:
            raise ValueError(
                f"{component['purl']}: conflicting npm integrity records"
            )
        existing["direct"] = existing["direct"] or component["direct"]
        existing["dependencies"] = sorted(
            set(existing["dependencies"]) | set(component["dependencies"])
        )
    return sorted(by_purl.values(), key=lambda item: item["purl"])


def locked_production_components(repo_root: Path) -> list[dict[str, Any]]:
    python_path = _repository_file(repo_root, "requirements.lock")
    npm_path = _repository_file(repo_root, "gateway/package-lock.json")
    return sorted(
        _parse_python_lock(
            python_path,
            production_roots=_production_python_roots(repo_root),
            environments=_load_environment_matrix(repo_root),
        )
        + _parse_npm_lock(npm_path),
        key=lambda item: item["purl"],
    )


def _lock_records(
    repo_root: Path,
    commit: str | None = None,
) -> list[dict[str, str]]:
    if commit is None:
        return [_file_record(repo_root, path) for path in LOCK_PATHS]
    return [_file_record_at_commit(repo_root, commit, path) for path in LOCK_PATHS]


def build_production_sbom(
    repo_root: Path, licenses: dict[str, Any]
) -> dict[str, Any]:
    license_entries = licenses.get("licenses", []) if isinstance(licenses, dict) else []
    license_by_purl = {
        item.get("component"): item.get("expression")
        for item in license_entries
        if isinstance(item, dict)
    }
    components = locked_production_components(repo_root)
    output_components: list[dict[str, Any]] = []
    for component in components:
        license_expression = license_by_purl.get(component["purl"])
        output = {
            key: value
            for key, value in component.items()
            if key != "dependencies"
        }
        output["license"] = license_expression
        output["dependsOn"] = component["dependencies"]
        output_components.append(output)
    source_locks = _lock_records(repo_root)
    serial_material = {
        "sourceLocks": source_locks,
        "components": [item["purl"] for item in output_components],
    }
    return {
        "schemaVersion": SBOM_SCHEMA,
        "serialNumber": f"urn:{document_digest(serial_material)}",
        "sourceLocks": source_locks,
        "components": output_components,
    }


def _normalize_license_expression(
    expression: str | None, classifiers: list[str] | None = None
) -> str | None:
    if expression:
        aliases = {
            "3-Clause BSD License": "BSD-3-Clause",
            "Apache 2": "Apache-2.0",
            "Apache 2.0": "Apache-2.0",
            "Apache License, Version 2.0": "Apache-2.0",
            "BSD": "BSD-3-Clause",
            "ISC License": "ISC",
            "MIT License": "MIT",
            "MIT OR Apache-2.0": "Apache-2.0 OR MIT",
            "Modified BSD License": "BSD-3-Clause",
            "PSF": "PSF-2.0",
        }
        normalized = aliases.get(expression.strip(), expression.strip())
        if "\n" not in normalized and len(normalized) <= 100:
            return normalized
    classifier_map = {
        "License :: OSI Approved :: Apache Software License": "Apache-2.0",
        "License :: OSI Approved :: BSD License": "BSD-3-Clause",
        "License :: OSI Approved :: ISC License (ISCL)": "ISC",
        "License :: OSI Approved :: MIT License": "MIT",
        (
            "License :: OSI Approved :: Mozilla Public License 2.0 "
            "(MPL 2.0)"
        ): "MPL-2.0",
        (
            "License :: OSI Approved :: Python Software Foundation License"
        ): "PSF-2.0",
    }
    for classifier in classifiers or []:
        if classifier in classifier_map:
            return classifier_map[classifier]
    return None


def suggest_license_registry(
    repo_root: Path,
    *,
    python_site_packages: Path | list[Path],
    node_modules: Path,
) -> dict[str, Any]:
    """Build an offline review starting point from installed package metadata."""
    components = locked_production_components(repo_root)
    node_metadata: dict[tuple[str, str], tuple[str, str]] = {}
    for package_json in node_modules.rglob("package.json"):
        try:
            package = json.loads(package_json.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            continue
        name = package.get("name")
        version = package.get("version")
        raw_license = package.get("license")
        if isinstance(raw_license, dict):
            raw_license = raw_license.get("type")
        expression = _normalize_license_expression(
            raw_license if isinstance(raw_license, str) else None
        )
        if (
            isinstance(name, str)
            and isinstance(version, str)
            and expression is not None
        ):
            relative = package_json.relative_to(node_modules).as_posix()
            node_metadata[(name, version)] = (expression, relative)

    python_metadata: dict[tuple[str, str], tuple[str, str]] = {}
    python_metadata_roots = (
        [python_site_packages]
        if isinstance(python_site_packages, Path)
        else python_site_packages
    )
    for metadata_root in python_metadata_roots:
        for metadata_path in metadata_root.glob("*.dist-info/METADATA"):
            try:
                metadata = Parser().parsestr(
                    metadata_path.read_text(encoding="utf-8")
                )
            except (OSError, UnicodeDecodeError):
                continue
            name = metadata.get("Name")
            version = metadata.get("Version")
            expression = _normalize_license_expression(
                metadata.get("License-Expression") or metadata.get("License"),
                metadata.get_all("Classifier", []),
            )
            if (
                isinstance(name, str)
                and isinstance(version, str)
                and expression is not None
            ):
                normalized_name = name.lower().replace("_", "-")
                python_metadata[(normalized_name, version)] = (
                    expression,
                    metadata_path.parent.name,
                )

    reviewed_fallbacks = {
        ("pypi", "annotated-types"): "MIT",
        ("pypi", "markdown-it-py"): "MIT",
        ("pypi", "mdurl"): "MIT",
    }
    reviewed_existing: dict[str, tuple[str, str]] = {}
    try:
        existing_registry = read_canonical_json(
            _repository_file(
                repo_root,
                LICENSES_PATH,
                require_tracked=False,
            )
        )
    except (OSError, ValueError, json.JSONDecodeError):
        existing_registry = None
    if (
        isinstance(existing_registry, dict)
        and existing_registry.get("schemaVersion") == LICENSE_SCHEMA
        and isinstance(existing_registry.get("licenses"), list)
    ):
        for item in existing_registry["licenses"]:
            if (
                isinstance(item, dict)
                and set(item) == {"component", "expression", "evidence"}
                and isinstance(item.get("component"), str)
                and isinstance(item.get("expression"), str)
                and item["expression"]
                and isinstance(item.get("evidence"), str)
                and item["evidence"]
            ):
                reviewed_existing[item["component"]] = (
                    item["expression"],
                    item["evidence"],
                )
    entries: list[dict[str, str]] = []
    missing: list[str] = []
    for component in components:
        key = (component["name"], component["version"])
        metadata_entry = (
            node_metadata.get(key)
            if component["ecosystem"] == "npm"
            else python_metadata.get(key)
        )
        if metadata_entry is None:
            fallback = reviewed_fallbacks.get(
                (component["ecosystem"], component["name"])
            )
            existing = reviewed_existing.get(component["purl"])
            if existing is not None:
                expression, previous_evidence = existing
                evidence = (
                    "reviewed-registry:preserved exact platform component; "
                    + previous_evidence
                )
            elif fallback is None:
                missing.append(component["purl"])
                continue
            else:
                expression = fallback
                evidence = "reviewed-registry:manual SPDX confirmation"
        else:
            expression, source = metadata_entry
            evidence = f"lock-metadata:{source}"
        entries.append(
            {
                "component": component["purl"],
                "expression": expression,
                "evidence": evidence,
            }
        )
    if missing:
        raise ValueError(
            "license metadata missing for production components: "
            + ", ".join(missing)
        )
    return {
        "schemaVersion": LICENSE_SCHEMA,
        "licenses": entries,
    }


def _validate_license_policy(document: Any) -> tuple[list[str], set[str]]:
    errors = _check_exact_keys(
        document,
        location="licensePolicy",
        required={"schemaVersion", "allowedExpressions"},
    )
    if not isinstance(document, dict):
        return errors, set()
    if document.get("schemaVersion") != LICENSE_POLICY_SCHEMA:
        errors.append(
            f"licensePolicy.schemaVersion: must be {LICENSE_POLICY_SCHEMA}"
        )
    allowed = document.get("allowedExpressions")
    if (
        not isinstance(allowed, list)
        or not allowed
        or len(allowed) != len(set(allowed))
        or not all(isinstance(item, str) and item for item in allowed)
    ):
        errors.append(
            "licensePolicy.allowedExpressions: must be unique and non-empty"
        )
        return errors, set()
    return errors, set(allowed)


def _validate_license_registry(
    document: Any,
    component_purls: set[str],
    allowed_expressions: set[str],
) -> list[str]:
    errors = _check_exact_keys(
        document,
        location="licenses",
        required={"schemaVersion", "licenses"},
    )
    if not isinstance(document, dict):
        return errors
    if document.get("schemaVersion") != LICENSE_SCHEMA:
        errors.append(f"licenses.schemaVersion: must be {LICENSE_SCHEMA}")
    entries = document.get("licenses")
    if not isinstance(entries, list):
        return errors + ["licenses.licenses: must be an array"]
    seen: set[str] = set()
    for index, item in enumerate(entries):
        label = f"licenses.licenses[{index}]"
        errors.extend(
            _check_exact_keys(
                item,
                location=label,
                required={"component", "expression", "evidence"},
            )
        )
        if not isinstance(item, dict):
            continue
        component = item.get("component")
        if component in seen:
            errors.append(f"{label}.component: duplicate component")
        seen.add(component)
        expression = item.get("expression")
        if expression in {"NOASSERTION", "UNKNOWN", None, ""}:
            errors.append(f"{label}.expression: unknown license is forbidden")
        elif expression not in allowed_expressions:
            errors.append(f"{label}.expression: license is not allowed")
        evidence = item.get("evidence")
        if (
            not isinstance(evidence, str)
            or not evidence.startswith(("lock-metadata:", "reviewed-registry:"))
        ):
            errors.append(f"{label}.evidence: provenance is required")
    missing = sorted(component_purls - seen)
    extra = sorted(seen - component_purls)
    if missing:
        errors.append(
            f"licenses: production components missing license: {', '.join(missing)}"
        )
    if extra:
        errors.append(
            f"licenses: stale components not present in locks: {', '.join(extra)}"
        )
    return errors


def _validate_primary_response(
    record: Any,
    location: str,
) -> tuple[list[str], Any]:
    errors = _check_exact_keys(
        record,
        location=location,
        required={
            "contentEncoding",
            "rawBase64",
            "rawSha256",
            "canonical",
            "canonicalSha256",
        },
    )
    if not isinstance(record, dict):
        return errors, None
    encoding = record.get("contentEncoding")
    if encoding not in {"gzip", "identity"}:
        errors.append(f"{location}.contentEncoding: unsupported value")
    encoded = record.get("rawBase64")
    try:
        if not isinstance(encoded, str):
            raise ValueError
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, TypeError):
        errors.append(f"{location}.rawBase64: invalid base64 bytes")
        return errors, record.get("canonical")
    if record.get("rawSha256") != _blob_digest(raw):
        errors.append(f"{location}.rawSha256: raw response digest is stale")
    try:
        decoded = gzip.decompress(raw) if encoding == "gzip" else raw
        parsed = json.loads(
            decoded.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_constant,
            parse_float=str,
        )
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError):
        errors.append(f"{location}.rawBase64: raw response is not valid JSON")
        return errors, record.get("canonical")
    if parsed != record.get("canonical"):
        errors.append(
            f"{location}.canonical: canonical response differs from raw bytes"
        )
    try:
        canonical_digest = document_digest(record.get("canonical"))
    except ValueError:
        errors.append(f"{location}.canonical: unsupported canonical JSON value")
    else:
        if record.get("canonicalSha256") != canonical_digest:
            errors.append(
                f"{location}.canonicalSha256: canonical response digest is stale"
            )
    return errors, record.get("canonical")


def _primary_severity(vulnerability: dict[str, Any]) -> str:
    textual: list[str] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key.casefold() == "severity" and isinstance(child, str):
                    textual.append(child.casefold())
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(vulnerability)
    for severity in ("critical", "high", "moderate", "medium", "low"):
        if severity in textual:
            return "moderate" if severity == "medium" else severity
    return "critical"


def _expected_osv_query(component: dict[str, Any]) -> dict[str, Any]:
    return {
        "package": {
            "ecosystem": (
                "PyPI" if component.get("ecosystem") == "pypi" else "npm"
            ),
            "name": component.get("name"),
        },
        "version": component.get("version"),
    }


def _validate_advisory_database(
    document: Any,
    *,
    now: datetime,
    components: list[dict[str, Any]],
) -> tuple[list[str], list[dict[str, Any]]]:
    errors = _check_exact_keys(
        document,
        location="advisoryDatabase",
        required={
            "schemaVersion",
            "database",
            "components",
            "componentsSha256",
            "entries",
            "npmCorroboration",
            "osv",
        },
    )
    if not isinstance(document, dict):
        return errors, []
    if document.get("schemaVersion") != ADVISORY_DATABASE_SCHEMA:
        errors.append(
            "advisoryDatabase.schemaVersion: "
            f"must be {ADVISORY_DATABASE_SCHEMA}"
        )
    metadata = document.get("database")
    errors.extend(
        _check_exact_keys(
            metadata,
            location="advisoryDatabase.database",
            required={
                "authority",
                "fetchedAt",
                "name",
                "version",
                "source",
                "validUntil",
                "ecosystems",
            },
        )
    )
    if isinstance(metadata, dict):
        if metadata.get("authority") != "OSV":
            errors.append(
                "advisoryDatabase.database.authority: OSV authority is required"
            )
        for field in ("name", "version", "source"):
            if not isinstance(metadata.get(field), str) or not metadata.get(field):
                errors.append(
                    f"advisoryDatabase.database.{field}: must be non-empty"
                )
        ecosystems = metadata.get("ecosystems")
        if (
            not isinstance(ecosystems, list)
            or not ecosystems
            or ecosystems != sorted(set(ecosystems))
            or not all(item in {"npm", "pypi"} for item in ecosystems)
        ):
            errors.append(
                "advisoryDatabase.database.ecosystems: "
                "must be a sorted unique supported ecosystem list"
            )
        try:
            fetched_at = _parse_timestamp(
                metadata.get("fetchedAt"),
                "advisoryDatabase.database.fetchedAt",
            )
            valid_until = _parse_timestamp(
                metadata.get("validUntil"),
                "advisoryDatabase.database.validUntil",
            )
            if fetched_at > now:
                errors.append(
                    "advisoryDatabase.database.fetchedAt: "
                    "snapshot retrieval is in the future"
                )
            if valid_until <= now:
                errors.append(
                    "advisoryDatabase.database.validUntil: database is expired"
                )
            if valid_until <= fetched_at:
                errors.append(
                    "advisoryDatabase.database.validUntil: "
                    "must be after generation"
                )
            elif valid_until - fetched_at > MAX_DATABASE_VALIDITY:
                errors.append(
                    "advisoryDatabase.database.validUntil: "
                    "validity exceeds 31 days"
                )
        except ValueError as exc:
            errors.append(str(exc))

    expected_purls = [component["purl"] for component in components]
    if document.get("components") != expected_purls:
        errors.append(
            "advisoryDatabase.components: per-component coverage is not 1:1 "
            "with the canonical production graph"
        )
    if document.get("componentsSha256") != document_digest(
        {"components": expected_purls}
    ):
        errors.append(
            "advisoryDatabase.componentsSha256: component coverage digest is stale"
        )

    osv = document.get("osv")
    errors.extend(
        _check_exact_keys(
            osv,
            location="advisoryDatabase.osv",
            required={
                "endpoint",
                "mode",
                "request",
                "requestSha256",
                "response",
                "pages",
                "coverage",
                "vulnerabilities",
            },
        )
    )
    affected: set[tuple[str, str]] = set()
    expected_queries = [_expected_osv_query(component) for component in components]
    results: list[Any] = []
    page_records: list[Any] = []
    if isinstance(osv, dict):
        if osv.get("endpoint") != "https://api.osv.dev/v1/querybatch":
            errors.append("advisoryDatabase.osv.endpoint: unexpected OSV endpoint")
        if osv.get("mode") != "querybatch-with-bounded-query-pagination":
            errors.append("advisoryDatabase.osv.mode: unsupported collection mode")
        expected_request = {"queries": expected_queries}
        if osv.get("request") != expected_request:
            errors.append(
                "advisoryDatabase.osv.request: canonical ordered query set is stale"
            )
        if osv.get("requestSha256") != document_digest(expected_request):
            errors.append("advisoryDatabase.osv.requestSha256: request digest is stale")
        response_errors, response = _validate_primary_response(
            osv.get("response"),
            "advisoryDatabase.osv.response",
        )
        errors.extend(response_errors)
        if isinstance(response, dict) and isinstance(response.get("results"), list):
            results = response["results"]
        else:
            errors.append(
                "advisoryDatabase.osv.response: querybatch results are required"
            )
        if len(results) != len(components):
            errors.append(
                "advisoryDatabase.osv.response: result count/order mapping "
                "must be 1:1"
            )
        pages = osv.get("pages")
        if not isinstance(pages, list):
            errors.append("advisoryDatabase.osv.pages: must be an array")
        else:
            page_records = pages

    pages_by_index: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for page_index, page in enumerate(page_records):
        label = f"advisoryDatabase.osv.pages[{page_index}]"
        errors.extend(
            _check_exact_keys(
                page,
                location=label,
                required={
                    "component",
                    "endpoint",
                    "index",
                    "request",
                    "requestSha256",
                    "response",
                },
            )
        )
        if not isinstance(page, dict):
            continue
        index = page.get("index")
        if not isinstance(index, int) or isinstance(index, bool):
            errors.append(f"{label}.index: must be an integer")
            continue
        pages_by_index[index].append(page)

    coverage = osv.get("coverage") if isinstance(osv, dict) else None
    if not isinstance(coverage, list) or len(coverage) != len(components):
        errors.append(
            "advisoryDatabase.osv.coverage: exact per-component coverage is required"
        )
        coverage = []
    for index, component in enumerate(components):
        first_result = results[index] if index < len(results) else None
        if not isinstance(first_result, dict):
            errors.append(
                f"advisoryDatabase.osv.response.results[{index}]: "
                "must be an object"
            )
            first_result = {}
        expected_result_digests = [document_digest(first_result)]
        current_result = first_result
        expected_query = expected_queries[index]
        for page_number, page in enumerate(pages_by_index.get(index, [])):
            label = (
                f"advisoryDatabase.osv.pages[{index}:{page_number}]"
            )
            token = current_result.get("next_page_token")
            expected_page_request = (
                {**expected_query, "page_token": token}
                if isinstance(token, str) and token
                else None
            )
            if expected_page_request is None:
                errors.append(f"{label}: unexpected page without continuation token")
            if page.get("component") != component["purl"]:
                errors.append(f"{label}.component: page mapping is stale")
            if page.get("endpoint") != "https://api.osv.dev/v1/query":
                errors.append(f"{label}.endpoint: unexpected OSV endpoint")
            if page.get("request") != expected_page_request:
                errors.append(f"{label}.request: continuation request is stale")
            if (
                expected_page_request is not None
                and page.get("requestSha256")
                != document_digest(expected_page_request)
            ):
                errors.append(f"{label}.requestSha256: page request digest is stale")
            response_errors, page_response = _validate_primary_response(
                page.get("response"),
                f"{label}.response",
            )
            errors.extend(response_errors)
            if not isinstance(page_response, dict):
                page_response = {}
            expected_result_digests.append(document_digest(page_response))
            current_result = page_response
        if current_result.get("next_page_token"):
            errors.append(
                f"advisoryDatabase.osv.coverage[{index}]: "
                "pagination is incomplete"
            )
        if index < len(coverage):
            expected_coverage = {
                "component": component["purl"],
                "index": index,
                "query": expected_query,
                "querySha256": document_digest(expected_query),
                "resultSha256": expected_result_digests,
            }
            if coverage[index] != expected_coverage:
                errors.append(
                    f"advisoryDatabase.osv.coverage[{index}]: "
                    "count/order/result mapping is stale"
                )
        for result in [first_result, *[
            page.get("response", {}).get("canonical", {})
            for page in pages_by_index.get(index, [])
            if isinstance(page, dict)
        ]]:
            vulnerabilities = result.get("vulns", []) if isinstance(result, dict) else []
            if not isinstance(vulnerabilities, list):
                errors.append(
                    f"advisoryDatabase.osv.coverage[{index}]: "
                    "vulnerabilities must be an array"
                )
                continue
            for vulnerability in vulnerabilities:
                advisory_id = (
                    vulnerability.get("id")
                    if isinstance(vulnerability, dict)
                    else None
                )
                if not isinstance(advisory_id, str) or not advisory_id:
                    errors.append(
                        f"advisoryDatabase.osv.coverage[{index}]: "
                        "unknown vulnerability identity"
                    )
                else:
                    affected.add((advisory_id, component["purl"]))

    detail_by_id: dict[str, dict[str, Any]] = {}
    vulnerabilities = osv.get("vulnerabilities") if isinstance(osv, dict) else None
    if not isinstance(vulnerabilities, list):
        errors.append("advisoryDatabase.osv.vulnerabilities: must be an array")
        vulnerabilities = []
    for index, vulnerability in enumerate(vulnerabilities):
        label = f"advisoryDatabase.osv.vulnerabilities[{index}]"
        errors.extend(
            _check_exact_keys(
                vulnerability,
                location=label,
                required={"endpoint", "id", "response"},
            )
        )
        if not isinstance(vulnerability, dict):
            continue
        advisory_id = vulnerability.get("id")
        if (
            not isinstance(advisory_id, str)
            or advisory_id in detail_by_id
            or (advisory_id, None) in detail_by_id
        ):
            errors.append(f"{label}.id: must be a unique advisory identity")
            continue
        expected_endpoint = (
            "https://api.osv.dev/v1/vulns/" + quote(advisory_id, safe="")
        )
        if vulnerability.get("endpoint") != expected_endpoint:
            errors.append(f"{label}.endpoint: unexpected OSV detail endpoint")
        response_errors, detail = _validate_primary_response(
            vulnerability.get("response"),
            f"{label}.response",
        )
        errors.extend(response_errors)
        if not isinstance(detail, dict) or detail.get("id") != advisory_id:
            errors.append(f"{label}.response: detail identity is stale")
        else:
            detail_by_id[advisory_id] = detail
    affected_ids = {advisory_id for advisory_id, _ in affected}
    if set(detail_by_id) != affected_ids:
        errors.append(
            "advisoryDatabase.osv.vulnerabilities: every result must have "
            "one primary detail and no unrelated details"
        )

    expected_entries = [
        {
            "component": component,
            "id": advisory_id,
            "severity": _primary_severity(detail_by_id[advisory_id]),
        }
        for advisory_id, component in sorted(affected)
        if advisory_id in detail_by_id
    ]
    entries = document.get("entries")
    if entries != expected_entries:
        errors.append(
            "advisoryDatabase.entries: findings do not match exact primary results"
        )

    npm = document.get("npmCorroboration")
    errors.extend(
        _check_exact_keys(
            npm,
            location="advisoryDatabase.npmCorroboration",
            required={
                "coverage",
                "endpoint",
                "mode",
                "request",
                "requestSha256",
                "response",
            },
        )
    )
    npm_components = [
        component for component in components if component["ecosystem"] == "npm"
    ]
    expected_npm_request: dict[str, list[str]] = {}
    for component in npm_components:
        expected_npm_request.setdefault(component["name"], []).append(
            component["version"]
        )
    expected_npm_request = {
        name: sorted(set(versions))
        for name, versions in sorted(expected_npm_request.items())
    }
    if isinstance(npm, dict):
        if npm.get("endpoint") != (
            "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk"
        ):
            errors.append(
                "advisoryDatabase.npmCorroboration.endpoint: "
                "unexpected registry endpoint"
            )
        if npm.get("mode") != "bulk-advisory-corroboration-only":
            errors.append(
                "advisoryDatabase.npmCorroboration.mode: "
                "must be explicit corroboration"
            )
        if npm.get("coverage") != [
            component["purl"] for component in npm_components
        ]:
            errors.append(
                "advisoryDatabase.npmCorroboration.coverage: "
                "npm mapping is incomplete"
            )
        if npm.get("request") != expected_npm_request:
            errors.append(
                "advisoryDatabase.npmCorroboration.request: request is stale"
            )
        if npm.get("requestSha256") != document_digest(expected_npm_request):
            errors.append(
                "advisoryDatabase.npmCorroboration.requestSha256: "
                "request digest is stale"
            )
        response_errors, response = _validate_primary_response(
            npm.get("response"),
            "advisoryDatabase.npmCorroboration.response",
        )
        errors.extend(response_errors)
        if not isinstance(response, dict):
            errors.append(
                "advisoryDatabase.npmCorroboration.response: "
                "registry response must be an object"
            )
    return errors, entries if isinstance(entries, list) else []


def _scan_advisory_database(
    entries: list[dict[str, Any]],
    component_purls: set[str],
) -> list[dict[str, Any]]:
    return sorted(
        (
            {
                "id": entry["id"],
                "component": entry["component"],
                "severity": entry["severity"],
            }
            for entry in entries
            if entry.get("component") in component_purls
        ),
        key=lambda item: (item["id"], item["component"]),
    )


def _advisory_coverage(
    components: list[dict[str, Any]],
) -> dict[str, Any]:
    component_purls = sorted(item["purl"] for item in components)
    return {
        "ecosystems": sorted({item["ecosystem"] for item in components}),
        "componentCount": len(component_purls),
        "componentsDigest": document_digest({"components": component_purls}),
    }


def build_advisory_snapshot(
    repo_root: Path,
    database: dict[str, Any],
    *,
    generated_at: str,
) -> dict[str, Any]:
    """Scan exact locked production purls against a reviewed offline database."""
    _parse_timestamp(generated_at, "generated-at")
    components = locked_production_components(repo_root)
    component_purls = {item["purl"] for item in components}
    entries = database.get("entries", []) if isinstance(database, dict) else []
    findings = _scan_advisory_database(entries, component_purls)
    metadata = database.get("database", {}) if isinstance(database, dict) else {}
    scanner = {
        "name": SCANNER_NAME,
        "version": SCANNER_VERSION,
        "database": {
            "path": ADVISORY_DATABASE_PATH,
            "schemaVersion": database.get("schemaVersion"),
            "name": metadata.get("name"),
            "version": metadata.get("version"),
            "ecosystems": metadata.get("ecosystems"),
            "sha256": file_digest(
                _repository_file(
                    repo_root,
                    ADVISORY_DATABASE_PATH,
                    require_tracked=False,
                )
            ),
        },
    }
    material = {
        "generatedAt": generated_at,
        "scanner": scanner,
        "lockDigests": {
            item["path"]: item["sha256"] for item in _lock_records(repo_root)
        },
        "coverage": _advisory_coverage(components),
        "advisories": findings,
    }
    return {
        "schemaVersion": ADVISORY_SCHEMA,
        "snapshotId": document_digest(material),
        **material,
    }


def _validate_advisory_snapshot(
    document: Any,
    *,
    lock_records: list[dict[str, str]],
    components: list[dict[str, Any]],
    database: dict[str, Any],
    database_digest: str,
    database_entries: list[dict[str, Any]],
    now: datetime,
) -> tuple[list[str], list[dict[str, Any]]]:
    errors = _check_exact_keys(
        document,
        location="advisories",
        required={
            "schemaVersion",
            "snapshotId",
            "generatedAt",
            "scanner",
            "lockDigests",
            "coverage",
            "advisories",
        },
    )
    if not isinstance(document, dict):
        return errors, []
    if document.get("schemaVersion") != ADVISORY_SCHEMA:
        errors.append(f"advisories.schemaVersion: must be {ADVISORY_SCHEMA}")
    if not isinstance(document.get("snapshotId"), str) or not SHA256_ID.fullmatch(
        str(document.get("snapshotId", ""))
    ):
        errors.append("advisories.snapshotId: must be a sha256 snapshot identity")
    generated_at: datetime | None = None
    try:
        generated_at = _parse_timestamp(
            document.get("generatedAt"), "advisories.generatedAt"
        )
        if generated_at > now:
            errors.append(
                "advisories.generatedAt: scan issuance is in the future"
            )
        elif now - generated_at > MAX_SCAN_AGE:
            errors.append("advisories.generatedAt: advisory scan is stale")
    except ValueError as exc:
        errors.append(str(exc))
    scanner = document.get("scanner")
    errors.extend(
        _check_exact_keys(
            scanner,
            location="advisories.scanner",
            required={"name", "version", "database"},
        )
    )
    if isinstance(scanner, dict):
        if scanner.get("name") != SCANNER_NAME:
            errors.append("advisories.scanner.name: unsupported scanner")
        if scanner.get("version") != SCANNER_VERSION:
            errors.append("advisories.scanner.version: unsupported scanner version")
        database_record = scanner.get("database")
        errors.extend(
            _check_exact_keys(
                database_record,
                location="advisories.scanner.database",
                required={
                    "path",
                    "schemaVersion",
                    "name",
                    "version",
                    "ecosystems",
                    "sha256",
                },
            )
        )
        metadata = (
            database.get("database", {}) if isinstance(database, dict) else {}
        )
        expected_database_record = {
            "path": ADVISORY_DATABASE_PATH,
            "schemaVersion": ADVISORY_DATABASE_SCHEMA,
            "name": metadata.get("name"),
            "version": metadata.get("version"),
            "ecosystems": metadata.get("ecosystems"),
            "sha256": database_digest,
        }
        if database_record != expected_database_record:
            errors.append(
                "advisories.scanner.database: "
                "database digest/version binding is stale"
            )
        if generated_at is not None and isinstance(metadata, dict):
            try:
                database_generated_at = _parse_timestamp(
                    metadata.get("fetchedAt"),
                    "advisoryDatabase.database.fetchedAt",
                )
                if generated_at < database_generated_at:
                    errors.append(
                        "advisories.generatedAt: scan predates its database"
                    )
            except ValueError as exc:
                errors.append(str(exc))
    expected_locks = {item["path"]: item["sha256"] for item in lock_records}
    if document.get("lockDigests") != expected_locks:
        errors.append("advisories.lockDigests: stale production lock snapshot")
    expected_coverage = _advisory_coverage(components)
    if document.get("coverage") != expected_coverage:
        errors.append(
            "advisories.coverage: scan must cover the exact production graph"
        )
    if (
        isinstance(scanner, dict)
        and isinstance(scanner.get("database"), dict)
        and scanner["database"].get("ecosystems")
        != expected_coverage["ecosystems"]
    ):
        errors.append(
            "advisories.coverage: advisory database does not cover "
            "every production ecosystem"
        )
    findings = document.get("advisories")
    if not isinstance(findings, list):
        return errors + ["advisories.advisories: must be an array"], []
    snapshot_material = {
        key: document.get(key)
        for key in (
            "generatedAt",
            "scanner",
            "lockDigests",
            "coverage",
            "advisories",
        )
    }
    if document.get("snapshotId") != document_digest(snapshot_material):
        errors.append("advisories.snapshotId: stale advisory snapshot digest")
    component_purls = {item["purl"] for item in components}
    expected_findings = _scan_advisory_database(
        database_entries, component_purls
    )
    if findings != expected_findings:
        errors.append(
            "advisories.advisories: findings were not produced by "
            "the bound offline database"
        )
    seen: set[tuple[Any, Any]] = set()
    for index, finding in enumerate(findings):
        label = f"advisories.advisories[{index}]"
        errors.extend(
            _check_exact_keys(
                finding,
                location=label,
                required={"id", "component", "severity"},
            )
        )
        if not isinstance(finding, dict):
            continue
        key = (finding.get("id"), finding.get("component"))
        if key in seen:
            errors.append(f"{label}: duplicate advisory/package finding")
        seen.add(key)
        if finding.get("component") not in component_purls:
            errors.append(f"{label}.component: package is absent from production SBOM")
        if finding.get("severity") not in SEVERITIES:
            errors.append(f"{label}.severity: unsupported severity")
    return errors, findings


def _validate_waiver_registry_shape(
    document: Any,
) -> tuple[list[str], list[dict[str, Any]]]:
    errors = _check_exact_keys(
        document,
        location="waiverRegistry",
        required={"schemaVersion", "waivers"},
    )
    if not isinstance(document, dict):
        return errors, []
    if document.get("schemaVersion") != WAIVER_SCHEMA:
        errors.append(f"waiverRegistry.schemaVersion: must be {WAIVER_SCHEMA}")
    waivers = document.get("waivers")
    if not isinstance(waivers, list):
        return errors + ["waiverRegistry.waivers: must be an array"], []
    return errors, waivers


def _validate_sbom_document(
    document: Any, expected: dict[str, Any]
) -> list[str]:
    errors = _check_exact_keys(
        document,
        location="productionSbom",
        required={"schemaVersion", "serialNumber", "sourceLocks", "components"},
    )
    if not isinstance(document, dict):
        return errors
    if document.get("schemaVersion") != SBOM_SCHEMA:
        errors.append(f"productionSbom.schemaVersion: must be {SBOM_SCHEMA}")
    if document.get("sourceLocks") != expected["sourceLocks"]:
        errors.append("productionSbom.sourceLocks: stale production lock binding")
    components = document.get("components")
    if not isinstance(components, list) or not components:
        errors.append("productionSbom.components: must be a non-empty array")
    else:
        seen: set[str] = set()
        for index, component in enumerate(components):
            label = f"productionSbom.components[{index}]"
            if not isinstance(component, dict):
                errors.append(f"{label}: must be an object")
                continue
            purl = component.get("purl")
            if not isinstance(purl, str) or not purl.startswith("pkg:"):
                errors.append(f"{label}.purl: must be an exact package purl")
            elif purl in seen:
                errors.append(f"{label}: duplicate SBOM component: {purl}")
            else:
                seen.add(purl)
            if component.get("license") in {None, "", "UNKNOWN", "NOASSERTION"}:
                errors.append(f"{label}.license: known license is required")
            depends_on = component.get("dependsOn")
            if (
                not isinstance(depends_on, list)
                or len(depends_on) != len(set(depends_on))
                or not all(
                    isinstance(dependency, str)
                    and dependency.startswith("pkg:")
                    for dependency in depends_on
                )
            ):
                errors.append(f"{label}.dependsOn: must be unique package purls")
    if document != expected:
        errors.append(
            "production SBOM is stale or does not cover the exact lock graph"
        )
    return errors


def _load_ci_gate() -> Any:
    """Load the repository's sole CI topology and inventory authority."""
    module_name = "_release_candidate_ci_gate"
    existing = sys.modules.get(module_name)
    if existing is not None:
        return existing
    module_path = Path(__file__).with_name("ci_gate.py")
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise ValueError("cannot load authoritative CI gate")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    try:
        spec.loader.exec_module(module)
    except Exception:
        sys.modules.pop(module_name, None)
        raise
    return module


def validate_repository_supply_chain(
    repo_root: Path,
    *,
    reject_high_findings: bool = True,
    now: str | None = None,
) -> tuple[list[str], list[dict[str, Any]], list[dict[str, Any]]]:
    """Verify locks, complete SBOM, licenses, advisories, waivers and suites."""
    errors: list[str] = []
    try:
        current_time = _parse_timestamp(now or _default_now(), "now")
        license_policy = read_canonical_json(
            _repository_file(
                repo_root, LICENSE_POLICY_PATH, require_tracked=False
            )
        )
        policy_errors, allowed_expressions = _validate_license_policy(
            license_policy
        )
        errors.extend(policy_errors)
        licenses = read_canonical_json(
            _repository_file(
                repo_root, LICENSES_PATH, require_tracked=False
            )
        )
        components = locked_production_components(repo_root)
        component_purls = {item["purl"] for item in components}
        errors.extend(
            _validate_license_registry(
                licenses,
                component_purls,
                allowed_expressions,
            )
        )
        expected_sbom = build_production_sbom(repo_root, licenses)
        actual_sbom = read_canonical_json(
            _repository_file(repo_root, SBOM_PATH, require_tracked=False)
        )
        errors.extend(_validate_sbom_document(actual_sbom, expected_sbom))
        lock_records = _lock_records(repo_root)
        database_path = _repository_file(
            repo_root,
            ADVISORY_DATABASE_PATH,
            require_tracked=False,
        )
        advisory_database = read_canonical_json(database_path)
        database_errors, database_entries = _validate_advisory_database(
            advisory_database,
            now=current_time,
            components=components,
        )
        errors.extend(database_errors)
        advisories = read_canonical_json(
            _repository_file(
                repo_root, ADVISORIES_PATH, require_tracked=False
            )
        )
        advisory_errors, findings = _validate_advisory_snapshot(
            advisories,
            lock_records=lock_records,
            components=components,
            database=advisory_database,
            database_digest=file_digest(database_path),
            database_entries=database_entries,
            now=current_time,
        )
        errors.extend(advisory_errors)
        waiver_registry = read_canonical_json(
            _repository_file(repo_root, WAIVERS_PATH, require_tracked=False)
        )
        waiver_errors, waivers = _validate_waiver_registry_shape(waiver_registry)
        errors.extend(waiver_errors)
        if reject_high_findings:
            for finding in findings:
                if finding.get("severity") in HIGH_SEVERITIES:
                    errors.append(
                        "unaccepted high/critical advisory in repository gate: "
                        f"{finding.get('id')} for {finding.get('component')}"
                    )
        ci_gate = _load_ci_gate()
        suite_manifest = ci_gate.load_manifest(
            _repository_file(
                repo_root,
                SUITE_MANIFEST_PATH,
                require_tracked=False,
            )
        )
        suite_contract = ci_gate.load_manifest(
            _repository_file(
                repo_root,
                SUITE_CONTRACT_PATH,
                require_tracked=False,
            )
        )
        errors.extend(
            ci_gate.validate_manifest(
                suite_manifest,
                repo_root,
                suite_contract,
            )
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        errors.append(str(exc))
        return errors, [], []
    return errors, findings, waivers


def _validate_reviewer_trust_roots(
    document: Any,
) -> tuple[list[str], dict[str, dict[str, Any]]]:
    errors = _check_exact_keys(
        document,
        location="reviewerTrustRoots",
        required={"schemaVersion", "keys"},
    )
    if not isinstance(document, dict):
        return errors, {}
    if document.get("schemaVersion") != REVIEW_TRUST_ROOTS_SCHEMA:
        errors.append(
            "reviewerTrustRoots.schemaVersion: "
            f"must be {REVIEW_TRUST_ROOTS_SCHEMA}"
        )
    keys = document.get("keys")
    if not isinstance(keys, list):
        return errors + ["reviewerTrustRoots.keys: must be an array"], {}
    by_id: dict[str, dict[str, Any]] = {}
    observed_ids: list[str] = []
    for index, key in enumerate(keys):
        label = f"reviewerTrustRoots.keys[{index}]"
        errors.extend(
            _check_exact_keys(
                key,
                location=label,
                required={
                    "keyId",
                    "algorithm",
                    "publicKey",
                    "subjects",
                    "roles",
                    "validFrom",
                    "validUntil",
                },
            )
        )
        if not isinstance(key, dict):
            continue
        key_id = key.get("keyId")
        if (
            not isinstance(key_id, str)
            or not key_id
            or key_id in by_id
            or len(key_id) > 128
        ):
            errors.append(f"{label}.keyId: must be a unique key identity")
            continue
        observed_ids.append(key_id)
        if key.get("algorithm") != "ed25519":
            errors.append(f"{label}.algorithm: must be ed25519")
        try:
            public_key = base64.b64decode(
                key.get("publicKey", ""),
                validate=True,
            )
            if len(public_key) != 32:
                raise ValueError
            Ed25519PublicKey.from_public_bytes(public_key)
        except (ValueError, TypeError):
            errors.append(f"{label}.publicKey: invalid Ed25519 public key")
        subjects = key.get("subjects")
        if (
            not isinstance(subjects, list)
            or not subjects
            or subjects != sorted(set(subjects))
            or not all(
                isinstance(subject, str)
                and NORMALIZED_MAILTO.fullmatch(subject)
                for subject in subjects
            )
        ):
            errors.append(f"{label}.subjects: normalized subjects are required")
        roles = key.get("roles")
        if roles != ["independent-reviewer"]:
            errors.append(
                f"{label}.roles: independent-reviewer is the sole supported role"
            )
        try:
            valid_from = _parse_timestamp(
                key.get("validFrom"),
                f"{label}.validFrom",
            )
            valid_until = _parse_timestamp(
                key.get("validUntil"),
                f"{label}.validUntil",
            )
            if valid_until <= valid_from:
                errors.append(f"{label}.validUntil: must be after validFrom")
        except ValueError as exc:
            errors.append(str(exc))
        by_id[key_id] = key
    if observed_ids != sorted(observed_ids):
        errors.append("reviewerTrustRoots.keys: keys must be sorted by keyId")
    return errors, by_id


def _verify_review_signature(
    review: dict[str, Any],
    trust_key: dict[str, Any],
    *,
    location: str,
) -> list[str]:
    errors: list[str] = []
    if review.get("reviewer") not in trust_key.get("subjects", []):
        errors.append(f"{location}.reviewer: identity is absent from trust root")
    if review.get("reviewerRole") not in trust_key.get("roles", []):
        errors.append(f"{location}.reviewerRole: role is absent from trust root")
    try:
        issued_at = _parse_timestamp(
            review.get("issuedAt"),
            f"{location}.issuedAt",
        )
        valid_from = _parse_timestamp(
            trust_key.get("validFrom"),
            f"{location}.trustRoot.validFrom",
        )
        valid_until = _parse_timestamp(
            trust_key.get("validUntil"),
            f"{location}.trustRoot.validUntil",
        )
        if not valid_from <= issued_at < valid_until:
            errors.append(
                f"{location}.issuedAt: signature is outside key validity"
            )
    except ValueError as exc:
        errors.append(str(exc))
    try:
        public_key = Ed25519PublicKey.from_public_bytes(
            base64.b64decode(trust_key["publicKey"], validate=True)
        )
        signature = base64.b64decode(review["signature"], validate=True)
        public_key.verify(
            signature,
            canonical_json_bytes(_review_signature_material(review)),
        )
    except (InvalidSignature, KeyError, TypeError, ValueError):
        errors.append(f"{location}.signature: Ed25519 verification failed")
    return errors


def _verify_file_record(
    repo_root: Path,
    record: dict[str, Any],
    location: str,
    *,
    commit: str | None = None,
) -> list[str]:
    try:
        if commit is None:
            path = _repository_file(repo_root, record["path"])
            actual = file_digest(path)
        else:
            blob = _assert_clean_material_path(
                repo_root,
                commit,
                record["path"],
            )
            actual = _blob_digest(blob)
    except (KeyError, OSError, ValueError) as exc:
        return [f"{location}: {exc}"]
    if actual != record.get("sha256"):
        return [
            f"{location}: stale digest for {record.get('path')}: "
            f"expected {record.get('sha256')}, observed {actual}"
        ]
    return []


def validate_candidate_repository(
    repo_root: Path,
    candidate: dict[str, Any],
    *,
    now: str,
) -> list[str]:
    errors = validate_candidate_shape(candidate)
    if errors:
        return errors
    try:
        current_time = _parse_timestamp(now, "now")
    except ValueError as exc:
        return [str(exc)]
    root = repo_root.resolve()
    subject = candidate["repository"]["candidate"]
    try:
        _reject_legacy_grafts(root)
        head = _git(root, "rev-parse", "--verify", "HEAD^{commit}")
        head_tree = _git(root, "rev-parse", "--verify", "HEAD^{tree}")
        branch = candidate["repository"]["branch"]
        if head != branch["commit"] or head_tree != branch["tree"]:
            errors.append("checkout HEAD does not equal the pinned evidence head")
        if _git(root, "status", "--porcelain=v1", "--untracked-files=no"):
            errors.append("checkout has tracked modifications")
        for name in ("base", "branch"):
            identity = candidate["repository"][name]
            resolved_identity = _resolve_exact_ref_identity(
                root,
                identity["ref"],
                allowed_prefixes=("refs/heads/",),
            )
            if resolved_identity != identity:
                errors.append(
                    f"repository.{name}: ref moved or resolves to mixed identity"
                )
        candidate_identity = _git_commit_identity(root, subject["commit"])
        if candidate_identity != subject:
            errors.append("repository.candidate: pinned commit/tree identity is mixed")
        errors.extend(
            _review_only_advancement_errors(
                root,
                subject["commit"],
                branch["commit"],
            )
        )
        merge_base = _git(
            root,
            "merge-base",
            candidate["repository"]["base"]["commit"],
            subject["commit"],
        )
        if merge_base != candidate["repository"]["mergeBase"]:
            errors.append("repository.mergeBase: stale or contradictory merge base")
        if not _git_is_ancestor(
            root,
            candidate["repository"]["base"]["commit"],
            subject["commit"],
        ):
            errors.append("repository.base: base is not an ancestor of candidate")
    except ValueError as exc:
        errors.append(str(exc))

    records: list[tuple[str, dict[str, Any]]] = []
    records.extend(
        (f"candidate.inputs[{index}]", item)
        for index, item in enumerate(candidate["inputs"])
    )
    records.extend(
        (f"candidate.locks[{index}]", item)
        for index, item in enumerate(candidate["locks"])
    )
    records.extend(
        (
            ("candidate.suiteManifest", candidate["suiteManifest"]),
            ("candidate.suiteContract", candidate["suiteContract"]),
        )
    )
    for name in (
        "sbom",
        "licenses",
        "licensePolicy",
        "advisories",
        "advisoryDatabase",
    ):
        records.append(
            (f"candidate.supplyChain.{name}", candidate["supplyChain"][name])
        )
    records.extend(
        (f"candidate.runtimes[{index}].source", item["source"])
        for index, item in enumerate(candidate["runtimes"])
    )
    try:
        expected_runtimes = _runtime_records(root, subject["commit"])
        if candidate["runtimes"] != expected_runtimes:
            errors.append(
                "candidate.runtimes: runtime contract is stale or detached "
                "from its manifests"
            )
    except ValueError as exc:
        errors.append(str(exc))
    material_digests: dict[str, str] = {}
    for location, record in records:
        errors.extend(
            _verify_file_record(
                root,
                record,
                location,
                commit=subject["commit"],
            )
        )
        path = record.get("path")
        digest = record.get("sha256")
        if path in material_digests and material_digests[path] != digest:
            errors.append(f"{location}: conflicting duplicate material digest")
        elif isinstance(path, str) and isinstance(digest, str):
            material_digests[path] = digest
    provenance_materials = {
        item["path"]: item["sha256"] for item in candidate["provenance"]["materials"]
    }
    if provenance_materials != material_digests:
        errors.append(
            "candidate.provenance.materials: must exactly cover candidate inputs"
        )

    trust_keys: dict[str, dict[str, Any]] = {}
    try:
        trust_document = read_canonical_json(
            _repository_file(root, REVIEW_TRUST_ROOTS_PATH)
        )
        trust_errors, trust_keys = _validate_reviewer_trust_roots(
            trust_document
        )
        errors.extend(trust_errors)
        candidate_timestamp = int(
            _git(root, "show", "-s", "--format=%ct", subject["commit"])
        )
        candidate_committed_at = datetime.fromtimestamp(
            candidate_timestamp,
            tz=timezone.utc,
        )
        actor_emails = _git(
            root,
            "show",
            "-s",
            "--format=%ae%n%ce",
            subject["commit"],
        ).splitlines()
        if len(actor_emails) != 2:
            raise ValueError("candidate Git actor identities are invalid")
        candidate_actors = {
            role: "mailto:" + email.strip().casefold()
            for role, email in zip(
                ("author", "committer"),
                actor_emails,
                strict=True,
            )
        }
        if not all(
            NORMALIZED_MAILTO.fullmatch(identity)
            for identity in candidate_actors.values()
        ):
            raise ValueError(
                "candidate Git actor identities must be normalized email addresses"
            )
    except (OSError, ValueError) as exc:
        errors.append(str(exc))
        candidate_committed_at = current_time
        candidate_actors = {}

    for index, review in enumerate(candidate["reviewEvidence"]):
        location = f"candidate.reviewEvidence[{index}]"
        try:
            issued_at = _parse_timestamp(
                review.get("issuedAt"),
                f"{location}.issuedAt",
            )
            if issued_at > current_time:
                errors.append(
                    f"{location}.issuedAt: "
                    "review issuance is in the future"
                )
            if issued_at < candidate_committed_at:
                errors.append(
                    f"{location}.issuedAt: review predates the candidate commit"
                )
        except ValueError as exc:
            errors.append(str(exc))
        for actor_role, actor_identity in candidate_actors.items():
            if review.get("reviewer") == actor_identity:
                errors.append(
                    f"{location}.reviewer: candidate {actor_role} "
                    "is not an independent reviewer"
                )
        trust_key = trust_keys.get(str(review.get("keyId", "")))
        if trust_key is None:
            errors.append(f"{location}.keyId: trust root is unknown")
        else:
            errors.extend(
                _verify_review_signature(
                    review,
                    trust_key,
                    location=location,
                )
            )

    supply_errors, findings, committed_waivers = validate_repository_supply_chain(
        root,
        reject_high_findings=False,
        now=now,
    )
    errors.extend(supply_errors)
    embedded_waivers = candidate["supplyChain"]["waivers"]
    if embedded_waivers != committed_waivers and committed_waivers:
        errors.append(
            "candidate.supplyChain.waivers: committed non-empty registry changed"
        )
    for waiver_index, waiver in enumerate(embedded_waivers):
        if not isinstance(waiver, dict):
            continue
        for evidence_index, evidence in enumerate(waiver.get("evidence", [])):
            location = (
                f"candidate.supplyChain.waivers[{waiver_index}] "
                f"waiver evidence[{evidence_index}]"
            )
            if isinstance(evidence, dict):
                errors.extend(
                    _verify_file_record(
                        root,
                        evidence,
                        location,
                        commit=subject["commit"],
                    )
                )
    errors.extend(
        validate_advisory_waivers(
            candidate,
            findings,
            embedded_waivers,
            now=now,
        )
    )
    return errors


def validate_state_ledger_repository(
    repo_root: Path,
    ledger: dict[str, Any],
    candidate: dict[str, Any],
    *,
    now: str,
) -> list[str]:
    errors = validate_candidate_shape(candidate)
    if errors:
        return [
            f"candidate for state ledger: {error}" for error in errors
        ]
    errors = validate_state_ledger_shape(ledger, candidate)
    if errors:
        return errors
    try:
        current_time = _parse_timestamp(now, "now")
        _reject_legacy_grafts(repo_root.resolve())
    except ValueError as exc:
        return [str(exc)]
    subject = candidate["repository"]["candidate"]
    reviews_by_digest = {
        item["digest"]: item for item in candidate.get("reviewEvidence", [])
    }
    previous_issued_at: datetime | None = None
    integration_commit: str | None = None
    promotion_commit: str | None = None
    evidence_by_kind: dict[str, dict[str, Any]] = {}
    for index, transition in enumerate(ledger["transitions"]):
        for evidence in transition["evidence"]:
            evidence_by_kind[evidence["kind"]] = evidence
            try:
                issued_at = _parse_timestamp(
                    evidence.get("issuedAt"),
                    f"stateLedger.transitions[{index}].evidence.issuedAt",
                )
                if issued_at > current_time:
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "evidence issuedAt is in the future"
                    )
                if (
                    previous_issued_at is not None
                    and issued_at < previous_issued_at
                ):
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "evidence issuedAt regresses"
                    )
                previous_issued_at = issued_at
            except ValueError as exc:
                errors.append(str(exc))
            if evidence["kind"] == "review":
                if evidence.get("verdict") != "OK":
                    errors.append(
                        f"stateLedger.transitions[{index}]: review verdict must be OK"
                    )
                attestation = reviews_by_digest.get(
                    evidence.get("attestationDigest")
                )
                if attestation is None:
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "review evidence is not candidate-bound"
                    )
                else:
                    try:
                        attestation_issued_at = _parse_timestamp(
                            attestation.get("issuedAt"),
                            "reviewAttestation.issuedAt",
                        )
                        evidence_issued_at = _parse_timestamp(
                            evidence.get("issuedAt"),
                            "reviewEvidence.issuedAt",
                        )
                        if evidence_issued_at < attestation_issued_at:
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "review transition predates attestation issuance"
                            )
                    except ValueError as exc:
                        errors.append(str(exc))
            if evidence["kind"] in {
                "integration-ref",
                "promotion-ref",
                "release-tag",
            }:
                ref = evidence.get("ref")
                if not isinstance(ref, str):
                    errors.append(
                        f"stateLedger.transitions[{index}]: ref evidence is required"
                    )
                    continue
                try:
                    allowed_prefixes = (
                        ("refs/tags/",)
                        if evidence["kind"] == "release-tag"
                        else ("refs/heads/",)
                    )
                    exact_identity = _resolve_exact_ref_identity(
                        repo_root,
                        ref,
                        allowed_prefixes=allowed_prefixes,
                    )
                    commit = exact_identity["commit"]
                    resolved_identity = {
                        "commit": commit,
                        "tree": exact_identity["tree"],
                    }
                    if resolved_identity != evidence.get("refIdentity"):
                        errors.append(
                            f"stateLedger.transitions[{index}]: "
                            "ref moved or differs from its evidence identity"
                        )
                    if not _git_is_ancestor(
                        repo_root,
                        subject["commit"],
                        commit,
                    ):
                        errors.append(
                            f"stateLedger.transitions[{index}]: "
                            "ref resolves outside the candidate ancestry"
                        )
                    if evidence["kind"] == "integration-ref":
                        if ref == candidate["repository"]["branch"]["ref"]:
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "isolated feature branch is not integration"
                            )
                        if not ref.startswith("refs/heads/"):
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "integration must bind a branch ref"
                            )
                        if not _git_is_ancestor(
                            repo_root,
                            candidate["repository"]["branch"]["commit"],
                            commit,
                        ):
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "integration does not contain the final "
                                "review-evidence head"
                            )
                        integration_commit = commit
                    elif evidence["kind"] == "promotion-ref":
                        if integration_commit is None:
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "promotion requires prior integration"
                            )
                        elif not _git_is_ancestor(
                            repo_root,
                            integration_commit,
                            commit,
                        ):
                            errors.append(
                                f"stateLedger.transitions[{index}]: "
                                "promotion does not contain integration"
                            )
                        promotion_commit = commit
                    elif (
                        evidence["kind"] == "release-tag"
                        and promotion_commit is not None
                        and commit != promotion_commit
                    ):
                        errors.append(
                            f"stateLedger.transitions[{index}]: "
                            "release tag does not identify the promoted commit"
                        )
                except ValueError as exc:
                    errors.append(f"stateLedger.transitions[{index}]: {exc}")
            if evidence["kind"] == "promotion-ref":
                if evidence.get("ref") != "refs/heads/main":
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "promotion must bind refs/heads/main"
                    )
            if evidence["kind"] == "release-tag":
                ref = evidence.get("ref")
                if not isinstance(ref, str) or not SEMVER_TAG.fullmatch(ref):
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "release must bind one canonical SemVer tag"
                    )
                expected_provenance = build_release_provenance(candidate)
                if evidence.get("provenance") != expected_provenance:
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "release provenance artifact is stale or detached"
                    )
                if evidence.get("provenanceDigest") != document_digest(
                    expected_provenance
                ):
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "release provenance digest is stale"
                    )
                required_evidence = {
                    kind: evidence_by_kind.get(kind)
                    for kind in ("review", "integration-ref", "promotion-ref")
                }
                if any(item is None for item in required_evidence.values()):
                    errors.append(
                        f"stateLedger.transitions[{index}]: "
                        "canonical checklist lacks prior release evidence"
                    )
                else:
                    expected_checklist = build_release_checklist(
                        candidate,
                        provenance_digest=document_digest(expected_provenance),
                        review_digest=required_evidence["review"]["digest"],
                        integration_digest=required_evidence["integration-ref"][
                            "digest"
                        ],
                        promotion_digest=required_evidence["promotion-ref"][
                            "digest"
                        ],
                    )
                    if evidence.get("checklist") != expected_checklist:
                        errors.append(
                            f"stateLedger.transitions[{index}]: "
                            "canonical checklist is stale, incomplete, or detached"
                        )
                    if evidence.get("checklistDigest") != document_digest(
                        expected_checklist
                    ):
                        errors.append(
                            f"stateLedger.transitions[{index}]: "
                            "canonical checklist digest is stale"
                        )
    return errors


def _external_output_path(repo_root: Path, output: Path) -> Path:
    root = repo_root.resolve()
    if ".." in output.parts:
        raise ValueError("external output must not contain path traversal")
    if output.is_symlink():
        raise ValueError("external output must not be a symlink")
    absolute_output = Path(os.path.abspath(output))
    for parent in (absolute_output.parent, *absolute_output.parent.parents):
        if parent.is_symlink():
            raise ValueError("external output must not use a symlink parent")
    resolved = output.resolve()
    if resolved == root or root in resolved.parents:
        raise ValueError("candidate/state artifacts must be external to the checkout")
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return resolved


def _runtime_records(
    repo_root: Path,
    commit: str | None = None,
) -> list[dict[str, Any]]:
    if commit is None:
        package_bytes = _repository_file(
            repo_root, "gateway/package.json"
        ).read_bytes()
        cli_bytes = _repository_file(
            repo_root, "cli/pyproject.toml"
        ).read_bytes()
    else:
        package_bytes = _assert_clean_material_path(
            repo_root, commit, "gateway/package.json"
        )
        cli_bytes = _assert_clean_material_path(
            repo_root, commit, "cli/pyproject.toml"
        )

    def record(path: str) -> dict[str, str]:
        if commit is not None:
            return _file_record_at_commit(repo_root, commit, path)
        return _file_record(repo_root, path)
    try:
        package = json.loads(
            package_bytes.decode("utf-8"),
            object_pairs_hook=_reject_duplicate_keys,
        )
        cli = tomllib.loads(cli_bytes.decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise ValueError("runtime manifests must be UTF-8") from exc
    node_constraint = package.get("engines", {}).get("node")
    python_constraint = cli.get("project", {}).get("requires-python")
    if not isinstance(node_constraint, str) or not isinstance(
        python_constraint, str
    ):
        raise ValueError("runtime constraints are missing from project manifests")
    return [
        {
            "name": "node",
            "constraint": node_constraint,
            "source": record("gateway/package.json"),
        },
        {
            "name": "python",
            "constraint": python_constraint,
            "source": record("cli/pyproject.toml"),
        },
    ]


def _git_identity(repo_root: Path, ref: str) -> dict[str, str]:
    return _resolve_exact_ref_identity(
        repo_root,
        ref,
        allowed_prefixes=("refs/heads/",),
    )


def collect_candidate(
    repo_root: Path,
    *,
    base_ref: str,
    branch_ref: str,
    review_paths: list[Path] | None = None,
    waiver_path: Path | None = None,
    candidate_commit: str | None = None,
) -> dict[str, Any]:
    root = repo_root.resolve()
    _reject_legacy_grafts(root)
    if _git(root, "status", "--porcelain=v1", "--untracked-files=no"):
        raise ValueError("tracked checkout must be clean before candidate collection")
    base = _git_identity(root, base_ref)
    branch = _git_identity(root, branch_ref)
    head = _git(root, "rev-parse", "--verify", "HEAD^{commit}")
    head_tree = _git(root, "rev-parse", "--verify", "HEAD^{tree}")
    if branch["commit"] != head or branch["tree"] != head_tree:
        raise ValueError("branch ref and checkout must identify the same evidence head")
    candidate_subject = _git_commit_identity(
        root,
        candidate_commit or head,
    )
    advancement_errors = _review_only_advancement_errors(
        root,
        candidate_subject["commit"],
        branch["commit"],
    )
    if advancement_errors:
        raise ValueError("; ".join(advancement_errors))
    merge_base = _git(
        root,
        "merge-base",
        base["commit"],
        candidate_subject["commit"],
    )

    inputs = [
        _file_record_at_commit(root, candidate_subject["commit"], path)
        for path in INPUT_PATHS
    ]
    locks = _lock_records(root, candidate_subject["commit"])
    suite_manifest = _file_record_at_commit(
        root, candidate_subject["commit"], SUITE_MANIFEST_PATH
    )
    suite_contract = _file_record_at_commit(
        root, candidate_subject["commit"], SUITE_CONTRACT_PATH
    )
    sbom = _file_record_at_commit(root, candidate_subject["commit"], SBOM_PATH)
    licenses = _file_record_at_commit(
        root, candidate_subject["commit"], LICENSES_PATH
    )
    license_policy = _file_record_at_commit(
        root, candidate_subject["commit"], LICENSE_POLICY_PATH
    )
    advisories = _file_record_at_commit(
        root, candidate_subject["commit"], ADVISORIES_PATH
    )
    advisory_database = _file_record_at_commit(
        root, candidate_subject["commit"], ADVISORY_DATABASE_PATH
    )
    records = inputs + locks + [
        suite_manifest,
        suite_contract,
        sbom,
        licenses,
        license_policy,
        advisories,
        advisory_database,
    ]
    material_by_path = {record["path"]: record for record in records}

    review_evidence: list[dict[str, Any]] = []
    for path in review_paths or []:
        attestation = read_canonical_json(path)
        expected_keys = {
            "schemaVersion",
            "verdict",
            "reviewer",
            "reviewerRole",
            "keyId",
            "subject",
            "issuedAt",
            "signatureAlgorithm",
            "signature",
        }
        if not isinstance(attestation, dict) or set(attestation) != expected_keys:
            raise ValueError(f"{path}: release review attestation shape is invalid")
        review = dict(attestation)
        review["digest"] = document_digest(attestation)
        review_evidence.append(review)

    registry_path = waiver_path or _repository_file(root, WAIVERS_PATH)
    waiver_registry = read_canonical_json(registry_path)
    waiver_errors, waivers = _validate_waiver_registry_shape(waiver_registry)
    if waiver_errors:
        raise ValueError("; ".join(waiver_errors))

    return {
        "schemaVersion": CANDIDATE_SCHEMA,
        "repository": {
            "base": base,
            "branch": branch,
            "candidate": candidate_subject,
            "mergeBase": merge_base,
        },
        "runtimes": _runtime_records(root, candidate_subject["commit"]),
        "inputs": inputs,
        "locks": locks,
        "suiteManifest": suite_manifest,
        "suiteContract": suite_contract,
        "supplyChain": {
            "sbom": sbom,
            "licenses": licenses,
            "licensePolicy": license_policy,
            "advisories": advisories,
            "advisoryDatabase": advisory_database,
            "waiverRegistryDigest": document_digest(waiver_registry),
            "waivers": waivers,
        },
        "reviewEvidence": review_evidence,
        "provenance": {
            "predicateType": "https://agents.example/release-candidate/v1",
            "subject": {
                "name": "repository-tree",
                "digest": {"gitTree": candidate_subject["tree"]},
            },
            "materials": [
                material_by_path[path] for path in sorted(material_by_path)
            ],
        },
    }


def _write_canonical(path: Path, document: Any) -> None:
    descriptor = os.open(
        path,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )
    try:
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(canonical_json_bytes(document))
    except BaseException:
        try:
            path.unlink()
        except OSError:
            pass
        raise


def _replace_canonical(path: Path, document: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.is_symlink():
        raise ValueError(f"{path}: generated target must not be a symlink")
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        descriptor = os.open(
            temporary,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL,
            0o600,
        )
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(canonical_json_bytes(document))
        temporary.replace(path)
    finally:
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def _default_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _trusted_validation_now(value: str | None) -> str:
    observed = datetime.now(timezone.utc).replace(microsecond=0)
    if value is None:
        return observed.strftime("%Y-%m-%dT%H:%M:%SZ")
    requested = _parse_timestamp(value, "--at")
    if abs(requested - observed) > CLI_CLOCK_SKEW:
        raise ValueError(
            "--at: supplied clock differs from the system clock by more than "
            "five minutes; rollback/fast-forward validation is refused"
        )
    return requested.strftime("%Y-%m-%dT%H:%M:%SZ")


def _result(status: str, errors: list[str], **extra: Any) -> dict[str, Any]:
    return {"status": status, "errors": errors, **extra}


def _candidate_subject_if_valid(candidate: Any) -> dict[str, str] | None:
    if not isinstance(candidate, dict):
        return None
    repository = candidate.get("repository")
    if not isinstance(repository, dict):
        return None
    subject = repository.get("candidate")
    if not isinstance(subject, dict) or set(subject) != {"commit", "tree"}:
        return None
    if not all(FULL_GIT_ID.fullmatch(str(subject.get(key, ""))) for key in subject):
        return None
    return {"commit": subject["commit"], "tree": subject["tree"]}


def _cmd_verify_repository(args: argparse.Namespace) -> int:
    validation_now = _trusted_validation_now(args.at)
    errors, findings, waivers = validate_repository_supply_chain(
        args.repo_root.resolve(),
        now=validation_now,
    )
    print(
        json.dumps(
            _result(
                "passed" if not errors else "failed",
                errors,
                productionAdvisories=len(findings),
                registeredWaivers=len(waivers),
            ),
            sort_keys=True,
        )
    )
    return int(bool(errors))


def _cmd_collect(args: argparse.Namespace) -> int:
    root = args.repo_root.resolve()
    validation_now = _trusted_validation_now(args.at)
    output = _external_output_path(root, args.output)
    candidate = collect_candidate(
        root,
        base_ref=args.base_ref,
        branch_ref=args.branch_ref,
        review_paths=args.review,
        waiver_path=args.waivers,
        candidate_commit=args.candidate_commit,
    )
    errors = validate_candidate_repository(root, candidate, now=validation_now)
    if errors:
        print(json.dumps(_result("failed", errors), sort_keys=True))
        return 1
    _write_canonical(output, candidate)
    print(
        json.dumps(
            _result(
                "passed",
                [],
                candidateDigest=document_digest(candidate),
                output=str(output),
                subject=candidate["repository"]["candidate"],
            ),
            sort_keys=True,
        )
    )
    return 0


def _cmd_verify(args: argparse.Namespace) -> int:
    try:
        validation_now = _trusted_validation_now(args.at)
        candidate = read_canonical_json(args.candidate.resolve())
        errors = validate_candidate_repository(
            args.repo_root.resolve(),
            candidate,
            now=validation_now,
        )
        ledger = None
        if args.state is not None:
            ledger = read_canonical_json(args.state.resolve())
            errors.extend(
                validate_state_ledger_repository(
                    args.repo_root.resolve(),
                    ledger,
                    candidate,
                    now=validation_now,
                )
            )
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        errors = ["candidate or state evidence is invalid"]
        candidate = None
        ledger = None
    subject = _candidate_subject_if_valid(candidate)
    print(
        json.dumps(
            _result(
                "passed" if not errors else "failed",
                errors,
                **(
                    {
                        "candidateDigest": document_digest(candidate),
                        "subject": subject,
                    }
                    if isinstance(candidate, dict) and subject is not None
                    else {}
                ),
                **(
                    {"state": ledger.get("currentState")}
                    if isinstance(ledger, dict)
                    else {}
                ),
            ),
            sort_keys=True,
        )
    )
    return int(bool(errors))


def _cmd_digest(args: argparse.Namespace) -> int:
    try:
        document = read_canonical_json(args.document.resolve())
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps(_result("failed", [str(exc)]), sort_keys=True))
        return 1
    print(
        json.dumps(
            _result("passed", [], digest=document_digest(document)),
            sort_keys=True,
        )
    )
    return 0


def _cmd_suggest_licenses(args: argparse.Namespace) -> int:
    document = suggest_license_registry(
        args.repo_root.resolve(),
        python_site_packages=[
            path.resolve() for path in args.python_site_packages
        ],
        node_modules=args.node_modules.resolve(),
    )
    sys.stdout.buffer.write(canonical_json_bytes(document))
    return 0


def _cmd_refresh_generated(args: argparse.Namespace) -> int:
    root = args.repo_root.resolve()
    snapshot_time = _parse_timestamp(args.snapshot_at, "snapshot-at")
    license_policy = read_canonical_json(
        _repository_file(
            root,
            LICENSE_POLICY_PATH,
            require_tracked=False,
        )
    )
    policy_errors, allowed_expressions = _validate_license_policy(
        license_policy
    )
    if policy_errors:
        raise ValueError("; ".join(policy_errors))
    licenses = suggest_license_registry(
        root,
        python_site_packages=[
            path.resolve() for path in args.python_site_packages
        ],
        node_modules=args.node_modules.resolve(),
    )
    locked_components = locked_production_components(root)
    component_purls = {item["purl"] for item in locked_components}
    license_errors = _validate_license_registry(
        licenses,
        component_purls,
        allowed_expressions,
    )
    if license_errors:
        raise ValueError("; ".join(license_errors))
    sbom = build_production_sbom(root, licenses)
    database = read_canonical_json(
        _repository_file(
            root,
            ADVISORY_DATABASE_PATH,
            require_tracked=False,
        )
    )
    database_errors, _ = _validate_advisory_database(
        database,
        now=snapshot_time,
        components=locked_components,
    )
    if database_errors:
        raise ValueError("; ".join(database_errors))
    advisories = build_advisory_snapshot(
        root,
        database,
        generated_at=args.snapshot_at,
    )
    _replace_canonical(root / LICENSES_PATH, licenses)
    _replace_canonical(root / SBOM_PATH, sbom)
    _replace_canonical(root / ADVISORIES_PATH, advisories)
    print(
        json.dumps(
            _result(
                "passed",
                [],
                components=len(sbom["components"]),
                generated=[
                    LICENSES_PATH,
                    SBOM_PATH,
                    ADVISORIES_PATH,
                ],
            ),
            sort_keys=True,
        )
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    verify_repository = subparsers.add_parser("verify-repository")
    verify_repository.add_argument("--repo-root", type=Path, default=Path.cwd())
    verify_repository.add_argument("--at")
    verify_repository.set_defaults(handler=_cmd_verify_repository)

    collect = subparsers.add_parser("collect")
    collect.add_argument("--repo-root", type=Path, default=Path.cwd())
    collect.add_argument("--output", type=Path, required=True)
    collect.add_argument("--base-ref", required=True)
    collect.add_argument("--branch-ref", required=True)
    collect.add_argument(
        "--candidate-commit",
        help=(
            "full immutable technical commit; later branch commits may contain "
            "only canonical review artifacts"
        ),
    )
    collect.add_argument("--review", type=Path, action="append", default=[])
    collect.add_argument("--waivers", type=Path)
    collect.add_argument("--at")
    collect.set_defaults(handler=_cmd_collect)

    verify = subparsers.add_parser("verify")
    verify.add_argument("--repo-root", type=Path, default=Path.cwd())
    verify.add_argument("--candidate", type=Path, required=True)
    verify.add_argument("--state", type=Path)
    verify.add_argument("--at")
    verify.set_defaults(handler=_cmd_verify)

    digest = subparsers.add_parser("digest")
    digest.add_argument("--document", type=Path, required=True)
    digest.set_defaults(handler=_cmd_digest)

    suggest_licenses = subparsers.add_parser("suggest-licenses")
    suggest_licenses.add_argument(
        "--repo-root", type=Path, default=Path.cwd()
    )
    suggest_licenses.add_argument(
        "--python-site-packages",
        type=Path,
        action="append",
        required=True,
    )
    suggest_licenses.add_argument("--node-modules", type=Path, required=True)
    suggest_licenses.set_defaults(handler=_cmd_suggest_licenses)

    refresh_generated = subparsers.add_parser("refresh-generated")
    refresh_generated.add_argument(
        "--repo-root", type=Path, default=Path.cwd()
    )
    refresh_generated.add_argument(
        "--python-site-packages",
        type=Path,
        action="append",
        required=True,
    )
    refresh_generated.add_argument("--node-modules", type=Path, required=True)
    refresh_generated.add_argument("--snapshot-at", required=True)
    refresh_generated.set_defaults(handler=_cmd_refresh_generated)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.handler(args)
    except (
        OSError,
        ValueError,
        KeyError,
        TypeError,
        UnicodeError,
        json.JSONDecodeError,
    ):
        print(
            json.dumps(
                _result("failed", ["command input or repository evidence is invalid"]),
                sort_keys=True,
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
