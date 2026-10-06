from __future__ import annotations

import importlib
import json
from copy import deepcopy
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
PROFILE_PATH = REPO / "gateway" / "contracts" / "orchestrator-profile-v1.json"
SCHEMA_PATH = REPO / "schemas" / "doctor-result-v1.schema.json"
DOCTOR_DOC_PATH = REPO / "docs" / "doctor.md"

CORE_CHECK_IDS = (
    "config",
    "dependency",
    "policy",
    "profile",
    "repository",
    "runtime",
)
FINAL_PROBE_CHECK_IDS = (
    "claude-login",
    "codex-login",
    "coordination",
    "coordination-scope",
    "isolation",
    "state-ownership",
)

PROVIDER_CASES = (
    (
        "claude-code",
        "CLAUDE",
        ("claude", "--version"),
        ("claude", "auth", "status"),
    ),
    (
        "codex",
        "CODEX",
        ("codex", "--version"),
        ("codex", "login", "status"),
    ),
)


@pytest.fixture
def modules():
    doctor = importlib.reload(importlib.import_module("agents_cli.doctor"))
    probes = importlib.reload(importlib.import_module("agents_cli.doctor_probes"))
    return doctor, probes


def canonical_providers():
    profile = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
    return profile["providers"]


class FakeBoundedRunner:
    def __init__(self, default_status, outcomes=None):
        self.default_status = default_status
        self.outcomes = dict(outcomes or {})
        self.calls = []

    def __call__(self, argv, *, timeout_seconds):
        self.calls.append((argv, timeout_seconds))
        outcome = self.outcomes.get(argv, self.default_status)
        if isinstance(outcome, BaseException):
            raise outcome
        return outcome


class CollidingProviderKey:
    def __init__(self, error):
        self.error = error

    def __hash__(self):
        return hash("claude-code")

    def __eq__(self, _other):
        raise self.error


def passing_core_bindings(doctor):
    bindings = []
    for definition in doctor.CHECK_REGISTRY[: len(CORE_CHECK_IDS)]:
        passing = next(
            outcome
            for outcome in definition.outcomes
            if outcome.result_status is doctor.ResultStatus.PASS
        )
        observation = doctor.ProbeObservation(
            passing.probe_status,
            passing.code,
        )
        bindings.append(
            doctor.ProbeBinding(
                definition.id,
                lambda observation=observation: observation,
            )
        )
    return tuple(bindings)


def run_provider_checks(doctor, probes, providers, runner):
    provider_bindings = probes.create_provider_login_bindings(
        providers,
        runner,
    )
    trailing_bindings = []
    for definition in doctor.CHECK_REGISTRY[
        len(CORE_CHECK_IDS) + len(PROVIDER_CASES) :
    ]:
        passing = next(
            outcome
            for outcome in definition.outcomes
            if outcome.result_status is doctor.ResultStatus.PASS
        )
        observation = doctor.ProbeObservation(
            passing.probe_status,
            passing.code,
        )
        trailing_bindings.append(
            doctor.ProbeBinding(
                definition.id,
                lambda observation=observation: observation,
            )
        )
    return doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (
            *passing_core_bindings(doctor),
            *provider_bindings,
            *trailing_bindings,
        ),
    )


def provider_projection(doctor, run):
    start = len(CORE_CHECK_IDS)
    return doctor.project_result(run.result)["checks"][
        start : start + len(PROVIDER_CASES)
    ]


def providers_with_only(provider_id):
    providers = deepcopy(canonical_providers())
    for selected in ("claude-code", "codex"):
        providers[selected]["execution"] = (
            "available" if selected == provider_id else "registry-only"
        )
    return providers


def test_provider_probe_order_is_the_prefix_of_the_frozen_six_check_contract(
    modules,
):
    doctor, probes = modules
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    assert probes.FINAL_PROBE_CHECK_ORDER == FINAL_PROBE_CHECK_IDS
    assert tuple(definition.id.value for definition in doctor.CHECK_REGISTRY) == (
        *CORE_CHECK_IDS,
        *FINAL_PROBE_CHECK_IDS,
    )
    assert [item["$ref"] for item in schema["properties"]["checks"]["prefixItems"]] == [
        "#/$defs/configCheck",
        "#/$defs/dependencyCheck",
        "#/$defs/policyCheck",
        "#/$defs/profileCheck",
        "#/$defs/repositoryCheck",
        "#/$defs/runtimeCheck",
        "#/$defs/claudeLoginCheck",
        "#/$defs/codexLoginCheck",
        "#/$defs/coordinationCheck",
        "#/$defs/coordinationScopeCheck",
        "#/$defs/isolationCheck",
        "#/$defs/stateOwnershipCheck",
    ]
    assert schema["properties"]["checks"]["minItems"] == 12
    assert schema["properties"]["checks"]["maxItems"] == 12
    assert schema["$defs"]["remediation"]["properties"]["anchor"]["enum"] == [
        "bootstrap",
        "coordination",
        "isolation",
        "provider-login",
        "state-ownership",
        "synthetic-input",
    ]
    Draft202012Validator.check_schema(schema)


def test_provider_login_remediation_is_static_and_actionable():
    text = DOCTOR_DOC_PATH.read_text(encoding="utf-8")

    assert "## Provider login" in text
    for command in (
        "claude --version",
        "claude auth status",
        "codex --version",
        "codex login status",
    ):
        assert f"`{command}`" in text
    assert "does not inspect or display command output" in text
    assert "never logs in automatically" in text


def test_canonical_h000_modes_run_two_fixed_bounded_argv_per_available_provider(
    modules,
):
    doctor, probes = modules
    runner = FakeBoundedRunner(probes.CommandStatus.SUCCESS)

    run = run_provider_checks(
        doctor,
        probes,
        canonical_providers(),
        runner,
    )

    assert runner.calls == [
        (
            ("claude", "--version"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("claude", "auth", "status"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("codex", "--version"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
        (
            ("codex", "login", "status"),
            probes.PROVIDER_COMMAND_TIMEOUT_SECONDS,
        ),
    ]
    assert probes.PROVIDER_COMMAND_TIMEOUT_SECONDS == 5.0
    assert all(type(argv) is tuple for argv, _ in runner.calls)
    assert provider_projection(doctor, run) == [
        {
            "id": "claude-login",
            "status": "pass",
            "code": "CLAUDE_LOGIN_READY",
            "summary": "Claude Code CLI is installed and authenticated.",
            "remediation": {
                "doc": "docs/doctor.md",
                "anchor": "provider-login",
            },
        },
        {
            "id": "codex-login",
            "status": "pass",
            "code": "CODEX_LOGIN_READY",
            "summary": "Codex CLI is installed and authenticated.",
            "remediation": {
                "doc": "docs/doctor.md",
                "anchor": "provider-login",
            },
        },
    ]


def test_registry_only_providers_run_zero_commands_and_are_not_required(modules):
    doctor, probes = modules
    providers = deepcopy(canonical_providers())
    providers["claude-code"]["execution"] = "registry-only"
    providers["codex"]["execution"] = "registry-only"
    providers["gemini-cli"]["execution"] = "registry-only"
    runner = FakeBoundedRunner(probes.CommandStatus.SUCCESS)

    run = run_provider_checks(doctor, probes, providers, runner)

    assert runner.calls == []
    assert [
        (check["id"], check["status"], check["code"])
        for check in provider_projection(doctor, run)
    ] == [
        ("claude-login", "pass", "CLAUDE_LOGIN_NOT_REQUIRED"),
        ("codex-login", "pass", "CODEX_LOGIN_NOT_REQUIRED"),
    ]


@pytest.mark.parametrize(
    ("provider_id", "code_prefix", "version_argv", "login_argv"),
    PROVIDER_CASES,
)
@pytest.mark.parametrize(
    ("failed_command", "command_status", "expected_suffix", "expected_calls"),
    (
        ("version", "NOT_FOUND", "CLI_UNAVAILABLE", 1),
        ("version", "FAILED", "CLI_UNAVAILABLE", 1),
        ("version", "TIMED_OUT", "LOGIN_TIMEOUT", 1),
        ("login", "NOT_FOUND", "CLI_UNAVAILABLE", 2),
        ("login", "FAILED", "LOGIN_REQUIRED", 2),
        ("login", "TIMED_OUT", "LOGIN_TIMEOUT", 2),
    ),
)
def test_provider_absence_timeout_and_stale_login_are_closed_observations(
    modules,
    provider_id,
    code_prefix,
    version_argv,
    login_argv,
    failed_command,
    command_status,
    expected_suffix,
    expected_calls,
):
    doctor, probes = modules
    selected_argv = version_argv if failed_command == "version" else login_argv
    runner = FakeBoundedRunner(
        probes.CommandStatus.SUCCESS,
        {selected_argv: getattr(probes.CommandStatus, command_status)},
    )

    run = run_provider_checks(
        doctor,
        probes,
        providers_with_only(provider_id),
        runner,
    )
    checks = {check["id"]: check for check in provider_projection(doctor, run)}

    assert len(runner.calls) == expected_calls
    assert checks[f"{code_prefix.lower()}-login"]["status"] == "fail"
    assert checks[f"{code_prefix.lower()}-login"]["code"] == (
        f"{code_prefix}_{expected_suffix}"
    )
    assert checks[f"{code_prefix.lower()}-login"]["remediation"] == {
        "doc": "docs/doctor.md",
        "anchor": "provider-login",
    }
    assert run.exit_code == 1


@pytest.mark.parametrize(
    ("provider_id", "code_prefix", "version_argv", "_login_argv"),
    PROVIDER_CASES,
)
def test_runner_exception_text_causes_outputs_and_config_never_reach_results(
    modules,
    provider_id,
    code_prefix,
    version_argv,
    _login_argv,
):
    doctor, probes = modules
    canaries = (
        "tok_live_PROVIDER_SECRET_CANARY",
        "provider-owner-canary",
        "/home/provider-owner/.config/private",
        "https://user:credential@example.invalid/private",
        '{"token":"raw-provider-token"}',
        "Traceback provider-private.py:71",
    )

    class SensitiveRunnerError(RuntimeError):
        def __str__(self):
            return " | ".join(canaries)

        def __repr__(self):
            return f"SensitiveRunnerError({' | '.join(canaries)})"

    try:
        raise ValueError(canaries[0])
    except ValueError as cause:
        sensitive_error = SensitiveRunnerError()
        sensitive_error.raw_config = canaries[4]
        sensitive_error.__cause__ = cause

    providers = providers_with_only(provider_id)
    providers[provider_id].update(
        {
            "username": canaries[1],
            "home": canaries[2],
            "credentialUrl": canaries[3],
            "token": canaries[4],
        }
    )
    runner = FakeBoundedRunner(
        probes.CommandStatus.SUCCESS,
        {version_argv: sensitive_error},
    )

    run = run_provider_checks(doctor, probes, providers, runner)
    projection = doctor.project_result(run.result)
    outputs = (
        repr(run),
        repr(run.result),
        json.dumps(projection, sort_keys=True),
        doctor.render_json(run.result),
        doctor.render_human(run.result),
    )
    selected = next(
        check
        for check in projection["checks"]
        if check["id"] == f"{code_prefix.lower()}-login"
    )

    assert selected["code"] == f"{code_prefix}_LOGIN_PROBE_ERROR"
    assert selected["status"] == "fail"
    assert len(runner.calls) == 1
    for canary in canaries:
        assert all(canary not in output for output in outputs)
    for argv, _timeout in runner.calls:
        assert " ".join(argv) not in outputs[2]
        assert " ".join(argv) not in outputs[3]
        assert " ".join(argv) not in outputs[4]


@pytest.mark.parametrize(
    "invalid_providers",
    (
        {},
        {
            "claude-code": {},
            "codex": {},
        },
        {
            "claude-code": {"execution": object()},
            "codex": {"execution": "registry-only"},
        },
        {
            "claude-code": {"execution": "registry-only"},
            "codex": {"execution": "unexpected"},
        },
    ),
)
def test_missing_or_malformed_provider_modes_fail_closed_without_commands(
    modules,
    invalid_providers,
):
    doctor, probes = modules
    runner = FakeBoundedRunner(probes.CommandStatus.SUCCESS)

    run = run_provider_checks(
        doctor,
        probes,
        invalid_providers,
        runner,
    )

    assert runner.calls == []
    projected = provider_projection(doctor, run)
    assert any(
        check["status"] == "fail" and check["code"].endswith("_LOGIN_PROBE_ERROR")
        for check in projected
    )
    assert all(
        check["code"].endswith(("_LOGIN_NOT_REQUIRED", "_LOGIN_PROBE_ERROR"))
        for check in projected
    )


@pytest.mark.parametrize("factory_name", ("provider", "composed"))
def test_hostile_provider_key_lookup_fails_closed_without_commands(
    modules,
    factory_name,
):
    doctor, probes = modules
    sentinel = RuntimeError("HOSTILE_PROVIDER_KEY")
    providers = {
        CollidingProviderKey(sentinel): {"execution": "available"},
    }
    runner = FakeBoundedRunner(probes.CommandStatus.SUCCESS)

    assert type(providers) is dict
    if factory_name == "provider":
        run = run_provider_checks(doctor, probes, providers, runner)
    else:
        bindings = probes.create_doctor_probe_bindings(
            providers=providers,
            runner=runner,
            coordination_snapshot={
                "coordination": "COORDINATION_READY",
                "coordinationScope": "COORDINATION_SCOPE_MATCH",
            },
        )
        assert runner.calls == []
        run = doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            (*passing_core_bindings(doctor), *bindings),
        )

    assert runner.calls == []
    assert [
        (check["id"], check["status"], check["code"])
        for check in provider_projection(doctor, run)
    ] == [
        ("claude-login", "fail", "CLAUDE_LOGIN_PROBE_ERROR"),
        ("codex-login", "fail", "CODEX_LOGIN_PROBE_ERROR"),
    ]


@pytest.mark.parametrize("factory_name", ("provider", "composed"))
def test_hostile_provider_key_lookup_base_exception_propagates_unchanged(
    modules,
    factory_name,
):
    _doctor, probes = modules
    signal = KeyboardInterrupt()
    providers = {
        CollidingProviderKey(signal): {"execution": "available"},
    }
    runner = FakeBoundedRunner(probes.CommandStatus.SUCCESS)

    assert type(providers) is dict
    with pytest.raises(KeyboardInterrupt) as caught:
        if factory_name == "provider":
            probes.create_provider_login_bindings(providers, runner)
        else:
            probes.create_doctor_probe_bindings(
                providers=providers,
                runner=runner,
                coordination_snapshot={},
            )

    assert caught.value is signal
    assert runner.calls == []


def test_unknown_runner_result_is_not_inspected_or_projected(modules):
    doctor, probes = modules
    calls = []
    canary = "tok-hostile-runner-result-canary"

    class HostileResult:
        stdout = canary
        stderr = f"/home/{canary}"

        def __getattribute__(self, name):
            if name not in {"__class__"}:
                calls.append(name)
            return object.__getattribute__(self, name)

    runner = FakeBoundedRunner(
        probes.CommandStatus.SUCCESS,
        {("claude", "--version"): HostileResult()},
    )

    run = run_provider_checks(
        doctor,
        probes,
        providers_with_only("claude-code"),
        runner,
    )
    rendered = (
        doctor.render_json(run.result),
        doctor.render_human(run.result),
    )

    assert calls == []
    assert all(canary not in output for output in rendered)
    assert provider_projection(doctor, run)[0]["code"] == ("CLAUDE_LOGIN_PROBE_ERROR")


def test_provider_probe_base_exceptions_propagate_unchanged(modules):
    doctor, probes = modules
    signal = KeyboardInterrupt()
    runner = FakeBoundedRunner(
        probes.CommandStatus.SUCCESS,
        {("claude", "--version"): signal},
    )

    with pytest.raises(KeyboardInterrupt) as caught:
        run_provider_checks(
            doctor,
            probes,
            providers_with_only("claude-code"),
            runner,
        )

    assert caught.value is signal
