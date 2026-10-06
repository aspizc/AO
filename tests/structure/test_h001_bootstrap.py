from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
BOOTSTRAP = REPO / "scripts" / "bootstrap.sh"
PREFLIGHT = REPO / "scripts" / "bootstrap_preflight.mjs"
FAKE_BIN = REPO / "tests" / "fixtures" / "h001" / "fake-bin"
SBOM_RELATIVE = "ci/production-sbom.json"
ADVISORIES_RELATIVE = "ci/production-advisories.json"
REVIEW_SNAPSHOT_PATHS = (SBOM_RELATIVE, ADVISORIES_RELATIVE)
NODE_LOCK_RELATIVE = "gateway/package-lock.json"
CHECKOUT_INPUTS = (
    ".gitignore",
    "requirements.lock",
    "scripts/bootstrap.sh",
    "scripts/bootstrap_preflight.mjs",
    "scripts/requirements_lock.sh",
    "cli/pyproject.toml",
    "orchestrator-langgraph/pyproject.toml",
    "ci/requirements-build.in",
    SBOM_RELATIVE,
    ADVISORIES_RELATIVE,
    "gateway/package.json",
    NODE_LOCK_RELATIVE,
    "gateway/.npmrc",
    "examples/hero/profile.json",
    "examples/hero/repository.json",
    "examples/hero/plan.json",
    "examples/hero/app/index.html",
)
EXPECTED_CALLS = [
    "uv\t--version",
    "uv\tvenv\t--python\t3.11\t.venv",
    "uv\tpip\tsync\t--require-hashes\trequirements.lock",
    (
        "uv\tpip\tinstall\t--no-deps\t--no-build-isolation\t-e\tcli\t-e"
        "\torchestrator-langgraph\t--offline"
    ),
    "npm\t--prefix\tgateway\tci\t--ignore-scripts",
]
GATEWAY_MANIFEST = json.loads(
    (REPO / "gateway" / "package.json").read_text(encoding="utf-8")
)
DIRECT_NODE_DEPENDENCIES = tuple(
    sorted(
        {
            *GATEWAY_MANIFEST["dependencies"],
            *GATEWAY_MANIFEST["devDependencies"],
        }
    )
)


def copy_input_checkout(destination: Path) -> None:
    for relative in CHECKOUT_INPUTS:
        source = REPO / relative
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def run(
    argv: list[str],
    *,
    cwd: Path,
    env: dict[str, str],
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        argv,
        cwd=cwd,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )


@pytest.fixture
def portable_checkout(tmp_path: Path) -> dict[str, object]:
    checkout = tmp_path / "checkout"
    outside = tmp_path / "outside"
    home = tmp_path / "empty-home"
    fake_bin = tmp_path / "fake-bin"
    log = tmp_path / "installer-calls.tsv"
    checkout.mkdir()
    outside.mkdir()
    home.mkdir()
    shutil.copytree(FAKE_BIN, fake_bin)
    copy_input_checkout(checkout)

    secret_canary = "owner-" + "secret-canary-value"
    credential_file = home / ".credentials"
    credential_file.write_text(secret_canary, encoding="utf-8")
    credential_file.chmod(0o600)

    env = {
        "HOME": str(home),
        "PATH": f"{fake_bin}{os.pathsep}{os.defpath}",
        "LC_ALL": "C",
        "H001_INSTALL_LOG": str(log),
        "H001_SECRET_CANARY": secret_canary,
        "H001_REAL_NODE": shutil.which("node", path=os.defpath),
    }
    git_env = {
        "HOME": str(home),
        "PATH": os.defpath,
        "LC_ALL": "C",
    }
    assert run(["git", "init", "-q"], cwd=checkout, env=git_env).returncode == 0
    assert run(["git", "add", "."], cwd=checkout, env=git_env).returncode == 0
    commit = run(
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
            "-c",
            "user.name=Synthetic Fixture",
            "-c",
            "user.email=fixture@example.invalid",
            "commit",
            "-qm",
            "fixture",
        ],
        cwd=checkout,
        env=git_env,
    )
    assert commit.returncode == 0, commit.stderr

    return {
        "checkout": checkout,
        "outside": outside,
        "home": home,
        "log": log,
        "env": env,
        "git_env": git_env,
        "credential_file": credential_file,
        "secret_canary": secret_canary,
    }


def installer_calls(log: Path) -> list[str]:
    if not log.exists():
        return []
    return log.read_text(encoding="utf-8").splitlines()


def assert_checkout_clean(checkout: Path, git_env: dict[str, str]) -> None:
    diff = run(["git", "diff", "--exit-code"], cwd=checkout, env=git_env)
    assert diff.returncode == 0, diff.stdout + diff.stderr
    status = run(
        ["git", "status", "--short", "--untracked-files=all"],
        cwd=checkout,
        env=git_env,
    )
    assert status.returncode == 0
    assert status.stdout == ""


def assert_no_dependency_state(checkout: Path, log: Path) -> None:
    assert installer_calls(log) == []
    assert not (checkout / ".venv").exists()
    assert not (checkout / "gateway" / "node_modules").exists()


def read_lock(checkout: Path) -> dict[str, object]:
    lock = json.loads(
        (checkout / "gateway" / "package-lock.json").read_text(encoding="utf-8")
    )
    assert isinstance(lock, dict)
    return lock


def write_lock(checkout: Path, lock: dict[str, object]) -> None:
    (checkout / NODE_LOCK_RELATIVE).write_text(
        json.dumps(lock),
        encoding="utf-8",
    )


def read_snapshot(checkout: Path, relative: str) -> dict[str, object]:
    snapshot = json.loads((checkout / relative).read_text(encoding="utf-8"))
    assert isinstance(snapshot, dict)
    return snapshot


def write_snapshot(
    checkout: Path,
    relative: str,
    snapshot: dict[str, object],
) -> None:
    (checkout / relative).write_text(json.dumps(snapshot), encoding="utf-8")


def snapshot_lock_digest(snapshot: dict[str, object], relative: str) -> str:
    if relative == SBOM_RELATIVE:
        source_locks = snapshot["sourceLocks"]
        assert isinstance(source_locks, list)
        matches = [
            entry
            for entry in source_locks
            if isinstance(entry, dict) and entry.get("path") == NODE_LOCK_RELATIVE
        ]
        assert len(matches) == 1
        digest = matches[0]["sha256"]
    else:
        lock_digests = snapshot["lockDigests"]
        assert isinstance(lock_digests, dict)
        digest = lock_digests[NODE_LOCK_RELATIVE]
    assert isinstance(digest, str)
    return digest


def replace_snapshot_lock_digest(
    snapshot: dict[str, object],
    relative: str,
    digest: str,
) -> None:
    if relative == SBOM_RELATIVE:
        source_locks = snapshot["sourceLocks"]
        assert isinstance(source_locks, list)
        matches = [
            entry
            for entry in source_locks
            if isinstance(entry, dict) and entry.get("path") == NODE_LOCK_RELATIVE
        ]
        assert len(matches) == 1
        matches[0]["sha256"] = digest
    else:
        lock_digests = snapshot["lockDigests"]
        assert isinstance(lock_digests, dict)
        lock_digests[NODE_LOCK_RELATIVE] = digest


def assert_bootstrap_rejects_before_installing(
    portable_checkout: dict[str, object],
) -> None:
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert_no_dependency_state(checkout, log)


def install_uv_control_file_mutator(
    env: dict[str, str],
    relative: str,
) -> None:
    fake_bin = Path(env["PATH"].split(os.pathsep, 1)[0])
    uv = fake_bin / "uv"
    original_uv = fake_bin / "uv-original"
    uv.rename(original_uv)
    uv.write_text(
        """#!/usr/bin/env bash
set -euo pipefail

readonly fake_directory="${BASH_SOURCE[0]%/*}"
"$fake_directory/uv-original" "$@"
if [[ "$#" -eq 9 && "$1" == "pip" && "$2" == "install" ]]; then
  : "${H001_MUTATE_CONTROL_RELATIVE:?H001_MUTATE_CONTROL_RELATIVE is required}"
  printf '\\n' >>"$H001_MUTATE_CONTROL_RELATIVE"
fi
""",
        encoding="utf-8",
    )
    uv.chmod(original_uv.stat().st_mode)
    env["H001_MUTATE_CONTROL_RELATIVE"] = relative


def test_bootstrap_uses_only_the_exact_reviewed_lock_commands():
    text = BOOTSTRAP.read_text(encoding="utf-8")
    for command in (
        'node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"',
        "uv venv --python 3.11 .venv",
        "uv pip sync --require-hashes requirements.lock",
        (
            "uv pip install --no-deps --no-build-isolation "
            "-e cli -e orchestrator-langgraph --offline"
        ),
        "npm --prefix gateway ci --ignore-scripts",
    ):
        assert command in text

    for control_path in REVIEW_SNAPSHOT_PATHS:
        assert control_path in text

    lower = text.lower()
    for forbidden in (
        "curl ",
        "wget ",
        "http://",
        "https://",
        "git clone",
        "npm install",
        "npm update",
        "pip install -r",
        "$home",
        "${home",
        "~/",
    ):
        assert forbidden not in lower


def test_bootstrap_places_final_exact_preflight_immediately_before_npm():
    text = BOOTSTRAP.read_text(encoding="utf-8")
    preflight = 'node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"'

    assert text.count(preflight) == 2
    assert (
        "validate_control_boundary post-venv\n"
        f"{preflight}\n"
        "npm --prefix gateway ci --ignore-scripts"
    ) in text


def test_node_preflight_is_closed_read_only_and_has_no_network_surface():
    text = PREFLIGHT.read_text(encoding="utf-8")
    lower = text.lower()

    for forbidden in (
        "writefilesync",
        "appendfilesync",
        "mkdirsync",
        "rmsync",
        "renamesync",
        "child_process",
        "node:http",
        "node:https",
        "node:net",
        "fetch(",
    ):
        assert forbidden not in lower


def test_node_preflight_binds_the_lock_to_reviewed_snapshots_not_a_custom_graph():
    text = PREFLIGHT.read_text(encoding="utf-8")

    for required in (
        SBOM_RELATIVE,
        ADVISORIES_RELATIVE,
        "production-sbom/v1",
        "production-advisories/v1",
        NODE_LOCK_RELATIVE,
    ):
        assert required in text

    for removed in (
        "parseSemanticVersion",
        "satisfiesSemanticRange",
        "checkPackageLock",
        "checkRequiredPackageClosure",
        "dereferencePackage",
    ):
        assert removed not in text


def test_bootstrap_is_portable_idempotent_and_clean_with_injected_installers(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    home = portable_checkout["home"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    git_env = portable_checkout["git_env"]
    credential_file = portable_checkout["credential_file"]
    secret_canary = portable_checkout["secret_canary"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(home, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)
    assert isinstance(git_env, dict)
    assert isinstance(credential_file, Path)
    assert isinstance(secret_canary, str)

    first = run(["./scripts/bootstrap.sh"], cwd=checkout, env=env)
    second = run(["./scripts/bootstrap.sh"], cwd=checkout, env=env)

    assert first.returncode == 0, first.stdout + first.stderr
    assert second.returncode == 0, second.stdout + second.stderr
    assert installer_calls(log) == EXPECTED_CALLS * 2
    assert (checkout / ".venv" / ".h001-editable").is_file()
    assert (checkout / ".venv" / "lib64").is_symlink()
    assert (checkout / ".venv" / "lib64").resolve() == checkout / ".venv" / "lib"
    assert (checkout / "gateway" / "node_modules" / ".h001-installed").is_file()
    assert not (outside / ".venv").exists()
    assert credential_file.read_text(encoding="utf-8") == secret_canary

    observed = (
        first.stdout
        + first.stderr
        + second.stdout
        + second.stderr
        + log.read_text(encoding="utf-8")
    )
    assert secret_canary not in observed
    assert str(home) not in observed
    assert_checkout_clean(checkout, git_env)


@pytest.mark.parametrize(
    ("relative", "replacement"),
    [
        ("requirements.lock", None),
        ("gateway/package-lock.json", None),
        ("requirements.lock", "# stale lock input\n"),
    ],
)
def test_bootstrap_rejects_missing_or_stale_locks_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
    replacement: str | None,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)

    target = checkout / relative
    if replacement is None:
        target.unlink()
    else:
        target.write_text(replacement, encoding="utf-8")

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert_no_dependency_state(checkout, log)


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
def test_bootstrap_requires_each_review_snapshot_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    (checkout / relative).unlink()

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
def test_bootstrap_rejects_each_symlinked_review_snapshot_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    target = checkout / relative
    external = outside / Path(relative).name
    target.rename(external)
    target.symlink_to(external)

    assert_bootstrap_rejects_before_installing(portable_checkout)
    assert external.is_file()


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
def test_bootstrap_rejects_each_malformed_review_snapshot_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    (checkout / relative).write_text("{not-json\n", encoding="utf-8")

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    ("relative", "wrong_schema"),
    [
        (SBOM_RELATIVE, "production-sbom/v0"),
        (ADVISORIES_RELATIVE, "production-advisories/v0"),
    ],
)
def test_bootstrap_rejects_each_review_snapshot_with_the_wrong_schema(
    portable_checkout: dict[str, object],
    relative: str,
    wrong_schema: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    snapshot = read_snapshot(checkout, relative)
    snapshot["schemaVersion"] = wrong_schema
    write_snapshot(checkout, relative, snapshot)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
def test_bootstrap_rejects_each_review_snapshot_with_the_wrong_lock_path(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    snapshot = read_snapshot(checkout, relative)
    if relative == SBOM_RELATIVE:
        source_locks = snapshot["sourceLocks"]
        assert isinstance(source_locks, list)
        target = next(
            entry
            for entry in source_locks
            if isinstance(entry, dict) and entry.get("path") == NODE_LOCK_RELATIVE
        )
        target["path"] = "gateway/replaced-package-lock.json"
    else:
        lock_digests = snapshot["lockDigests"]
        assert isinstance(lock_digests, dict)
        lock_digests["gateway/replaced-package-lock.json"] = lock_digests.pop(
            NODE_LOCK_RELATIVE
        )
    write_snapshot(checkout, relative, snapshot)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
def test_bootstrap_rejects_each_review_snapshot_with_a_duplicate_lock_path(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    snapshot_path = checkout / relative
    if relative == SBOM_RELATIVE:
        snapshot = read_snapshot(checkout, relative)
        source_locks = snapshot["sourceLocks"]
        assert isinstance(source_locks, list)
        target = next(
            entry
            for entry in source_locks
            if isinstance(entry, dict) and entry.get("path") == NODE_LOCK_RELATIVE
        )
        source_locks.append(dict(target))
        write_snapshot(checkout, relative, snapshot)
    else:
        raw = snapshot_path.read_text(encoding="utf-8")
        snapshot = read_snapshot(checkout, relative)
        digest = snapshot_lock_digest(snapshot, relative)
        member = f'"{NODE_LOCK_RELATIVE}":"{digest}"'
        assert raw.count(member) == 1
        snapshot_path.write_text(
            raw.replace(member, f"{member},{member}"),
            encoding="utf-8",
        )

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("relative", REVIEW_SNAPSHOT_PATHS)
@pytest.mark.parametrize(
    "replacement",
    [
        "SHA256:" + ("A" * 64),
        "sha256:" + ("0" * 64),
    ],
    ids=["noncanonical", "stale"],
)
def test_bootstrap_rejects_each_review_snapshot_with_an_invalid_lock_digest(
    portable_checkout: dict[str, object],
    relative: str,
    replacement: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    snapshot = read_snapshot(checkout, relative)
    replace_snapshot_lock_digest(snapshot, relative, replacement)
    write_snapshot(checkout, relative, snapshot)

    assert_bootstrap_rejects_before_installing(portable_checkout)


def test_bootstrap_rejects_disagreeing_review_snapshot_digests_before_installing(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    sbom = read_snapshot(checkout, SBOM_RELATIVE)
    advisories = read_snapshot(checkout, ADVISORIES_RELATIVE)
    assert snapshot_lock_digest(sbom, SBOM_RELATIVE) == snapshot_lock_digest(
        advisories,
        ADVISORIES_RELATIVE,
    )
    replace_snapshot_lock_digest(
        advisories,
        ADVISORIES_RELATIVE,
        "sha256:" + ("1" * 64),
    )
    write_snapshot(checkout, ADVISORIES_RELATIVE, advisories)

    assert_bootstrap_rejects_before_installing(portable_checkout)


def test_bootstrap_rejects_any_change_to_the_reviewed_package_lock_bytes(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock_path = checkout / NODE_LOCK_RELATIVE
    lock_path.write_bytes(lock_path.read_bytes() + b"\n")

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    "relative",
    [NODE_LOCK_RELATIVE, *REVIEW_SNAPSHOT_PATHS],
)
def test_bootstrap_rejects_regular_node_control_bytes_changed_during_uv(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)

    target = checkout / relative
    original_bytes = target.read_bytes()
    assert target.is_file()
    assert not target.is_symlink()
    install_uv_control_file_mutator(env, relative)

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    node_modules = checkout / "gateway" / "node_modules"
    assert (installer_calls(log), node_modules.exists()) == (EXPECTED_CALLS[:4], False)
    assert result.returncode != 0
    assert target.is_file()
    assert not target.is_symlink()
    assert target.read_bytes() == original_bytes + b"\n"
    assert (checkout / ".venv" / ".h001-synced").is_file()
    assert (checkout / ".venv" / ".h001-editable").is_file()
    assert not node_modules.exists()


@pytest.mark.parametrize(
    "relative",
    [
        "scripts",
        "cli",
        "orchestrator-langgraph",
        "ci",
        "gateway",
        "requirements.lock",
        "scripts/bootstrap.sh",
        "scripts/bootstrap_preflight.mjs",
        "scripts/requirements_lock.sh",
        "cli/pyproject.toml",
        "orchestrator-langgraph/pyproject.toml",
        "ci/requirements-build.in",
        "gateway/package.json",
        "gateway/package-lock.json",
        "gateway/.npmrc",
        "examples/hero/profile.json",
        "examples/hero/repository.json",
        "examples/hero/plan.json",
        "examples/hero/app/index.html",
    ],
)
def test_bootstrap_rejects_every_symlinked_control_path_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)

    target = checkout / relative
    external = outside / "external-control"
    target.rename(external)
    target.symlink_to(external, target_is_directory=external.is_dir())
    before = (
        sorted(
            (path.relative_to(external).as_posix(), path.read_bytes())
            for path in external.rglob("*")
            if path.is_file()
        )
        if external.is_dir()
        else external.read_bytes()
    )

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert installer_calls(log) == []
    after = (
        sorted(
            (path.relative_to(external).as_posix(), path.read_bytes())
            for path in external.rglob("*")
            if path.is_file()
        )
        if external.is_dir()
        else external.read_bytes()
    )
    assert after == before
    assert not (outside / ".venv").exists()


@pytest.mark.parametrize(
    ("relative", "is_directory"),
    [
        (".venv", True),
        (".venv/bin", True),
        (".venv/bin/activate", False),
        ("gateway/node_modules", True),
    ],
)
def test_bootstrap_rejects_nested_symlinked_outputs_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
    is_directory: bool,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)

    external = outside / "external-output"
    if is_directory:
        external.mkdir()
    else:
        external.write_text("outside activation sentinel\n", encoding="utf-8")
    target = checkout / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.symlink_to(external, target_is_directory=is_directory)
    before = external.read_bytes() if external.is_file() else list(external.iterdir())

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert installer_calls(log) == []
    after = external.read_bytes() if external.is_file() else list(external.iterdir())
    assert after == before


def test_bootstrap_rejects_a_new_control_symlink_before_sourcing_or_installing(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)

    external = outside / "new-venv-output"
    external.mkdir()
    env["H001_VENV_BIN_SYMLINK_TARGET"] = str(external)

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert installer_calls(log) == EXPECTED_CALLS[:2]
    assert list(external.iterdir()) == []


@pytest.mark.parametrize(
    ("relative", "replacement"),
    [
        ("gateway/package.json", "{not-json\n"),
        ("gateway/package-lock.json", "{not-json\n"),
        ("gateway/package.json", None),
        ("gateway/package-lock.json", None),
    ],
)
def test_bootstrap_rejects_malformed_or_drifted_node_locks_before_installing(
    portable_checkout: dict[str, object],
    relative: str,
    replacement: str | None,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)

    target = checkout / relative
    if replacement is not None:
        target.write_text(replacement, encoding="utf-8")
    else:
        document = json.loads(target.read_text(encoding="utf-8"))
        if relative.endswith("package.json"):
            document["dependencies"]["zod"] = "^99.0.0"
        else:
            document["packages"][""]["dependencies"]["zod"] = "^99.0.0"
        target.write_text(json.dumps(document), encoding="utf-8")

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert_no_dependency_state(checkout, log)


def test_bootstrap_rejects_a_package_lock_reduced_to_its_root_entry(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    lock["packages"] = {"": packages[""]}
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("dependency", DIRECT_NODE_DEPENDENCIES)
def test_bootstrap_requires_every_direct_package_lock_entry_before_installing(
    portable_checkout: dict[str, object],
    dependency: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    removed = packages.pop(f"node_modules/{dependency}")
    assert isinstance(removed, dict)
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize("dependency", DIRECT_NODE_DEPENDENCIES)
def test_bootstrap_rejects_every_incompatible_direct_locked_version(
    portable_checkout: dict[str, object],
    dependency: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    entry = packages[f"node_modules/{dependency}"]
    assert isinstance(entry, dict)
    entry["version"] = "99.0.0"
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    ("parent", "dependency", "target", "corruption"),
    [
        (
            "node_modules/@modelcontextprotocol/sdk",
            "content-type",
            "node_modules/content-type",
            "missing-target",
        ),
        (
            "node_modules/@modelcontextprotocol/sdk",
            "content-type",
            "node_modules/content-type",
            "incompatible-target",
        ),
        (
            "node_modules/@modelcontextprotocol/sdk",
            "content-type",
            "node_modules/content-type",
            "incompatible-edge",
        ),
        (
            "node_modules/@eslint-community/eslint-utils",
            "eslint-visitor-keys",
            (
                "node_modules/@eslint-community/eslint-utils/"
                "node_modules/eslint-visitor-keys"
            ),
            "missing-nested-target",
        ),
    ],
)
def test_bootstrap_rejects_missing_or_incoherent_required_transitive_edges(
    portable_checkout: dict[str, object],
    parent: str,
    dependency: str,
    target: str,
    corruption: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    parent_entry = packages[parent]
    target_entry = packages[target]
    assert isinstance(parent_entry, dict)
    assert isinstance(target_entry, dict)

    if corruption in {"missing-target", "missing-nested-target"}:
        del packages[target]
    elif corruption == "incompatible-target":
        target_entry["version"] = "99.0.0"
    else:
        dependencies = parent_entry["dependencies"]
        assert isinstance(dependencies, dict)
        dependencies[dependency] = "^99.0.0"
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    "corruption",
    [
        "entry-type",
        "entry-path",
        "entry-name-type",
        "entry-version-missing",
        "entry-version-invalid",
        "entry-integrity-missing",
        "entry-integrity-invalid",
        "reachable-name-mismatch",
        "unreachable-link-cycle",
    ],
)
def test_bootstrap_rejects_concretely_inconsistent_package_lock_entries(
    portable_checkout: dict[str, object],
    corruption: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    zod = packages["node_modules/zod"]
    assert isinstance(zod, dict)

    if corruption == "entry-type":
        packages["node_modules/hostile-extra"] = []
    elif corruption == "entry-path":
        packages["node_modules/../hostile-extra"] = dict(zod)
    elif corruption == "entry-name-type":
        packages["node_modules/hostile-extra"] = {
            **zod,
            "name": 42,
        }
    elif corruption == "entry-version-missing":
        del zod["version"]
    elif corruption == "entry-version-invalid":
        zod["version"] = "not-a-semantic-version"
    elif corruption == "entry-integrity-missing":
        del zod["integrity"]
    elif corruption == "entry-integrity-invalid":
        zod["integrity"] = "not-subresource-integrity"
    elif corruption == "unreachable-link-cycle":
        packages["node_modules/hostile-extra"] = {
            "resolved": "vendor/hostile-extra",
            "link": True,
        }
        packages["vendor/hostile-extra"] = {
            "resolved": "node_modules/hostile-extra",
            "link": True,
        }
    else:
        zod["name"] = "not-zod"
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", "not-agents-gateway"),
        ("version", "99.0.0"),
        ("lockfileVersion", 2),
        ("lockfileVersion", 4),
        ("lockfileVersion", "3"),
        ("requires", False),
    ],
)
def test_bootstrap_rejects_incompatible_package_lock_metadata(
    portable_checkout: dict[str, object],
    field: str,
    value: object,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    lock[field] = value
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    "corruption",
    [
        "required-peer-incompatible",
        "present-optional-incompatible",
    ],
)
def test_bootstrap_validates_present_peer_and_optional_edges(
    portable_checkout: dict[str, object],
    corruption: str,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)

    if corruption == "required-peer-incompatible":
        parent = packages["node_modules/zod-to-json-schema"]
        assert isinstance(parent, dict)
        peer_dependencies = parent["peerDependencies"]
        assert isinstance(peer_dependencies, dict)
        peer_dependencies["zod"] = "^99.0.0"
    else:
        parent = packages["node_modules/@modelcontextprotocol/sdk"]
        assert isinstance(parent, dict)
        parent["optionalDependencies"] = {"content-type": "^99.0.0"}
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


@pytest.mark.parametrize(
    ("dependency_range", "locked_version"),
    [
        ("^3.23.0 || not-a-range", None),
        ("3.0.0 - 4.0.0", "3.25.76-alpha"),
        (">=3.0.0-alpha <4.0.0", "3.25.76-beta"),
    ],
)
def test_bootstrap_rejects_malformed_or_incompatible_semver_contracts(
    portable_checkout: dict[str, object],
    dependency_range: str,
    locked_version: str | None,
):
    checkout = portable_checkout["checkout"]
    assert isinstance(checkout, Path)
    manifest_path = checkout / "gateway" / "package.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert isinstance(manifest, dict)
    dependencies = manifest["dependencies"]
    assert isinstance(dependencies, dict)
    dependencies["semver-probe"] = dependency_range
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    lock = read_lock(checkout)
    packages = lock["packages"]
    assert isinstance(packages, dict)
    root = packages[""]
    assert isinstance(root, dict)
    root_dependencies = root["dependencies"]
    assert isinstance(root_dependencies, dict)
    root_dependencies["semver-probe"] = dependency_range
    packages["node_modules/semver-probe"] = {
        "version": locked_version or "3.25.76",
    }
    write_lock(checkout, lock)

    assert_bootstrap_rejects_before_installing(portable_checkout)


def test_node_preflight_accepts_only_the_exact_reviewed_package_lock(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = portable_checkout["env"]
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    assert isinstance(env, dict)
    result = run(
        [
            "node",
            str(checkout / "scripts" / "bootstrap_preflight.mjs"),
            str(checkout),
            "v22.13.0",
        ],
        cwd=outside,
        env=env,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert_no_dependency_state(checkout, log)


@pytest.mark.parametrize("version", ["20.19.0", "22.12.0", "23.0.0", "25.0.0"])
def test_bootstrap_rejects_unsupported_node_before_installing(
    portable_checkout: dict[str, object],
    version: str,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    env["H001_NODE_VERSION"] = version

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert_no_dependency_state(checkout, log)


def test_bootstrap_rejects_missing_node_before_installing(
    portable_checkout: dict[str, object],
    tmp_path: Path,
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)

    no_node_bin = tmp_path / "no-node-bin"
    no_node_bin.mkdir()
    bash = shutil.which("bash", path=os.defpath)
    assert bash is not None
    shutil.copy2(bash, no_node_bin / "bash")
    env["PATH"] = str(no_node_bin)

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert "Node.js is required" in result.stderr
    assert_no_dependency_state(checkout, log)


@pytest.mark.parametrize(
    ("failure", "expected_prefix"),
    [
        ("uv-version", EXPECTED_CALLS[:1]),
        ("uv-venv", EXPECTED_CALLS[:2]),
        ("uv-sync", EXPECTED_CALLS[:3]),
        ("uv-editable", EXPECTED_CALLS[:4]),
        ("npm-ci", EXPECTED_CALLS),
    ],
)
def test_bootstrap_stops_at_the_first_installer_failure(
    portable_checkout: dict[str, object],
    failure: str,
    expected_prefix: list[str],
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    env["H001_FAIL_ON"] = failure

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert installer_calls(log) == expected_prefix


def test_bootstrap_rejects_an_unpinned_uv_before_creating_dependency_state(
    portable_checkout: dict[str, object],
):
    checkout = portable_checkout["checkout"]
    outside = portable_checkout["outside"]
    log = portable_checkout["log"]
    env = dict(portable_checkout["env"])
    assert isinstance(checkout, Path)
    assert isinstance(outside, Path)
    assert isinstance(log, Path)
    env["H001_UV_VERSION"] = "99.0.0"

    result = run([str(checkout / "scripts" / "bootstrap.sh")], cwd=outside, env=env)

    assert result.returncode != 0
    assert installer_calls(log) == EXPECTED_CALLS[:1]
    assert not (checkout / ".venv").exists()


@pytest.mark.parametrize("tool", ["uv", "npm"])
def test_fake_installers_reject_unallowlisted_network_argv_without_logging_it(
    tmp_path: Path,
    tool: str,
):
    log = tmp_path / "calls.tsv"
    home = tmp_path / "private-home"
    home.mkdir()
    network_argument = "ht" + "tps://network.invalid/dependency"
    env = {
        "HOME": str(home),
        "PATH": os.defpath,
        "LC_ALL": "C",
        "H001_INSTALL_LOG": str(log),
    }

    result = run(
        [str(FAKE_BIN / tool), network_argument],
        cwd=tmp_path,
        env=env,
    )

    assert result.returncode == 97
    assert installer_calls(log) == []
    assert network_argument not in result.stdout + result.stderr
    assert str(home) not in result.stdout + result.stderr
