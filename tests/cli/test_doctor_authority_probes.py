from __future__ import annotations

import importlib
import json
from enum import Enum
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "schemas" / "doctor-result-v1.schema.json"

PREFIX_CHECK_IDS = (
    "config",
    "dependency",
    "policy",
    "profile",
    "repository",
    "runtime",
    "claude-login",
    "codex-login",
    "coordination",
    "coordination-scope",
)
AUTHORITY_CHECK_IDS = (
    "isolation",
    "state-ownership",
)
FINAL_CHECK_IDS = (*PREFIX_CHECK_IDS, *AUTHORITY_CHECK_IDS)
PREFIX_CHECK_COUNT = len(PREFIX_CHECK_IDS)
_ABSENT = object()

PATH_CANARY = "/home/authority-owner/private/state.pid"
LOCK_CANARY = "authority-lock-token-canary"
PID_CANARY = "pid-canary-48291"
UID_CANARY = "uid-canary-1975"
GID_CANARY = "gid-canary-1976"
MODE_CANARY = "mode-canary-0700"
PERMISSIONS_CANARY = "permissions-canary-rwx"
OWNER_CANARY = "directory-owner-canary"
ENVIRONMENT_CANARY = "AUTHORITY_ENV_SECRET=tok_live_authority_canary"
CALLER_CANARY = "caller-asserted-isolated-and-owned"
EXCEPTION_CANARY = "Traceback authority-private.py:71"
RAW_CANARIES = (
    PATH_CANARY,
    LOCK_CANARY,
    PID_CANARY,
    UID_CANARY,
    GID_CANARY,
    MODE_CANARY,
    PERMISSIONS_CANARY,
    OWNER_CANARY,
    ENVIRONMENT_CANARY,
    CALLER_CANARY,
    EXCEPTION_CANARY,
)


@pytest.fixture
def modules():
    doctor = importlib.reload(importlib.import_module("agents_cli.doctor"))
    probes = importlib.reload(importlib.import_module("agents_cli.doctor_probes"))
    return doctor, probes


def passing_prefix_bindings(doctor):
    bindings = []
    for definition in doctor.CHECK_REGISTRY[:PREFIX_CHECK_COUNT]:
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


def authority_bindings(probes, capability=_ABSENT):
    factory = getattr(probes, "create_authority_bindings", None)
    assert callable(factory), "the Doctor authority-binding factory is absent"
    if capability is _ABSENT:
        return factory()
    return factory(capability)


def run_authority_checks(doctor, probes, capability=_ABSENT):
    return doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (
            *passing_prefix_bindings(doctor),
            *authority_bindings(probes, capability),
        ),
    )


def projected_authority_checks(doctor, run):
    return doctor.project_result(run.result)["checks"][PREFIX_CHECK_COUNT:]


def projected_status_codes(doctor, run):
    return [
        (check["status"], check["code"])
        for check in projected_authority_checks(doctor, run)
    ]


def rendered_outputs(doctor, run):
    projection = doctor.project_result(run.result)
    return (
        repr(run),
        repr(run.result),
        json.dumps(projection, sort_keys=True),
        doctor.render_json(run.result),
        doctor.render_human(run.result),
    )


def test_authority_checks_complete_the_frozen_twelve_check_order(modules):
    doctor, probes = modules

    assert (
        tuple(definition.id.value for definition in doctor.CHECK_REGISTRY)
        == FINAL_CHECK_IDS
    )
    assert doctor.CheckId.ISOLATION.value == "isolation"
    assert doctor.CheckId.STATE_OWNERSHIP.value == "state-ownership"

    bindings = authority_bindings(probes)
    assert type(bindings) is tuple
    assert tuple(binding.check_id for binding in bindings) == (
        doctor.CheckId.ISOLATION,
        doctor.CheckId.STATE_OWNERSHIP,
    )


def test_authority_capability_statuses_are_exact_closed_enums(modules):
    _doctor, probes = modules

    authority_bindings(probes)
    assert issubclass(probes.IsolationStatus, Enum)
    assert [(status.name, status.value) for status in probes.IsolationStatus] == [
        ("READY", "ready"),
        ("UNAVAILABLE", "unavailable"),
    ]
    assert issubclass(probes.StateOwnershipStatus, Enum)
    assert [(status.name, status.value) for status in probes.StateOwnershipStatus] == [
        ("OWNED", "owned"),
        ("FOREIGN_SECOND_WRITER", "foreign-second-writer"),
        ("STALE", "stale"),
        ("OPAQUE", "opaque"),
    ]


def test_authority_registry_has_only_the_closed_static_outcomes(modules):
    doctor, _probes = modules
    definitions = {definition.id: definition for definition in doctor.CHECK_REGISTRY}

    isolation = definitions[doctor.CheckId.ISOLATION]
    assert [
        (outcome.probe_status, outcome.code, outcome.result_status)
        for outcome in isolation.outcomes
    ] == [
        (doctor.ProbeStatus.PASS, "ISOLATION_READY", doctor.ResultStatus.PASS),
        (
            doctor.ProbeStatus.FAIL,
            "ISOLATION_UNAVAILABLE",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "ISOLATION_PROBE_ERROR",
            doctor.ResultStatus.FAIL,
        ),
    ]
    assert isolation.exception_code == "ISOLATION_PROBE_ERROR"
    assert {outcome.remediation.anchor for outcome in isolation.outcomes} == {
        "isolation"
    }

    ownership = definitions[doctor.CheckId.STATE_OWNERSHIP]
    assert [
        (outcome.probe_status, outcome.code, outcome.result_status)
        for outcome in ownership.outcomes
    ] == [
        (
            doctor.ProbeStatus.PASS,
            "STATE_OWNERSHIP_OWNED",
            doctor.ResultStatus.PASS,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "STATE_OWNERSHIP_CONFLICT",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "STATE_OWNERSHIP_STALE",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "STATE_OWNERSHIP_UNVERIFIABLE",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "STATE_OWNERSHIP_PROBE_ERROR",
            doctor.ResultStatus.FAIL,
        ),
    ]
    assert ownership.exception_code == "STATE_OWNERSHIP_PROBE_ERROR"
    assert {outcome.remediation.anchor for outcome in ownership.outcomes} == {
        "state-ownership"
    }


def test_authority_schema_closes_order_codes_and_remediation_anchors():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    checks = schema["properties"]["checks"]

    assert checks["minItems"] == 12
    assert checks["maxItems"] == 12
    assert [item["$ref"] for item in checks["prefixItems"]] == [
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
    assert schema["$defs"]["remediation"]["properties"]["anchor"]["enum"] == [
        "bootstrap",
        "coordination",
        "isolation",
        "provider-login",
        "state-ownership",
        "synthetic-input",
    ]
    assert (
        schema["$defs"]["isolationRemediation"]["allOf"][1]["properties"]["anchor"][
            "const"
        ]
        == "isolation"
    )
    assert (
        schema["$defs"]["stateOwnershipRemediation"]["allOf"][1]["properties"][
            "anchor"
        ]["const"]
        == "state-ownership"
    )

    isolation = schema["$defs"]["isolationCheck"]
    assert isolation["allOf"][1]["properties"]["id"]["const"] == "isolation"
    assert isolation["allOf"][1]["properties"]["remediation"]["$ref"] == (
        "#/$defs/isolationRemediation"
    )
    assert [
        (
            outcome["properties"]["status"]["const"],
            outcome["properties"]["code"]["const"],
        )
        for outcome in isolation["allOf"][2]["oneOf"]
    ] == [
        ("pass", "ISOLATION_READY"),
        ("fail", "ISOLATION_UNAVAILABLE"),
        ("fail", "ISOLATION_PROBE_ERROR"),
    ]

    ownership = schema["$defs"]["stateOwnershipCheck"]
    assert ownership["allOf"][1]["properties"]["id"]["const"] == ("state-ownership")
    assert ownership["allOf"][1]["properties"]["remediation"]["$ref"] == (
        "#/$defs/stateOwnershipRemediation"
    )
    assert [
        (
            outcome["properties"]["status"]["const"],
            outcome["properties"]["code"]["const"],
        )
        for outcome in ownership["allOf"][2]["oneOf"]
    ] == [
        ("pass", "STATE_OWNERSHIP_OWNED"),
        ("fail", "STATE_OWNERSHIP_CONFLICT"),
        ("fail", "STATE_OWNERSHIP_STALE"),
        ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
        ("fail", "STATE_OWNERSHIP_PROBE_ERROR"),
    ]
    Draft202012Validator.check_schema(schema)


def test_absent_d_owned_capability_is_visibly_non_green_and_schema_valid(modules):
    doctor, probes = modules
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    bindings = authority_bindings(probes)
    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (*passing_prefix_bindings(doctor), *bindings),
    )
    projection = doctor.project_result(run.result)

    assert projected_status_codes(doctor, run) == [
        ("fail", "ISOLATION_UNAVAILABLE"),
        ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
    ]
    assert [
        check["remediation"] for check in projected_authority_checks(doctor, run)
    ] == [
        {"doc": "docs/doctor.md", "anchor": "isolation"},
        {"doc": "docs/doctor.md", "anchor": "state-ownership"},
    ]
    assert run.exit_code == 1
    assert run.result.status is doctor.ResultStatus.FAIL
    Draft202012Validator(schema).validate(projection)


@pytest.mark.parametrize(
    (
        "isolation_status",
        "ownership_status",
        "expected",
        "expected_exit",
    ),
    (
        (
            "READY",
            "OWNED",
            [
                ("pass", "ISOLATION_READY"),
                ("pass", "STATE_OWNERSHIP_OWNED"),
            ],
            0,
        ),
        (
            "READY",
            "FOREIGN_SECOND_WRITER",
            [
                ("pass", "ISOLATION_READY"),
                ("fail", "STATE_OWNERSHIP_CONFLICT"),
            ],
            1,
        ),
        (
            "READY",
            "STALE",
            [
                ("pass", "ISOLATION_READY"),
                ("fail", "STATE_OWNERSHIP_STALE"),
            ],
            1,
        ),
        (
            "UNAVAILABLE",
            "OPAQUE",
            [
                ("fail", "ISOLATION_UNAVAILABLE"),
                ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
            ],
            1,
        ),
    ),
)
def test_trusted_capability_runs_once_and_maps_only_closed_statuses(
    modules,
    isolation_status,
    ownership_status,
    expected,
    expected_exit,
):
    doctor, probes = modules
    calls = []

    def capability():
        calls.append("authority")
        return (
            getattr(probes.IsolationStatus, isolation_status),
            getattr(probes.StateOwnershipStatus, ownership_status),
        )

    bindings = authority_bindings(probes, capability)
    assert calls == []

    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (*passing_prefix_bindings(doctor), *bindings),
    )

    assert calls == ["authority"]
    assert projected_status_codes(doctor, run) == expected
    assert run.exit_code == expected_exit


def unsafe_capability_result(case, doctor):
    if case == "caller-booleans":
        return True, True
    if case == "status-strings":
        return "ready", "owned"
    if case == "issued-observations":
        return (
            doctor.ProbeObservation(doctor.ProbeStatus.PASS, "CONFIG_VALID"),
            doctor.ProbeObservation(doctor.ProbeStatus.PASS, "RUNTIME_SUPPORTED"),
        )
    if case == "host-derived-dict":
        return {
            "isolated": True,
            "owned": True,
            "callerAssertion": CALLER_CANARY,
            "permissions": PERMISSIONS_CANARY,
            "uid": UID_CANARY,
            "gid": GID_CANARY,
            "directoryOwner": OWNER_CANARY,
            "mode": MODE_CANARY,
            "environment": ENVIRONMENT_CANARY,
            "path": PATH_CANARY,
            "pid": PID_CANARY,
            "pidFile": PATH_CANARY,
            "lock": LOCK_CANARY,
        }
    return object()


@pytest.mark.parametrize(
    "case",
    (
        "caller-booleans",
        "status-strings",
        "issued-observations",
        "host-derived-dict",
        "arbitrary-object",
    ),
)
def test_host_heuristics_and_caller_assertions_cannot_synthesize_pass(
    modules,
    case,
):
    doctor, probes = modules
    calls = []
    unsafe_result = unsafe_capability_result(case, doctor)

    def capability():
        calls.append("authority")
        return unsafe_result

    run = run_authority_checks(doctor, probes, capability)

    assert calls == ["authority"]
    assert projected_status_codes(doctor, run) == [
        ("fail", "ISOLATION_UNAVAILABLE"),
        ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
    ]
    assert run.exit_code == 1
    fallback = run_authority_checks(doctor, probes)
    assert doctor.render_json(run.result) == doctor.render_json(fallback.result)
    assert doctor.render_human(run.result) == doctor.render_human(fallback.result)
    for canary in RAW_CANARIES:
        assert all(canary not in output for output in rendered_outputs(doctor, run))


def test_opaque_capability_value_is_not_inspected_or_rendered(modules):
    doctor, probes = modules
    hostile_calls = []

    class OpaqueValue:
        def __getattribute__(self, name):
            if name != "__class__":
                hostile_calls.append(name)
            return object.__getattribute__(self, name)

        def __iter__(self):
            hostile_calls.append("iter")
            raise RuntimeError(EXCEPTION_CANARY)

        def __bool__(self):
            hostile_calls.append("bool")
            raise RuntimeError(ENVIRONMENT_CANARY)

        def __repr__(self):
            hostile_calls.append("repr")
            return PATH_CANARY

        def __str__(self):
            hostile_calls.append("str")
            return LOCK_CANARY

    opaque = OpaqueValue()
    run = run_authority_checks(doctor, probes, lambda: opaque)

    assert hostile_calls == []
    assert projected_status_codes(doctor, run) == [
        ("fail", "ISOLATION_UNAVAILABLE"),
        ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
    ]
    for canary in RAW_CANARIES:
        assert all(canary not in output for output in rendered_outputs(doctor, run))


@pytest.mark.parametrize("candidate", (None, True, "owned", object()))
def test_noncallable_capability_values_fail_closed(modules, candidate):
    doctor, probes = modules

    run = run_authority_checks(doctor, probes, candidate)

    assert projected_status_codes(doctor, run) == [
        ("fail", "ISOLATION_UNAVAILABLE"),
        ("fail", "STATE_OWNERSHIP_UNVERIFIABLE"),
    ]


def test_authority_capability_exception_maps_both_static_probe_errors(modules):
    doctor, probes = modules
    calls = []

    class SensitiveCapabilityError(RuntimeError):
        def __str__(self):
            return " | ".join(RAW_CANARIES)

        def __repr__(self):
            return f"SensitiveCapabilityError({' | '.join(RAW_CANARIES)})"

    def capability():
        calls.append("authority")
        try:
            raise ValueError(ENVIRONMENT_CANARY)
        except ValueError as cause:
            raise SensitiveCapabilityError() from cause

    run = run_authority_checks(doctor, probes, capability)

    assert calls == ["authority"]
    assert projected_status_codes(doctor, run) == [
        ("fail", "ISOLATION_PROBE_ERROR"),
        ("fail", "STATE_OWNERSHIP_PROBE_ERROR"),
    ]
    assert run.exit_code == 1
    for canary in RAW_CANARIES:
        assert all(canary not in output for output in rendered_outputs(doctor, run))


@pytest.mark.parametrize("signal_type", (KeyboardInterrupt, SystemExit, GeneratorExit))
def test_authority_capability_base_exceptions_propagate_unchanged(
    modules,
    signal_type,
):
    doctor, probes = modules
    signal = signal_type()
    calls = []

    def capability():
        calls.append("authority")
        raise signal

    with pytest.raises(signal_type) as caught:
        run_authority_checks(doctor, probes, capability)

    assert caught.value is signal
    assert calls == ["authority"]
