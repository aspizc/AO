from __future__ import annotations

import importlib
from dataclasses import replace

import pytest

CORE_CHECK_IDS = (
    "config",
    "dependency",
    "policy",
    "profile",
    "repository",
    "runtime",
)
FINAL_CHECK_IDS = (
    "claude-login",
    "codex-login",
    "coordination",
    "coordination-scope",
    "isolation",
    "state-ownership",
)
CLEAN_CORE_CODES = (
    "CONFIG_VALID",
    "DEPENDENCIES_READY",
    "POLICY_VALID",
    "PROFILE_VALID",
    "REPOSITORY_CANONICAL",
    "RUNTIME_SUPPORTED",
)
FINAL_CODES = (
    "CLAUDE_LOGIN_READY",
    "CODEX_LOGIN_READY",
    "COORDINATION_READY",
    "COORDINATION_SCOPE_MATCH",
    "ISOLATION_UNAVAILABLE",
    "STATE_OWNERSHIP_UNVERIFIABLE",
)
AVAILABLE_PROVIDERS = {
    "claude-code": {"execution": "available"},
    "codex": {"execution": "available"},
}
READY_COORDINATION = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_MATCH",
}


class SuccessfulRunner:
    def __call__(self, _argv, *, timeout_seconds):
        assert timeout_seconds > 0
        return importlib.import_module("agents_cli.doctor_probes").CommandStatus.SUCCESS


def _core_module():
    try:
        module = importlib.import_module("agents_cli.doctor_core_probes")
    except ModuleNotFoundError:
        pytest.fail("the production first-six Doctor binding factory is absent")
    assert callable(getattr(module, "create_doctor_core_bindings", None))
    return module


def test_core_factory_resolves_check_ids_after_doctor_reload():
    importlib.import_module("agents_cli.main")
    core = _core_module()
    doctor = importlib.reload(importlib.import_module("agents_cli.doctor"))
    inputs = core.CoreProbeInputs(
        config_valid=True,
        dependencies_ready=True,
        policy_valid=True,
        profile_valid=True,
        repository_canonical=True,
        runtime_supported=True,
    )

    bindings = core.create_doctor_core_bindings(inputs)

    assert tuple(type(binding.check_id) for binding in bindings) == (
        doctor.CheckId,
    ) * len(CORE_CHECK_IDS)
    assert tuple(binding.check_id.value for binding in bindings) == CORE_CHECK_IDS


def test_aggregate_bindings_resolve_doctor_authority_after_cli_import_reload():
    importlib.import_module("agents_cli.main")
    probes = importlib.import_module("agents_cli.doctor_probes")
    core = _core_module()
    doctor = importlib.reload(importlib.import_module("agents_cli.doctor"))
    inputs = core.CoreProbeInputs(
        config_valid=True,
        dependencies_ready=True,
        policy_valid=True,
        profile_valid=True,
        repository_canonical=True,
        runtime_supported=True,
    )

    bindings = core.create_doctor_core_bindings(inputs)
    bindings += probes.create_doctor_probe_bindings(
        providers=AVAILABLE_PROVIDERS,
        runner=SuccessfulRunner(),
        coordination_snapshot=READY_COORDINATION,
    )
    run = doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)

    assert (
        tuple(check["id"] for check in doctor.project_result(run.result)["checks"])
        == CORE_CHECK_IDS + FINAL_CHECK_IDS
    )


@pytest.mark.parametrize(
    ("input_name", "failure_code"),
    (
        ("config_valid", "CONFIG_MISSING"),
        ("dependencies_ready", "REQUIRED_DEPENDENCY_MISSING"),
        ("policy_valid", "POLICY_INVALID"),
        ("profile_valid", "PROFILE_INVALID"),
        ("repository_canonical", "REPOSITORY_NONCANONICAL"),
        ("runtime_supported", "RUNTIME_UNSUPPORTED"),
    ),
)
def test_each_first_six_input_drives_its_semantic_failure(
    input_name,
    failure_code,
):
    doctor = importlib.import_module("agents_cli.doctor")
    probes = importlib.import_module("agents_cli.doctor_probes")
    core = _core_module()
    clean = core.CoreProbeInputs(
        config_valid=True,
        dependencies_ready=True,
        policy_valid=True,
        profile_valid=True,
        repository_canonical=True,
        runtime_supported=True,
    )
    inputs = replace(clean, **{input_name: False})

    core_bindings = core.create_doctor_core_bindings(inputs)
    final_bindings = probes.create_doctor_probe_bindings(
        providers=AVAILABLE_PROVIDERS,
        runner=SuccessfulRunner(),
        coordination_snapshot=READY_COORDINATION,
    )
    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (*core_bindings, *final_bindings),
    )
    projection = doctor.project_result(run.result)
    status_codes = [
        (check["id"], check["status"], check["code"]) for check in projection["checks"]
    ]

    expected_core_codes = list(CLEAN_CORE_CODES)
    failed_index = tuple(clean.__dataclass_fields__).index(input_name)
    expected_core_codes[failed_index] = failure_code
    expected = [
        (
            check_id,
            "fail" if index == failed_index else "pass",
            code,
        )
        for index, (check_id, code) in enumerate(
            zip(CORE_CHECK_IDS, expected_core_codes, strict=True)
        )
    ]
    expected.extend(
        (
            check_id,
            "fail" if check_id in ("isolation", "state-ownership") else "pass",
            code,
        )
        for check_id, code in zip(FINAL_CHECK_IDS, FINAL_CODES, strict=True)
    )

    assert tuple(binding.check_id.value for binding in core_bindings) == CORE_CHECK_IDS
    assert status_codes == expected
    assert run.exit_code == 1
