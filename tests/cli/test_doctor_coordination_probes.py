from __future__ import annotations

import importlib
import json

import pytest

PREFIX_CHECK_COUNT = 8
COORDINATION_CHECK_COUNT = 2
READY_MATCH = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_MATCH",
}
UNAVAILABLE = {
    "coordination": "COORDINATION_UNAVAILABLE",
    "coordinationScope": "COORDINATION_SCOPE_PROBE_ERROR",
}
PROBE_ERROR = {
    "coordination": "COORDINATION_PROBE_ERROR",
    "coordinationScope": "COORDINATION_SCOPE_PROBE_ERROR",
}
READY_MISMATCH = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_MISMATCH",
}
READY_SCOPE_ERROR = {
    "coordination": "COORDINATION_READY",
    "coordinationScope": "COORDINATION_SCOPE_PROBE_ERROR",
}

RAW_CANARIES = (
    "redis://doctor:credential@coordination.invalid:6379/9",
    "private:doctor:coord:v1",
    "project:doctor-private-scope",
    "tok_live_COORDINATION_CREDENTIAL_CANARY",
    "/home/coordination-owner/.config/private",
    "raw coordination diagnostic canary",
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


def coordination_bindings(probes, snapshot):
    assert hasattr(
        probes,
        "create_coordination_bindings",
    ), "the Python Doctor coordination snapshot mapper is absent"
    return probes.create_coordination_bindings(snapshot)


def passing_trailing_bindings(doctor):
    bindings = []
    for definition in doctor.CHECK_REGISTRY[
        PREFIX_CHECK_COUNT + COORDINATION_CHECK_COUNT :
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
        bindings.append(
            doctor.ProbeBinding(
                definition.id,
                lambda observation=observation: observation,
            )
        )
    return tuple(bindings)


def run_coordination_checks(doctor, probes, snapshot):
    return doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (
            *passing_prefix_bindings(doctor),
            *coordination_bindings(probes, snapshot),
            *passing_trailing_bindings(doctor),
        ),
    )


def projected_coordination_checks(doctor, run):
    return doctor.project_result(run.result)["checks"][
        PREFIX_CHECK_COUNT : PREFIX_CHECK_COUNT + COORDINATION_CHECK_COUNT
    ]


def test_coordination_checks_extend_the_frozen_registry_in_exact_order(modules):
    doctor, probes = modules

    assert tuple(definition.id.value for definition in doctor.CHECK_REGISTRY) == (
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
        "isolation",
        "state-ownership",
    )
    assert doctor.CheckId.COORDINATION.value == "coordination"
    assert doctor.CheckId.COORDINATION_SCOPE.value == "coordination-scope"

    bindings = coordination_bindings(probes, READY_MATCH)
    assert type(bindings) is tuple
    assert tuple(binding.check_id for binding in bindings) == (
        doctor.CheckId.COORDINATION,
        doctor.CheckId.COORDINATION_SCOPE,
    )


def test_coordination_registry_has_only_the_closed_static_outcomes(modules):
    doctor, _probes = modules
    definitions = {
        definition.id: definition
        for definition in doctor.CHECK_REGISTRY[
            PREFIX_CHECK_COUNT : PREFIX_CHECK_COUNT + COORDINATION_CHECK_COUNT
        ]
    }

    assert [
        (outcome.probe_status, outcome.code, outcome.result_status)
        for outcome in definitions[doctor.CheckId.COORDINATION].outcomes
    ] == [
        (doctor.ProbeStatus.PASS, "COORDINATION_READY", doctor.ResultStatus.PASS),
        (
            doctor.ProbeStatus.FAIL,
            "COORDINATION_UNAVAILABLE",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "COORDINATION_PROBE_ERROR",
            doctor.ResultStatus.FAIL,
        ),
    ]
    assert definitions[doctor.CheckId.COORDINATION].exception_code == (
        "COORDINATION_PROBE_ERROR"
    )
    assert [
        (outcome.probe_status, outcome.code, outcome.result_status)
        for outcome in definitions[doctor.CheckId.COORDINATION_SCOPE].outcomes
    ] == [
        (
            doctor.ProbeStatus.PASS,
            "COORDINATION_SCOPE_MATCH",
            doctor.ResultStatus.PASS,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "COORDINATION_SCOPE_MISMATCH",
            doctor.ResultStatus.FAIL,
        ),
        (
            doctor.ProbeStatus.FAIL,
            "COORDINATION_SCOPE_PROBE_ERROR",
            doctor.ResultStatus.FAIL,
        ),
    ]
    assert definitions[doctor.CheckId.COORDINATION_SCOPE].exception_code == (
        "COORDINATION_SCOPE_PROBE_ERROR"
    )


def test_one_ready_snapshot_maps_both_checks_deterministically(modules):
    doctor, probes = modules

    first = run_coordination_checks(doctor, probes, READY_MATCH)
    second = run_coordination_checks(doctor, probes, READY_MATCH)
    projected = projected_coordination_checks(doctor, first)

    assert first.exit_code == 0
    assert first.result.status is doctor.ResultStatus.PASS
    assert projected == [
        {
            "id": "coordination",
            "status": "pass",
            "code": "COORDINATION_READY",
            "summary": "Coordination is ready.",
            "remediation": {
                "doc": "docs/doctor.md",
                "anchor": "coordination",
            },
        },
        {
            "id": "coordination-scope",
            "status": "pass",
            "code": "COORDINATION_SCOPE_MATCH",
            "summary": "Coordination uses the configured canonical scope.",
            "remediation": {
                "doc": "docs/doctor.md",
                "anchor": "coordination",
            },
        },
    ]
    assert doctor.render_json(first.result) == doctor.render_json(second.result)
    assert doctor.render_human(first.result) == doctor.render_human(second.result)


@pytest.mark.parametrize(
    ("snapshot", "expected", "expected_exit"),
    (
        (
            UNAVAILABLE,
            [
                ("coordination", "fail", "COORDINATION_UNAVAILABLE"),
                (
                    "coordination-scope",
                    "fail",
                    "COORDINATION_SCOPE_PROBE_ERROR",
                ),
            ],
            1,
        ),
        (
            PROBE_ERROR,
            [
                ("coordination", "fail", "COORDINATION_PROBE_ERROR"),
                (
                    "coordination-scope",
                    "fail",
                    "COORDINATION_SCOPE_PROBE_ERROR",
                ),
            ],
            1,
        ),
        (
            READY_MISMATCH,
            [
                ("coordination", "pass", "COORDINATION_READY"),
                (
                    "coordination-scope",
                    "fail",
                    "COORDINATION_SCOPE_MISMATCH",
                ),
            ],
            1,
        ),
        (
            READY_SCOPE_ERROR,
            [
                ("coordination", "pass", "COORDINATION_READY"),
                (
                    "coordination-scope",
                    "fail",
                    "COORDINATION_SCOPE_PROBE_ERROR",
                ),
            ],
            1,
        ),
    ),
)
def test_closed_snapshot_codes_have_deterministic_failures_and_exit_behavior(
    modules,
    snapshot,
    expected,
    expected_exit,
):
    doctor, probes = modules

    run = run_coordination_checks(doctor, probes, snapshot)
    checks = projected_coordination_checks(doctor, run)

    assert [
        (check["id"], check["status"], check["code"]) for check in checks
    ] == expected
    assert run.exit_code == expected_exit
    assert all(
        check["remediation"] == {"doc": "docs/doctor.md", "anchor": "coordination"}
        for check in checks
    )


@pytest.mark.parametrize(
    "invalid_snapshot",
    (
        None,
        [],
        {},
        {"coordination": "COORDINATION_READY"},
        {
            "coordination": "COORDINATION_READY",
            "coordinationScope": "COORDINATION_SCOPE_MATCH",
            "rawConfig": RAW_CANARIES[3],
        },
        {
            "coordination": "COORDINATION_UNKNOWN",
            "coordinationScope": "COORDINATION_SCOPE_MATCH",
        },
        {
            "coordination": "COORDINATION_UNAVAILABLE",
            "coordinationScope": "COORDINATION_SCOPE_MATCH",
        },
        {
            "coordination": "COORDINATION_PROBE_ERROR",
            "coordinationScope": "COORDINATION_SCOPE_MISMATCH",
        },
    ),
)
def test_invalid_snapshots_map_to_both_static_probe_errors(
    modules,
    invalid_snapshot,
):
    doctor, probes = modules

    run = run_coordination_checks(doctor, probes, invalid_snapshot)

    assert [
        (check["status"], check["code"])
        for check in projected_coordination_checks(doctor, run)
    ] == [
        ("fail", "COORDINATION_PROBE_ERROR"),
        ("fail", "COORDINATION_SCOPE_PROBE_ERROR"),
    ]
    assert run.exit_code == 1


def test_snapshot_is_captured_once_and_detached_before_either_probe_runs(modules):
    doctor, probes = modules
    source = dict(READY_MATCH)

    bindings = coordination_bindings(probes, source)
    source.clear()
    source.update(
        {
            "coordination": RAW_CANARIES[3],
            "coordinationScope": RAW_CANARIES[4],
            "error": RAW_CANARIES[5],
        }
    )
    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        (
            *passing_prefix_bindings(doctor),
            *bindings,
            *passing_trailing_bindings(doctor),
        ),
    )

    assert [check["code"] for check in projected_coordination_checks(doctor, run)] == [
        "COORDINATION_READY",
        "COORDINATION_SCOPE_MATCH",
    ]


def test_hostile_snapshot_values_are_not_coerced_or_leaked(modules):
    doctor, probes = modules
    hostile_calls = []

    class HostileValue:
        def __getattribute__(self, name):
            if name != "__class__":
                hostile_calls.append(name)
            return object.__getattribute__(self, name)

        def __eq__(self, other):
            hostile_calls.append(("eq", other))
            raise RuntimeError(RAW_CANARIES[5])

        def __hash__(self):
            hostile_calls.append("hash")
            raise RuntimeError(RAW_CANARIES[3])

        def __repr__(self):
            hostile_calls.append("repr")
            return RAW_CANARIES[4]

        def __str__(self):
            hostile_calls.append("str")
            return RAW_CANARIES[5]

    snapshot = {
        "coordination": HostileValue(),
        "coordinationScope": HostileValue(),
    }

    run = run_coordination_checks(doctor, probes, snapshot)
    projection = doctor.project_result(run.result)
    outputs = (
        repr(run),
        repr(run.result),
        json.dumps(projection, sort_keys=True),
        doctor.render_json(run.result),
        doctor.render_human(run.result),
    )

    assert hostile_calls == []
    assert [check["code"] for check in projected_coordination_checks(doctor, run)] == [
        "COORDINATION_PROBE_ERROR",
        "COORDINATION_SCOPE_PROBE_ERROR",
    ]
    for canary in RAW_CANARIES:
        assert all(canary not in output for output in outputs)


@pytest.mark.parametrize("binding_index", (0, 1))
def test_coordination_probe_base_exceptions_propagate_unchanged(
    modules,
    binding_index,
):
    doctor, probes = modules
    bindings = list(coordination_bindings(probes, READY_MATCH))
    signal = KeyboardInterrupt()

    def interrupt():
        raise signal

    bindings[binding_index] = doctor.ProbeBinding(
        bindings[binding_index].check_id,
        interrupt,
    )

    with pytest.raises(KeyboardInterrupt) as caught:
        doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            (
                *passing_prefix_bindings(doctor),
                *bindings,
                *passing_trailing_bindings(doctor),
            ),
        )

    assert caught.value is signal
