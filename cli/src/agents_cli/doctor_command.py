"""Executable composition for the read-only Doctor preflight."""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import typer
from jsonschema import Draft202012Validator

from . import doctor as doctor_model
from . import doctor_probes
from .doctor_core_probes import CoreProbeInputs, create_doctor_core_bindings
from .output import fail

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCTOR_PROFILE = REPO_ROOT / "examples" / "hero" / "profile.json"
DOCTOR_PROFILE_SCHEMA = REPO_ROOT / "schemas" / "doctor-profile-v1.schema.json"
ORCHESTRATOR_PROFILE = (
    REPO_ROOT / "gateway" / "contracts" / "orchestrator-profile-v1.json"
)
ORCHESTRATOR_PROFILE_SCHEMA = (
    REPO_ROOT / "schemas" / "orchestrator-profile-v1.schema.json"
)
POLICY_VALIDATOR = REPO_ROOT / "gateway" / "scripts" / "validate-registries.mjs"
PACKAGE = REPO_ROOT / "gateway" / "package.json"
REQUIRED_LOCKS = (
    REPO_ROOT / "requirements.lock",
    REPO_ROOT / "gateway" / "package-lock.json",
)
_NODE_VERSION = re.compile(r"^v(\d+)\.(\d+)\.(\d+)$")
_COORDINATION_UNAVAILABLE = {
    "coordination": "COORDINATION_UNAVAILABLE",
    "coordinationScope": "COORDINATION_SCOPE_PROBE_ERROR",
}
_NATIVE_SMOKE = (
    "const Database=require('better-sqlite3');"
    "const db=new Database(':memory:');db.close();"
)


@dataclass(frozen=True, slots=True)
class DoctorCommandDependencies:
    """Complete injected inputs for one command invocation."""

    profile_id: object
    core_inputs: object
    providers: object
    runner: object
    coordination_snapshot: object
    authority_capability: object = None


class _OutputBlindRunner:
    __slots__ = ()

    def __call__(
        self,
        argv: tuple[str, ...],
        *,
        timeout_seconds: float,
    ) -> doctor_probes.CommandStatus:
        try:
            result = subprocess.run(
                argv,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=timeout_seconds,
                check=False,
            )
        except FileNotFoundError:
            return doctor_probes.CommandStatus.NOT_FOUND
        except subprocess.TimeoutExpired:
            return doctor_probes.CommandStatus.TIMED_OUT
        return (
            doctor_probes.CommandStatus.SUCCESS
            if result.returncode == 0
            else doctor_probes.CommandStatus.FAILED
        )


def _load_json(path: Path) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None


def _schema_valid(instance_path: Path, schema_path: Path) -> bool:
    instance = _load_json(instance_path)
    schema = _load_json(schema_path)
    if type(instance) is not dict or type(schema) is not dict:
        return False
    try:
        Draft202012Validator(schema).validate(instance)
    except Exception:
        return False
    return True


def _config_valid() -> bool:
    profile = _load_json(DOCTOR_PROFILE)
    if type(profile) is not dict or not _schema_valid(
        DOCTOR_PROFILE,
        DOCTOR_PROFILE_SCHEMA,
    ):
        return False
    try:
        root = DOCTOR_PROFILE.parent.resolve(strict=True)
        for key in ("repository", "plan"):
            target = (root / dict.__getitem__(profile, key)).resolve(strict=True)
            if not target.is_file() or not target.is_relative_to(root):
                return False
    except (KeyError, OSError, TypeError, ValueError):
        return False
    return True


def _policy_valid() -> bool:
    if shutil.which("node") is None or not POLICY_VALIDATOR.is_file():
        return False
    try:
        result = subprocess.run(
            ("node", str(POLICY_VALIDATOR)),
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=os.environ.copy(),
            timeout=5.0,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def _load_repositories() -> object:
    """Read the effective registry through the Gateway's fail-closed loader."""
    try:
        result = subprocess.run(
            ("node", str(POLICY_VALIDATOR), "--repositories"),
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            env=os.environ.copy(),
            timeout=5.0,
            check=False,
        )
        data = json.loads(result.stdout)
        if result.returncode == 0 and type(data) is dict:
            repositories = data.get("repositories")
            return repositories if type(repositories) is dict else None
    except (OSError, subprocess.TimeoutExpired, UnicodeError, json.JSONDecodeError):
        pass
    return None


def _repository_canonical() -> bool:
    repositories = _load_repositories()
    try:
        entry = dict.__getitem__(repositories, "agents-orchestrator")
        cwd = Path.cwd().resolve(strict=True)
        root = REPO_ROOT.resolve(strict=True)
    except (KeyError, OSError, TypeError, ValueError):
        return False
    return (
        type(repositories) is dict
        and type(entry) is dict
        and cwd.is_relative_to(root)
        and (root / ".git").exists()
    )


def _node_version_supported() -> bool:
    package = _load_json(PACKAGE)
    try:
        engine = dict.__getitem__(dict.__getitem__(package, "engines"), "node")
        result = subprocess.run(
            ("node", "--version"),
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
        match = _NODE_VERSION.fullmatch(result.stdout.strip())
        candidate = tuple(int(part) for part in match.groups())
    except (AttributeError, KeyError, OSError, TypeError, ValueError):
        return False
    except subprocess.TimeoutExpired:
        return False
    if result.returncode != 0 or type(engine) is not str:
        return False
    for clause in engine.split(" || "):
        if not clause.startswith("^"):
            return False
        try:
            lower = tuple(int(part) for part in clause[1:].split("."))
        except ValueError:
            return False
        if len(lower) != 3:
            return False
        if lower <= candidate < (lower[0] + 1, 0, 0):
            return True
    return False


def _dependencies_ready() -> bool:
    if any(shutil.which(command) is None for command in ("node", "npm", "uv")):
        return False
    if not all(path.is_file() for path in REQUIRED_LOCKS):
        return False
    try:
        result = subprocess.run(
            ("node", "--eval", _NATIVE_SMOKE),
            cwd=REPO_ROOT / "gateway",
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5.0,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    return result.returncode == 0


def create_production_dependencies() -> DoctorCommandDependencies:
    """Collect read-only production inputs without retaining raw output."""

    profile = _load_json(ORCHESTRATOR_PROFILE)
    providers = dict.get(profile, "providers", {}) if type(profile) is dict else {}
    return DoctorCommandDependencies(
        profile_id=doctor_model.CANONICAL_PROFILE_ID,
        core_inputs=CoreProbeInputs(
            config_valid=_config_valid(),
            dependencies_ready=_dependencies_ready(),
            policy_valid=_policy_valid(),
            profile_valid=_schema_valid(
                ORCHESTRATOR_PROFILE,
                ORCHESTRATOR_PROFILE_SCHEMA,
            ),
            repository_canonical=_repository_canonical(),
            runtime_supported=sys.version_info >= (3, 11) and _node_version_supported(),
        ),
        providers=providers,
        runner=_OutputBlindRunner(),
        coordination_snapshot=dict(_COORDINATION_UNAVAILABLE),
    )


def doctor(
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Run the read-only Doctor preflight."""

    try:
        dependencies = create_production_dependencies()
        core_bindings = create_doctor_core_bindings(dependencies.core_inputs)
        final_bindings = doctor_probes.create_doctor_probe_bindings(
            providers=dependencies.providers,
            runner=dependencies.runner,
            coordination_snapshot=dependencies.coordination_snapshot,
            authority_capability=dependencies.authority_capability,
        )
        run = doctor_model.run_doctor(
            dependencies.profile_id,
            (*core_bindings, *final_bindings),
        )
        rendered = (
            doctor_model.render_json(run.result)
            if output_json
            else doctor_model.render_human(run.result)
        )
    except Exception:
        fail("doctor contract validation failed", exit_code=2)
    typer.echo(rendered)
    raise typer.Exit(code=run.exit_code)
