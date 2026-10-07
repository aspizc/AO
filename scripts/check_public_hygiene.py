#!/usr/bin/env python3
"""Check tracked publication inputs; historical exceptions are deliberately exact."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

HISTORY_DIRECTORIES = ("plan/", "audit/")
HISTORY_FILES = {"plan_proyecto_v4.md", "tareas_implementacion_v4.md"}
PUBLIC_IDS = {"cvision", "cvlib", "developer-tools", "sample-apps", "agents-orchestrator"}
HOME_PATH = re.compile(r"/(?:home|Users)/[A-Za-z0-9._-]+/[^\s\"'`<>;,)]*")
FIXTURES = "ci/public-hygiene-fixtures.json"


def scan(root: Path) -> list[str]:
    tracked = subprocess.run(["git", "-C", str(root), "ls-files", "-z"],
                             capture_output=True, check=True).stdout.decode().split("\0")
    entries = json.loads((root / FIXTURES).read_text(encoding="utf-8"))
    if type(entries) is not list:
        raise ValueError("fixture allowlist must be a list of exact path/literal pairs")
    allowed: dict[str, set[str]] = {}
    for entry in entries:
        if (type(entry) is not dict or set(entry) != {"path", "literal"}
                or type(entry["path"]) is not str or type(entry["literal"]) is not str
                or not HOME_PATH.fullmatch(entry["literal"])):
            raise ValueError("invalid fixture allowlist path/literal pair")
        allowed.setdefault(entry["path"], set()).add(entry["literal"])
    findings = []
    for relative in sorted(filter(None, tracked)):
        if relative in HISTORY_FILES or relative.startswith(HISTORY_DIRECTORIES):
            continue
        content = (root / relative).read_bytes().decode("utf-8", errors="replace")
        for line_number, line in enumerate(content.splitlines(), 1):
            for match in HOME_PATH.finditer(line):
                literal = match.group()
                if literal not in allowed.get(relative, set()):
                    findings.append(f"{relative}:{line_number}: home path: {literal}")
        if relative == "policies/repositories.json":
            registry = json.loads(content)
            repositories = registry["repositories"]
            if type(repositories) is not dict:
                raise ValueError("base repositories must be an object")
            for repo_id in sorted(set(repositories) - PUBLIC_IDS):
                key = re.compile(r"\"" + re.escape(repo_id) + r'"\s*:')
                line_number = next(i for i, line in enumerate(content.splitlines(), 1) if key.search(line))
                findings.append(f"{relative}:{line_number}: non-public repository id: {repo_id}")
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        findings = scan(args.repo_root.resolve())
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"public hygiene scan error: {error}", file=sys.stderr)
        return 2
    for finding in findings:
        print(finding)
    print(f"public hygiene: {len(findings)} finding(s)")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
