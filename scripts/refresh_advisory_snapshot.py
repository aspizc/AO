#!/usr/bin/env python3
"""Refresh the reviewed offline SCA snapshot from public primary endpoints."""

from __future__ import annotations

import argparse
import base64
from datetime import timedelta
import gzip
import importlib.util
import json
from pathlib import Path
import ssl
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


OSV_BATCH_ENDPOINT = "https://api.osv.dev/v1/querybatch"
OSV_QUERY_ENDPOINT = "https://api.osv.dev/v1/query"
NPM_BULK_ENDPOINT = (
    "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk"
)
OSV_VULNERABILITY_ENDPOINT = "https://api.osv.dev/v1/vulns/"
HTTP_TIMEOUT_SECONDS = 30
MAX_RESPONSE_BYTES = 32 * 1024 * 1024
MAX_OSV_PAGES_PER_COMPONENT = 100


def _load_release_module(repo_root: Path) -> Any:
    path = repo_root / "scripts/release_candidate.py"
    spec = importlib.util.spec_from_file_location("_release_snapshot", path)
    if spec is None or spec.loader is None:
        raise ValueError("release candidate module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _post_json(endpoint: str, document: Any, release: Any) -> tuple[bytes, Any]:
    body = release.canonical_json_bytes(document)
    request = Request(
        endpoint,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "User-Agent": "agents-orchestrator-release-snapshot/1",
        },
    )
    try:
        with urlopen(  # noqa: S310 - endpoints are fixed HTTPS constants
            request,
            timeout=HTTP_TIMEOUT_SECONDS,
            context=ssl.create_default_context(),
        ) as response:
            if response.status != 200:
                raise ValueError("primary advisory endpoint returned non-200")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, ssl.SSLError) as exc:
        raise ValueError("primary advisory endpoint request failed") from exc
    if len(raw) > MAX_RESPONSE_BYTES:
        raise ValueError("primary advisory response exceeded the size limit")
    decoded = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
    try:
        parsed = json.loads(
            decoded.decode("utf-8"),
            object_pairs_hook=release._reject_duplicate_keys,
            parse_constant=release._reject_constant,
            parse_float=str,
        )
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("primary advisory response was not valid JSON") from exc
    return raw, parsed


def _get_json(endpoint: str, release: Any) -> tuple[bytes, Any]:
    request = Request(
        endpoint,
        method="GET",
        headers={"User-Agent": "agents-orchestrator-release-snapshot/1"},
    )
    try:
        with urlopen(  # noqa: S310 - endpoint has a fixed HTTPS prefix
            request,
            timeout=HTTP_TIMEOUT_SECONDS,
            context=ssl.create_default_context(),
        ) as response:
            if response.status != 200:
                raise ValueError("primary advisory endpoint returned non-200")
            raw = response.read(MAX_RESPONSE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError, ssl.SSLError) as exc:
        raise ValueError("primary advisory endpoint request failed") from exc
    if len(raw) > MAX_RESPONSE_BYTES:
        raise ValueError("primary advisory response exceeded the size limit")
    decoded = gzip.decompress(raw) if raw.startswith(b"\x1f\x8b") else raw
    try:
        parsed = json.loads(
            decoded.decode("utf-8"),
            object_pairs_hook=release._reject_duplicate_keys,
            parse_constant=release._reject_constant,
            parse_float=str,
        )
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("primary advisory response was not valid JSON") from exc
    return raw, parsed


def _response_record(raw: bytes, parsed: Any, release: Any) -> dict[str, Any]:
    return {
        "contentEncoding": "gzip" if raw.startswith(b"\x1f\x8b") else "identity",
        "rawBase64": base64.b64encode(raw).decode("ascii"),
        "rawSha256": release._blob_digest(raw),
        "canonical": parsed,
        "canonicalSha256": release.document_digest(parsed),
    }


def _osv_query(component: dict[str, Any]) -> dict[str, Any]:
    ecosystem = "PyPI" if component["ecosystem"] == "pypi" else "npm"
    return {
        "package": {
            "ecosystem": ecosystem,
            "name": component["name"],
        },
        "version": component["version"],
    }


def _severity(vulnerability: dict[str, Any]) -> str:
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
    # Unknown severity is intentionally conservative; it is never a fabricated
    # claim that the exact component is unaffected.
    return "critical"


def _collect_osv(
    components: list[dict[str, Any]],
    release: Any,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    queries = [_osv_query(component) for component in components]
    batch_request = {"queries": queries}
    raw, parsed = _post_json(OSV_BATCH_ENDPOINT, batch_request, release)
    if not isinstance(parsed, dict) or not isinstance(parsed.get("results"), list):
        raise ValueError("OSV querybatch response shape is invalid")
    results = parsed["results"]
    if len(results) != len(components):
        raise ValueError("OSV querybatch count/order mapping is incomplete")

    pages: list[dict[str, Any]] = []
    coverage: list[dict[str, Any]] = []
    affected: set[tuple[str, str]] = set()
    for index, (component, query, first_result) in enumerate(
        zip(components, queries, results, strict=True)
    ):
        if not isinstance(first_result, dict):
            raise ValueError("OSV querybatch result must be an object")
        result_records = [
            {
                "endpoint": OSV_BATCH_ENDPOINT,
                "requestSha256": release.document_digest(batch_request),
                "responseResult": first_result,
                "responseResultSha256": release.document_digest(first_result),
            }
        ]
        current = first_result
        page_count = 0
        while current.get("next_page_token"):
            page_count += 1
            if page_count > MAX_OSV_PAGES_PER_COMPONENT:
                raise ValueError("OSV pagination exceeded the bounded page limit")
            token = current["next_page_token"]
            if not isinstance(token, str) or not token:
                raise ValueError("OSV pagination token is invalid")
            page_request = {**query, "page_token": token}
            page_raw, page_parsed = _post_json(
                OSV_QUERY_ENDPOINT,
                page_request,
                release,
            )
            if not isinstance(page_parsed, dict):
                raise ValueError("OSV paginated response must be an object")
            page_record = {
                "component": component["purl"],
                "endpoint": OSV_QUERY_ENDPOINT,
                "index": index,
                "request": page_request,
                "requestSha256": release.document_digest(page_request),
                "response": _response_record(page_raw, page_parsed, release),
            }
            pages.append(page_record)
            result_records.append(
                {
                    "endpoint": OSV_QUERY_ENDPOINT,
                    "requestSha256": page_record["requestSha256"],
                    "responseResult": page_parsed,
                    "responseResultSha256": release.document_digest(page_parsed),
                }
            )
            current = page_parsed
        for result_record in result_records:
            vulnerabilities = result_record["responseResult"].get("vulns", [])
            if not isinstance(vulnerabilities, list):
                raise ValueError("OSV vulnerabilities result must be an array")
            for vulnerability in vulnerabilities:
                if not isinstance(vulnerability, dict):
                    raise ValueError("OSV vulnerability must be an object")
                advisory_id = vulnerability.get("id")
                if not isinstance(advisory_id, str) or not advisory_id:
                    raise ValueError("OSV vulnerability identity is missing")
                affected.add((advisory_id, component["purl"]))
        coverage.append(
            {
                "component": component["purl"],
                "index": index,
                "query": query,
                "querySha256": release.document_digest(query),
                "resultSha256": [
                    item["responseResultSha256"] for item in result_records
                ],
            }
        )
    vulnerabilities: list[dict[str, Any]] = []
    severity_by_id: dict[str, str] = {}
    for advisory_id in sorted({item[0] for item in affected}):
        endpoint = OSV_VULNERABILITY_ENDPOINT + quote(advisory_id, safe="")
        detail_raw, detail = _get_json(endpoint, release)
        if not isinstance(detail, dict) or detail.get("id") != advisory_id:
            raise ValueError("OSV vulnerability detail identity mismatch")
        severity_by_id[advisory_id] = _severity(detail)
        vulnerabilities.append(
            {
                "endpoint": endpoint,
                "id": advisory_id,
                "response": _response_record(detail_raw, detail, release),
            }
        )
    findings = [
        {
            "component": component,
            "id": advisory_id,
            "severity": severity_by_id[advisory_id],
        }
        for advisory_id, component in sorted(affected)
    ]
    return (
        {
            "endpoint": OSV_BATCH_ENDPOINT,
            "mode": "querybatch-with-bounded-query-pagination",
            "request": batch_request,
            "requestSha256": release.document_digest(batch_request),
            "response": _response_record(raw, parsed, release),
            "pages": pages,
            "coverage": coverage,
            "vulnerabilities": vulnerabilities,
        },
        findings,
    )


def _collect_npm(
    components: list[dict[str, Any]],
    release: Any,
) -> dict[str, Any]:
    npm_components = [
        component for component in components if component["ecosystem"] == "npm"
    ]
    request_document: dict[str, list[str]] = {}
    for component in npm_components:
        request_document.setdefault(component["name"], []).append(
            component["version"]
        )
    request_document = {
        name: sorted(set(versions))
        for name, versions in sorted(request_document.items())
    }
    raw, parsed = _post_json(NPM_BULK_ENDPOINT, request_document, release)
    if not isinstance(parsed, dict):
        raise ValueError("npm Bulk Advisory response must be an object")
    return {
        "coverage": [component["purl"] for component in npm_components],
        "endpoint": NPM_BULK_ENDPOINT,
        "mode": "bulk-advisory-corroboration-only",
        "request": request_document,
        "requestSha256": release.document_digest(request_document),
        "response": _response_record(raw, parsed, release),
    }


def build_snapshot(
    repo_root: Path,
    *,
    fetched_at: str,
    validity_days: int,
) -> dict[str, Any]:
    release = _load_release_module(repo_root)
    observed = release._parse_timestamp(fetched_at, "fetched-at")
    if validity_days < 1 or validity_days > 31:
        raise ValueError("validity-days must be between 1 and 31")
    components = release.locked_production_components(repo_root)
    osv, entries = _collect_osv(components, release)
    npm = _collect_npm(components, release)
    valid_until = (observed + timedelta(days=validity_days)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    component_purls = [component["purl"] for component in components]
    return {
        "schemaVersion": "offline-advisory-database/v2",
        "database": {
            "authority": "OSV",
            "ecosystems": sorted(
                {component["ecosystem"] for component in components}
            ),
            "fetchedAt": fetched_at,
            "name": "OSV exact-component primary snapshot",
            "source": OSV_BATCH_ENDPOINT,
            "validUntil": valid_until,
            "version": observed.strftime("%Y-%m-%d"),
        },
        "components": component_purls,
        "componentsSha256": release.document_digest(
            {"components": component_purls}
        ),
        "entries": entries,
        "npmCorroboration": npm,
        "osv": osv,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--fetched-at", required=True)
    parser.add_argument("--validity-days", type=int, default=14)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ci/offline-advisory-database.json"),
    )
    args = parser.parse_args(argv)
    root = args.repo_root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    if output.is_symlink():
        raise ValueError("snapshot output must not be a symlink")
    snapshot = build_snapshot(
        root,
        fetched_at=args.fetched_at,
        validity_days=args.validity_days,
    )
    output.write_bytes(
        _load_release_module(root).canonical_json_bytes(snapshot)
    )
    print(
        json.dumps(
            {
                "components": len(snapshot["components"]),
                "entries": len(snapshot["entries"]),
                "status": "passed",
            },
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
