from __future__ import annotations

import io
import json
import os
import shutil
import subprocess
import tarfile
import traceback
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPT_DISABLED_NPM = ["--prefix", "gateway", "ci", "--ignore-scripts"]
SCRIPT_ENABLED_NPM = ["--prefix", "gateway", "ci"]
NATIVE_CODE = "NATIVE_ADDON_UNAVAILABLE"
ALLOWED_DESTINATIONS = {
    "npm": "https://registry.npmjs.org/",
    "python": "https://pypi.org/simple/",
}
ARCHIVE_INPUTS = (
    "ci/production-advisories.json",
    "ci/production-sbom.json",
    "ci/requirements-build.in",
    "cli/pyproject.toml",
    "examples/hero/app/index.html",
    "examples/hero/plan.json",
    "examples/hero/profile.json",
    "examples/hero/repository.json",
    "gateway/.npmrc",
    "gateway/package-lock.json",
    "gateway/package.json",
    "orchestrator-langgraph/pyproject.toml",
    "requirements.lock",
    "scripts/bootstrap.sh",
    "scripts/bootstrap_preflight.mjs",
    "scripts/requirements_lock.sh",
)


@dataclass(frozen=True)
class CandidateArchive:
    commit: str
    tree: str
    payload: bytes


@dataclass
class PortabilityCase:
    checkout: Path
    portable_root: Path
    owner_home: Path
    owner_cache: Path
    fake_bin: Path
    calls_log: Path
    proxy_log: Path
    egress_log: Path
    output_dir: Path
    env: dict[str, str]
    secret: str
    username: str
    credential_url: str
    canaries: tuple[str, ...]
    canary_labels: tuple[str, ...]


FAKE_TOOL = r"""#!/usr/bin/env python3
import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit


TOOL = Path(sys.argv[0]).name
ARGS = sys.argv[1:]
ALLOWED = {
    "npm": "https://registry.npmjs.org/",
    "python": "https://pypi.org/simple/",
}


def reject(code, status):
    if os.environ.get("H001_CALLS_LOG"):
        record(
            "H001_CALLS_LOG",
            {"code": code, "kind": "rejection", "tool": TOOL},
        )
    print(code, file=sys.stderr)
    raise SystemExit(status)


def record(variable, payload):
    path = Path(os.environ[variable])
    with path.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(payload, sort_keys=True) + "\n")


def require_closed_environment():
    root = Path(os.environ["H001_PORTABLE_ROOT"]).resolve()
    home = Path(os.environ.get("HOME", "")).resolve()
    if home != root / "home":
        reject("PORTABILITY_INHERITED_HOME", 90)

    for variable in ("XDG_CACHE_HOME", "UV_CACHE_DIR", "npm_config_cache"):
        cache = Path(os.environ.get(variable, "")).resolve()
        if not cache.is_relative_to(root) or any(cache.iterdir()):
            reject("PORTABILITY_INHERITED_CACHE", 91)

    credential_variables = (
        "AWS_ACCESS_KEY_ID",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "NPM_TOKEN",
        "UV_CREDENTIALS",
    )
    if any(os.environ.get(variable) for variable in credential_variables):
        reject("PORTABILITY_INHERITED_CREDENTIAL", 92)


def run_route(ecosystem):
    destination = ALLOWED[ecosystem]
    mode = os.environ.get("H001_ROUTE_MODE", "proxy")
    if mode == "direct":
        command = [os.environ["H001_EGRESS_FAKE"], "direct", destination]
    else:
        if mode == "unallowlisted":
            destination = "https://packages.invalid/"
        source_variable = (
            "npm_config_registry" if ecosystem == "npm" else "UV_INDEX_URL"
        )
        command = [
            os.environ["H001_PROXY_FAKE"],
            ecosystem,
            os.environ[source_variable],
            destination,
        ]
    routed = subprocess.run(command, text=True, capture_output=True, check=False)
    if routed.returncode != 0:
        sys.stderr.write(routed.stderr)
        raise SystemExit(routed.returncode)


def run_egress():
    mode, destination = ARGS
    if mode == "test-leak":
        value = os.environ["H001_TEST_LEAK"]
        target = os.environ["H001_LEAK_TARGET"]
        if target == "stdout":
            print(value)
        elif target == "stderr":
            print(value, file=sys.stderr)
        elif target == "log":
            Path(os.environ["H001_CALLS_LOG"]).write_text(value, encoding="utf-8")
        elif target == "json":
            output = Path(os.environ["H001_LEAK_OUTPUT"])
            output.write_text(json.dumps({"value": value}), encoding="utf-8")
        raise SystemExit(0)
    if mode != "proxied":
        reject("PORTABILITY_DIRECT_EGRESS_DENIED", 94)
    if destination not in ALLOWED.values():
        reject("PORTABILITY_UNALLOWLISTED_EGRESS_DENIED", 95)
    record("H001_EGRESS_LOG", {"route": "proxied-allowlisted"})


def run_proxy():
    ecosystem, source, destination = ARGS
    parsed = urlsplit(source)
    expected_path = "/npm/" if ecosystem == "npm" else "/python/simple/"
    if parsed.scheme != "http":
        reject("PORTABILITY_PROXY_SCHEME_DENIED", 96)
    if parsed.hostname != "127.0.0.1":
        reject("PORTABILITY_PROXY_HOST_DENIED", 96)
    if parsed.password is not None:
        reject("PORTABILITY_PROXY_PASSWORD_DENIED", 96)
    if parsed.username is not None:
        reject("PORTABILITY_PROXY_USERNAME_DENIED", 96)
    if parsed.path != expected_path:
        reject("PORTABILITY_PROXY_PATH_DENIED", 96)
    if destination != ALLOWED.get(ecosystem):
        reject("PORTABILITY_UNALLOWLISTED_EGRESS_DENIED", 95)
    guarded = subprocess.run(
        [os.environ["H001_EGRESS_FAKE"], "proxied", destination],
        text=True,
        capture_output=True,
        check=False,
    )
    if guarded.returncode != 0:
        sys.stderr.write(guarded.stderr)
        raise SystemExit(guarded.returncode)
    record(
        "H001_PROXY_LOG",
        {"ecosystem": ecosystem, "route": "loopback-allowlisted"},
    )


def run_uv():
    record("H001_CALLS_LOG", {"argv": ARGS, "tool": "uv"})
    require_closed_environment()
    if ARGS == ["--version"]:
        if Path(".venv").exists() or Path("gateway/node_modules").exists():
            reject("PORTABILITY_INHERITED_INSTALL", 97)
        print("uv 0.11.21")
        return
    if ARGS == ["venv", "--python", "3.11", ".venv"]:
        Path(".venv/bin").mkdir(parents=True)
        Path(".venv/bin/activate").write_text(
            'VIRTUAL_ENV="$PWD/.venv"\n'
            'export VIRTUAL_ENV\n'
            'PATH="$VIRTUAL_ENV/bin:$PATH"\n'
            'export PATH\n',
            encoding="utf-8",
        )
        return
    if ARGS == ["pip", "sync", "--require-hashes", "requirements.lock"]:
        lock = Path("requirements.lock").read_text(encoding="utf-8")
        if "# inputs-sha256:" not in lock or "--hash=sha256:" not in lock:
            reject("PORTABILITY_UNREVIEWED_PYTHON_LOCK", 98)
        run_route("python")
        Path(".venv/.portability-synced").touch()
        return
    expected = [
        "pip",
        "install",
        "--no-deps",
        "--no-build-isolation",
        "-e",
        "cli",
        "-e",
        "orchestrator-langgraph",
        "--offline",
    ]
    if ARGS == expected:
        Path(".venv/.portability-editable").touch()
        return
    reject("PORTABILITY_UNEXPECTED_UV_ARGUMENTS", 99)


def run_npm():
    record("H001_CALLS_LOG", {"argv": ARGS, "tool": "npm"})
    require_closed_environment()
    if ARGS == ["--prefix", "gateway", "ci"]:
        Path(os.environ["H001_SCRIPT_SENTINEL"]).touch()
        reject("PORTABILITY_INSTALL_SCRIPTS_ENABLED", 93)
    expected = ["--prefix", "gateway", "ci", "--ignore-scripts"]
    if ARGS != expected:
        reject("PORTABILITY_UNEXPECTED_NPM_ARGUMENTS", 99)

    lock = json.loads(Path("gateway/package-lock.json").read_text(encoding="utf-8"))
    package = lock["packages"]["node_modules/better-sqlite3"]
    if package.get("hasInstallScript") is not True or not str(
        package.get("integrity", "")
    ).startswith("sha512-"):
        reject("PORTABILITY_UNREVIEWED_NODE_LOCK", 98)
    run_route("npm")

    package_root = Path("gateway/node_modules/better-sqlite3")
    native = package_root / "build/Release/better_sqlite3.node"
    native.parent.mkdir(parents=True)
    native.write_bytes(b"intentionally unbuilt native addon\n")
    (package_root / "package.json").write_text(
        json.dumps(
            {
                "main": "index.js",
                "name": "better-sqlite3",
                "version": package["version"],
            }
        ),
        encoding="utf-8",
    )
    (package_root / "index.js").write_text(
        'require("./build/Release/better_sqlite3.node");\n',
        encoding="utf-8",
    )
    (package_root.parent / "portability-install.json").write_text(
        json.dumps(
            {
                "installScripts": "disabled",
                "lockGraphMaterialized": True,
                "schemaVersion": "h001-portability-install/v1",
            },
            sort_keys=True,
        ),
        encoding="utf-8",
    )


if TOOL == "portability-egress":
    run_egress()
elif TOOL == "portability-proxy":
    run_proxy()
elif TOOL == "uv":
    run_uv()
elif TOOL == "npm":
    run_npm()
else:
    reject("PORTABILITY_UNKNOWN_FAKE", 99)
"""


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


def read_events(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def extract_candidate(candidate: CandidateArchive, checkout: Path) -> None:
    checkout.mkdir()
    with tarfile.open(fileobj=io.BytesIO(candidate.payload), mode="r:") as archive:
        for member in archive.getmembers():
            parts = Path(member.name).parts
            assert member.name and not Path(member.name).is_absolute()
            assert ".." not in parts
            if member.issym() or member.islnk():
                assert not Path(member.linkname).is_absolute()
                assert ".." not in Path(member.linkname).parts
        archive.extractall(checkout)


def install_fake_tools(case: PortabilityCase) -> None:
    case.fake_bin.mkdir()
    for name in ("npm", "portability-egress", "portability-proxy", "uv"):
        path = case.fake_bin / name
        path.write_text(FAKE_TOOL, encoding="utf-8")
        path.chmod(0o755)
    for name in ("bash", "node", "python3"):
        target = shutil.which(name, path=os.defpath)
        assert target is not None
        (case.fake_bin / name).symlink_to(target)


@pytest.fixture(scope="module")
def candidate_archive() -> CandidateArchive:
    commit = subprocess.run(
        ["git", "rev-parse", "--verify", "HEAD^{commit}"],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    tree = subprocess.run(
        ["git", "rev-parse", "HEAD^{tree}"],
        cwd=REPO,
        text=True,
        capture_output=True,
        check=True,
    ).stdout.strip()
    archived = subprocess.run(
        ["git", "archive", "--format=tar", commit, "--", *ARCHIVE_INPUTS],
        cwd=REPO,
        capture_output=True,
        check=False,
    )
    assert archived.returncode == 0, archived.stderr.decode("utf-8", errors="replace")
    assert len(commit) == 40 and len(tree) == 40
    return CandidateArchive(commit=commit, tree=tree, payload=archived.stdout)


@pytest.fixture
def portability_case(
    tmp_path: Path,
    candidate_archive: CandidateArchive,
) -> PortabilityCase:
    checkout = tmp_path / "candidate"
    portable_root = tmp_path / "portable"
    owner_home = tmp_path / "owner-user-canary-home"
    owner_cache = tmp_path / "owner-user-canary-cache"
    fake_bin = portable_root / "fake-bin"
    output_dir = portable_root / "output"
    calls_log = output_dir / "calls.jsonl"
    proxy_log = output_dir / "proxy.jsonl"
    egress_log = output_dir / "egress.jsonl"
    extract_candidate(candidate_archive, checkout)

    for path in (
        portable_root / "home",
        portable_root / "xdg-cache",
        portable_root / "uv-cache",
        portable_root / "npm-cache",
        owner_home,
        owner_cache,
        output_dir,
    ):
        path.mkdir(parents=True)

    secret = "tok_portability_owner_secret_canary"
    username = "owner-user-canary"
    credential_url = f"https://{username}:{secret}@packages.invalid/simple"
    (owner_home / ".credentials").write_text(
        f"token={secret}\nurl={credential_url}\n",
        encoding="utf-8",
    )
    (owner_cache / "owner-cache-canary").write_text(secret, encoding="utf-8")

    case = PortabilityCase(
        checkout=checkout,
        portable_root=portable_root,
        owner_home=owner_home,
        owner_cache=owner_cache,
        fake_bin=fake_bin,
        calls_log=calls_log,
        proxy_log=proxy_log,
        egress_log=egress_log,
        output_dir=output_dir,
        env={},
        secret=secret,
        username=username,
        credential_url=credential_url,
        canaries=(
            secret,
            username,
            credential_url,
            str(owner_home),
            str(Path.home()),
            str(REPO),
        ),
        canary_labels=(
            "secret",
            "protected_username_detector",
            "protected_credential_url_detector",
            "protected_owner_home_detector",
            "protected_reviewer_home_detector",
            "protected_repo_path_detector",
        ),
    )
    install_fake_tools(case)
    loopback = "http://127.0.0.1:48731"
    case.env.update(
        {
            "HOME": str(portable_root / "home"),
            "H001_CALLS_LOG": str(calls_log),
            "H001_EGRESS_FAKE": str(fake_bin / "portability-egress"),
            "H001_EGRESS_LOG": str(egress_log),
            "H001_PORTABLE_ROOT": str(portable_root),
            "H001_PROXY_FAKE": str(fake_bin / "portability-proxy"),
            "H001_PROXY_LOG": str(proxy_log),
            "H001_SCRIPT_SENTINEL": str(output_dir / "install-script-would-run"),
            "LC_ALL": "C",
            "PATH": str(fake_bin),
            "PIP_INDEX_URL": f"{loopback}/python/simple/",
            "UV_CACHE_DIR": str(portable_root / "uv-cache"),
            "UV_INDEX_URL": f"{loopback}/python/simple/",
            "XDG_CACHE_HOME": str(portable_root / "xdg-cache"),
            "npm_config_cache": str(portable_root / "npm-cache"),
            "npm_config_registry": f"{loopback}/npm/",
        }
    )

    assert not (checkout / ".git").exists()
    assert not (checkout / ".venv").exists()
    assert not (checkout / "gateway/node_modules").exists()
    assert not list(checkout.rglob("*.pyc"))
    assert not list(checkout.rglob(".pytest_cache"))
    assert not any(path.is_symlink() for path in checkout.rglob("*"))
    checkout_bytes = b"\n".join(
        path.read_bytes() for path in checkout.rglob("*") if path.is_file()
    )
    assert str(Path.home()).encode() not in checkout_bytes
    return case


def native_outcome(
    case: PortabilityCase,
) -> tuple[dict[str, str], subprocess.CompletedProcess[str] | None]:
    artifact = (
        case.checkout
        / "gateway/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    )
    probe = None
    if artifact.is_file():
        probe = run(
            ["node", "-e", 'require("./gateway/node_modules/better-sqlite3")'],
            cwd=case.checkout,
            env=case.env,
        )
    available = probe is not None and probe.returncode == 0
    outcome = {
        "code": "DEPENDENCIES_READY" if available else NATIVE_CODE,
        "status": "pass" if available else "fail",
    }
    (case.output_dir / "native-result.json").write_text(
        json.dumps(outcome, sort_keys=True),
        encoding="utf-8",
    )
    return outcome, probe


def assert_no_canary_leaks(
    case: PortabilityCase,
    completed: list[subprocess.CompletedProcess[str] | None],
    exceptions: tuple[BaseException, ...] = (),
) -> None:
    surfaces = []
    for result in completed:
        if result is not None:
            surfaces.extend((result.stdout, result.stderr))
    for log in (case.calls_log, case.proxy_log, case.egress_log):
        if log.exists():
            surfaces.append(log.read_text(encoding="utf-8"))
    produced_json = [
        case.checkout / "gateway/node_modules/portability-install.json",
        case.output_dir / "native-result.json",
        case.output_dir / "leak.json",
        case.output_dir / "raw-config.json",
    ]
    for path in produced_json:
        if path.exists():
            surfaces.append(path.read_text(encoding="utf-8"))
    for exception in exceptions:
        surfaces.extend(
            traceback.TracebackException.from_exception(exception).format(chain=True)
        )
    observed = "\n".join(surfaces)
    leaks = [
        (len(canary), label)
        for label, canary in zip(case.canary_labels, case.canaries, strict=True)
        if canary in observed
    ]
    assert not leaks, (
        "PORTABILITY_CANARY_LEAK:" + max(leaks, key=lambda leak: leak[0])[1]
    )


def npm_argv(case: PortabilityCase) -> list[str] | None:
    npm_calls = [
        event["argv"]
        for event in read_events(case.calls_log)
        if event["tool"] == "npm" and "argv" in event
    ]
    assert len(npm_calls) <= 1
    return npm_calls[0] if npm_calls else None


def test_fake_control_reaches_script_disabled_native_unavailable_boundary(
    portability_case: PortabilityCase,
):
    case = portability_case
    commands = [
        ["uv", "--version"],
        ["uv", "venv", "--python", "3.11", ".venv"],
        ["uv", "pip", "sync", "--require-hashes", "requirements.lock"],
        [
            "uv",
            "pip",
            "install",
            "--no-deps",
            "--no-build-isolation",
            "-e",
            "cli",
            "-e",
            "orchestrator-langgraph",
            "--offline",
        ],
        ["npm", *SCRIPT_DISABLED_NPM],
    ]
    results = [run(command, cwd=case.checkout, env=case.env) for command in commands]
    assert all(result.returncode == 0 for result in results)

    outcome, native_probe = native_outcome(case)
    artifact = (
        case.checkout
        / "gateway/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    )
    assert artifact.is_file()
    assert native_probe is not None and native_probe.returncode != 0
    assert outcome == {"code": NATIVE_CODE, "status": "fail"}
    assert npm_argv(case) == SCRIPT_DISABLED_NPM
    assert [event["ecosystem"] for event in read_events(case.proxy_log)] == [
        "python",
        "npm",
    ]
    assert read_events(case.egress_log) == [
        {"route": "proxied-allowlisted"},
        {"route": "proxied-allowlisted"},
    ]
    assert_no_canary_leaks(case, [*results, native_probe])


def test_archived_bootstrap_uses_the_script_disabled_portability_flow(
    portability_case: PortabilityCase,
):
    case = portability_case
    result = run(["./scripts/bootstrap.sh"], cwd=case.checkout, env=case.env)
    outcome, native_probe = native_outcome(case)
    artifact = (
        case.checkout
        / "gateway/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    )
    assert_no_canary_leaks(case, [result, native_probe])

    observed = {
        "bootstrapReturnCode": result.returncode,
        "installScriptSentinel": (
            case.output_dir / "install-script-would-run"
        ).exists(),
        "nativeArtifactMaterialized": artifact.is_file(),
        "nativeOutcome": outcome,
        "npmArgv": npm_argv(case),
        "proxyEcosystems": [
            event["ecosystem"] for event in read_events(case.proxy_log)
        ],
    }
    assert observed == {
        "bootstrapReturnCode": 0,
        "installScriptSentinel": False,
        "nativeArtifactMaterialized": True,
        "nativeOutcome": {"code": NATIVE_CODE, "status": "fail"},
        "npmArgv": SCRIPT_DISABLED_NPM,
        "proxyEcosystems": ["python", "npm"],
    }, result.stdout + result.stderr


def test_npm_fake_rejects_script_enabled_install_with_stable_sentinel(
    portability_case: PortabilityCase,
):
    case = portability_case
    result = run(["npm", *SCRIPT_ENABLED_NPM], cwd=case.checkout, env=case.env)

    assert result.returncode == 93
    assert result.stderr == "PORTABILITY_INSTALL_SCRIPTS_ENABLED\n"
    assert (case.output_dir / "install-script-would-run").is_file()
    assert npm_argv(case) == SCRIPT_ENABLED_NPM
    assert not (case.checkout / "gateway/node_modules").exists()
    assert_no_canary_leaks(case, [result])


@pytest.mark.parametrize(
    ("mode", "expected_code"),
    [
        ("direct", "PORTABILITY_DIRECT_EGRESS_DENIED"),
        ("unallowlisted", "PORTABILITY_UNALLOWLISTED_EGRESS_DENIED"),
    ],
)
def test_npm_fake_rejects_proxy_bypass_and_unallowlisted_egress(
    portability_case: PortabilityCase,
    mode: str,
    expected_code: str,
):
    case = portability_case
    env = dict(case.env)
    env["H001_ROUTE_MODE"] = mode

    result = run(["npm", *SCRIPT_DISABLED_NPM], cwd=case.checkout, env=env)

    assert result.returncode != 0
    assert result.stderr == f"{expected_code}\n"
    assert not (case.checkout / "gateway/node_modules").exists()
    source_probes = (
        (
            "https://127.0.0.1:48731/npm/",
            "PORTABILITY_PROXY_SCHEME_DENIED",
        ),
        (
            "http://127.0.0.2:48731/npm/",
            "PORTABILITY_PROXY_HOST_DENIED",
        ),
        (
            "http://proxy-user@127.0.0.1:48731/npm/",
            "PORTABILITY_PROXY_USERNAME_DENIED",
        ),
        (
            "http://proxy-user:proxy-password@127.0.0.1:48731/npm/",
            "PORTABILITY_PROXY_PASSWORD_DENIED",
        ),
        (
            "http://127.0.0.1:48731/npm",
            "PORTABILITY_PROXY_PATH_DENIED",
        ),
    )
    probe_results = []
    for source, source_code in source_probes:
        probe = run(
            [
                str(case.fake_bin / "portability-proxy"),
                "npm",
                source,
                ALLOWED_DESTINATIONS["npm"],
            ],
            cwd=case.checkout,
            env=case.env,
        )
        assert (probe.returncode, probe.stderr) == (96, f"{source_code}\n")
        probe_results.append(probe)
    assert_no_canary_leaks(case, [result, *probe_results])


@pytest.mark.parametrize(
    ("inherited", "expected_code", "paired_inherited", "paired_expected_code"),
    [
        (
            "home",
            "PORTABILITY_INHERITED_HOME",
            "xdg-cache",
            "PORTABILITY_INHERITED_CACHE",
        ),
        (
            "uv-cache",
            "PORTABILITY_INHERITED_CACHE",
            "aws-credential",
            "PORTABILITY_INHERITED_CREDENTIAL",
        ),
        (
            "npm-cache",
            "PORTABILITY_INHERITED_CACHE",
            "google-credential",
            "PORTABILITY_INHERITED_CREDENTIAL",
        ),
        (
            "credential",
            "PORTABILITY_INHERITED_CREDENTIAL",
            "uv-credential",
            "PORTABILITY_INHERITED_CREDENTIAL",
        ),
        (
            "install",
            "PORTABILITY_INHERITED_INSTALL",
            "venv",
            "PORTABILITY_INHERITED_INSTALL",
        ),
    ],
)
def test_bootstrap_rejects_inherited_owner_or_dependency_state(
    portability_case: PortabilityCase,
    inherited: str,
    expected_code: str,
    paired_inherited: str,
    paired_expected_code: str,
):
    case = portability_case
    env = dict(case.env)
    if inherited == "home":
        env["HOME"] = str(case.owner_home)
    elif inherited == "uv-cache":
        env["UV_CACHE_DIR"] = str(case.owner_cache)
    elif inherited == "npm-cache":
        env["npm_config_cache"] = str(case.owner_cache)
    elif inherited == "credential":
        env["NPM_TOKEN"] = case.secret
    else:
        inherited_install = case.checkout / "gateway/node_modules"
        inherited_install.mkdir()
        inherited_install_canary = inherited_install / "owner-install-canary"
        inherited_install_canary.write_text(
            case.secret,
            encoding="utf-8",
        )

    result = run(["./scripts/bootstrap.sh"], cwd=case.checkout, env=env)

    assert result.returncode != 0
    assert expected_code in {event.get("code") for event in read_events(case.calls_log)}
    assert npm_argv(case) is None
    assert_no_canary_leaks(case, [result])

    if inherited == "install":
        inherited_install_canary.unlink()
        inherited_install.rmdir()
    case.calls_log.unlink(missing_ok=True)
    paired_env = dict(case.env)
    if paired_inherited == "xdg-cache":
        paired_env["XDG_CACHE_HOME"] = str(case.owner_cache)
    elif paired_inherited == "aws-credential":
        paired_env["AWS_ACCESS_KEY_ID"] = case.secret
    elif paired_inherited == "google-credential":
        paired_env["GOOGLE_APPLICATION_CREDENTIALS"] = case.secret
    elif paired_inherited == "uv-credential":
        paired_env["UV_CREDENTIALS"] = case.secret
    else:
        inherited_venv = case.checkout / ".venv"
        inherited_venv.mkdir()
        (inherited_venv / "owner-venv-canary").write_text(
            case.secret,
            encoding="utf-8",
        )

    paired_result = run(
        ["./scripts/bootstrap.sh"],
        cwd=case.checkout,
        env=paired_env,
    )

    assert paired_result.returncode != 0
    assert paired_expected_code in {
        event.get("code") for event in read_events(case.calls_log)
    }
    assert npm_argv(case) is None
    assert_no_canary_leaks(case, [paired_result])


@pytest.mark.parametrize("surface", ["stdout", "stderr", "log", "json"])
def test_output_scan_rejects_every_canary_bearing_surface(
    portability_case: PortabilityCase,
    surface: str,
):
    case = portability_case
    leak_output = case.output_dir / "leak.json"
    protected_values = (
        ("protected_username_detector", case.username),
        ("protected_credential_url_detector", case.credential_url),
        ("protected_owner_home_detector", str(case.owner_home)),
        ("protected_reviewer_home_detector", str(Path.home())),
        ("protected_repo_path_detector", str(REPO)),
    )
    for detector, protected_value in protected_values:
        env = dict(case.env)
        env.update(
            {
                "H001_LEAK_OUTPUT": str(leak_output),
                "H001_LEAK_TARGET": surface,
                "H001_TEST_LEAK": protected_value,
            }
        )
        result = run(
            [str(case.fake_bin / "portability-egress"), "test-leak", "ignored"],
            cwd=case.checkout,
            env=env,
        )

        assert result.returncode == 0
        with pytest.raises(
            AssertionError,
            match=rf"PORTABILITY_CANARY_LEAK:{detector}",
        ):
            assert_no_canary_leaks(case, [result])
        case.calls_log.unlink(missing_ok=True)
        leak_output.unlink(missing_ok=True)

    raw_config = case.output_dir / "raw-config.json"
    raw_config.write_text(json.dumps({"token": case.secret}), encoding="utf-8")
    with pytest.raises(AssertionError, match="PORTABILITY_CANARY_LEAK:secret"):
        assert_no_canary_leaks(case, [])
    raw_config.unlink()

    cause = RuntimeError(case.secret)
    rendered = RuntimeError("portability exception")
    rendered.__cause__ = cause
    with pytest.raises(AssertionError, match="PORTABILITY_CANARY_LEAK:secret"):
        assert_no_canary_leaks(case, [], exceptions=(rendered,))


def test_unbuilt_native_file_cannot_be_reported_as_dependency_ready(
    portability_case: PortabilityCase,
):
    case = portability_case
    result = run(["npm", *SCRIPT_DISABLED_NPM], cwd=case.checkout, env=case.env)
    outcome, native_probe = native_outcome(case)
    artifact = (
        case.checkout
        / "gateway/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
    )

    assert result.returncode == 0
    assert artifact.is_file()
    assert native_probe is not None and native_probe.returncode != 0
    assert outcome == {"code": NATIVE_CODE, "status": "fail"}
    assert outcome["code"] != "DEPENDENCIES_READY"
    assert_no_canary_leaks(case, [result, native_probe])
