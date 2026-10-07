"""Narrow read-only validation and preflight for explicit project profiles."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import typer

from .output import emit

project_app = typer.Typer(help="Validate explicit project inputs without launching work.", no_args_is_help=True)


def _client_runtime_available():
    try:
        from mcp import ClientSession  # noqa: F401
        from orchestrator_langgraph.client.gateway_client import (
            GatewayClient,  # noqa: F401
        )
    except ImportError:
        return False
    return True


def _locking_supported(runtime_root):
    try:
        import fcntl

        # Fail closed where mounted filesystem type cannot be established.
        mounts = []
        for line in Path("/proc/self/mountinfo").read_text().splitlines():
            left, right = line.split(" - ", 1)
            mount = left.split()[4]
            for escaped, character in (("\\040", " "), ("\\011", "\t"), ("\\012", "\n"), ("\\134", "\\")):
                mount = mount.replace(escaped, character)
            if runtime_root.is_relative_to(Path(mount)):
                mounts.append((len(mount), right.split()[0]))
        local_types = {"ext2", "ext3", "ext4", "xfs", "btrfs", "zfs", "tmpfs", "ramfs", "overlay", "f2fs"}
        if not mounts or max(mounts)[1] not in local_types:
            return False
        fd = os.open(runtime_root, os.O_RDONLY | os.O_DIRECTORY)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)
    except (ImportError, OSError):
        return False
    return True


def _node_preflight(profile, gateway_root, policies_dir):
    from orchestrator_langgraph.project_profile import ProfileError, canonical_json

    node = shutil.which("node")
    script = gateway_root / "scripts/project-preflight.mjs"
    if node is None or not script.is_file():
        raise ProfileError("PROFILE_RUNTIME_UNAVAILABLE", "node")
    request = {"gatewayRoot": str(gateway_root), "policiesDir": str(policies_dir),
               "allowedRoots": [str(r) for r in profile.allowed_roots],
               "projectRoot": str(profile.project_root), "repositoryId": profile.repository_id,
               "taskCwds": [str(t.cwd) for t in profile.tasks],
               "writePaths": [str(p) for t in profile.tasks for p in t.write_paths],
               "roles": profile.to_dict()["roles"]}
    payload = canonical_json(request).encode("utf-8")
    if len(payload) > 1024 * 1024:
        raise ProfileError("PROFILE_INVALID", "profile")
    # Temporary output storage bounds memory; no raw subprocess output is emitted.
    # The helper's closed contract has only two small safe selections.
    with tempfile.TemporaryFile() as output:
        try:
            result = subprocess.run([node, str(script)], input=payload, stdout=output,
                                    stderr=subprocess.DEVNULL, shell=False, timeout=10, check=False)
            output.seek(0)
            raw = output.read(16385)
            if len(raw) > 16384 or result.returncode not in (0, 2, 3):
                raise ValueError("invalid helper response")
            response = json.loads(raw)
            if set(response) != {"status", "selections", "error"}:
                raise ValueError("invalid helper response")
            if response["status"] not in ("ready", "invalid", "unavailable"):
                raise ValueError("invalid helper status")
            if type(response["selections"]) is not list or len(response["selections"]) > 2:
                raise ValueError("invalid selections")
        except (OSError, ValueError, TypeError, subprocess.TimeoutExpired):
            raise ProfileError("PROFILE_RUNTIME_UNAVAILABLE", "node") from None
    return response


def _execute(profile_path, gateway_root, policies_dir, allowed_root, runtime_root, output_json, *, preflight):
    result = {"schemaVersion": "project-preflight/v1", "projectId": None, "profileDigest": None,
              "status": "invalid", "checks": [], "selections": []}
    exit_code = 2
    try:
        from orchestrator_langgraph.project_profile import (
            ProfileError,
            _absolute_directory,
            load_project_profile,
        )
    except ImportError:
        result["status"] = "unavailable"
        result["error"] = {"code": "PROFILE_RUNTIME_UNAVAILABLE", "field": "client"}
        result["checks"] = [{"id": "client", "status": "unavailable", "outcomeCode": "PROFILE_RUNTIME_UNAVAILABLE"}]
        emit(result, json_mode=output_json)
        raise typer.Exit(code=3) from None
    try:
        if preflight and os.name != "posix":
            raise ProfileError("PROFILE_RUNTIME_UNSUPPORTED", "platform")
        gateway = _absolute_directory(gateway_root, "gatewayRoot")
        policies = _absolute_directory(policies_dir, "policiesDir")
        profile = load_project_profile(profile_path, allowed_roots=allowed_root, runtime_root=runtime_root)
        result.update(projectId=profile.project_id, profileDigest=profile.digest)
        result["checks"].append({"id": "profile", "status": "pass", "outcomeCode": "PROFILE_VALID"})
        if preflight:
            if os.name != "posix" or not all(_locking_supported(p) for p in (profile.runtime_root, profile.project_root)):
                raise ProfileError("PROFILE_RUNTIME_UNSUPPORTED", "platform")
            if sys.version_info < (3, 11) or not _client_runtime_available():
                raise ProfileError("PROFILE_RUNTIME_UNAVAILABLE", "client")
            response = _node_preflight(profile, gateway, policies)
            result["selections"] = response["selections"]
            if response["error"]:
                error = response["error"]
                # Treat only the helper's closed codes/fields as safe output.
                codes = {"PROFILE_INVALID", "PROFILE_PATH_DENIED", "PROFILE_POLICY_DENIED", "PROFILE_RUNTIME_UNAVAILABLE", "PROFILE_RUNTIME_UNSUPPORTED"}
                fields = {"profile", "roles", "repositoryId", "gatewayRoot", "policiesDir", "allowedRoots", "projectRoot", "cwd", "tasks", "writePaths", "platform", "node", "mcp", "provider"}
                if set(error) != {"code", "field"} or error["code"] not in codes or error["field"] not in fields:
                    raise ProfileError("PROFILE_RUNTIME_UNAVAILABLE", "node")
                raise ProfileError(error["code"], error["field"])
            result["checks"].append({"id": "runtime", "status": "pass", "outcomeCode": "PROFILE_RUNTIME_READY"})
        result["status"], exit_code = "ready", 0
    except ProfileError as error:
        exit_code = error.exit_code
        result["status"] = "unavailable" if exit_code == 3 else "invalid"
        result["error"] = error.to_dict()
        result["checks"].append({"id": "validation", "status": "unavailable" if exit_code == 3 else "fail", "outcomeCode": error.code})
    emit(result, json_mode=output_json)
    raise typer.Exit(code=exit_code)


@project_app.command("validate")
def validate(
    profile: Path = typer.Option(..., "--profile"),
    gateway_root: Path = typer.Option(..., "--gateway-root"),
    policies_dir: Path = typer.Option(..., "--policies-dir"),
    allowed_root: list[Path] = typer.Option(..., "--allowed-root"),
    runtime_root: Path = typer.Option(..., "--runtime-root"),
    output_json: bool = typer.Option(False, "--json"),
):
    """Validate bounded profile paths and dependencies only."""
    _execute(profile, gateway_root, policies_dir, allowed_root, runtime_root, output_json, preflight=False)


@project_app.command("preflight")
def preflight(
    profile: Path = typer.Option(..., "--profile"),
    gateway_root: Path = typer.Option(..., "--gateway-root"),
    policies_dir: Path = typer.Option(..., "--policies-dir"),
    allowed_root: list[Path] = typer.Option(..., "--allowed-root"),
    runtime_root: Path = typer.Option(..., "--runtime-root"),
    output_json: bool = typer.Option(False, "--json"),
):
    """Check local runtime and canonical policies without launching work."""
    _execute(profile, gateway_root, policies_dir, allowed_root, runtime_root, output_json, preflight=True)
