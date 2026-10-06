import base64
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import shutil
import subprocess
import sys
import time

import jsonschema
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


REPO = Path(__file__).resolve().parents[2]
VALIDATOR_PATH = REPO / "scripts" / "release_candidate.py"
CI_GATE_PATH = REPO / "scripts" / "ci_gate.py"
CANDIDATE_SCHEMA_PATH = REPO / "schemas" / "release-candidate-v1.schema.json"
STATE_SCHEMA_PATH = REPO / "schemas" / "release-state-v1.schema.json"
SUITE_MANIFEST_PATH = REPO / "ci" / "suites.json"
SUITE_CONTRACT_PATH = REPO / "ci" / "suites-contract.json"
SBOM_PATH = REPO / "ci" / "production-sbom.json"
LICENSES_PATH = REPO / "ci" / "production-licenses.json"
LICENSE_ALLOWLIST_PATH = REPO / "ci" / "license-allowlist.json"
ADVISORIES_PATH = REPO / "ci" / "production-advisories.json"
ADVISORY_DATABASE_PATH = REPO / "ci" / "offline-advisory-database.json"
WAIVERS_PATH = REPO / "ci" / "advisory-waivers.json"
CANDIDATE_DOC_PATH = REPO / "docs" / "release-candidate.md"
GOVERNED_INPUT_PATHS = (
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


def load_validator():
    assert VALIDATOR_PATH.is_file(), "the release-candidate validator is missing"
    spec = importlib.util.spec_from_file_location("release_candidate", VALIDATOR_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def minimal_candidate():
    digest = "sha256:" + "d" * 64
    return {
        "schemaVersion": "release-candidate/v1",
        "repository": {
            "base": {
                "ref": "refs/heads/develop",
                "commit": "1" * 40,
                "tree": "2" * 40,
            },
            "branch": {
                "ref": "refs/heads/candidate",
                "commit": "3" * 40,
                "tree": "4" * 40,
            },
            "candidate": {"commit": "3" * 40, "tree": "4" * 40},
            "mergeBase": "1" * 40,
        },
        "runtimes": [
            {
                "name": "python",
                "constraint": ">=3.11",
                "source": {"path": "cli/pyproject.toml", "sha256": digest},
            },
            {
                "name": "node",
                "constraint": "^22.13.0 || ^24.0.0",
                "source": {"path": "gateway/package.json", "sha256": digest},
            },
        ],
        "inputs": [
            {"path": path, "sha256": digest} for path in GOVERNED_INPUT_PATHS
        ],
        "locks": [
            {"path": "requirements.lock", "sha256": digest},
            {"path": "gateway/package-lock.json", "sha256": digest},
        ],
        "suiteManifest": {
            "path": "ci/suites.json",
            "sha256": digest,
        },
        "suiteContract": {
            "path": "ci/suites-contract.json",
            "sha256": digest,
        },
        "supplyChain": {
            "sbom": {"path": "ci/production-sbom.json", "sha256": digest},
            "licenses": {
                "path": "ci/production-licenses.json",
                "sha256": digest,
            },
            "licensePolicy": {
                "path": "ci/license-allowlist.json",
                "sha256": digest,
            },
            "advisories": {
                "path": "ci/production-advisories.json",
                "sha256": digest,
            },
            "advisoryDatabase": {
                "path": "ci/offline-advisory-database.json",
                "sha256": digest,
            },
            "waiverRegistryDigest": (
                "sha256:"
                + hashlib.sha256(
                    b'{"schemaVersion":"advisory-waivers/v1","waivers":[]}\n'
                ).hexdigest()
            ),
            "waivers": [],
        },
        "reviewEvidence": [],
        "provenance": {
            "predicateType": "https://agents.example/release-candidate/v1",
            "subject": {
                "name": "repository-tree",
                "digest": {"gitTree": "4" * 40},
            },
            "materials": [
                {
                    "path": "scripts/release_candidate.py",
                    "sha256": digest,
                }
            ],
        },
    }


def minimal_state_ledger(validator, candidate_digest, subject):
    def evidence(kind):
        material = {
            "kind": kind,
            "subject": subject,
            "issuedAt": "2026-07-26T01:00:00Z",
        }
        return {**material, "digest": validator.document_digest(material)}

    return {
        "schemaVersion": "release-state/v1",
        "candidateDigest": candidate_digest,
        "subject": subject,
        "currentState": "implemented",
        "transitions": [
            {"from": None, "to": "planned", "evidence": [evidence("plan")]},
            {
                "from": "planned",
                "to": "implemented",
                "evidence": [evidence("implementation")],
            },
        ],
    }


def minimal_waiver(candidate, advisory):
    return {
        "id": "WAIVER-2026-001",
        "advisoryId": advisory["id"],
        "component": advisory["component"],
        "severity": advisory["severity"],
        "candidate": candidate["repository"]["candidate"],
        "lockDigests": {
            item["path"]: item["sha256"] for item in candidate["locks"]
        },
        "owner": "release-engineering@example.invalid",
        "reachability": "The affected entry point is not reachable in production.",
        "compensatingControls": ["The disabled feature is denied by policy."],
        "evidence": [
            {
                "path": "docs/threat-model.md",
                "sha256": "sha256:" + "e" * 64,
            }
        ],
        "issuedAt": "2026-07-26T10:00:00Z",
        "expiresAt": "2026-08-25T10:00:00Z",
        "provenance": {
            "issuer": "release-engineering@example.invalid",
            "subjectDigest": candidate["repository"]["candidate"]["tree"],
        },
    }


def git(repo, *args):
    completed = subprocess.run(
        [
            "git",
            "-c",
            "gc.auto=0",
            "-c",
            "gc.autoDetach=false",
            "-c",
            "maintenance.auto=false",
            "-c",
            "maintenance.autoDetach=false",
            "-C",
            str(repo),
            *args,
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    assert completed.returncode == 0, completed.stderr
    return completed.stdout.strip()


def write_json(path, document, validator):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(validator.canonical_json_bytes(document))


def primary_response(document, validator):
    raw = validator.canonical_json_bytes(document)
    return {
        "contentEncoding": "identity",
        "rawBase64": base64.b64encode(raw).decode("ascii"),
        "rawSha256": "sha256:" + hashlib.sha256(raw).hexdigest(),
        "canonical": document,
        "canonicalSha256": validator.document_digest(document),
    }


def empty_primary_advisory_database(components, validator):
    queries = [
        {
            "package": {
                "ecosystem": (
                    "PyPI" if component["ecosystem"] == "pypi" else "npm"
                ),
                "name": component["name"],
            },
            "version": component["version"],
        }
        for component in components
    ]
    batch_request = {"queries": queries}
    batch_response = {"results": [{} for _ in components]}
    npm_components = [
        component for component in components if component["ecosystem"] == "npm"
    ]
    npm_request = {}
    for component in npm_components:
        npm_request.setdefault(component["name"], []).append(component["version"])
    npm_request = {
        name: sorted(set(versions)) for name, versions in sorted(npm_request.items())
    }
    purls = [component["purl"] for component in components]
    return {
        "schemaVersion": "offline-advisory-database/v2",
        "database": {
            "authority": "OSV",
            "ecosystems": sorted(
                {component["ecosystem"] for component in components}
            ),
            "fetchedAt": "2026-07-26T00:00:00Z",
            "name": "OSV exact-component primary snapshot",
            "source": "https://api.osv.dev/v1/querybatch",
            "validUntil": "2026-08-09T00:00:00Z",
            "version": "2026-07-26",
        },
        "components": purls,
        "componentsSha256": validator.document_digest({"components": purls}),
        "entries": [],
        "npmCorroboration": {
            "coverage": [component["purl"] for component in npm_components],
            "endpoint": (
                "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk"
            ),
            "mode": "bulk-advisory-corroboration-only",
            "request": npm_request,
            "requestSha256": validator.document_digest(npm_request),
            "response": primary_response({}, validator),
        },
        "osv": {
            "coverage": [
                {
                    "component": component["purl"],
                    "index": index,
                    "query": query,
                    "querySha256": validator.document_digest(query),
                    "resultSha256": [validator.document_digest({})],
                }
                for index, (component, query) in enumerate(
                    zip(components, queries, strict=True)
                )
            ],
            "endpoint": "https://api.osv.dev/v1/querybatch",
            "mode": "querybatch-with-bounded-query-pagination",
            "pages": [],
            "request": batch_request,
            "requestSha256": validator.document_digest(batch_request),
            "response": primary_response(batch_response, validator),
            "vulnerabilities": [],
        },
    }


def signed_review(
    validator,
    subject,
    *,
    reviewer="mailto:independent@example.invalid",
    issued_at="2026-07-26T06:00:00Z",
):
    material = {
        "schemaVersion": "release-review/v1",
        "verdict": "OK",
        "reviewer": reviewer,
        "reviewerRole": "independent-reviewer",
        "keyId": "test-reviewer-2026",
        "subject": subject,
        "issuedAt": issued_at,
        "signatureAlgorithm": "ed25519",
    }
    signature = validator._test_review_private_key.sign(
        validator.canonical_json_bytes(material)
    )
    return {
        **material,
        "signature": base64.b64encode(signature).decode("ascii"),
    }


@pytest.fixture
def candidate_repository(tmp_path):
    validator = load_validator()
    reviewer_private_key = Ed25519PrivateKey.generate()
    validator._test_review_private_key = reviewer_private_key
    reviewer_public_key = reviewer_private_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    repo = tmp_path / "repo"
    repo.mkdir()
    fixture_files = {
        ".github/workflows/ci.yml": "name: fixture\n",
        "cli/pyproject.toml": (
            "[project]\n"
            'name = "fixture-cli"\n'
            'version = "1.0.0"\n'
            'requires-python = ">=3.11"\n'
            'dependencies = ["jsonschema", "rich", "typer"]\n'
        ),
        "gateway/package.json": json.dumps(
            {
                "name": "fixture-gateway",
                "version": "1.0.0",
                "engines": {"node": "^22.13.0 || ^24.0.0"},
                "dependencies": {"zod": "3.25.76"},
            }
        ),
        "orchestrator-langgraph/pyproject.toml": (
            "[project]\n"
            'name = "fixture-orchestrator"\n'
            'version = "1.0.0"\n'
            'requires-python = ">=3.11"\n'
            'dependencies = ["langgraph", "mcp", "temporalio"]\n'
            "[project.optional-dependencies]\n"
            'redis = ["redis"]\n'
        ),
        "ci/release-environments.json": json.dumps(
            {
                "schemaVersion": "release-environments/v1",
                "environments": [
                    {
                        "id": "cpython-3.11.2-linux",
                        "markers": {
                            "implementation_name": "cpython",
                            "implementation_version": "3.11.2",
                            "os_name": "posix",
                            "platform_machine": "x86_64",
                            "platform_python_implementation": "CPython",
                            "platform_release": "fixture",
                            "platform_system": "Linux",
                            "platform_version": "fixture",
                            "python_full_version": "3.11.2",
                            "python_version": "3.11",
                            "sys_platform": "linux",
                        },
                    },
                    {
                        "id": "cpython-3.11.9-macos",
                        "markers": {
                            "implementation_name": "cpython",
                            "implementation_version": "3.11.9",
                            "os_name": "posix",
                            "platform_machine": "arm64",
                            "platform_python_implementation": "CPython",
                            "platform_release": "fixture",
                            "platform_system": "Darwin",
                            "platform_version": "fixture",
                            "python_full_version": "3.11.9",
                            "python_version": "3.11",
                            "sys_platform": "darwin",
                        },
                    },
                    {
                        "id": "cpython-3.11.9-windows",
                        "markers": {
                            "implementation_name": "cpython",
                            "implementation_version": "3.11.9",
                            "os_name": "nt",
                            "platform_machine": "AMD64",
                            "platform_python_implementation": "CPython",
                            "platform_release": "fixture",
                            "platform_system": "Windows",
                            "platform_version": "fixture",
                            "python_full_version": "3.11.9",
                            "python_version": "3.11",
                            "sys_platform": "win32",
                        },
                    },
                ],
            },
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n",
        "ci/requirements-build.in": "hatchling==1.0.0\n",
        "ci/reviewer-trust-roots.json": json.dumps(
            {
                "schemaVersion": "reviewer-trust-roots/v1",
                "keys": [
                    {
                        "keyId": "test-reviewer-2026",
                        "algorithm": "ed25519",
                        "publicKey": base64.b64encode(
                            reviewer_public_key
                        ).decode("ascii"),
                        "subjects": [
                            "mailto:candidate@example.invalid",
                            "mailto:independent@example.invalid",
                        ],
                        "roles": ["independent-reviewer"],
                        "validFrom": "2026-01-01T00:00:00Z",
                        "validUntil": "2027-01-01T00:00:00Z",
                    }
                ],
            },
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n",
        "schemas/release-candidate-v1.schema.json": "{}\n",
        "schemas/release-state-v1.schema.json": "{}\n",
        "scripts/ci.sh": "#!/usr/bin/env bash\n",
        "scripts/ci_gate.py": "# fixture CI gate subject\n",
        "scripts/refresh_advisory_snapshot.py": "# fixture snapshot refresher\n",
        "scripts/requirements_lock.sh": "#!/usr/bin/env bash\n",
        "scripts/release_candidate.py": "# fixture validator subject\n",
        "requirements.lock": "\n".join(
            f"{name}==1.0.0 \\\n    --hash=sha256:{'a' * 64}"
            for name in (
                "jsonschema",
                "langgraph",
                "mcp",
                "redis",
                "rich",
                "temporalio",
                "typer",
            )
        )
        + "\n",
        "tests/test_sample.py": "def test_sample(): pass\n",
    }
    for relative, content in fixture_files.items():
        path = repo / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    package_lock = {
        "name": "fixture-gateway",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "requires": True,
        "packages": {
            "": {
                "name": "fixture-gateway",
                "version": "1.0.0",
                "dependencies": {"zod": "3.25.76"},
            },
            "node_modules/zod": {
                "version": "3.25.76",
                "integrity": "sha512-" + "a" * 86,
            },
        },
    }
    write_json(repo / "gateway/package-lock.json", package_lock, validator)

    git(repo, "init", "-b", "develop")
    git(repo, "config", "user.name", "Candidate Fixture")
    git(repo, "config", "user.email", "candidate@example.invalid")
    git(repo, "add", ".")
    git(repo, "commit", "-m", "fixture base")

    components = validator.locked_production_components(repo)
    license_document = {
        "schemaVersion": "production-licenses/v1",
        "licenses": [
            {
                "component": component["purl"],
                "expression": "MIT",
                "evidence": "reviewed-registry:fixture",
            }
            for component in components
        ],
    }
    write_json(repo / "ci/production-licenses.json", license_document, validator)
    write_json(
        repo / "ci/license-allowlist.json",
        {
            "schemaVersion": "license-allowlist/v1",
            "allowedExpressions": ["MIT"],
        },
        validator,
    )
    write_json(
        repo / "ci/production-sbom.json",
        validator.build_production_sbom(repo, license_document),
        validator,
    )
    advisory_database = empty_primary_advisory_database(components, validator)
    write_json(
        repo / "ci/offline-advisory-database.json",
        advisory_database,
        validator,
    )
    write_json(
        repo / "ci/production-advisories.json",
        validator.build_advisory_snapshot(
            repo,
            advisory_database,
            generated_at="2026-07-26T01:00:00Z",
        ),
        validator,
    )
    write_json(
        repo / "ci/advisory-waivers.json",
        {"schemaVersion": "advisory-waivers/v1", "waivers": []},
        validator,
    )
    inventory_paths = ["tests/test_sample.py"]
    suite_topology = {
        "id": "test.fixture",
        "classification": "required",
        "runner": "pytest",
        "argv": ["python", "-m", "pytest", "-q", "-rs"],
        "include": ["tests/test_*.py"],
        "exclude": [],
        "minimumTests": 1,
        "allowedSkips": [],
        "timeoutSeconds": 30,
    }
    write_json(
        repo / "ci/suites-contract.json",
        {
            "schemaVersion": 1,
            "requiredSuiteIds": ["test.fixture"],
            "optionalSuiteIds": [],
            "suites": [suite_topology],
        },
        validator,
    )
    write_json(
        repo / "ci/suites.json",
        {
            "schemaVersion": 1,
            "requiredSuiteIds": ["test.fixture"],
            "suites": [
                {
                    **suite_topology,
                    "inventorySha256": "sha256:"
                    + hashlib.sha256(
                        "\n".join(inventory_paths).encode()
                    ).hexdigest(),
                }
            ],
        },
        validator,
    )
    git(repo, "add", ".")
    git(repo, "commit", "-m", "add release policy")
    base_commit = git(repo, "rev-parse", "HEAD")
    git(repo, "switch", "-c", "candidate")
    (repo / "app.txt").write_text("candidate\n", encoding="utf-8")
    git(repo, "add", "app.txt")
    git(repo, "commit", "-m", "candidate implementation")
    candidate = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
    )
    return validator, repo, candidate, base_commit


def test_release_candidate_contract_is_external_and_ci_enforced():
    for path in (
        CANDIDATE_SCHEMA_PATH,
        STATE_SCHEMA_PATH,
        SUITE_MANIFEST_PATH,
        SUITE_CONTRACT_PATH,
        SBOM_PATH,
        LICENSES_PATH,
        LICENSE_ALLOWLIST_PATH,
        ADVISORIES_PATH,
        ADVISORY_DATABASE_PATH,
        WAIVERS_PATH,
    ):
        assert path.is_file(), f"missing release contract artifact: {path}"

    ci_script = (REPO / "scripts" / "ci.sh").read_text(encoding="utf-8")
    assert 'exec python3 scripts/ci_gate.py "$@"' in ci_script
    manifest = json.loads(SUITE_MANIFEST_PATH.read_text(encoding="utf-8"))
    release_suite = next(
        suite for suite in manifest["suites"] if suite["id"] == "release.candidate"
    )
    assert release_suite["argv"] == [
        "python",
        "scripts/release_candidate.py",
        "verify-repository",
        "--repo-root",
        ".",
    ]
    assert not (REPO / "release-candidate.json").exists()
    assert not (REPO / "ci" / "release-suites.json").exists()


def test_canonical_json_rejects_duplicates_and_noncanonical_bytes(tmp_path):
    validator = load_validator()
    duplicate = tmp_path / "duplicate.json"
    duplicate.write_text(
        '{"schemaVersion":"release-candidate/v1",'
        '"schemaVersion":"release-candidate/v1"}\n',
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="duplicate key"):
        validator.read_canonical_json(duplicate)

    noncanonical = tmp_path / "noncanonical.json"
    noncanonical.write_text(
        json.dumps({"schemaVersion": "release-candidate/v1"}, indent=2) + "\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="canonical JSON"):
        validator.read_canonical_json(noncanonical)


def test_hash_locked_python_inventory_accepts_hashes_and_environment_markers(
    tmp_path,
):
    validator = load_validator()
    roots = (
        "jsonschema",
        "langgraph",
        "mcp",
        "redis",
        "rich",
        "temporalio",
        "typer",
    )
    lines = []
    for root in roots:
        marker = " ; python_version >= '3.11'" if root == "redis" else ""
        lines.extend(
            [
                f"{root}==1.0.0{marker} \\",
                f"    --hash=sha256:{'a' * 64}",
                "    # via -r ci/requirements-build.in",
            ]
        )
    lines.extend(
        [
            "anyio==4.0.0 \\",
            f"    --hash=sha256:{'b' * 64}",
            "    # via",
            "    #   mcp",
            "inactive-helper==9.0.0 ; python_version < '0' \\",
            f"    --hash=sha256:{'c' * 64}",
            "    # via",
            "    #   mcp",
        ]
    )
    lock = tmp_path / "requirements.lock"
    lock.write_text("\n".join(lines) + "\n", encoding="utf-8")

    environments = [
        {
            "id": "cpython-linux",
            "markers": {
                "implementation_name": "cpython",
                "implementation_version": "3.11.9",
                "os_name": "posix",
                "platform_machine": "x86_64",
                "platform_python_implementation": "CPython",
                "platform_release": "test",
                "platform_system": "Linux",
                "platform_version": "test",
                "python_full_version": "3.11.9",
                "python_version": "3.11",
                "sys_platform": "linux",
            },
        }
    ]
    components = validator._parse_python_lock(
        lock,
        production_roots=set(roots),
        environments=environments,
    )

    assert {item["name"] for item in components if item["direct"]} == set(roots)
    assert next(item for item in components if item["name"] == "mcp")[
        "dependencies"
    ] == []
    assert any(item["name"] == "anyio" for item in components)
    assert all(item["name"] != "inactive-helper" for item in components)


@pytest.mark.parametrize(
    ("mutation", "expected_error"),
    [
        ({"commit": "a" * 12}, "full 40-character"),
        ({"tree": "b" * 39}, "full 40-character"),
        ({"inputPaths": ["../requirements.lock"]}, "safe repository-relative"),
        (
            {"inputPaths": ["requirements.lock", "requirements.lock"]},
            "duplicate path",
        ),
    ],
)
def test_candidate_shape_rejects_abbreviated_identity_and_unsafe_paths(
    mutation, expected_error
):
    validator = load_validator()
    candidate = minimal_candidate()
    candidate["repository"]["candidate"]["commit"] = mutation.get(
        "commit", candidate["repository"]["candidate"]["commit"]
    )
    candidate["repository"]["candidate"]["tree"] = mutation.get(
        "tree", candidate["repository"]["candidate"]["tree"]
    )
    if "inputPaths" in mutation:
        candidate["inputs"] = [
            {"path": path, "sha256": "sha256:" + "c" * 64}
            for path in mutation["inputPaths"]
        ]

    errors = validator.validate_candidate_shape(candidate)

    assert any(expected_error in error for error in errors)


def test_candidate_shape_rejects_omitted_or_substituted_governed_materials():
    validator = load_validator()
    missing_input = minimal_candidate()
    missing_input["inputs"].pop()
    errors = validator.validate_candidate_shape(missing_input)
    assert any("governed input set" in error for error in errors)

    substituted_suite = minimal_candidate()
    substituted_suite["suiteManifest"]["path"] = "ci/unreviewed-suites.json"
    errors = validator.validate_candidate_shape(substituted_suite)
    assert any("authoritative CI suite manifest" in error for error in errors)

    substituted_contract = minimal_candidate()
    substituted_contract["suiteContract"]["path"] = "ci/self-approved.json"
    errors = validator.validate_candidate_shape(substituted_contract)
    assert any("non-refreshable CI suite contract" in error for error in errors)

    substituted_sbom = minimal_candidate()
    substituted_sbom["supplyChain"]["sbom"]["path"] = "tmp/self-approved.json"
    errors = validator.validate_candidate_shape(substituted_sbom)
    assert any("authoritative production SBOM" in error for error in errors)

    stale_waiver_registry = minimal_candidate()
    stale_waiver_registry["supplyChain"]["waiverRegistryDigest"] = (
        "sha256:" + "0" * 64
    )
    errors = validator.validate_candidate_shape(stale_waiver_registry)
    assert any("waiver registry digest" in error for error in errors)


def test_candidate_shape_rejects_same_base_and_candidate_branch():
    validator = load_validator()
    candidate = minimal_candidate()
    candidate["repository"]["base"] = copy.deepcopy(
        candidate["repository"]["branch"]
    )

    errors = validator.validate_candidate_shape(candidate)

    assert any(
        "base and candidate branch must be distinct" in error for error in errors
    )


def test_state_ledger_rejects_skipped_duplicate_and_regressive_transitions():
    validator = load_validator()
    candidate = minimal_candidate()
    candidate_digest = validator.document_digest(candidate)
    base = minimal_state_ledger(
        validator,
        candidate_digest,
        candidate["repository"]["candidate"],
    )

    skipped = json.loads(json.dumps(base))
    skipped["transitions"] = [
        skipped["transitions"][0],
        {
            "from": "planned",
            "to": "reviewed",
            "evidence": [],
        },
    ]
    assert any(
        "impossible transition" in error
        for error in validator.validate_state_ledger_shape(skipped, candidate)
    )

    duplicate = json.loads(json.dumps(base))
    duplicate["transitions"].append(duplicate["transitions"][0])
    assert any(
        "duplicate transition" in error
        for error in validator.validate_state_ledger_shape(duplicate, candidate)
    )

    regressive = json.loads(json.dumps(base))
    regressive["transitions"].append(
        {"from": "implemented", "to": "planned", "evidence": []}
    )
    assert any(
        "impossible transition" in error
        for error in validator.validate_state_ledger_shape(regressive, candidate)
    )


def test_high_or_critical_advisory_requires_narrow_current_waiver():
    validator = load_validator()
    candidate = minimal_candidate()
    advisory = {
        "id": "GHSA-test-high",
        "component": "pkg:pypi/example@1.0.0",
        "severity": "high",
    }
    now = "2026-07-26T12:00:00Z"

    missing_errors = validator.validate_advisory_waivers(
        candidate,
        [advisory],
        [],
        now=now,
    )
    assert any("unaccepted high/critical advisory" in error for error in missing_errors)

    waiver = minimal_waiver(candidate, advisory)
    assert validator.validate_advisory_waivers(
        candidate,
        [advisory],
        [waiver],
        now=now,
    ) == []

    for field, value, expected in (
        ("owner", "", "owner"),
        ("expiresAt", "2026-07-26T11:59:59Z", "expired"),
        ("component", "pkg:pypi/other@1.0.0", "package"),
        ("lockDigests", {}, "lock digest"),
    ):
        invalid = json.loads(json.dumps(waiver))
        invalid[field] = value
        errors = validator.validate_advisory_waivers(
            candidate,
            [advisory],
            [invalid],
            now=now,
        )
        assert any(expected in error for error in errors)


def test_real_checkout_candidate_binds_refs_tree_locks_suites_and_provenance(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository

    errors = validator.validate_candidate_repository(
        repo,
        candidate,
        now="2026-07-26T12:00:00Z",
    )

    assert errors == []
    assert candidate["repository"]["candidate"]["commit"] == git(
        repo, "rev-parse", "HEAD"
    )
    assert candidate["repository"]["candidate"]["tree"] == git(
        repo, "rev-parse", "HEAD^{tree}"
    )
    assert candidate["provenance"]["subject"]["digest"]["gitTree"] == candidate[
        "repository"
    ]["candidate"]["tree"]


def test_real_candidate_rejects_runtime_constraint_detached_from_manifest(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    detached = copy.deepcopy(candidate)
    detached["runtimes"][0]["constraint"] = ">=0"

    errors = validator.validate_candidate_repository(
        repo,
        detached,
        now="2026-07-26T12:00:00Z",
    )

    assert any("runtime contract is stale" in error for error in errors)


def test_machine_schemas_accept_collected_candidate_and_explicit_state_prefix(
    candidate_repository,
):
    validator, _, candidate, _ = candidate_repository
    candidate_schema = json.loads(
        CANDIDATE_SCHEMA_PATH.read_text(encoding="utf-8")
    )
    state_schema = json.loads(STATE_SCHEMA_PATH.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator.check_schema(candidate_schema)
    jsonschema.Draft202012Validator.check_schema(state_schema)

    jsonschema.validate(candidate, candidate_schema)
    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(candidate),
        candidate["repository"]["candidate"],
    )
    jsonschema.validate(ledger, state_schema)


def test_collect_and_verify_cli_round_trip_is_external_canonical_and_no_overwrite(
    candidate_repository, tmp_path, capsys, monkeypatch
):
    validator, repo, _, _ = candidate_repository
    monkeypatch.setattr(
        validator,
        "_trusted_validation_now",
        lambda value: value or "2026-07-26T12:00:00Z",
    )
    output = tmp_path / "evidence" / "candidate.json"
    validation_now = "2026-07-26T12:00:00Z"
    arguments = [
        "collect",
        "--repo-root",
        str(repo),
        "--base-ref",
        "refs/heads/develop",
        "--branch-ref",
        "refs/heads/candidate",
        "--output",
        str(output),
    ]

    assert validator.main(arguments) == 0
    collect_report = json.loads(capsys.readouterr().out)
    candidate = validator.read_canonical_json(output)
    assert collect_report["candidateDigest"] == validator.document_digest(candidate)

    assert (
        validator.main(
            [
                "verify",
                "--repo-root",
                str(repo),
                "--candidate",
                str(output),
                "--at",
                validation_now,
            ]
        )
        == 0
    )
    verify_report = json.loads(capsys.readouterr().out)
    assert verify_report["status"] == "passed"
    original = output.read_bytes()

    assert validator.main(arguments) == 1
    duplicate_report = json.loads(capsys.readouterr().out)
    assert duplicate_report["status"] == "failed"
    assert output.read_bytes() == original


def test_collector_binds_canonical_independent_review_attestation(
    candidate_repository, tmp_path
):
    validator, repo, candidate, _ = candidate_repository
    attestation = signed_review(
        validator,
        candidate["repository"]["candidate"],
    )
    review_path = tmp_path / "review.json"
    write_json(review_path, attestation, validator)

    reviewed_candidate = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        review_paths=[review_path],
    )

    assert reviewed_candidate["reviewEvidence"] == [
        {**attestation, "digest": validator.document_digest(attestation)}
    ]
    assert validator.validate_candidate_shape(reviewed_candidate) == []

    detached = copy.deepcopy(attestation)
    detached["subject"]["tree"] = "0" * 40
    write_json(tmp_path / "detached.json", detached, validator)
    detached_candidate = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        review_paths=[tmp_path / "detached.json"],
    )
    errors = validator.validate_candidate_shape(detached_candidate)
    assert any("must equal the candidate identity" in error for error in errors)


def test_real_candidate_rejects_moved_ref_and_lock_or_suite_drift(
    candidate_repository,
):
    validator, repo, candidate, base_commit = candidate_repository
    moved = copy.deepcopy(candidate)
    git(repo, "branch", "moved", base_commit)
    moved["repository"]["branch"]["ref"] = "refs/heads/moved"

    moved_errors = validator.validate_candidate_repository(
        repo,
        moved,
        now="2026-07-26T12:00:00Z",
    )
    assert any("ref moved" in error for error in moved_errors)

    lock = repo / "requirements.lock"
    original_lock = lock.read_bytes()
    lock.write_bytes(original_lock + b"unexpected==1.0.0\n")
    try:
        drift_errors = validator.validate_candidate_repository(
            repo,
            candidate,
            now="2026-07-26T12:00:00Z",
        )
        assert any(
            "checkout bytes differ from pinned tree" in error
            for error in drift_errors
        )
        assert any("sha256 hash" in error for error in drift_errors)
    finally:
        lock.write_bytes(original_lock)

    added_suite_source = repo / "tests/test_added.py"
    added_suite_source.write_text("def test_added(): pass\n", encoding="utf-8")
    try:
        suite_errors = validator.validate_candidate_repository(
            repo,
            candidate,
            now="2026-07-26T12:00:00Z",
        )
        assert any("stale inventorySha256" in error for error in suite_errors)
    finally:
        added_suite_source.unlink()


def test_release_gate_reuses_authoritative_suite_topology_skip_and_readiness(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    manifest_path = repo / "ci/suites.json"
    original = manifest_path.read_bytes()

    mutations = (
        (
            lambda manifest: manifest["requiredSuiteIds"].clear(),
            "requiredSuiteIds",
        ),
        (
            lambda manifest: manifest["suites"][0]["allowedSkips"].append(
                {
                    "id": "self-approved skip",
                    "classification": "infrastructure_unavailable",
                    "service": "unreviewed",
                }
            ),
            "allowedSkips",
        ),
        (
            lambda manifest: manifest["suites"][0].__setitem__(
                "readiness",
                {
                    "service": "unreviewed",
                    "environmentPresent": ["UNREVIEWED_READY"],
                },
            ),
            "readiness",
        ),
    )
    for mutate, expected in mutations:
        manifest = json.loads(original)
        mutate(manifest)
        write_json(manifest_path, manifest, validator)
        errors, _, _ = validator.validate_repository_supply_chain(
            repo,
            now="2026-07-26T12:00:00Z",
        )
        assert any(expected in error for error in errors)

    manifest_path.write_bytes(original)
    detached = copy.deepcopy(candidate)
    detached["suiteManifest"]["sha256"] = "sha256:" + "0" * 64
    errors = validator.validate_candidate_repository(
        repo,
        detached,
        now="2026-07-26T12:00:00Z",
    )
    assert any(
        "candidate.suiteManifest" in error and "stale digest" in error
        for error in errors
    )


def test_authoritative_refresh_is_inventory_only(candidate_repository):
    _, repo, _, _ = candidate_repository
    manifest_path = repo / "ci/suites.json"
    contract_path = repo / "ci/suites-contract.json"
    manifest_before = manifest_path.read_bytes()
    contract_before = contract_path.read_bytes()
    added_test = repo / "tests/test_added.py"
    added_test.write_text("def test_added(): pass\n", encoding="utf-8")

    completed = subprocess.run(
        [
            sys.executable,
            str(CI_GATE_PATH),
            "--repo-root",
            str(repo),
            "--refresh-inventory",
        ],
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    assert json.loads(completed.stdout)["status"] == "passed"
    assert manifest_path.read_bytes() != manifest_before
    assert contract_path.read_bytes() == contract_before
    assert not (repo / "ci/release-suites.json").exists()


def test_real_candidate_rejects_missing_production_lock(candidate_repository):
    validator, repo, candidate, _ = candidate_repository
    lock = repo / "requirements.lock"
    missing = repo.parent / "requirements.lock.missing"
    lock.rename(missing)
    try:
        errors = validator.validate_candidate_repository(
            repo,
            candidate,
            now="2026-07-26T12:00:00Z",
        )
        assert any("required file is missing" in error for error in errors)
    finally:
        missing.rename(lock)


def test_real_candidate_rejects_lock_symlink_even_when_target_bytes_match(
    candidate_repository, tmp_path
):
    validator, repo, candidate, _ = candidate_repository
    lock = repo / "requirements.lock"
    outside = tmp_path / "outside-requirements.lock"
    outside.write_bytes(lock.read_bytes())
    lock.unlink()
    lock.symlink_to(outside)
    try:
        errors = validator.validate_candidate_repository(
            repo,
            candidate,
            now="2026-07-26T12:00:00Z",
        )
        assert any("symlinks are not accepted" in error for error in errors)
    finally:
        lock.unlink()
        shutil.copyfile(outside, lock)


def transition_evidence(validator, kind, subject, **extra):
    material = {
        "kind": kind,
        "subject": subject,
        "issuedAt": "2026-07-26T07:00:00Z",
        **extra,
    }
    return {**material, "digest": validator.document_digest(material)}


def test_real_state_ledger_verifies_each_ref_review_tag_and_release_provenance(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    subject = candidate["repository"]["candidate"]
    review = signed_review(validator, subject)
    review["digest"] = validator.document_digest(review)
    candidate["reviewEvidence"] = [review]
    git(repo, "switch", "-c", "integration", "develop")
    git(repo, "merge", "--no-ff", "candidate", "-m", "integrate candidate")
    integration_identity = {
        "commit": git(repo, "rev-parse", "HEAD^{commit}"),
        "tree": git(repo, "rev-parse", "HEAD^{tree}"),
    }
    git(repo, "branch", "main", integration_identity["commit"])
    git(repo, "tag", "v1.0.0", integration_identity["commit"])
    git(repo, "switch", "candidate")
    review_transition = transition_evidence(
        validator,
        "review",
        subject,
        attestationDigest=review["digest"],
        verdict="OK",
    )
    integration_transition = transition_evidence(
        validator,
        "integration-ref",
        subject,
        ref="refs/heads/integration",
        refIdentity=integration_identity,
    )
    promotion_transition = transition_evidence(
        validator,
        "promotion-ref",
        subject,
        ref="refs/heads/main",
        refIdentity=integration_identity,
    )
    provenance = validator.build_release_provenance(candidate)
    provenance_digest = validator.document_digest(provenance)
    checklist = validator.build_release_checklist(
        candidate,
        provenance_digest=provenance_digest,
        review_digest=review_transition["digest"],
        integration_digest=integration_transition["digest"],
        promotion_digest=promotion_transition["digest"],
    )
    ledger = {
        "schemaVersion": "release-state/v1",
        "candidateDigest": validator.document_digest(candidate),
        "subject": subject,
        "currentState": "released",
        "transitions": [
            {
                "from": None,
                "to": "planned",
                "evidence": [transition_evidence(validator, "plan", subject)],
            },
            {
                "from": "planned",
                "to": "implemented",
                "evidence": [
                    transition_evidence(validator, "implementation", subject)
                ],
            },
            {
                "from": "implemented",
                "to": "reviewed",
                "evidence": [review_transition],
            },
            {
                "from": "reviewed",
                "to": "integrated",
                "evidence": [integration_transition],
            },
            {
                "from": "integrated",
                "to": "promoted",
                "evidence": [promotion_transition],
            },
            {
                "from": "promoted",
                "to": "released",
                "evidence": [
                    transition_evidence(
                        validator,
                        "release-tag",
                        subject,
                        ref="refs/tags/v1.0.0",
                        refIdentity=integration_identity,
                        checklist=checklist,
                        checklistDigest=validator.document_digest(checklist),
                        provenance=provenance,
                        provenanceDigest=provenance_digest,
                    )
                ],
            },
        ],
    }

    assert validator.validate_state_ledger_repository(
        repo,
        ledger,
        candidate,
        now="2026-07-26T12:00:00Z",
    ) == []

    outside = copy.deepcopy(ledger)
    git(repo, "tag", "v1.0.1", candidate["repository"]["base"]["commit"])
    outside_evidence = outside["transitions"][-1]["evidence"][0]
    outside_evidence["ref"] = "refs/tags/v1.0.1"
    outside_evidence["refIdentity"] = copy.deepcopy(
        candidate["repository"]["base"]
    )
    outside_evidence["refIdentity"].pop("ref")
    outside_evidence["digest"] = validator.document_digest(
        {
            key: value
            for key, value in outside_evidence.items()
            if key != "digest"
        }
    )
    errors = validator.validate_state_ledger_repository(
        repo,
        outside,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("outside the candidate" in error for error in errors)

    incomplete = copy.deepcopy(ledger)
    incomplete_evidence = incomplete["transitions"][-1]["evidence"][0]
    incomplete_evidence["checklist"]["items"][0]["complete"] = False
    incomplete_evidence["checklistDigest"] = validator.document_digest(
        incomplete_evidence["checklist"]
    )
    incomplete_evidence["digest"] = validator.document_digest(
        {
            key: value
            for key, value in incomplete_evidence.items()
            if key != "digest"
        }
    )
    errors = validator.validate_state_ledger_repository(
        repo,
        incomplete,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("canonical checklist" in error for error in errors)


def test_waiver_evidence_digest_is_verified_against_candidate_checkout(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    component = validator.locked_production_components(repo)[0]["purl"]
    advisory = {
        "id": "GHSA-fixture",
        "component": component,
        "severity": "critical",
    }
    waiver = minimal_waiver(candidate, advisory)
    waiver["evidence"] = [
        {
            "path": "scripts/ci.sh",
            "sha256": "sha256:" + "0" * 64,
        }
    ]
    candidate["supplyChain"]["waivers"] = [waiver]
    candidate["supplyChain"]["waiverRegistryDigest"] = validator.document_digest(
        {
            "schemaVersion": "advisory-waivers/v1",
            "waivers": candidate["supplyChain"]["waivers"],
        }
    )

    errors = validator.validate_candidate_repository(
        repo,
        candidate,
        now="2026-07-26T12:00:00Z",
    )

    assert any(
        "waiver evidence" in error and "stale digest" in error
        for error in errors
    )


def test_repository_supply_chain_rejects_duplicate_sbom_and_missing_license(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    sbom_path = repo / "ci/production-sbom.json"
    licenses_path = repo / "ci/production-licenses.json"
    original_sbom = sbom_path.read_bytes()
    original_licenses = licenses_path.read_bytes()

    sbom = validator.read_canonical_json(sbom_path)
    sbom["components"].append(copy.deepcopy(sbom["components"][0]))
    write_json(sbom_path, sbom, validator)
    try:
        errors, _, _ = validator.validate_repository_supply_chain(repo)
        assert any("duplicate SBOM component" in error for error in errors)
    finally:
        sbom_path.write_bytes(original_sbom)

    licenses = validator.read_canonical_json(licenses_path)
    removed = licenses["licenses"].pop()
    write_json(licenses_path, licenses, validator)
    try:
        errors, _, _ = validator.validate_repository_supply_chain(repo)
        assert any(
            "missing license" in error and removed["component"] in error
            for error in errors
        )
    finally:
        licenses_path.write_bytes(original_licenses)


def test_repository_gate_rejects_new_high_advisory_without_candidate_waiver(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    advisory_path = repo / "ci/production-advisories.json"
    database_path = repo / "ci/offline-advisory-database.json"
    original = advisory_path.read_bytes()
    original_database = database_path.read_bytes()
    advisory_database = validator.read_canonical_json(database_path)
    component = validator.locked_production_components(repo)[0]["purl"]
    advisory_database["entries"] = [
        {
            "id": "GHSA-new-production-finding",
            "component": component,
            "severity": "high",
        }
    ]
    write_json(database_path, advisory_database, validator)
    write_json(
        advisory_path,
        validator.build_advisory_snapshot(
            repo,
            advisory_database,
            generated_at="2026-07-26T01:00:00Z",
        ),
        validator,
    )
    try:
        errors, _, _ = validator.validate_repository_supply_chain(
            repo,
            now="2026-07-26T12:00:00Z",
        )
        assert any("unaccepted high/critical advisory" in error for error in errors)
    finally:
        advisory_path.write_bytes(original)
        database_path.write_bytes(original_database)


def test_review_evidence_digest_cannot_be_detached_from_attestation_subject():
    validator = load_validator()
    candidate = minimal_candidate()
    candidate["reviewEvidence"] = [
        {
            "schemaVersion": "release-review/v1",
            "digest": "sha256:" + "a" * 64,
            "verdict": "OK",
            "reviewer": "reviewer@example.invalid",
            "subject": candidate["repository"]["candidate"],
            "issuedAt": "2026-07-26T01:00:00Z",
        }
    ]

    errors = validator.validate_candidate_shape(candidate)

    assert any("review attestation digest" in error for error in errors)


def test_external_output_refuses_checkout_paths_and_existing_symlinks(
    candidate_repository, tmp_path
):
    validator, repo, _, _ = candidate_repository
    with pytest.raises(ValueError, match="external to the checkout"):
        validator._external_output_path(repo, repo / "release-candidate.json")

    target = tmp_path / "candidate-target.json"
    target.write_text("do not overwrite\n", encoding="utf-8")
    link = tmp_path / "candidate-link.json"
    link.symlink_to(target)
    with pytest.raises(ValueError, match="must not be a symlink"):
        validator._external_output_path(repo, link)

    real_directory = tmp_path / "real-evidence"
    real_directory.mkdir()
    linked_directory = tmp_path / "linked-evidence"
    linked_directory.symlink_to(real_directory, target_is_directory=True)
    with pytest.raises(ValueError, match="symlink parent"):
        validator._external_output_path(
            repo, linked_directory / "candidate.json"
        )


def test_candidate_operator_contract_documents_external_evidence_and_states():
    assert CANDIDATE_DOC_PATH.is_file()
    text = CANDIDATE_DOC_PATH.read_text(encoding="utf-8")
    for token in (
        "`release-candidate/v1`",
        "`release-state/v1`",
        "`planned`",
        "`implemented`",
        "`reviewed`",
        "`integrated`",
        "`promoted`",
        "`released`",
        "`verify-repository`",
        "`collect`",
        "`verify`",
        "outside the candidate checkout",
        "does not add an MCP tool",
    ):
        assert token in text

    changelog = (REPO / "CHANGELOG.md").read_text(encoding="utf-8")
    assert "release-candidate/v1" in changelog.split("## Unreleased", 1)[1]


def test_state_evidence_digest_is_recomputed_and_future_evidence_fails_closed(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(candidate),
        candidate["repository"]["candidate"],
    )

    detached = copy.deepcopy(ledger)
    detached["transitions"][0]["evidence"][0]["issuedAt"] = (
        "2026-07-26T01:00:01Z"
    )
    errors = validator.validate_state_ledger_repository(
        repo,
        detached,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("evidence digest" in error for error in errors)

    future = copy.deepcopy(ledger)
    material = future["transitions"][0]["evidence"][0]
    material["issuedAt"] = "2026-07-27T00:00:00Z"
    material["digest"] = validator.document_digest(
        {key: value for key, value in material.items() if key != "digest"}
    )
    errors = validator.validate_state_ledger_repository(
        repo,
        future,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("issuedAt" in error and "future" in error for error in errors)


def test_integrated_state_accepts_merge_descendant_but_rejects_feature_ref(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    subject = candidate["repository"]["candidate"]
    git(repo, "switch", "-c", "integration", "develop")
    git(repo, "merge", "--no-ff", "candidate", "-m", "integrate candidate")
    integrated = {
        "commit": git(repo, "rev-parse", "HEAD^{commit}"),
        "tree": git(repo, "rev-parse", "HEAD^{tree}"),
    }
    git(repo, "switch", "candidate")
    review_attestation = signed_review(validator, subject)
    candidate["reviewEvidence"] = [
        {
            **review_attestation,
            "digest": validator.document_digest(review_attestation),
        }
    ]
    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(candidate),
        subject,
    )
    ledger["transitions"].extend(
        [
            {
                "from": "implemented",
                "to": "reviewed",
                "evidence": [
                    transition_evidence(
                        validator,
                        "review",
                        subject,
                        verdict="OK",
                        attestationDigest=candidate["reviewEvidence"][0]["digest"],
                    )
                ],
            },
            {
                "from": "reviewed",
                "to": "integrated",
                "evidence": [
                    transition_evidence(
                        validator,
                        "integration-ref",
                        subject,
                        ref="refs/heads/integration",
                        refIdentity=integrated,
                    )
                ],
            },
        ]
    )
    ledger["currentState"] = "integrated"

    assert validator.validate_state_ledger_repository(
        repo,
        ledger,
        candidate,
        now="2026-07-26T12:00:00Z",
    ) == []

    isolated = copy.deepcopy(ledger)
    isolated_evidence = isolated["transitions"][-1]["evidence"][0]
    isolated_evidence["ref"] = "refs/heads/candidate"
    isolated_evidence["refIdentity"] = subject
    isolated_evidence["digest"] = validator.document_digest(
        {
            key: value
            for key, value in isolated_evidence.items()
            if key != "digest"
        }
    )
    errors = validator.validate_state_ledger_repository(
        repo,
        isolated,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("feature branch" in error for error in errors)


def test_future_waiver_issuance_and_rollback_clock_fail_closed(
    candidate_repository,
):
    validator, _, candidate, _ = candidate_repository
    advisory = {
        "id": "GHSA-future-waiver",
        "component": "pkg:pypi/example@1.0.0",
        "severity": "high",
    }
    waiver = minimal_waiver(candidate, advisory)
    waiver["issuedAt"] = "2026-07-27T00:00:00Z"

    errors = validator.validate_advisory_waivers(
        candidate,
        [advisory],
        [waiver],
        now="2026-07-26T12:00:00Z",
    )

    assert any("issuedAt" in error and "future" in error for error in errors)
    with pytest.raises(ValueError, match="rollback/fast-forward"):
        validator._trusted_validation_now("2000-01-01T00:00:00Z")


def test_review_attestation_is_canonical_candidate_bound_and_time_validated(
    candidate_repository, tmp_path
):
    validator, repo, candidate, _ = candidate_repository
    attestation = signed_review(
        validator,
        candidate["repository"]["candidate"],
        issued_at="2026-07-27T00:00:00Z",
    )
    review_path = tmp_path / "future-review.json"
    write_json(review_path, attestation, validator)
    reviewed = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        review_paths=[review_path],
    )

    errors = validator.validate_candidate_repository(
        repo,
        reviewed,
        now="2026-07-26T12:00:00Z",
    )

    assert any("reviewEvidence" in error and "future" in error for error in errors)

    attestation = signed_review(
        validator,
        candidate["repository"]["candidate"],
        reviewer="mailto:candidate@example.invalid",
    )
    author_review_path = tmp_path / "author-review.json"
    write_json(author_review_path, attestation, validator)
    author_reviewed = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        review_paths=[author_review_path],
    )
    errors = validator.validate_candidate_repository(
        repo,
        author_reviewed,
        now="2026-07-26T12:00:00Z",
    )
    assert any("not an independent reviewer" in error for error in errors)


def test_authenticated_reviewer_cannot_be_the_candidate_committer(
    candidate_repository,
    tmp_path,
    monkeypatch,
):
    validator, repo, _, _ = candidate_repository
    monkeypatch.setenv("GIT_COMMITTER_NAME", "Independent Committer")
    monkeypatch.setenv(
        "GIT_COMMITTER_EMAIL",
        "independent@example.invalid",
    )
    git(
        repo,
        "commit",
        "--amend",
        "--no-edit",
        "--author",
        "Candidate Fixture <candidate@example.invalid>",
    )
    subject = {
        "commit": git(repo, "rev-parse", "HEAD^{commit}"),
        "tree": git(repo, "rev-parse", "HEAD^{tree}"),
    }
    attestation = signed_review(
        validator,
        subject,
        reviewer="mailto:independent@example.invalid",
    )
    review_path = tmp_path / "committer-review.json"
    write_json(review_path, attestation, validator)
    reviewed = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        review_paths=[review_path],
    )

    errors = validator.validate_candidate_repository(
        repo,
        reviewed,
        now="2026-07-26T12:00:00Z",
    )

    assert any(
        "committer is not an independent reviewer" in error for error in errors
    )


def test_license_allowlist_is_independent_from_generated_inventory(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    licenses = validator.read_canonical_json(
        repo / "ci/production-licenses.json"
    )
    allowlist = validator.read_canonical_json(repo / "ci/license-allowlist.json")

    assert "allowedExpressions" not in licenses
    assert allowlist["schemaVersion"] == "license-allowlist/v1"

    allowlist["allowedExpressions"] = ["Apache-2.0"]
    write_json(repo / "ci/license-allowlist.json", allowlist, validator)
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("license is not allowed" in error for error in errors)


def test_sca_report_is_recomputed_from_fresh_digest_bound_database_and_coverage(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    report_path = repo / "ci/production-advisories.json"
    database_path = repo / "ci/offline-advisory-database.json"
    original_database = validator.read_canonical_json(database_path)

    incomplete_database = copy.deepcopy(original_database)
    incomplete_database["osv"]["coverage"].pop()
    write_json(database_path, incomplete_database, validator)
    write_json(
        report_path,
        validator.build_advisory_snapshot(
            repo,
            incomplete_database,
            generated_at="2026-07-26T01:00:00Z",
        ),
        validator,
    )
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("per-component coverage" in error for error in errors)

    raw_tamper = copy.deepcopy(original_database)
    raw_tamper["osv"]["response"]["rawBase64"] = base64.b64encode(
        b'{"results":[]}\n'
    ).decode("ascii")
    write_json(database_path, raw_tamper, validator)
    write_json(
        report_path,
        validator.build_advisory_snapshot(
            repo,
            raw_tamper,
            generated_at="2026-07-26T01:00:00Z",
        ),
        validator,
    )
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("raw response digest" in error for error in errors)

    write_json(database_path, original_database, validator)
    self_declared = validator.build_advisory_snapshot(
        repo,
        original_database,
        generated_at="2026-07-26T01:00:00Z",
    )
    self_declared["advisories"] = []
    self_declared["scanner"]["database"]["sha256"] = "sha256:" + "0" * 64
    material = {
        key: self_declared[key]
        for key in (
            "generatedAt",
            "scanner",
            "lockDigests",
            "coverage",
            "advisories",
        )
    }
    self_declared["snapshotId"] = validator.document_digest(material)
    write_json(report_path, self_declared, validator)
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("database digest" in error for error in errors)

    database = validator.read_canonical_json(database_path)
    report = validator.build_advisory_snapshot(
        repo,
        database,
        generated_at="2026-07-26T01:00:00Z",
    )
    report["coverage"]["componentCount"] -= 1
    material = {
        key: report[key]
        for key in (
            "generatedAt",
            "scanner",
            "lockDigests",
            "coverage",
            "advisories",
        )
    }
    report["snapshotId"] = validator.document_digest(material)
    write_json(report_path, report, validator)
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("coverage" in error for error in errors)

    database["database"]["validUntil"] = "2026-07-26T11:59:59Z"
    write_json(database_path, database, validator)
    write_json(
        report_path,
        validator.build_advisory_snapshot(
            repo,
            database,
            generated_at="2026-07-26T01:00:00Z",
        ),
        validator,
    )
    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )
    assert any("database" in error and "expired" in error for error in errors)


def test_schema_and_runtime_reject_same_structural_state_and_review_drift():
    validator = load_validator()
    candidate = minimal_candidate()
    candidate_schema = json.loads(
        CANDIDATE_SCHEMA_PATH.read_text(encoding="utf-8")
    )
    state_schema = json.loads(STATE_SCHEMA_PATH.read_text(encoding="utf-8"))

    review = {
        "schemaVersion": "release-review/v1",
        "digest": "sha256:" + "a" * 64,
        "verdict": "OK",
        "reviewer": "reviewer@example.invalid",
        "subject": candidate["repository"]["candidate"],
    }
    candidate["reviewEvidence"] = [review]
    assert list(
        jsonschema.Draft202012Validator(candidate_schema).iter_errors(candidate)
    )
    assert validator.validate_candidate_shape(candidate)

    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(minimal_candidate()),
        candidate["repository"]["candidate"],
    )
    ledger["transitions"][0]["evidence"][0]["unexpected"] = True
    assert list(
        jsonschema.Draft202012Validator(state_schema).iter_errors(ledger)
    )
    assert validator.validate_state_ledger_shape(ledger, minimal_candidate())

    substituted = minimal_candidate()
    substituted["suiteManifest"]["path"] = "ci/unreviewed-suites.json"
    assert list(
        jsonschema.Draft202012Validator(candidate_schema).iter_errors(
            substituted
        )
    )
    assert validator.validate_candidate_shape(substituted)

    wrong_kind_fields = minimal_state_ledger(
        validator,
        validator.document_digest(minimal_candidate()),
        minimal_candidate()["repository"]["candidate"],
    )
    evidence = wrong_kind_fields["transitions"][0]["evidence"][0]
    evidence["ref"] = "refs/heads/develop"
    evidence["digest"] = validator.document_digest(
        {key: value for key, value in evidence.items() if key != "digest"}
    )
    assert list(
        jsonschema.Draft202012Validator(state_schema).iter_errors(
            wrong_kind_fields
        )
    )
    assert validator.validate_state_ledger_shape(
        wrong_kind_fields,
        minimal_candidate(),
    )


@pytest.mark.parametrize(
    ("ref_name", "ref_value"),
    [
        ("base_ref", "refs/heads/develop~0"),
        ("branch_ref", "refs/heads/candidate^{commit}"),
    ],
)
def test_collector_rejects_revision_expressions_disguised_as_exact_refs(
    candidate_repository,
    ref_name,
    ref_value,
):
    validator, repo, _, _ = candidate_repository
    arguments = {
        "base_ref": "refs/heads/develop",
        "branch_ref": "refs/heads/candidate",
    }
    arguments[ref_name] = ref_value

    with pytest.raises(ValueError, match="exact .* reference"):
        validator.collect_candidate(repo, **arguments)


@pytest.mark.parametrize(
    "index_flag",
    ["--skip-worktree", "--assume-unchanged"],
)
def test_collection_rejects_governed_index_flags_even_when_status_is_clean(
    candidate_repository,
    index_flag,
):
    validator, repo, _, _ = candidate_repository
    governed = repo / "scripts/ci_gate.py"
    git(repo, "update-index", index_flag, "scripts/ci_gate.py")
    governed.write_text("# concealed governed bytes\n", encoding="utf-8")

    with pytest.raises(ValueError, match="index flag"):
        validator.collect_candidate(
            repo,
            base_ref="refs/heads/develop",
            branch_ref="refs/heads/candidate",
        )


@pytest.mark.parametrize(
    ("replace_ref_base", "replace_ref"),
    [
        (None, "refs/replace/{commit}"),
        ("refs/local-replacements/", "refs/local-replacements/{commit}"),
    ],
)
def test_candidate_identity_ignores_mutable_commit_replacements(
    candidate_repository,
    monkeypatch,
    replace_ref_base,
    replace_ref,
):
    validator, repo, _, _ = candidate_repository
    technical_commit = git(
        repo, "--no-replace-objects", "rev-parse", "HEAD^{commit}"
    )
    immutable_tree = git(
        repo, "--no-replace-objects", "rev-parse", f"{technical_commit}^{{tree}}"
    )
    parent = git(
        repo, "--no-replace-objects", "rev-parse", f"{technical_commit}^"
    )
    (repo / "app.txt").write_text("replacement tree\n", encoding="utf-8")
    git(repo, "add", "app.txt")
    replacement_tree = git(repo, "write-tree")
    replacement_commit = git(
        repo,
        "commit-tree",
        replacement_tree,
        "-p",
        parent,
        "-m",
        "mutable replacement",
    )
    git(repo, "reset", "--hard", technical_commit)
    git(
        repo,
        "update-ref",
        replace_ref.format(commit=technical_commit),
        replacement_commit,
    )
    if replace_ref_base is not None:
        monkeypatch.setenv("GIT_REPLACE_REF_BASE", replace_ref_base)

    collected = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
    )

    assert replacement_tree != immutable_tree
    assert collected["repository"]["candidate"]["tree"] == immutable_tree
    assert validator.validate_candidate_repository(
        repo,
        collected,
        now="2026-07-26T12:00:00Z",
    ) == []


def test_candidate_identity_fails_closed_on_legacy_grafts(candidate_repository):
    validator, repo, _, _ = candidate_repository
    technical_commit = git(
        repo, "--no-replace-objects", "rev-parse", "HEAD^{commit}"
    )
    graft_file = repo / ".git/info/grafts"
    graft_file.write_text(f"{technical_commit}\n", encoding="ascii")

    with pytest.raises(ValueError, match="legacy Git graft"):
        validator.collect_candidate(
            repo,
            base_ref="refs/heads/develop",
            branch_ref="refs/heads/candidate",
        )


@pytest.mark.parametrize(
    "environment_name",
    ["GIT_GRAFT_FILE", "GIT_SHALLOW_FILE"],
)
def test_external_ancestry_environment_cannot_change_candidate_identity(
    candidate_repository,
    tmp_path,
    monkeypatch,
    environment_name,
):
    validator, repo, baseline, _ = candidate_repository
    technical_commit = baseline["repository"]["candidate"]["commit"]
    external_ancestry = tmp_path / "external-ancestry"
    external_ancestry.write_text(f"{technical_commit}\n", encoding="ascii")
    monkeypatch.setenv(environment_name, str(external_ancestry))

    contaminated = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
    )

    assert contaminated["repository"] == baseline["repository"]
    assert validator.validate_candidate_repository(
        repo,
        contaminated,
        now="2026-07-26T12:00:00Z",
    ) == []


def test_git_local_environment_inventory_is_fully_neutralized(
    candidate_repository,
    tmp_path,
    monkeypatch,
):
    validator, repo, baseline, _ = candidate_repository
    reported = set(git(repo, "rev-parse", "--local-env-vars").splitlines())
    required = {
        "GIT_ALTERNATE_OBJECT_DIRECTORIES",
        "GIT_COMMON_DIR",
        "GIT_CONFIG",
        "GIT_CONFIG_COUNT",
        "GIT_CONFIG_PARAMETERS",
        "GIT_DIR",
        "GIT_GRAFT_FILE",
        "GIT_IMPLICIT_WORK_TREE",
        "GIT_INDEX_FILE",
        "GIT_NO_REPLACE_OBJECTS",
        "GIT_OBJECT_DIRECTORY",
        "GIT_PREFIX",
        "GIT_REPLACE_REF_BASE",
        "GIT_SHALLOW_FILE",
        "GIT_WORK_TREE",
    }
    assert required <= reported
    inherited_path = os.environ["PATH"]
    for name in reported:
        monkeypatch.setenv(name, str(tmp_path / name.lower()))
    monkeypatch.setenv("GIT_CONFIG_KEY_0", "core.bare")
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", "true")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(tmp_path / "global-config"))
    monkeypatch.setenv("GIT_CONFIG_SYSTEM", str(tmp_path / "system-config"))
    monkeypatch.setenv("HOME", str(tmp_path / "home"))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path / "xdg"))

    environment = validator._git_environment()

    assert environment["PATH"] == inherited_path
    assert environment["GIT_NO_REPLACE_OBJECTS"] == "1"
    assert (
        reported - {"GIT_NO_REPLACE_OBJECTS"}
    ).isdisjoint(environment)
    assert set(environment) == {
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
    assert str(tmp_path) not in repr(environment)

    contaminated = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
    )
    assert contaminated["repository"] == baseline["repository"]
    assert validator.validate_candidate_repository(
        repo,
        contaminated,
        now="2026-07-26T12:00:00Z",
    ) == []


def test_global_and_system_git_config_cannot_change_candidate_resolution(
    candidate_repository,
    tmp_path,
    monkeypatch,
):
    validator, repo, baseline, _ = candidate_repository
    hostile_config = tmp_path / "hostile.gitconfig"
    hostile_config.write_text("[invalid\n", encoding="utf-8")
    hostile_home = tmp_path / "home"
    hostile_home.mkdir()
    (hostile_home / ".gitconfig").write_bytes(hostile_config.read_bytes())
    monkeypatch.setenv("HOME", str(hostile_home))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(hostile_home))
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(hostile_config))
    monkeypatch.setenv("GIT_CONFIG_SYSTEM", str(hostile_config))

    contaminated = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
    )

    assert contaminated["repository"] == baseline["repository"]
    assert validator.validate_candidate_repository(
        repo,
        contaminated,
        now="2026-07-26T12:00:00Z",
    ) == []


def test_non_neutralizable_repository_config_fails_closed_without_paths(
    candidate_repository,
    tmp_path,
    capsys,
):
    validator, repo, _, _ = candidate_repository
    hostile_config = tmp_path / "repository-include"
    hostile_config.write_text("[invalid\n", encoding="utf-8")
    git(repo, "config", "include.path", str(hostile_config))

    result = validator.main(
        [
            "collect",
            "--repo-root",
            str(repo),
            "--base-ref",
            "refs/heads/develop",
            "--branch-ref",
            "refs/heads/candidate",
            "--output",
            str(tmp_path / "candidate.json"),
        ]
    )
    output = capsys.readouterr()

    assert result == 1
    assert output.err == ""
    assert len(output.out.splitlines()) == 1
    assert json.loads(output.out)["status"] == "failed"
    assert str(tmp_path) not in output.out
    assert str(repo) not in output.out


def test_review_only_branch_advancement_keeps_the_technical_subject_pinned(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    technical_commit = git(repo, "rev-parse", "HEAD^{commit}")
    technical_tree = git(repo, "rev-parse", "HEAD^{tree}")
    request = repo / "plan/PROJECT_V5/reviews/C_0_2-2_to_review.md"
    request.parent.mkdir(parents=True)
    request.write_text("# Independent review request\n", encoding="utf-8")
    git(repo, "add", request.relative_to(repo).as_posix())
    git(repo, "commit", "-m", "docs(review): request independent verdict")

    collected = validator.collect_candidate(
        repo,
        base_ref="refs/heads/develop",
        branch_ref="refs/heads/candidate",
        candidate_commit=technical_commit,
    )

    assert collected["repository"]["candidate"] == {
        "commit": technical_commit,
        "tree": technical_tree,
    }
    assert (
        collected["repository"]["branch"]["commit"]
        == git(repo, "rev-parse", "HEAD^{commit}")
    )
    assert validator.validate_candidate_repository(
        repo,
        collected,
        now="2026-07-26T12:00:00Z",
    ) == []


def test_post_freeze_non_review_change_is_rejected(candidate_repository):
    validator, repo, _, _ = candidate_repository
    technical_commit = git(repo, "rev-parse", "HEAD^{commit}")
    (repo / "unrelated.txt").write_text("not review evidence\n", encoding="utf-8")
    git(repo, "add", "unrelated.txt")
    git(repo, "commit", "-m", "docs: unrelated post-freeze change")

    with pytest.raises(ValueError, match="review artifacts"):
        validator.collect_candidate(
            repo,
            base_ref="refs/heads/develop",
            branch_ref="refs/heads/candidate",
            candidate_commit=technical_commit,
        )


def test_state_refs_also_reject_revision_expression_pseudo_refs(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository

    with pytest.raises(ValueError, match="exact existing Git reference"):
        validator._resolve_exact_ref_identity(
            repo,
            "refs/heads/candidate~0",
            allowed_prefixes=("refs/heads/",),
        )


def test_unrelated_advisory_corpus_cannot_claim_full_graph_coverage(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    database_path = repo / "ci/offline-advisory-database.json"
    database = validator.read_canonical_json(database_path)
    database["components"] = ["pkg:npm/not-installed@1.0.0"]
    database["componentsSha256"] = validator.document_digest(
        {"components": database["components"]}
    )
    write_json(database_path, database, validator)

    errors, _, _ = validator.validate_repository_supply_chain(
        repo,
        now="2026-07-26T12:00:00Z",
    )

    assert any(
        "1:1" in error or "per-component" in error or "zero-overlap" in error
        for error in errors
    )


def test_python_roots_come_from_all_production_pyprojects_not_comments(
    candidate_repository,
):
    validator, repo, _, _ = candidate_repository
    manifest = repo / "cli/pyproject.toml"
    manifest.write_text(
        "\n".join(
            [
                "[project]",
                'name = "fixture-cli"',
                'version = "1.0.0"',
                'requires-python = ">=3.11"',
                'dependencies = ["custom-runtime>=2"]',
                "",
            ]
        ),
        encoding="utf-8",
    )
    lock = repo / "requirements.lock"
    lock.write_text(
        lock.read_text(encoding="utf-8")
        + "custom-runtime==2.1.0 \\\n"
        + f"    --hash=sha256:{'e' * 64}\n"
        + "    # via a-comment-that-is-not-authority\n",
        encoding="utf-8",
    )

    components = validator.locked_production_components(repo)

    custom = next(item for item in components if item["name"] == "custom-runtime")
    assert custom["direct"] is True


def test_selected_python_lock_nodes_require_sha256_hashes(candidate_repository):
    validator, repo, _, _ = candidate_repository
    lock = repo / "requirements.lock"
    lock.write_text(
        "\n".join(
            line
            for line in lock.read_text(encoding="utf-8").splitlines()
            if "--hash=sha256:" not in line
        )
        + "\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="sha256 hash"):
        validator.locked_production_components(repo)


def test_unsigned_self_asserted_review_is_not_candidate_evidence():
    validator = load_validator()
    candidate = minimal_candidate()
    material = {
        "schemaVersion": "release-review/v1",
        "verdict": "OK",
        "reviewer": "independent@example.invalid",
        "subject": candidate["repository"]["candidate"],
        "issuedAt": "2026-07-26T01:00:00Z",
    }
    candidate["reviewEvidence"] = [
        {**material, "digest": validator.document_digest(material)}
    ]

    errors = validator.validate_candidate_shape(candidate)

    assert any(
        "signature" in error or "trust root" in error for error in errors
    )


def test_review_cannot_predate_the_pinned_technical_commit(candidate_repository):
    validator, repo, candidate, _ = candidate_repository
    review = signed_review(
        validator,
        candidate["repository"]["candidate"],
        issued_at="2020-01-01T00:00:00Z",
    )
    candidate["reviewEvidence"] = [
        {**review, "digest": validator.document_digest(review)}
    ]

    errors = validator.validate_candidate_repository(
        repo,
        candidate,
        now="2026-07-26T12:00:00Z",
    )

    assert any("predates" in error and "candidate" in error for error in errors)


def test_review_signature_and_state_chronology_cannot_be_reasserted(
    candidate_repository,
):
    validator, repo, candidate, _ = candidate_repository
    review_material = signed_review(
        validator,
        candidate["repository"]["candidate"],
    )
    tampered = copy.deepcopy(review_material)
    tampered["issuedAt"] = "2026-07-26T06:00:01Z"
    tampered["digest"] = validator.document_digest(tampered)
    candidate["reviewEvidence"] = [tampered]

    errors = validator.validate_candidate_repository(
        repo,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("signature" in error and "failed" in error for error in errors)

    valid_review = signed_review(
        validator,
        candidate["repository"]["candidate"],
    )
    valid_review["digest"] = validator.document_digest(valid_review)
    candidate["reviewEvidence"] = [valid_review]
    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(candidate),
        candidate["repository"]["candidate"],
    )
    early_review = transition_evidence(
        validator,
        "review",
        candidate["repository"]["candidate"],
        attestationDigest=valid_review["digest"],
        verdict="OK",
    )
    early_review["issuedAt"] = "2026-07-26T05:59:59Z"
    early_review["digest"] = validator.document_digest(
        {key: value for key, value in early_review.items() if key != "digest"}
    )
    ledger["transitions"].append(
        {
            "from": "implemented",
            "to": "reviewed",
            "evidence": [early_review],
        }
    )
    ledger["currentState"] = "reviewed"

    errors = validator.validate_state_ledger_repository(
        repo,
        ledger,
        candidate,
        now="2026-07-26T12:00:00Z",
    )
    assert any("predates attestation issuance" in error for error in errors)


def test_waiver_validity_is_capped_even_when_expiry_is_in_the_future():
    validator = load_validator()
    candidate = minimal_candidate()
    advisory = {
        "id": "GHSA-overlong",
        "component": "pkg:pypi/example@1.0.0",
        "severity": "high",
    }
    waiver = minimal_waiver(candidate, advisory)
    waiver["expiresAt"] = "9999-01-01T00:00:00Z"

    errors = validator.validate_advisory_waivers(
        candidate,
        [advisory],
        [waiver],
        now="2026-07-26T12:00:00Z",
    )

    assert any("validity" in error and "exceeds" in error for error in errors)


def test_schema_and_runtime_both_reject_duplicate_python_without_node():
    validator = load_validator()
    candidate = minimal_candidate()
    candidate["runtimes"][1] = copy.deepcopy(candidate["runtimes"][0])
    schema = json.loads(CANDIDATE_SCHEMA_PATH.read_text(encoding="utf-8"))

    schema_errors = list(
        jsonschema.Draft202012Validator(schema).iter_errors(candidate)
    )
    runtime_errors = validator.validate_candidate_shape(candidate)

    assert schema_errors
    assert runtime_errors


@pytest.mark.parametrize(
    ("reviewer", "accepted"),
    [
        ("mailto:independent@example.invalid", True),
        ("mailto:Reviewer@Example.Invalid", False),
        ("mailto:réviewer@example.invalid", False),
    ],
)
def test_schema_and_runtime_share_normalized_mailto_case_rules(
    candidate_repository,
    reviewer,
    accepted,
):
    validator, _, candidate, _ = candidate_repository
    review = signed_review(
        validator,
        candidate["repository"]["candidate"],
        reviewer=reviewer,
    )
    candidate["reviewEvidence"] = [
        {**review, "digest": validator.document_digest(review)}
    ]
    schema = json.loads(CANDIDATE_SCHEMA_PATH.read_text(encoding="utf-8"))

    schema_errors = list(
        jsonschema.Draft202012Validator(schema).iter_errors(candidate)
    )
    runtime_errors = validator.validate_candidate_shape(candidate)

    assert bool(schema_errors) is not accepted
    assert bool(runtime_errors) is not accepted


def test_malformed_candidate_cli_returns_one_safe_json_object(
    candidate_repository,
    tmp_path,
    capsys,
):
    validator, repo, _, _ = candidate_repository
    malformed_path = tmp_path / "malformed-candidate.json"
    write_json(
        malformed_path,
        {"schemaVersion": "release-candidate/v1"},
        validator,
    )

    result = validator.main(
        [
            "verify",
            "--repo-root",
            str(repo),
            "--candidate",
            str(malformed_path),
            "--at",
            validator._default_now(),
        ]
    )
    output = capsys.readouterr()
    lines = output.out.splitlines()

    assert result == 1
    assert output.err == ""
    assert len(lines) == 1
    report = json.loads(lines[0])
    assert report["status"] == "failed"
    assert str(tmp_path) not in lines[0]


def test_malformed_governed_json_error_does_not_expose_absolute_paths(
    candidate_repository,
    tmp_path,
    capsys,
):
    validator, repo, candidate, _ = candidate_repository
    candidate_path = tmp_path / "candidate.json"
    write_json(candidate_path, candidate, validator)
    allowlist_path = repo / "ci/license-allowlist.json"
    allowlist = json.loads(allowlist_path.read_text(encoding="utf-8"))
    allowlist_path.write_text(
        json.dumps(allowlist, indent=2) + "\n",
        encoding="utf-8",
    )

    result = validator.main(
        [
            "verify",
            "--repo-root",
            str(repo),
            "--candidate",
            str(candidate_path),
            "--at",
            validator._default_now(),
        ]
    )
    output = capsys.readouterr()

    assert result == 1
    assert output.err == ""
    assert len(output.out.splitlines()) == 1
    report = json.loads(output.out)
    assert report["status"] == "failed"
    assert "canonical JSON" in output.out
    assert str(repo.resolve()) not in output.out
    assert str(tmp_path.resolve()) not in output.out


def test_git_wrapper_has_a_bounded_timeout_and_hardened_environment(
    candidate_repository,
    monkeypatch,
):
    validator, repo, _, _ = candidate_repository
    observed = {}

    class HangingGit:
        pid = 12345

        def communicate(self, *, timeout):
            observed["timeout"] = timeout
            raise subprocess.TimeoutExpired("git", timeout)

    def fake_popen(*args, **kwargs):
        observed["argv"] = args[0]
        observed.update(kwargs)
        return HangingGit()

    monkeypatch.setattr(validator.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(
        validator,
        "_terminate_process_group",
        lambda process: observed.update({"terminated": process.pid}),
    )
    with pytest.raises(ValueError, match="timed out"):
        validator._git(repo, "status", timeout_seconds=0.01)

    assert observed["stdin"] is subprocess.DEVNULL
    assert observed["timeout"] == 0.01
    assert observed["env"]["LC_ALL"] == "C"
    assert observed["env"]["GIT_TERMINAL_PROMPT"] == "0"
    assert observed["start_new_session"] is True
    assert observed["shell"] is False
    assert observed["terminated"] == 12345


def test_git_timeout_kills_group_descendant_after_leader_exits(
    candidate_repository,
    tmp_path,
    monkeypatch,
):
    import ctypes

    validator, repo, _, _ = candidate_repository
    libc = ctypes.CDLL(None, use_errno=True)
    original_subreaper = ctypes.c_int()
    assert libc.prctl(37, ctypes.byref(original_subreaper), 0, 0, 0) == 0
    assert libc.prctl(36, 1, 0, 0, 0) == 0
    executable_directory = tmp_path / "bin"
    executable_directory.mkdir()
    process_record = tmp_path / "process.json"
    fake_git = executable_directory / "git"
    fake_git.write_text(
        "#!/usr/bin/env python3\n"
        "import json\n"
        "import os\n"
        "import signal\n"
        "import subprocess\n"
        "import sys\n"
        f"record = {str(process_record)!r}\n"
        "child = subprocess.Popen([\n"
        "    sys.executable,\n"
        "    '-c',\n"
        "    'import signal,time; signal.signal(signal.SIGTERM, "
        "signal.SIG_IGN); time.sleep(60)',\n"
        "])\n"
        "with open(record, 'w', encoding='utf-8') as stream:\n"
        "    json.dump({'child': child.pid, 'group': os.getpgrp()}, stream)\n",
        encoding="utf-8",
    )
    fake_git.chmod(0o755)
    monkeypatch.setenv(
        "PATH",
        f"{executable_directory}{os.pathsep}{os.environ['PATH']}",
    )

    child_pid = None
    process_group = None
    try:
        with pytest.raises(ValueError, match="timed out"):
            validator._git(repo, "status", timeout_seconds=0.1)
        process_data = json.loads(process_record.read_text(encoding="utf-8"))
        child_pid = process_data["child"]
        process_group = process_data["group"]

        deadline = time.monotonic() + 2
        while _process_is_running(child_pid) and time.monotonic() < deadline:
            time.sleep(0.01)

        assert not _process_is_running(child_pid)
    finally:
        if child_pid is not None and _process_is_running(child_pid):
            os.killpg(process_group, signal.SIGKILL)
        if child_pid is not None:
            os.waitpid(child_pid, 0)
        assert libc.prctl(36, original_subreaper.value, 0, 0, 0) == 0


def _process_is_running(pid):
    try:
        stat_fields = Path(f"/proc/{pid}/stat").read_text(
            encoding="ascii"
        ).split()
    except FileNotFoundError:
        return False
    return len(stat_fields) > 2 and stat_fields[2] != "Z"


def test_legacy_boolean_checklist_and_arbitrary_provenance_are_rejected():
    validator = load_validator()
    candidate = minimal_candidate()
    ledger = minimal_state_ledger(
        validator,
        validator.document_digest(candidate),
        candidate["repository"]["candidate"],
    )
    previous = "implemented"
    for state, kind, extra in (
        (
            "reviewed",
            "review",
            {
                "verdict": "OK",
                "attestationDigest": "sha256:" + "1" * 64,
            },
        ),
        (
            "integrated",
            "integration-ref",
            {
                "ref": "refs/heads/develop",
                "refIdentity": candidate["repository"]["candidate"],
            },
        ),
        (
            "promoted",
            "promotion-ref",
            {
                "ref": "refs/heads/main",
                "refIdentity": candidate["repository"]["candidate"],
            },
        ),
        (
            "released",
            "release-tag",
            {
                "ref": "refs/tags/v1.0.0",
                "refIdentity": candidate["repository"]["candidate"],
                "candidateDigest": validator.document_digest(candidate),
                "checklistComplete": True,
                "provenanceDigest": "sha256:" + "8" * 64,
            },
        ),
    ):
        ledger["transitions"].append(
            {
                "from": previous,
                "to": state,
                "evidence": [
                    transition_evidence(
                        validator,
                        kind,
                        candidate["repository"]["candidate"],
                        **extra,
                    )
                ],
            }
        )
        previous = state
    ledger["currentState"] = "released"

    errors = validator.validate_state_ledger_shape(ledger, candidate)

    assert any(
        "canonical checklist" in error or "provenance artifact" in error
        for error in errors
    )
