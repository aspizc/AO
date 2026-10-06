from __future__ import annotations

import gc
import importlib
import inspect
import json
import threading
import types
import weakref
from copy import deepcopy
from dataclasses import FrozenInstanceError
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO / "schemas" / "doctor-result-v1.schema.json"
THREAD_TIMEOUT_SECONDS = 2.0


def load_doctor():
    module = importlib.import_module("agents_cli.doctor")
    return importlib.reload(module)


def make_observations(doctor, overrides=None):
    selected = dict(overrides or {})
    observations = {}
    for definition in doctor.CHECK_REGISTRY:
        if definition.id in selected:
            observations[definition.id] = selected[definition.id]
            continue
        passing = next(
            outcome
            for outcome in definition.outcomes
            if outcome.result_status is doctor.ResultStatus.PASS
        )
        observations[definition.id] = doctor.ProbeObservation(
            status=passing.probe_status,
            code=passing.code,
        )
    return observations


def make_bindings(doctor, observations):
    bindings = []
    for definition in doctor.CHECK_REGISTRY:
        observation = observations[definition.id]

        def probe(observation=observation):
            return observation

        bindings.append(doctor.ProbeBinding(definition.id, probe))
    return tuple(bindings)


def run_with(doctor, overrides=None):
    observations = make_observations(doctor, overrides)
    return doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        make_bindings(doctor, observations),
    )


def forge_exact(dto_type, **fields):
    forged = object.__new__(dto_type)
    for field_name, value in fields.items():
        object.__setattr__(forged, field_name, value)
    return forged


def clone_remediation(doctor, source):
    return doctor.Remediation(
        doc=source.doc,
        anchor=source.anchor,
    )


def clone_outcome(doctor, source):
    return doctor.OutcomeDefinition(
        probe_status=source.probe_status,
        code=source.code,
        result_status=source.result_status,
        summary=source.summary,
        remediation=clone_remediation(doctor, source.remediation),
    )


def clone_definition(doctor, source):
    return doctor.CheckDefinition(
        id=source.id,
        outcomes=tuple(clone_outcome(doctor, outcome) for outcome in source.outcomes),
        exception_code=source.exception_code,
    )


DTO_FIELD_NAMES = {
    "Remediation": ("doc", "anchor"),
    "OutcomeDefinition": (
        "probe_status",
        "code",
        "result_status",
        "summary",
        "remediation",
    ),
    "CheckDefinition": ("id", "outcomes", "exception_code"),
    "ProbeObservation": ("status", "code"),
    "ProbeBinding": ("check_id", "probe"),
    "DoctorCheck": ("id", "status", "code", "summary", "remediation"),
    "DoctorResult": ("schema_version", "profile_id", "status", "checks"),
    "DoctorRun": ("result", "exit_code"),
}


def make_dto_samples(doctor):
    observations = make_observations(doctor)
    bindings = make_bindings(doctor, observations)
    run = doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)
    definition = doctor.CHECK_REGISTRY[0]
    outcome = definition.outcomes[0]
    return (
        {
            "Remediation": outcome.remediation,
            "OutcomeDefinition": outcome,
            "CheckDefinition": definition,
            "ProbeObservation": observations[doctor.CheckId.CONFIG],
            "ProbeBinding": bindings[0],
            "DoctorCheck": run.result.checks[0],
            "DoctorResult": run.result,
            "DoctorRun": run,
        },
        bindings,
        run,
    )


def make_collectible_dto_samples(doctor):
    observations = make_observations(doctor)
    bindings = make_bindings(doctor, observations)
    run = doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)
    source_definition = doctor.CHECK_REGISTRY[0]
    source_outcome = source_definition.outcomes[0]
    return {
        "Remediation": clone_remediation(doctor, source_outcome.remediation),
        "OutcomeDefinition": clone_outcome(doctor, source_outcome),
        "CheckDefinition": clone_definition(doctor, source_definition),
        "ProbeObservation": observations[doctor.CheckId.CONFIG],
        "ProbeBinding": bindings[0],
        "DoctorCheck": run.result.checks[0],
        "DoctorResult": run.result,
        "DoctorRun": run,
    }


def dto_fields(dto_name, sample):
    return {
        field_name: object.__getattribute__(sample, field_name)
        for field_name in DTO_FIELD_NAMES[dto_name]
    }


def make_hostile_subclass(doctor, dto_name, callbacks):
    dto_type = getattr(doctor, dto_name)

    class LeftDTO:
        def __init_subclass__(cls, **kwargs):
            callbacks.append("left-dto-init-subclass")

    class LeftMeta(type):
        def __init_subclass__(cls, **kwargs):
            callbacks.append("left-meta-init-subclass")

    class BypassMeta(LeftMeta, doctor._OpaqueDTOType):
        def __new__(mcls, name, bases, namespace, **kwargs):
            return type.__new__(mcls, name, bases, namespace, **kwargs)

    def hostile_getattribute(self, name):
        callbacks.append(("getattribute", name))
        return object.__getattribute__(self, name)

    return BypassMeta(
        f"Adversarial{dto_name}",
        (LeftDTO, dto_type),
        {"__getattribute__": hostile_getattribute},
    )


def present_dto_candidate(doctor, dto_name, candidate, bindings, run):
    if dto_name == "Remediation":
        doctor.OutcomeDefinition(
            probe_status=doctor.ProbeStatus.PASS,
            code="CONFIG_VALID",
            result_status=doctor.ResultStatus.PASS,
            summary="Configuration paths are valid.",
            remediation=candidate,
        )
    elif dto_name == "OutcomeDefinition":
        definition = doctor.CHECK_REGISTRY[0]
        doctor.CheckDefinition(
            id=doctor.CheckId.CONFIG,
            outcomes=(candidate, *definition.outcomes[1:]),
            exception_code="CONFIG_PROBE_ERROR",
        )
    elif dto_name == "CheckDefinition":
        if candidate is not doctor.CHECK_REGISTRY[0]:
            doctor.CHECK_REGISTRY = (candidate, *doctor.CHECK_REGISTRY[1:])
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)
    elif dto_name == "ProbeObservation":
        candidate_bindings = list(bindings)
        candidate_bindings[0] = doctor.ProbeBinding(
            doctor.CheckId.CONFIG,
            lambda: candidate,
        )
        doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            tuple(candidate_bindings),
        )
    elif dto_name == "ProbeBinding":
        candidate_bindings = (candidate, *bindings[1:])
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, candidate_bindings)
    elif dto_name == "DoctorCheck":
        doctor.DoctorResult(
            schema_version=run.result.schema_version,
            profile_id=run.result.profile_id,
            status=run.result.status,
            checks=(candidate, *run.result.checks[1:]),
        )
    elif dto_name == "DoctorResult":
        doctor.DoctorRun(result=candidate, exit_code=run.exit_code)
    else:
        doctor._validate_doctor_run(candidate)


def different_value(doctor, field_value):
    if type(field_value) is str:
        return f"{field_value}-drift"
    if type(field_value) is int:
        return 1 if field_value == 0 else 0
    if type(field_value) is tuple:
        return (*field_value,)
    if type(field_value) in {
        doctor.CheckId,
        doctor.ProbeStatus,
        doctor.ResultStatus,
    }:
        return next(item for item in type(field_value) if item is not field_value)
    if type(field_value) is doctor.DoctorResult:
        return run_with(doctor).result
    if callable(field_value):
        return lambda: None
    raise AssertionError(f"unsupported field value type: {type(field_value)!r}")


class HostilePrimitive:
    def __init__(self, calls, canary):
        self._calls = calls
        self._canary = canary

    def __bool__(self):
        self._calls.append("bool")
        return True

    def __eq__(self, other):
        self._calls.append("eq")
        return True

    def __hash__(self):
        self._calls.append("hash")
        return 0

    def __str__(self):
        self._calls.append("str")
        return self._canary

    def __repr__(self):
        self._calls.append("repr")
        return self._canary


def assert_safe_contract_error(doctor, error, canary):
    assert type(error) is doctor.DoctorContractError
    assert error.exit_code == 2
    assert error.code == "DOCTOR_CONTRACT_INVALID"
    assert str(error) == "doctor contract validation failed"
    assert error.__cause__ is None
    assert error.__context__ is None
    assert canary not in str(error)
    assert canary not in repr(error)


def test_closed_result_schema_exists():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    assert schema["$id"].endswith("/doctor-result-v1.schema.json")
    assert schema["additionalProperties"] is False
    Draft202012Validator.check_schema(schema)


def test_doctor_module_exists():
    doctor = load_doctor()

    assert doctor.SCHEMA_VERSION == "doctor-result/v1"
    assert doctor.CANONICAL_PROFILE_ID == "canonical-orchestrator"


def test_registry_is_closed_immutable_and_canonically_ordered():
    doctor = load_doctor()

    assert isinstance(doctor.CHECK_REGISTRY, tuple)
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

    all_pairs = []
    for definition in doctor.CHECK_REGISTRY:
        assert isinstance(definition.outcomes, tuple)
        assert definition.exception_code in {
            outcome.code for outcome in definition.outcomes
        }
        all_pairs.extend(
            (definition.id, outcome.probe_status, outcome.code)
            for outcome in definition.outcomes
        )
        with pytest.raises(FrozenInstanceError):
            definition.id = doctor.CheckId.RUNTIME

    assert len(all_pairs) == len(set(all_pairs))


@pytest.mark.parametrize(
    ("dto_name", "field_names"),
    [
        ("Remediation", ("doc", "anchor")),
        (
            "OutcomeDefinition",
            ("probe_status", "code", "result_status", "summary", "remediation"),
        ),
        ("CheckDefinition", ("id", "outcomes", "exception_code")),
        ("ProbeObservation", ("status", "code")),
        ("ProbeBinding", ("check_id", "probe")),
        (
            "DoctorCheck",
            ("id", "status", "code", "summary", "remediation"),
        ),
        (
            "DoctorResult",
            ("schema_version", "profile_id", "status", "checks"),
        ),
        ("DoctorRun", ("result", "exit_code")),
    ],
)
def test_public_dto_observables_are_opaque_and_never_traverse_fields(
    dto_name,
    field_names,
):
    doctor = load_doctor()
    canary = "tok-live-public-dto-observable-canary"
    hostile_calls = []
    dto_type = getattr(doctor, dto_name)
    first = forge_exact(
        dto_type,
        **{
            field_name: HostilePrimitive(hostile_calls, canary)
            for field_name in field_names
        },
    )
    second = forge_exact(
        dto_type,
        **{
            field_name: HostilePrimitive(hostile_calls, canary)
            for field_name in field_names
        },
    )

    first_repr = repr(first)
    first_str = str(first)
    first_hash = hash(first)
    first_alias = first

    assert first_repr == f"<{dto_name} opaque>"
    assert first_str == first_repr
    assert hash(first) == first_hash
    assert first == first_alias
    assert first != second
    assert canary not in first_repr
    assert canary not in first_str
    assert hostile_calls == []


def test_valid_probe_binding_observables_never_traverse_or_invoke_callable():
    doctor = load_doctor()
    canary = "tok-live-valid-probe-binding-observable-canary"
    probe_calls = []

    class ObservableProbe:
        def __call__(self):
            probe_calls.append("call")
            return doctor.ProbeObservation(
                doctor.ProbeStatus.PASS,
                "CONFIG_VALID",
            )

        def __repr__(self):
            probe_calls.append("repr")
            return canary

        def __str__(self):
            probe_calls.append("str")
            return canary

        def __hash__(self):
            probe_calls.append("hash")
            return 0

        def __eq__(self, other):
            probe_calls.append("eq")
            return True

    probe = ObservableProbe()
    first = doctor.ProbeBinding(doctor.CheckId.CONFIG, probe)
    second = doctor.ProbeBinding(doctor.CheckId.CONFIG, probe)
    first_alias = first

    assert repr(first) == "<ProbeBinding opaque>"
    assert str(first) == "<ProbeBinding opaque>"
    assert isinstance(hash(first), int)
    assert first == first_alias
    assert first != second
    assert canary not in repr(first)
    assert probe_calls == []


def test_runtime_subclass_finality_is_not_the_admission_boundary():
    doctor = load_doctor()
    callbacks = []

    class LeftBase:
        def __init_subclass__(cls, **kwargs):
            callbacks.append("left-init-subclass")

    class LeftMeta(type):
        def __init_subclass__(cls, **kwargs):
            callbacks.append("left-meta-init-subclass")

    class BypassMeta(LeftMeta, doctor._OpaqueDTOType):
        def __new__(mcls, name, bases, namespace, **kwargs):
            return type.__new__(mcls, name, bases, namespace, **kwargs)

    class RemediationSubclass(
        LeftBase,
        doctor.Remediation,
        metaclass=BypassMeta,
    ):
        pass

    hostile = object.__new__(RemediationSubclass)
    object.__setattr__(hostile, "doc", "docs/doctor.md")
    object.__setattr__(hostile, "anchor", "synthetic-input")
    callbacks.clear()

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.OutcomeDefinition(
            probe_status=doctor.ProbeStatus.PASS,
            code="CONFIG_VALID",
            result_status=doctor.ResultStatus.PASS,
            summary="Configuration paths are valid.",
            remediation=hostile,
        )

    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-runtime-subclass-finality-is-not-authority",
    )
    assert callbacks == []


@pytest.mark.parametrize("container_kind", ["list", "tuple_subclass", "generator"])
def test_run_doctor_rejects_non_exact_binding_containers_without_iteration_or_probes(
    container_kind,
):
    doctor = load_doctor()
    bindings = make_bindings(doctor, make_observations(doctor))
    callbacks = []

    if container_kind == "list":
        candidate = list(bindings)
    elif container_kind == "tuple_subclass":

        class HostileTuple(tuple):
            def __iter__(self):
                callbacks.append("iter")
                return super().__iter__()

        candidate = HostileTuple(bindings)
    else:

        def hostile_generator():
            callbacks.append("iter")
            yield from bindings

        candidate = hostile_generator()

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, candidate)

    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-non-exact-binding-container",
    )
    assert callbacks == []


def test_run_doctor_requires_every_exact_binding_to_be_module_issued_before_probes():
    doctor = load_doctor()
    bindings = list(make_bindings(doctor, make_observations(doctor)))
    probe_calls = []

    def should_not_run():
        probe_calls.append("probe")
        return doctor.ProbeObservation(
            doctor.ProbeStatus.PASS,
            "RUNTIME_SUPPORTED",
        )

    bindings[-1] = forge_exact(
        doctor.ProbeBinding,
        check_id=doctor.CheckId.RUNTIME,
        probe=should_not_run,
    )

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, tuple(bindings))

    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-unissued-binding",
    )
    assert probe_calls == []


@pytest.mark.parametrize("observation_kind", ["unissued", "same_value_mutation"])
def test_probe_observation_requires_issued_unchanged_provenance_before_lookup(
    observation_kind,
):
    doctor = load_doctor()
    observation = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    if observation_kind == "unissued":
        observation = forge_exact(
            doctor.ProbeObservation,
            status=observation.status,
            code=observation.code,
        )
    else:
        object.__setattr__(observation, "code", observation.code)

    bindings = list(make_bindings(doctor, make_observations(doctor)))
    probe_calls = []

    def return_candidate():
        probe_calls.append("probe")
        return observation

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, return_candidate)

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, tuple(bindings))

    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-invalid-observation-provenance",
    )
    assert probe_calls == ["probe"]


def test_run_doctor_uses_complete_safe_binding_snapshot_after_first_probe():
    doctor = load_doctor()
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))
    calls = []
    assert len(bindings) == 12
    original_last_probe = bindings[-1].probe

    def replacement_probe():
        calls.append("replacement")
        raise AssertionError("later binding was reread after snapshot")

    def recorded_last_probe():
        calls.append("twelfth")
        return original_last_probe()

    last_binding = doctor.ProbeBinding(
        bindings[-1].check_id,
        recorded_last_probe,
    )

    def first_probe():
        calls.append("first")
        object.__setattr__(last_binding, "probe", replacement_probe)
        return observations[doctor.CheckId.CONFIG]

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, first_probe)
    bindings[-1] = last_binding

    run = doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, tuple(bindings))

    assert run.exit_code == 0
    assert calls == ["first", "twelfth"]


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
@pytest.mark.parametrize(
    "attack_kind",
    ["subclass", "unissued", "missing_slot", "hostile_field", "cycle"],
)
def test_every_dto_admission_rejects_nonissued_or_invalid_graphs_without_callbacks(
    dto_name,
    attack_kind,
):
    doctor = load_doctor()
    samples, bindings, run = make_dto_samples(doctor)
    sample = samples[dto_name]
    dto_type = getattr(doctor, dto_name)
    fields = dto_fields(dto_name, sample)
    callbacks = []
    canary = f"tok-{dto_name}-{attack_kind}-admission-canary"

    if attack_kind == "subclass":
        candidate_type = make_hostile_subclass(doctor, dto_name, callbacks)
        candidate = forge_exact(candidate_type, **fields)
    elif attack_kind == "missing_slot":
        fields.pop(DTO_FIELD_NAMES[dto_name][0])
        candidate = forge_exact(dto_type, **fields)
    else:
        candidate = forge_exact(dto_type, **fields)
        if attack_kind == "hostile_field":
            object.__setattr__(
                candidate,
                DTO_FIELD_NAMES[dto_name][0],
                HostilePrimitive(callbacks, canary),
            )
        elif attack_kind == "cycle":
            object.__setattr__(
                candidate,
                DTO_FIELD_NAMES[dto_name][0],
                candidate,
            )

    callbacks.clear()
    with pytest.raises(doctor.DoctorContractError) as caught:
        present_dto_candidate(
            doctor,
            dto_name,
            candidate,
            bindings,
            run,
        )

    assert_safe_contract_error(doctor, caught.value, canary)
    assert callbacks == []


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
@pytest.mark.parametrize(
    "mutation_kind",
    ["same_value", "different_value", "hostile_value"],
)
def test_every_issued_dto_rejects_all_post_construction_mutation(
    dto_name,
    mutation_kind,
):
    doctor = load_doctor()
    samples, bindings, run = make_dto_samples(doctor)
    candidate = samples[dto_name]
    field_name = DTO_FIELD_NAMES[dto_name][0]
    original = object.__getattribute__(candidate, field_name)
    callbacks = []
    canary = f"tok-{dto_name}-{mutation_kind}-mutation-canary"

    if mutation_kind == "same_value":
        replacement = original
    elif mutation_kind == "different_value":
        replacement = different_value(doctor, original)
    else:
        replacement = HostilePrimitive(callbacks, canary)
    object.__setattr__(candidate, field_name, replacement)

    with pytest.raises(doctor.DoctorContractError) as caught:
        present_dto_candidate(
            doctor,
            dto_name,
            candidate,
            bindings,
            run,
        )

    assert_safe_contract_error(doctor, caught.value, canary)
    assert callbacks == []


def publicly_exposed_raw_slot(dto_type, field_name):
    installed = type.__getattribute__(dto_type, "__dict__")[field_name]
    raw_accessor = getattr(installed, "_storage", None)
    if raw_accessor is None:
        return None
    try:
        raw_slot = raw_accessor()
    except (AttributeError, TypeError):
        return None
    if not isinstance(raw_slot, types.MemberDescriptorType):
        return None
    return raw_slot


def descriptor_supported_surface_values(descriptor):
    values = []
    descriptor_dict = getattr(descriptor, "__dict__", None)
    if type(descriptor_dict) is dict:
        values.extend(descriptor_dict.values())

    seen_slots = set()
    for descriptor_type in type(descriptor).__mro__:
        namespace = type.__getattribute__(descriptor_type, "__dict__")
        slots = namespace.get("__slots__", ())
        if type(slots) is str:
            slots = (slots,)
        for slot_name in slots:
            if slot_name in {"__dict__", "__weakref__"} or slot_name in seen_slots:
                continue
            seen_slots.add(slot_name)
            try:
                values.append(object.__getattribute__(descriptor, slot_name))
            except AttributeError:
                pass

        for namespace_value in namespace.values():
            if isinstance(namespace_value, (classmethod, staticmethod)):
                namespace_value = namespace_value.__func__
            if not inspect.isfunction(namespace_value):
                continue
            values.extend(namespace_value.__defaults__ or ())
            values.extend((namespace_value.__kwdefaults__ or {}).values())
            for cell in namespace_value.__closure__ or ():
                try:
                    values.append(cell.cell_contents)
                except ValueError:
                    pass

    for attribute_name in dir(descriptor):
        if attribute_name.startswith("__") and attribute_name.endswith("__"):
            continue
        try:
            observable = getattr(descriptor, attribute_name)
        except AttributeError:
            continue
        values.append(observable)
        if not callable(observable):
            continue
        try:
            inspect.signature(observable).bind()
        except (TypeError, ValueError):
            continue
        try:
            returned = observable()
        except (AttributeError, KeyError, TypeError):
            continue
        values.append(returned)
    return tuple(values)


def raw_member_descriptors(values):
    discovered = []
    pending = list(values)
    seen = set()
    while pending:
        value = pending.pop()
        if isinstance(value, types.MemberDescriptorType):
            discovered.append(value)
            continue
        value_id = id(value)
        if value_id in seen:
            continue
        seen.add(value_id)
        if type(value) in {tuple, list, set, frozenset}:
            pending.extend(value)
        elif type(value) is dict or isinstance(value, types.MappingProxyType):
            pending.extend(value.keys())
            pending.extend(value.values())
    return tuple(discovered)


def issue_record_values(record):
    values = []
    if type(record) is tuple:
        values.extend(record)

    record_dict = getattr(record, "__dict__", None)
    if type(record_dict) is dict:
        values.extend(record_dict.values())

    seen_slots = set()
    for record_type in type(record).__mro__:
        namespace = type.__getattribute__(record_type, "__dict__")
        slots = namespace.get("__slots__", ())
        if type(slots) is str:
            slots = (slots,)
        for slot_name in slots:
            if slot_name in {"__dict__", "__weakref__"} or slot_name in seen_slots:
                continue
            seen_slots.add(slot_name)
            try:
                values.append(object.__getattribute__(record, slot_name))
            except AttributeError:
                pass
    return tuple(values)


def issue_record_reference(record):
    references = tuple(
        value
        for value in issue_record_values(record)
        if isinstance(value, weakref.ReferenceType)
    )
    assert len(references) == 1
    return references[0]


def make_discarded_run_references(doctor, *, include_dtos):
    probe_calls = []

    class ReclaimableProbe:
        __slots__ = ("__weakref__", "observation")

        def __init__(self, observation):
            self.observation = observation

        def __call__(self):
            probe_calls.append(self.observation.code)
            return self.observation

    observations = []
    capabilities = []
    bindings = []
    for definition in doctor.CHECK_REGISTRY:
        passing = next(
            outcome
            for outcome in definition.outcomes
            if outcome.result_status is doctor.ResultStatus.PASS
        )
        observation = doctor.ProbeObservation(
            passing.probe_status,
            passing.code,
        )
        capability = ReclaimableProbe(observation)
        observations.append(observation)
        capabilities.append(capability)
        bindings.append(doctor.ProbeBinding(definition.id, capability))

    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        tuple(bindings),
    )
    assert probe_calls == [observation.code for observation in observations]
    capability_references = tuple(weakref.ref(value) for value in capabilities)
    dto_references = ()
    if include_dtos:
        dto_graph = (
            *observations,
            *bindings,
            *run.result.checks,
            *(check.remediation for check in run.result.checks),
            run.result,
            run,
        )
        dto_references = tuple(weakref.ref(value) for value in dto_graph)
    return capability_references, dto_references


def invoke_result_boundary(doctor, boundary_name, run):
    if boundary_name == "doctor_run_constructor":
        return doctor.DoctorRun(
            result=run.result,
            exit_code=run.exit_code,
        )
    if boundary_name == "doctor_run_validator":
        return doctor._validate_doctor_run(run)
    return getattr(doctor, boundary_name)(run.result)


def captured_profile_id(boundary_name, boundary_value):
    if boundary_name == "project_result":
        return boundary_value["profileId"]
    if boundary_name == "render_json":
        return json.loads(boundary_value)["profileId"]
    if boundary_name == "render_human":
        heading = boundary_value.splitlines()[0]
        return heading.removeprefix("Doctor ").split(":", maxsplit=1)[0]
    if boundary_name == "doctor_run_validator":
        return boundary_value[1][1]
    return None


def publicly_discovered_issue_reference(value):
    references = tuple(
        reference
        for reference in weakref.getweakrefs(value)
        if reference.__callback__ is not None
    )
    assert len(references) == 1
    return references[0]


def probe_weakref_authority_edits(reference):
    missing = object()
    original_key = getattr(reference, "key", missing)
    key_writable = False
    key_deletable = False

    try:
        reference.key = 0
    except (AttributeError, TypeError):
        pass
    else:
        key_writable = True
    finally:
        if original_key is not missing:
            reference.key = original_key

    try:
        delattr(reference, "key")
    except (AttributeError, TypeError):
        pass
    else:
        key_deletable = True
    finally:
        if original_key is not missing:
            reference.key = original_key

    return key_writable, key_deletable


def mutate_standard_callback_state(callback, retained):
    mutations = []
    for index, cell in enumerate(getattr(callback, "__closure__", ()) or ()):
        try:
            cell.cell_contents = retained
        except (AttributeError, TypeError, ValueError):
            pass
        else:
            mutations.append(f"closure[{index}]")

    for attribute_name, replacement in (
        ("__defaults__", (retained,)),
        ("__kwdefaults__", {"retained": retained}),
        ("retained", retained),
    ):
        try:
            setattr(callback, attribute_name, replacement)
        except (AttributeError, TypeError):
            pass
        else:
            mutations.append(attribute_name)

    namespace = getattr(callback, "__dict__", None)
    if type(namespace) is dict:
        try:
            namespace["retained_via_dict"] = retained
        except (AttributeError, TypeError):
            pass
        else:
            mutations.append("__dict__")

    return tuple(mutations)


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
@pytest.mark.parametrize(
    "mutation_kind",
    ["same_value", "different_then_restore"],
)
def test_every_dto_rejects_public_raw_descriptor_writes_permanently(
    dto_name,
    mutation_kind,
):
    doctor = load_doctor()
    samples, bindings, run = make_dto_samples(doctor)
    candidate = samples[dto_name]
    field_name = DTO_FIELD_NAMES[dto_name][0]
    raw_slot = publicly_exposed_raw_slot(
        getattr(doctor, dto_name),
        field_name,
    )
    if raw_slot is None:
        return

    callbacks = []
    canary = f"tok-{dto_name}-{mutation_kind}-raw-slot-canary"
    original = object.__getattribute__(candidate, field_name)
    if mutation_kind == "same_value":
        raw_slot.__set__(candidate, original)
    else:
        raw_slot.__set__(candidate, HostilePrimitive(callbacks, canary))
        raw_slot.__set__(candidate, original)

    try:
        present_dto_candidate(
            doctor,
            dto_name,
            candidate,
            bindings,
            run,
        )
    except doctor.DoctorContractError as error:
        assert_safe_contract_error(doctor, error, canary)
    else:
        record = doctor._ISSUANCE_LEDGER[id(candidate)]
        pytest.fail(
            "public raw member_descriptor write was admitted "
            f"with tainted={record.tainted!r}"
        )
    assert callbacks == []


@pytest.mark.parametrize(
    ("dto_name", "field_name"),
    [
        (dto_name, field_name)
        for dto_name, field_names in DTO_FIELD_NAMES.items()
        for field_name in field_names
    ],
)
def test_tracked_descriptors_expose_no_raw_storage_on_supported_surface(
    dto_name,
    field_name,
):
    doctor = load_doctor()
    dto_type = getattr(doctor, dto_name)
    installed = type.__getattribute__(dto_type, "__dict__")[field_name]

    exposed = raw_member_descriptors(descriptor_supported_surface_values(installed))

    assert exposed == ()


@pytest.mark.parametrize(
    "dto_name",
    ["Remediation", "OutcomeDefinition", "CheckDefinition"],
)
@pytest.mark.parametrize(
    "mutation_kind",
    ["same_value", "different_then_restore"],
)
def test_registry_rejects_nested_public_raw_descriptor_writes_permanently(
    dto_name,
    mutation_kind,
):
    doctor = load_doctor()
    definition = doctor.CHECK_REGISTRY[0]
    outcome = definition.outcomes[0]
    samples = {
        "Remediation": outcome.remediation,
        "OutcomeDefinition": outcome,
        "CheckDefinition": definition,
    }
    candidate = samples[dto_name]
    field_name = DTO_FIELD_NAMES[dto_name][0]
    raw_slot = publicly_exposed_raw_slot(
        getattr(doctor, dto_name),
        field_name,
    )
    if raw_slot is None:
        return

    callbacks = []
    canary = f"tok-registry-{dto_name}-{mutation_kind}-raw-slot-canary"
    original = object.__getattribute__(candidate, field_name)
    if mutation_kind == "same_value":
        raw_slot.__set__(candidate, original)
    else:
        raw_slot.__set__(candidate, HostilePrimitive(callbacks, canary))
        raw_slot.__set__(candidate, original)

    bindings = make_bindings(doctor, make_observations(doctor))
    try:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)
    except doctor.DoctorContractError as error:
        assert_safe_contract_error(doctor, error, canary)
    else:
        record = doctor._ISSUANCE_LEDGER[id(candidate)]
        pytest.fail(
            "registry admitted a public raw member_descriptor write "
            f"with tainted={record.tainted!r}"
        )
    assert callbacks == []


@pytest.mark.parametrize(
    "boundary_name",
    ["validate_result", "project_result", "render_json", "render_human"],
)
@pytest.mark.parametrize(
    "mutation_kind",
    ["same_value", "different_then_restore"],
)
def test_result_boundaries_reject_public_raw_descriptor_writes_permanently(
    boundary_name,
    mutation_kind,
):
    doctor = load_doctor()
    result = run_with(doctor).result
    raw_slot = publicly_exposed_raw_slot(
        doctor.DoctorResult,
        "schema_version",
    )
    if raw_slot is None:
        return

    callbacks = []
    canary = f"tok-{boundary_name}-{mutation_kind}-raw-slot-canary"
    original = result.schema_version
    if mutation_kind == "same_value":
        raw_slot.__set__(result, original)
    else:
        raw_slot.__set__(result, HostilePrimitive(callbacks, canary))
        raw_slot.__set__(result, original)

    boundary = getattr(doctor, boundary_name)
    try:
        boundary(result)
    except doctor.DoctorContractError as error:
        assert_safe_contract_error(doctor, error, canary)
    else:
        record = doctor._ISSUANCE_LEDGER[id(result)]
        pytest.fail(
            "result boundary admitted a public raw member_descriptor write "
            f"with tainted={record.tainted!r}"
        )
    assert callbacks == []


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
def test_every_issuance_record_weakly_tracks_only_its_exact_root(dto_name):
    doctor = load_doctor()
    samples, _, _ = make_dto_samples(doctor)
    candidate = samples[dto_name]
    record = doctor._ISSUANCE_LEDGER[id(candidate)]
    reference = issue_record_reference(record)
    retained_state = tuple(
        retained
        for retained in issue_record_values(record)
        if retained is not reference
    )

    assert reference() is candidate
    assert len(retained_state) == 1
    assert type(retained_state[0]) is bool


def test_discarded_runs_and_probe_capabilities_return_ledger_to_baseline():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)
    capability_references = []

    for _ in range(3):
        references, _ = make_discarded_run_references(
            doctor,
            include_dtos=False,
        )
        capability_references.extend(references)

    gc.collect()
    surviving_capability_count = sum(
        reference() is not None for reference in capability_references
    )
    extra_keys = frozenset(doctor._ISSUANCE_LEDGER).difference(baseline_keys)

    assert (surviving_capability_count, extra_keys) == (0, frozenset())


def test_discarded_run_result_graph_is_weak_referenceable_and_collected():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    capability_references, dto_references = make_discarded_run_references(
        doctor,
        include_dtos=True,
    )
    gc.collect()
    surviving_referent_count = sum(
        reference() is not None
        for reference in (*capability_references, *dto_references)
    )

    assert surviving_referent_count == 0
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys


def test_canonical_ledger_referents_stay_live_at_the_gc_baseline():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)
    baseline_references = tuple(
        issue_record_reference(record) for record in doctor._ISSUANCE_LEDGER.values()
    )

    gc.collect()

    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
    assert all(reference() is not None for reference in baseline_references)


def test_failed_constructor_adds_no_issuance_record_or_callbacks():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)
    callbacks = []
    canary = "tok-failed-constructor-ledger-canary"

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.ProbeObservation(
            HostilePrimitive(callbacks, canary),
            "CONFIG_VALID",
        )

    gc.collect()
    assert_safe_contract_error(doctor, caught.value, canary)
    assert callbacks == []
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys


def test_stale_retirement_callback_cannot_delete_a_replacement_record():
    doctor = load_doctor()
    first = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    replacement = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    first_key = id(first)
    replacement_key = id(replacement)
    first_record = doctor._ISSUANCE_LEDGER[first_key]
    replacement_record = doctor._ISSUANCE_LEDGER[replacement_key]
    stale_reference = issue_record_reference(first_record)
    replacement_reference = issue_record_reference(replacement_record)
    retirement_callback = stale_reference.__callback__

    assert stale_reference is not replacement_reference
    assert callable(retirement_callback)
    doctor._ISSUANCE_LEDGER[first_key] = replacement_record
    try:
        retirement_callback(stale_reference)
        assert doctor._ISSUANCE_LEDGER.get(first_key) is replacement_record
        assert doctor._ISSUANCE_LEDGER.get(replacement_key) is replacement_record
    finally:
        doctor._ISSUANCE_LEDGER[first_key] = first_record


@pytest.mark.parametrize(
    "boundary_name",
    [
        "doctor_run_constructor",
        "doctor_run_validator",
        "validate_result",
        "project_result",
        "render_json",
        "render_human",
    ],
)
def test_result_admission_is_atomic_against_supported_concurrent_mutation(
    monkeypatch,
    boundary_name,
):
    doctor = load_doctor()
    run = run_with(doctor)
    result = run.result
    original_profile_id = result.profile_id
    changed_profile_id = "concurrently-changed"
    admission_passed = threading.Event()
    allow_capture = threading.Event()
    mutation_started = threading.Event()
    mutation_completed = threading.Event()
    boundary_finished = threading.Event()
    boundary_outcome = {}
    mutation_outcome = {}
    original_issue_record = doctor._issue_record
    pause_guard = threading.Lock()
    paused = False

    def issue_then_pause(value, expected_type):
        nonlocal paused
        record = original_issue_record(value, expected_type)
        if value is result:
            with pause_guard:
                should_pause = not paused
                paused = True
            if should_pause:
                admission_passed.set()
                if not allow_capture.wait(THREAD_TIMEOUT_SECONDS):
                    raise AssertionError("result capture was not released")
        return record

    def call_boundary():
        try:
            boundary_outcome["value"] = invoke_result_boundary(
                doctor,
                boundary_name,
                run,
            )
        except (doctor.DoctorContractError, AssertionError) as error:
            boundary_outcome["error"] = error
        finally:
            boundary_finished.set()

    def mutate_result():
        mutation_started.set()
        try:
            object.__setattr__(result, "profile_id", changed_profile_id)
        except (AttributeError, TypeError, RuntimeError) as error:
            mutation_outcome["error"] = error
        finally:
            mutation_completed.set()

    monkeypatch.setattr(doctor, "_issue_record", issue_then_pause)
    boundary_thread = threading.Thread(target=call_boundary)
    boundary_thread.start()
    assert admission_passed.wait(THREAD_TIMEOUT_SECONDS)

    mutation_thread = threading.Thread(target=mutate_result)
    mutation_thread.start()
    assert mutation_started.wait(THREAD_TIMEOUT_SECONDS)
    mutation_landed_during_pause = mutation_completed.wait(THREAD_TIMEOUT_SECONDS)
    allow_capture.set()

    boundary_thread.join(THREAD_TIMEOUT_SECONDS)
    mutation_thread.join(THREAD_TIMEOUT_SECONDS)
    assert not boundary_thread.is_alive()
    assert not mutation_thread.is_alive()
    assert boundary_finished.is_set()
    assert "error" not in mutation_outcome
    assert result.profile_id == changed_profile_id
    assert doctor._ISSUANCE_LEDGER[id(result)].tainted is True

    boundary_error = boundary_outcome.get("error")
    if mutation_landed_during_pause:
        assert type(boundary_error) is doctor.DoctorContractError
        assert_safe_contract_error(
            doctor,
            boundary_error,
            "tok-concurrent-result-capture",
        )
    else:
        assert boundary_error is None
        captured = captured_profile_id(
            boundary_name,
            boundary_outcome.get("value"),
        )
        if captured is not None:
            assert captured == original_profile_id

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.validate_result(result)
    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-post-concurrent-result-capture",
    )


def test_binding_capture_never_invokes_a_concurrently_replaced_capability(
    monkeypatch,
):
    doctor = load_doctor()
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))
    original_calls = []
    injected_calls = []
    admission_passed = threading.Event()
    allow_capture = threading.Event()
    mutation_started = threading.Event()
    mutation_completed = threading.Event()
    boundary_outcome = {}
    original_issue_record = doctor._issue_record
    paused = False

    def original_probe():
        if not mutation_completed.wait(THREAD_TIMEOUT_SECONDS):
            raise AssertionError("capture lock remained held during probe invocation")
        original_calls.append("original")
        return observations[doctor.CheckId.CONFIG]

    def injected_probe():
        injected_calls.append("injected")
        return observations[doctor.CheckId.CONFIG]

    target_binding = doctor.ProbeBinding(
        doctor.CheckId.CONFIG,
        original_probe,
    )
    bindings[0] = target_binding
    exact_bindings = tuple(bindings)

    def issue_then_pause(value, expected_type):
        nonlocal paused
        record = original_issue_record(value, expected_type)
        if value is target_binding and not paused:
            paused = True
            admission_passed.set()
            if not allow_capture.wait(THREAD_TIMEOUT_SECONDS):
                raise AssertionError("binding capture was not released")
        return record

    def run_boundary():
        try:
            boundary_outcome["run"] = doctor.run_doctor(
                doctor.CANONICAL_PROFILE_ID,
                exact_bindings,
            )
        except (doctor.DoctorContractError, AssertionError) as error:
            boundary_outcome["error"] = error

    def replace_capability():
        mutation_started.set()
        object.__setattr__(target_binding, "probe", injected_probe)
        mutation_completed.set()

    monkeypatch.setattr(doctor, "_issue_record", issue_then_pause)
    boundary_thread = threading.Thread(target=run_boundary)
    boundary_thread.start()
    assert admission_passed.wait(THREAD_TIMEOUT_SECONDS)

    mutation_thread = threading.Thread(target=replace_capability)
    mutation_thread.start()
    assert mutation_started.wait(THREAD_TIMEOUT_SECONDS)
    mutation_completed.wait(THREAD_TIMEOUT_SECONDS)
    allow_capture.set()

    boundary_thread.join(THREAD_TIMEOUT_SECONDS)
    mutation_thread.join(THREAD_TIMEOUT_SECONDS)
    assert not boundary_thread.is_alive()
    assert not mutation_thread.is_alive()
    assert mutation_completed.is_set()
    assert injected_calls == []

    boundary_error = boundary_outcome.get("error")
    if boundary_error is not None:
        assert_safe_contract_error(
            doctor,
            boundary_error,
            "tok-concurrent-binding-capture",
        )
        assert original_calls == []
    else:
        assert boundary_outcome["run"].exit_code == 0
        assert original_calls == ["original"]

    call_counts = (len(original_calls), len(injected_calls))
    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, exact_bindings)
    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-post-concurrent-binding-capture",
    )
    assert (len(original_calls), len(injected_calls)) == call_counts


def test_consistency_protocol_is_released_before_intentional_probe_invocation():
    doctor = load_doctor()
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))
    mutable = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    mutation_completed = threading.Event()
    workers = []

    def mutate_from_other_thread():
        object.__setattr__(mutable, "code", mutable.code)
        mutation_completed.set()

    def probe_while_another_thread_mutates():
        worker = threading.Thread(target=mutate_from_other_thread)
        workers.append(worker)
        worker.start()
        if not mutation_completed.wait(THREAD_TIMEOUT_SECONDS):
            raise AssertionError(
                "admission consistency protocol leaked into probe call"
            )
        return observations[doctor.CheckId.CONFIG]

    bindings[0] = doctor.ProbeBinding(
        doctor.CheckId.CONFIG,
        probe_while_another_thread_mutates,
    )
    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        tuple(bindings),
    )
    for worker in workers:
        worker.join(THREAD_TIMEOUT_SECONDS)

    assert run.exit_code == 0
    assert mutation_completed.is_set()
    assert all(not worker.is_alive() for worker in workers)
    assert doctor._ISSUANCE_LEDGER[id(mutable)].tainted is True


@pytest.mark.parametrize("mutation_kind", ["set", "delete"])
def test_descriptor_mutation_releases_previous_probe_before_finalizer_waits(
    mutation_kind,
):
    doctor = load_doctor()
    observations = make_observations(doctor)
    worker_target = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    finalizer_called = threading.Event()
    worker_started = threading.Event()
    worker_completed = threading.Event()
    finalizer_outcome = {}
    worker_threads = []
    probe_calls = []

    class FinalizingProbe:
        def __call__(self):
            probe_calls.append("called")
            return observations[doctor.CheckId.CONFIG]

        def __del__(self):
            finalizer_called.set()

            def mutate_from_worker():
                worker_started.set()
                object.__setattr__(
                    worker_target,
                    "code",
                    worker_target.code,
                )
                worker_completed.set()

            worker = threading.Thread(
                target=mutate_from_worker,
                daemon=True,
            )
            worker_threads.append(worker)
            worker.start()
            finalizer_outcome["completed_while_waiting"] = worker_completed.wait(0.2)

    probe = FinalizingProbe()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, probe)
    del probe

    if mutation_kind == "set":
        object.__setattr__(
            binding,
            "probe",
            lambda: observations[doctor.CheckId.CONFIG],
        )
    else:
        object.__delattr__(binding, "probe")

    assert finalizer_called.wait(THREAD_TIMEOUT_SECONDS)
    assert worker_started.wait(THREAD_TIMEOUT_SECONDS)
    for worker in worker_threads:
        worker.join(THREAD_TIMEOUT_SECONDS)

    assert finalizer_outcome == {"completed_while_waiting": True}
    assert worker_completed.is_set()
    assert all(not worker.is_alive() for worker in worker_threads)
    assert probe_calls == []
    assert doctor._ISSUANCE_LEDGER[id(binding)].tainted is True
    assert doctor._ISSUANCE_LEDGER[id(worker_target)].tainted is True


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
def test_public_weakref_discovery_exposes_no_mutable_retirement_authority(
    dto_name,
):
    doctor = load_doctor()
    candidate = make_collectible_dto_samples(doctor)[dto_name]
    key = id(candidate)
    record = doctor._ISSUANCE_LEDGER[key]
    reference = publicly_discovered_issue_reference(candidate)
    callback = reference.__callback__
    key_writable, key_deletable = probe_weakref_authority_edits(reference)
    closure_values = tuple(
        cell.cell_contents for cell in getattr(callback, "__closure__", ()) or ()
    )

    callback(reference)

    assert type(reference) is weakref.ReferenceType
    assert reference() is candidate
    assert (key_writable, key_deletable) == (False, False)
    assert all(type(value) is int for value in closure_values)
    assert doctor._ISSUANCE_LEDGER.get(key) is record


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
def test_every_discovered_retirement_callback_has_no_writable_standard_state(
    dto_name,
):
    doctor = load_doctor()
    candidate = make_collectible_dto_samples(doctor)[dto_name]
    reference = publicly_discovered_issue_reference(candidate)
    callback = reference.__callback__

    mutations = mutate_standard_callback_state(callback, candidate)

    assert mutations == ()


def test_scalar_callback_rewrite_cannot_leave_a_stale_issuance_record():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    candidate = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    key = id(candidate)
    reference = publicly_discovered_issue_reference(candidate)
    callback = reference.__callback__
    mutations = mutate_standard_callback_state(callback, 0)
    del callback
    del candidate
    gc.collect()

    assert mutations == ()
    assert reference() is None
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
    assert key not in doctor._ISSUANCE_LEDGER


def test_callback_self_cycle_cannot_retain_a_binding_or_probe_capability():
    doctor = load_doctor()
    gc.collect()
    observation = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    class ReclaimableProbe:
        __slots__ = ("__weakref__",)

        def __call__(self):
            return observation

    capability = ReclaimableProbe()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, capability)
    key = id(binding)
    binding_reference = weakref.ref(binding)
    capability_reference = weakref.ref(capability)
    issuance_reference = publicly_discovered_issue_reference(binding)
    callback = issuance_reference.__callback__
    mutations = mutate_standard_callback_state(callback, binding)
    del callback
    del binding
    del capability
    gc.collect()

    assert mutations == ()
    assert binding_reference() is None
    assert capability_reference() is None
    assert issuance_reference() is None
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
    assert key not in doctor._ISSUANCE_LEDGER


@pytest.mark.parametrize(
    "authority_route",
    ["function_dict", "direct_function_attribute"],
)
def test_callback_call_function_state_cannot_retain_binding_and_probe(
    authority_route,
):
    doctor = load_doctor()
    gc.collect()
    observation = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    class ReclaimableProbe:
        __slots__ = ("__weakref__",)

        def __call__(self):
            return observation

    capability = ReclaimableProbe()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, capability)
    key = id(binding)
    binding_reference = weakref.ref(binding)
    capability_reference = weakref.ref(capability)
    issuance_reference = publicly_discovered_issue_reference(binding)
    attribute_name = f"trial11_retained_via_{authority_route}"
    route_writable = False

    callback = issuance_reference.__callback__
    bound_call = callback.__call__
    function = getattr(bound_call, "__func__", None)
    namespace = getattr(function, "__dict__", None)
    try:
        if authority_route == "function_dict" and type(namespace) is dict:
            namespace[attribute_name] = binding
            route_writable = True
        elif authority_route == "direct_function_attribute" and function is not None:
            try:
                setattr(function, attribute_name, binding)
            except (AttributeError, TypeError):
                pass
            else:
                route_writable = True

        del namespace
        del function
        del bound_call
        del callback
        del binding
        del capability
        gc.collect()

        if route_writable:
            assert binding_reference() is not None
            assert capability_reference() is not None
            assert issuance_reference() is binding_reference()
            assert doctor._ISSUANCE_LEDGER.get(key) is not None
        else:
            assert binding_reference() is None
            assert capability_reference() is None
            assert issuance_reference() is None
            assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
            assert key not in doctor._ISSUANCE_LEDGER
    finally:
        cleanup_callback = issuance_reference.__callback__
        cleanup_function = (
            getattr(cleanup_callback.__call__, "__func__", None)
            if cleanup_callback is not None
            else None
        )
        if cleanup_function is not None:
            if authority_route == "function_dict":
                cleanup_function.__dict__.pop(attribute_name, None)
            else:
                try:
                    delattr(cleanup_function, attribute_name)
                except (AttributeError, TypeError):
                    pass
        del cleanup_function
        del cleanup_callback
        gc.collect()

    assert route_writable is False
    assert binding_reference() is None
    assert capability_reference() is None
    assert issuance_reference() is None
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
    assert key not in doctor._ISSUANCE_LEDGER


@pytest.mark.parametrize(
    "lifecycle_route",
    ["issued_binding", "discovered_reference_referent"],
)
@pytest.mark.parametrize(
    "authority_route",
    ["function_dict", "direct_function_attribute"],
)
def test_dto_lifecycle_function_state_cannot_retain_binding_and_probe(
    lifecycle_route,
    authority_route,
):
    doctor = load_doctor()
    gc.collect()
    observation = doctor.ProbeObservation(
        doctor.ProbeStatus.PASS,
        "CONFIG_VALID",
    )
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    class ReclaimableProbe:
        __slots__ = ("__weakref__",)

        def __call__(self):
            return observation

    capability = ReclaimableProbe()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, capability)
    key = id(binding)
    binding_reference = weakref.ref(binding)
    capability_reference = weakref.ref(capability)
    issuance_reference = publicly_discovered_issue_reference(binding)
    lifecycle_owner = (
        binding if lifecycle_route == "issued_binding" else issuance_reference()
    )
    assert lifecycle_owner is binding
    attribute_name = f"trial12_retained_via_{lifecycle_route}_{authority_route}"
    route_writable = False

    lifecycle = getattr(lifecycle_owner, "__del__", None)
    function = getattr(lifecycle, "__func__", None)
    namespace = getattr(function, "__dict__", None)
    try:
        if authority_route == "function_dict" and type(namespace) is dict:
            namespace[attribute_name] = binding
            route_writable = True
        elif authority_route == "direct_function_attribute" and function is not None:
            try:
                setattr(function, attribute_name, binding)
            except (AttributeError, TypeError):
                pass
            else:
                route_writable = True

        del namespace
        del function
        del lifecycle
        del lifecycle_owner
        del binding
        del capability
        gc.collect()

        if route_writable:
            assert binding_reference() is not None
            assert capability_reference() is not None
            assert issuance_reference() is binding_reference()
            assert doctor._ISSUANCE_LEDGER.get(key) is not None
        else:
            assert binding_reference() is None
            assert capability_reference() is None
            assert issuance_reference() is None
            assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
            assert key not in doctor._ISSUANCE_LEDGER
    finally:
        live_binding = issuance_reference()
        cleanup_lifecycle = (
            getattr(live_binding, "__del__", None) if live_binding is not None else None
        )
        cleanup_function = getattr(cleanup_lifecycle, "__func__", None)
        if cleanup_function is not None:
            if authority_route == "function_dict":
                cleanup_function.__dict__.pop(attribute_name, None)
            else:
                try:
                    delattr(cleanup_function, attribute_name)
                except (AttributeError, TypeError):
                    pass
        del cleanup_function
        del cleanup_lifecycle
        del live_binding
        gc.collect()

    assert route_writable is False
    assert binding_reference() is None
    assert capability_reference() is None
    assert issuance_reference() is None
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys
    assert key not in doctor._ISSUANCE_LEDGER


@pytest.mark.parametrize(
    "retirement_surface",
    ["discovered_weakref_callback_call", "dto_del_retirement_hook"],
)
def test_retirement_specific_surfaces_expose_no_python_function_state(
    retirement_surface,
):
    doctor = load_doctor()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, lambda: None)
    reference = publicly_discovered_issue_reference(binding)

    if retirement_surface == "discovered_weakref_callback_call":
        callback_call = reference.__callback__.__call__
        function = getattr(callback_call, "__func__", None)
        assert function is None or not inspect.isfunction(function)
    else:
        # Other Python dunders are the documented D/0/02 reflection boundary.
        assert getattr(binding, "__del__", None) is None


def test_manual_dto_lifecycle_invocation_cannot_remove_live_exact_record():
    doctor = load_doctor()
    binding = doctor.ProbeBinding(doctor.CheckId.CONFIG, lambda: None)
    key = id(binding)
    record = doctor._ISSUANCE_LEDGER[key]
    reference = issue_record_reference(record)
    lifecycle = getattr(binding, "__del__", None)

    if lifecycle is not None:
        lifecycle()

    assert reference() is binding
    assert doctor._ISSUANCE_LEDGER.get(key) is record
    assert issue_record_reference(record) is reference


def test_weakref_authority_attempts_cannot_prevent_bounded_ledger_retirement():
    doctor = load_doctor()
    gc.collect()
    baseline_keys = frozenset(doctor._ISSUANCE_LEDGER)

    def discover_attempt_and_discard():
        samples = make_collectible_dto_samples(doctor)
        references = []
        for candidate in samples.values():
            reference = publicly_discovered_issue_reference(candidate)
            try:
                reference.key = 0
            except (AttributeError, TypeError):
                pass
            references.append(reference)
        return tuple(references)

    references = discover_attempt_and_discard()
    gc.collect()

    assert all(reference() is None for reference in references)
    assert frozenset(doctor._ISSUANCE_LEDGER) == baseline_keys


@pytest.mark.parametrize("dto_name", tuple(DTO_FIELD_NAMES))
def test_every_public_dto_constructor_rejects_hostile_fields_without_callbacks(
    dto_name,
):
    doctor = load_doctor()
    samples, _, _ = make_dto_samples(doctor)
    dto_type = getattr(doctor, dto_name)
    fields = dto_fields(dto_name, samples[dto_name])
    callbacks = []
    canary = f"tok-{dto_name}-constructor-hostile-canary"
    fields[DTO_FIELD_NAMES[dto_name][0]] = HostilePrimitive(callbacks, canary)

    with pytest.raises(doctor.DoctorContractError) as caught:
        dto_type(**fields)

    assert_safe_contract_error(doctor, caught.value, canary)
    assert callbacks == []


@pytest.mark.parametrize(
    ("dto_name", "field_name"),
    [
        ("CheckDefinition", "outcomes"),
        ("DoctorResult", "checks"),
    ],
)
def test_dto_constructors_reject_container_subclasses_without_iteration(
    dto_name,
    field_name,
):
    doctor = load_doctor()
    samples, _, _ = make_dto_samples(doctor)
    dto_type = getattr(doctor, dto_name)
    fields = dto_fields(dto_name, samples[dto_name])
    callbacks = []

    class HostileTuple(tuple):
        def __iter__(self):
            callbacks.append("iter")
            return super().__iter__()

        def __len__(self):
            callbacks.append("len")
            return super().__len__()

        def __bool__(self):
            callbacks.append("bool")
            return True

        def __eq__(self, other):
            callbacks.append("eq")
            return True

        def __hash__(self):
            callbacks.append("hash")
            return 0

    fields[field_name] = HostileTuple(fields[field_name])

    with pytest.raises(doctor.DoctorContractError) as caught:
        dto_type(**fields)

    assert_safe_contract_error(
        doctor,
        caught.value,
        "tok-container-subclass",
    )
    assert callbacks == []


@pytest.mark.parametrize(
    "dto_name",
    [
        "Remediation",
        "OutcomeDefinition",
        "CheckDefinition",
        "ProbeObservation",
        "ProbeBinding",
        "DoctorCheck",
        "DoctorResult",
        "DoctorRun",
    ],
)
def test_public_dto_observable_hooks_cannot_be_reassigned_or_deleted_normally(
    dto_name,
):
    doctor = load_doctor()
    dto_type = getattr(doctor, dto_name)
    hook_calls = []

    def hostile_hook(*args, **kwargs):
        hook_calls.append("called")
        return True

    for hook_name in ("__repr__", "__str__", "__eq__", "__hash__"):
        original = dto_type.__dict__.get(hook_name)
        try:
            with pytest.raises(TypeError):
                setattr(dto_type, hook_name, hostile_hook)
        finally:
            installed = dto_type.__dict__.get(hook_name)
            if installed is hostile_hook:
                if original is None:
                    type.__delattr__(dto_type, hook_name)
                else:
                    type.__setattr__(dto_type, hook_name, original)

        assert getattr(dto_type, hook_name) is not hostile_hook
        if original is not None:
            with pytest.raises(TypeError):
                delattr(dto_type, hook_name)
            assert dto_type.__dict__[hook_name] is original

    assert hook_calls == []


def test_public_registry_reassignment_cannot_reach_probes_or_change_render_inventory(
    monkeypatch,
):
    doctor = load_doctor()
    canonical_run = run_with(doctor)
    canonical_bindings = make_bindings(doctor, make_observations(doctor))
    canary = "tok-live-runtime-registry-reassignment-canary"
    hostile_calls = []
    probe_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    forged_definition = forge_exact(
        doctor.CheckDefinition,
        id=doctor.CheckId.CONFIG,
        outcomes=doctor.CHECK_REGISTRY[0].outcomes,
        exception_code=hostile,
    )

    def should_not_run():
        probe_calls.append("probe")
        raise RuntimeError(canary)

    bindings = (
        doctor.ProbeBinding(doctor.CheckId.CONFIG, should_not_run),
        *canonical_bindings[1:],
    )
    monkeypatch.setattr(doctor, "CHECK_REGISTRY", (forged_definition,))

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)

    assert_safe_contract_error(doctor, caught.value, canary)
    assert probe_calls == []
    assert hostile_calls == []

    for boundary in (
        doctor.validate_result,
        doctor.project_result,
        doctor.render_json,
        doctor.render_human,
    ):
        with pytest.raises(doctor.DoctorContractError) as result_error:
            boundary(canonical_run.result)
        assert_safe_contract_error(doctor, result_error.value, canary)
    assert hostile_calls == []


@pytest.mark.parametrize(
    "replacement_level",
    ["definition", "outcome", "remediation"],
)
def test_structurally_equal_public_registry_replacements_fail_before_fingerprint(
    monkeypatch,
    replacement_level,
):
    doctor = load_doctor()
    canonical_bindings = make_bindings(doctor, make_observations(doctor))
    public_definition = doctor.CHECK_REGISTRY[0]
    public_outcome = public_definition.outcomes[0]
    probe_calls = []
    fingerprint_calls = []
    restorations = []

    def should_not_run():
        probe_calls.append("probe")
        return canonical_bindings[0].probe()

    def should_not_fingerprint(registry):
        fingerprint_calls.append("fingerprint")
        raise AssertionError("identity drift reached primitive fingerprinting")

    bindings = (
        doctor.ProbeBinding(doctor.CheckId.CONFIG, should_not_run),
        *canonical_bindings[1:],
    )

    if replacement_level == "definition":
        replacement = clone_definition(doctor, public_definition)
        monkeypatch.setattr(
            doctor,
            "CHECK_REGISTRY",
            (replacement, *doctor.CHECK_REGISTRY[1:]),
        )
    elif replacement_level == "outcome":
        original = public_definition.outcomes
        replacement = (
            clone_outcome(doctor, public_outcome),
            *public_definition.outcomes[1:],
        )
        object.__setattr__(public_definition, "outcomes", replacement)
        restorations.append((public_definition, "outcomes", original))
    else:
        original = public_outcome.remediation
        replacement = clone_remediation(doctor, public_outcome.remediation)
        object.__setattr__(public_outcome, "remediation", replacement)
        restorations.append((public_outcome, "remediation", original))

    monkeypatch.setattr(doctor, "_registry_fingerprint", should_not_fingerprint)

    try:
        with pytest.raises(doctor.DoctorContractError) as caught:
            doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)

        assert_safe_contract_error(
            doctor,
            caught.value,
            "identity drift reached primitive fingerprinting",
        )
        assert probe_calls == []
        assert fingerprint_calls == []
    finally:
        for target, field_name, original in restorations:
            object.__setattr__(target, field_name, original)


@pytest.mark.parametrize(
    ("target_name", "field_name"),
    [
        ("definition", "exception_code"),
        ("outcome", "summary"),
        ("remediation", "doc"),
    ],
)
def test_public_registry_nested_mutation_cannot_alias_runtime_authority(
    target_name,
    field_name,
):
    doctor = load_doctor()
    canonical_run = run_with(doctor)
    canonical_bindings = make_bindings(doctor, make_observations(doctor))
    public_definition = doctor.CHECK_REGISTRY[0]
    public_outcome = public_definition.outcomes[0]
    public_remediation = public_outcome.remediation
    private_definition = doctor._CANONICAL_CHECK_REGISTRY[0]
    private_outcome = private_definition.outcomes[0]
    private_remediation = private_outcome.remediation
    canary = f"tok-live-public-registry-{target_name}-alias-canary"
    hostile_calls = []
    probe_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    targets = {
        "definition": public_definition,
        "outcome": public_outcome,
        "remediation": public_remediation,
    }
    target = targets[target_name]
    original = getattr(target, field_name)

    def should_not_run():
        probe_calls.append("probe")
        raise RuntimeError(canary)

    bindings = (
        doctor.ProbeBinding(doctor.CheckId.CONFIG, should_not_run),
        *canonical_bindings[1:],
    )

    assert public_definition is not private_definition
    assert public_outcome is not private_outcome
    assert public_remediation is not private_remediation

    try:
        object.__setattr__(target, field_name, hostile)

        with pytest.raises(doctor.DoctorContractError) as caught:
            doctor.run_doctor(doctor.CANONICAL_PROFILE_ID, bindings)

        assert_safe_contract_error(doctor, caught.value, canary)
        assert probe_calls == []
        assert hostile_calls == []
        for boundary in (
            doctor.validate_result,
            doctor.project_result,
            doctor.render_json,
            doctor.render_human,
        ):
            with pytest.raises(doctor.DoctorContractError) as result_error:
                boundary(canonical_run.result)
            assert_safe_contract_error(doctor, result_error.value, canary)
        assert hostile_calls == []
    finally:
        object.__setattr__(target, field_name, original)


def test_post_probe_resolution_failure_discards_ordinary_exception_context(
    monkeypatch,
):
    doctor = load_doctor()
    canary = "tok-live-post-probe-resolution-canary"
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))

    class ProbeFailure(RuntimeError):
        pass

    def failing_probe():
        raise ProbeFailure(canary)

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, failing_probe)
    monkeypatch.setattr(doctor, "_OUTCOME_BY_OBSERVATION", {})

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            tuple(bindings),
        )

    assert_safe_contract_error(doctor, caught.value, canary)


def test_every_public_result_remediation_is_fresh_and_registry_detached():
    doctor = load_doctor()
    canonical_remediations = tuple(
        outcome.remediation
        for definition in doctor._CANONICAL_CHECK_REGISTRY
        for outcome in definition.outcomes
    )
    public_remediations = tuple(
        outcome.remediation
        for definition in doctor.CHECK_REGISTRY
        for outcome in definition.outcomes
    )
    observed_result_remediations = []

    for definition in doctor.CHECK_REGISTRY:
        for outcome in definition.outcomes:
            observation = doctor.ProbeObservation(
                status=outcome.probe_status,
                code=outcome.code,
            )
            run = run_with(doctor, {definition.id: observation})
            result_check = next(
                check for check in run.result.checks if check.id is definition.id
            )
            remediation = result_check.remediation

            assert all(
                remediation is not canonical for canonical in canonical_remediations
            )
            assert all(remediation is not public for public in public_remediations)
            assert all(
                remediation is not prior for prior in observed_result_remediations
            )
            observed_result_remediations.append(remediation)

    assert len(observed_result_remediations) == 61


def test_mutating_prior_run_remediation_cannot_change_canonical_future_outputs():
    doctor = load_doctor()
    first = run_with(doctor)
    original_projection = doctor.project_result(first.result)
    exposed = first.result.checks[0].remediation
    canonical = doctor._CANONICAL_CHECK_REGISTRY[0].outcomes[0].remediation
    original_anchor = exposed.anchor
    prior_result_rejected = False

    assert original_anchor == "synthetic-input"

    try:
        object.__setattr__(exposed, "anchor", "bootstrap")
        try:
            doctor.project_result(first.result)
        except doctor.DoctorContractError as error:
            assert_safe_contract_error(
                doctor,
                error,
                "tok-live-mutated-result-remediation-canary",
            )
            prior_result_rejected = True

        second = run_with(doctor)
        second_projection = doctor.project_result(second.result)
        second_json = json.loads(doctor.render_json(second.result))
        second_human = doctor.render_human(second.result)
    finally:
        object.__setattr__(exposed, "anchor", original_anchor)

    assert exposed is not canonical
    assert prior_result_rejected
    assert second_projection == original_projection
    assert second_json == original_projection
    assert (
        "PASS config CONFIG_VALID - Configuration paths are valid. "
        "[docs/doctor.md#synthetic-input]"
    ) in second_human
    assert canonical.anchor == "synthetic-input"
    assert second.result.checks[0].remediation is not exposed
    assert second.result.checks[0].remediation is not canonical


def test_mutating_public_remediation_invalidates_every_public_boundary():
    doctor = load_doctor()
    first = run_with(doctor)
    public = doctor.CHECK_REGISTRY[0].outcomes[0].remediation
    canonical = doctor._CANONICAL_CHECK_REGISTRY[0].outcomes[0].remediation
    original_anchor = public.anchor
    probe_calls = []
    bindings = list(make_bindings(doctor, make_observations(doctor)))
    original_probe = bindings[0].probe

    def should_not_run():
        probe_calls.append("probe")
        return original_probe()

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, should_not_run)

    try:
        object.__setattr__(public, "anchor", "bootstrap")

        with pytest.raises(doctor.DoctorContractError) as caught:
            doctor.run_doctor(
                doctor.CANONICAL_PROFILE_ID,
                tuple(bindings),
            )

        assert_safe_contract_error(
            doctor,
            caught.value,
            "tok-live-mutated-public-remediation-canary",
        )
        assert probe_calls == []
        for boundary in (
            doctor.validate_result,
            doctor.project_result,
            doctor.render_json,
            doctor.render_human,
        ):
            with pytest.raises(doctor.DoctorContractError) as result_error:
                boundary(first.result)
            assert_safe_contract_error(
                doctor,
                result_error.value,
                "tok-live-mutated-public-remediation-canary",
            )
    finally:
        object.__setattr__(public, "anchor", original_anchor)

    assert canonical.anchor == "synthetic-input"
    assert public is not canonical


@pytest.mark.parametrize(
    "field_name",
    [
        "probe_status",
        "code",
        "result_status",
        "summary",
        "remediation",
    ],
)
def test_outcome_definition_revalidates_every_nested_exact_field_before_use(
    field_name,
):
    doctor = load_doctor()
    source = doctor.CHECK_REGISTRY[0].outcomes[0]
    canary = "tok-live-outcome-definition-hostile-canary"
    hostile_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    fields = {
        "probe_status": source.probe_status,
        "code": source.code,
        "result_status": source.result_status,
        "summary": source.summary,
        "remediation": source.remediation,
    }
    if field_name == "remediation":
        fields[field_name] = forge_exact(
            doctor.Remediation,
            doc=hostile,
            anchor=hostile,
        )
    else:
        fields[field_name] = hostile

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.OutcomeDefinition(**fields)

    assert_safe_contract_error(doctor, caught.value, canary)
    assert hostile_calls == []


@pytest.mark.parametrize(
    "field_name",
    [
        "id",
        "probe_status",
        "code",
        "result_status",
        "summary",
        "remediation",
        "exception_code",
    ],
)
def test_check_definition_revalidates_forged_children_before_hash_or_equality(
    field_name,
):
    doctor = load_doctor()
    source_definition = doctor.CHECK_REGISTRY[0]
    source_outcome = source_definition.outcomes[0]
    canary = "tok-live-check-definition-hostile-canary"
    hostile_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    check_id = source_definition.id
    exception_code = source_definition.exception_code
    outcomes = source_definition.outcomes

    if field_name == "id":
        check_id = hostile
    elif field_name == "exception_code":
        exception_code = hostile
    else:
        outcome_fields = {
            "probe_status": source_outcome.probe_status,
            "code": source_outcome.code,
            "result_status": source_outcome.result_status,
            "summary": source_outcome.summary,
            "remediation": source_outcome.remediation,
        }
        if field_name == "remediation":
            outcome_fields[field_name] = forge_exact(
                doctor.Remediation,
                doc=hostile,
                anchor=hostile,
            )
        else:
            outcome_fields[field_name] = hostile
        forged_outcome = forge_exact(doctor.OutcomeDefinition, **outcome_fields)
        outcomes = (forged_outcome, *source_definition.outcomes[1:])

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.CheckDefinition(
            id=check_id,
            outcomes=outcomes,
            exception_code=exception_code,
        )

    assert_safe_contract_error(doctor, caught.value, canary)
    assert hostile_calls == []


@pytest.mark.parametrize(
    "field_name",
    [
        "id",
        "code",
        "summary",
        "remediation",
        "exception_code",
    ],
)
def test_registry_validation_recurses_before_comparison_or_hash(
    monkeypatch,
    field_name,
):
    doctor = load_doctor()
    source_definition = doctor.CHECK_REGISTRY[0]
    source_outcome = source_definition.outcomes[0]
    canary = "tok-live-registry-validation-hostile-canary"
    hostile_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    definition_fields = {
        "id": source_definition.id,
        "outcomes": source_definition.outcomes,
        "exception_code": source_definition.exception_code,
    }

    if field_name in {"id", "exception_code"}:
        definition_fields[field_name] = hostile
    else:
        outcome_fields = {
            "probe_status": source_outcome.probe_status,
            "code": source_outcome.code,
            "result_status": source_outcome.result_status,
            "summary": source_outcome.summary,
            "remediation": source_outcome.remediation,
        }
        if field_name == "remediation":
            outcome_fields[field_name] = forge_exact(
                doctor.Remediation,
                doc=hostile,
                anchor=hostile,
            )
        else:
            outcome_fields[field_name] = hostile
        forged_outcome = forge_exact(doctor.OutcomeDefinition, **outcome_fields)
        definition_fields["outcomes"] = (
            forged_outcome,
            *source_definition.outcomes[1:],
        )

    forged_definition = forge_exact(
        doctor.CheckDefinition,
        **definition_fields,
    )
    monkeypatch.setattr(
        doctor,
        "CHECK_REGISTRY",
        (forged_definition, *doctor.CHECK_REGISTRY[1:]),
    )

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor._validate_registry()

    assert_safe_contract_error(doctor, caught.value, canary)
    assert hostile_calls == []


def test_all_pass_projection_is_exact_schema_valid_and_deterministic():
    doctor = load_doctor()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    first = run_with(doctor)
    second = run_with(doctor)
    projection = doctor.project_result(first.result)

    assert first.exit_code == 0
    assert first.result.status is doctor.ResultStatus.PASS
    assert tuple(projection) == ("schemaVersion", "profileId", "status", "checks")
    assert projection["schemaVersion"] == "doctor-result/v1"
    assert projection["profileId"] == "canonical-orchestrator"
    assert projection["status"] == "pass"
    assert [check["id"] for check in projection["checks"]] == [
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
    ]
    assert all(
        tuple(check) == ("id", "status", "code", "summary", "remediation")
        and tuple(check["remediation"]) == ("doc", "anchor")
        for check in projection["checks"]
    )
    Draft202012Validator(schema).validate(projection)

    first_json = doctor.render_json(first.result)
    assert first_json == doctor.render_json(second.result)
    assert json.loads(first_json) == projection
    assert "\n" not in first_json

    first_human = doctor.render_human(first.result)
    assert first_human == doctor.render_human(second.result)
    assert first_human.splitlines()[0] == ("Doctor canonical-orchestrator: PASS")
    assert len(first_human.splitlines()) == len(doctor.CHECK_REGISTRY) + 1


def test_selected_safe_profile_id_is_preserved_in_every_result_renderer():
    doctor = load_doctor()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    selected_profile = "portable-review-v2"
    observations = make_observations(doctor)

    run = doctor.run_doctor(
        selected_profile,
        make_bindings(doctor, observations),
    )
    projection = doctor.project_result(run.result)

    assert run.result.profile_id == selected_profile
    assert projection["profileId"] == selected_profile
    assert json.loads(doctor.render_json(run.result))["profileId"] == selected_profile
    assert doctor.render_human(run.result).splitlines()[0] == (
        f"Doctor {selected_profile}: PASS"
    )
    Draft202012Validator(schema).validate(projection)


@pytest.mark.parametrize(
    "profile_id",
    [
        "tok-live-doctor-secret-canary",
        "tok-test-doctor-secret-canary",
        "sk-proj-secret-canary-123",
        "sk-live-secret-canary-123",
        "ghp-doctor-secret-canary",
        "github-pat-doctor-secret-canary",
        "glpat-doctor-secret-canary",
        "xoxb-doctor-secret-canary",
        "xoxp-doctor-secret-canary",
    ],
)
def test_credential_like_profile_ids_fail_before_probes_without_leaks(profile_id):
    doctor = load_doctor()
    observations = make_observations(doctor)
    calls = []
    bindings = []
    for definition in doctor.CHECK_REGISTRY:
        observation = observations[definition.id]

        def probe(observation=observation):
            calls.append("called")
            return observation

        bindings.append(doctor.ProbeBinding(definition.id, probe))

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(profile_id, tuple(bindings))

    error = caught.value
    assert type(error) is doctor.DoctorContractError
    assert error.exit_code == 2
    assert error.code == "DOCTOR_CONTRACT_INVALID"
    assert str(error) == "doctor contract validation failed"
    assert error.__cause__ is None
    assert error.__context__ is None
    assert profile_id not in str(error)
    assert profile_id not in repr(error)
    assert calls == []


def test_profile_id_python_and_schema_contracts_have_absolute_end_parity():
    doctor = load_doctor()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    projection = doctor.project_result(run_with(doctor).result)
    schema_pattern = schema["properties"]["profileId"]["pattern"]

    assert schema_pattern == doctor._PROFILE_ID_PATTERN.pattern
    assert "$" not in schema_pattern
    assert schema_pattern.endswith(r"(?![\s\S])")

    valid_profiles = (
        "a",
        "a0",
        "canonical-orchestrator",
        "portable-review-v2",
        "a" * 64,
    )
    invalid_suffixes = tuple(
        chr(code)
        for code in range(256)
        if chr(code) not in "abcdefghijklmnopqrstuvwxyz0123456789"
    )
    invalid_profiles = (
        "",
        "a" * 65,
        b"portable-review-v2",
        "tok-live-doctor-secret-canary",
        "sk-proj-secret-canary-123",
        "safe-id\r\n",
        "safe-id\u2028",
        "safe-id\u2029",
        "safe-id\U0001f512",
        *(f"safe-id{suffix}" for suffix in invalid_suffixes),
    )

    for profile_id, expected in (
        *((profile_id, True) for profile_id in valid_profiles),
        *((profile_id, False) for profile_id in invalid_profiles),
    ):
        calls = []
        observations = make_observations(doctor)
        bindings = []
        for definition in doctor.CHECK_REGISTRY:
            observation = observations[definition.id]

            def probe(observation=observation, calls=calls):
                calls.append("called")
                return observation

            bindings.append(doctor.ProbeBinding(definition.id, probe))

        try:
            doctor.run_doctor(profile_id, tuple(bindings))
        except doctor.DoctorContractError as error:
            python_accepts = False
            assert type(error) is doctor.DoctorContractError
        else:
            python_accepts = True

        schema_accepts = validator.is_valid({**projection, "profileId": profile_id})
        assert python_accepts is expected, repr(profile_id)
        assert schema_accepts is expected, repr(profile_id)
        assert python_accepts is schema_accepts, repr(profile_id)
        assert len(calls) == (len(doctor.CHECK_REGISTRY) if expected else 0)


@pytest.mark.parametrize(
    "profile_id",
    [
        "",
        "Canonical-Orchestrator",
        "../private-profile",
        "nested/profile",
        "tok_live_PROFILE_SECRET_CANARY",
        "a" * 65,
        "trailing-",
        "double--dash",
    ],
)
def test_unsafe_or_noncanonical_profile_ids_are_safe_exit_two(profile_id):
    doctor = load_doctor()
    observations = make_observations(doctor)

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(
            profile_id,
            make_bindings(doctor, observations),
        )

    assert caught.value.exit_code == 2
    if profile_id:
        assert profile_id not in str(caught.value)
        assert profile_id not in repr(caught.value)


def test_required_failure_is_fail_exit_one_while_warnings_are_exit_zero():
    doctor = load_doctor()

    required_failure = doctor.ProbeObservation(
        status=doctor.ProbeStatus.FAIL,
        code="RUNTIME_UNSUPPORTED",
    )
    failed = run_with(doctor, {doctor.CheckId.RUNTIME: required_failure})

    assert failed.exit_code == 1
    assert failed.result.status is doctor.ResultStatus.FAIL
    assert failed.result.checks[5].status is doctor.ResultStatus.FAIL

    warning = doctor.ProbeObservation(
        status=doctor.ProbeStatus.WARN,
        code="RUNTIME_DEPRECATED",
    )
    warned = run_with(doctor, {doctor.CheckId.RUNTIME: warning})

    assert warned.exit_code == 0
    assert warned.result.status is doctor.ResultStatus.WARN
    assert warned.result.checks[5].status is doctor.ResultStatus.WARN

    optional_failure = doctor.ProbeObservation(
        status=doctor.ProbeStatus.FAIL,
        code="OPTIONAL_DEPENDENCY_MISSING",
    )
    optional = run_with(
        doctor,
        {doctor.CheckId.DEPENDENCY: optional_failure},
    )

    assert optional.exit_code == 0
    assert optional.result.status is doctor.ResultStatus.WARN
    assert optional.result.checks[1].status is doctor.ResultStatus.WARN


@pytest.mark.parametrize(
    "forgery",
    [
        "schema_version",
        "profile_id",
        "status",
        "checks",
        "check",
        "check_status",
        "remediation",
    ],
)
def test_doctor_run_recursively_rejects_exact_forged_results_before_repr(forgery):
    doctor = load_doctor()
    canonical = run_with(doctor).result
    canary = "tok-live-doctor-run-synthetic-canary"
    hostile_calls = []
    hostile = HostilePrimitive(hostile_calls, canary)
    result_fields = {
        "schema_version": canonical.schema_version,
        "profile_id": canonical.profile_id,
        "status": canonical.status,
        "checks": canonical.checks,
    }

    if forgery == "profile_id":
        result_fields["profile_id"] = canary
    elif forgery in {"schema_version", "status", "checks"}:
        result_fields[forgery] = hostile
    elif forgery == "check":
        result_fields["checks"] = (hostile, *canonical.checks[1:])
    else:
        source_check = canonical.checks[0]
        check_fields = {
            "id": source_check.id,
            "status": source_check.status,
            "code": source_check.code,
            "summary": source_check.summary,
            "remediation": source_check.remediation,
        }
        if forgery == "check_status":
            check_fields["status"] = hostile
        else:
            check_fields["remediation"] = forge_exact(
                doctor.Remediation,
                doc=hostile,
                anchor=hostile,
            )
        forged_check = forge_exact(doctor.DoctorCheck, **check_fields)
        result_fields["checks"] = (forged_check, *canonical.checks[1:])

    forged_result = forge_exact(doctor.DoctorResult, **result_fields)

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.DoctorRun(result=forged_result, exit_code=0)

    assert_safe_contract_error(doctor, caught.value, canary)
    assert hostile_calls == []


def test_probe_exceptions_are_replaced_by_static_safe_outcomes():
    doctor = load_doctor()
    canaries = (
        "tok_live_DOCTOR_SECRET_CANARY_7f4980",
        "https://owner:credential-canary@example.invalid/private",
        "doctor-owner-canary",
        "/home/doctor-owner/private/config.json",
        '{"apiKey":"raw-config-secret-canary"}',
        "Traceback /home/doctor-owner/private/probe.py:71",
    )

    class HostileProbeError(RuntimeError):
        def __str__(self):
            return " | ".join(canaries)

        def __repr__(self):
            return f"HostileProbeError({' | '.join(canaries)})"

    def hostile_probe():
        try:
            raise ValueError(canaries[0])
        except ValueError as cause:
            error = HostileProbeError()
            error.raw_config = canaries[4]
            raise error from cause

    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))
    runtime_index = tuple(definition.id for definition in doctor.CHECK_REGISTRY).index(
        doctor.CheckId.RUNTIME
    )
    bindings[runtime_index] = doctor.ProbeBinding(
        doctor.CheckId.RUNTIME,
        hostile_probe,
    )

    run = doctor.run_doctor(
        doctor.CANONICAL_PROFILE_ID,
        tuple(bindings),
    )
    projection = doctor.project_result(run.result)
    outputs = (
        repr(run.result),
        json.dumps(projection),
        doctor.render_json(run.result),
        doctor.render_human(run.result),
    )

    assert run.exit_code == 1
    assert projection["checks"][5] == {
        "id": "runtime",
        "status": "fail",
        "code": "RUNTIME_PROBE_ERROR",
        "summary": "The runtime check could not be completed safely.",
        "remediation": {
            "doc": "docs/doctor.md",
            "anchor": "bootstrap",
        },
    }
    for canary in canaries:
        assert all(canary not in output for output in outputs)


@pytest.mark.parametrize(
    "signal_type",
    [KeyboardInterrupt, SystemExit, GeneratorExit],
)
def test_probe_control_flow_signals_are_not_converted_to_doctor_results(signal_type):
    doctor = load_doctor()
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))

    def signal_probe(signal_type=signal_type):
        raise signal_type()

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, signal_probe)

    with pytest.raises(signal_type):
        doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            tuple(bindings),
        )


def test_hostile_binding_iterable_errors_are_rebuilt_without_chain_or_payload():
    doctor = load_doctor()
    canaries = (
        "tok-live-hostile-error-canary",
        "/home/doctor-owner/private/bindings",
        '{"apiKey":"hostile-binding-secret-canary"}',
    )

    class HostileBindingError(RuntimeError):
        def __str__(self):
            return " | ".join(canaries)

        def __repr__(self):
            return f"HostileBindingError({' | '.join(canaries)})"

    class HostileContractError(doctor.DoctorContractError):
        def __str__(self):
            return " | ".join(canaries)

        def __repr__(self):
            return f"HostileContractError({' | '.join(canaries)})"

    for error_type in (HostileBindingError, HostileContractError):

        def hostile_bindings(error_type=error_type):
            try:
                raise ValueError(canaries[1])
            except ValueError as cause:
                error = error_type()
                error.raw_config = canaries[2]
                raise error from cause
            yield

        with pytest.raises(doctor.DoctorContractError) as caught:
            doctor.run_doctor(
                doctor.CANONICAL_PROFILE_ID,
                hostile_bindings(),
            )

        error = caught.value
        assert type(error) is doctor.DoctorContractError
        assert error.exit_code == 2
        assert error.code == "DOCTOR_CONTRACT_INVALID"
        assert str(error) == "doctor contract validation failed"
        assert error.__cause__ is None
        assert error.__context__ is None
        assert not hasattr(error, "raw_config")
        for canary in canaries:
            assert canary not in str(error)
            assert canary not in repr(error)


@pytest.mark.parametrize(
    "bad_probe_result",
    [
        {
            "status": "pass",
            "code": "CONFIG_VALID",
            "rawConfig": "raw-config-secret-canary",
        },
        {"status": "unknown", "code": "CONFIG_VALID"},
        {"status": "pass", "code": "UNKNOWN_SECRET_CODE"},
    ],
)
def test_unknown_probe_fields_statuses_and_codes_fail_closed_without_leaks(
    bad_probe_result,
):
    doctor = load_doctor()
    observations = make_observations(doctor)
    bindings = list(make_bindings(doctor, observations))
    canary = json.dumps(bad_probe_result, sort_keys=True)

    def invalid_probe():
        return bad_probe_result

    bindings[0] = doctor.ProbeBinding(doctor.CheckId.CONFIG, invalid_probe)

    with pytest.raises(doctor.DoctorContractError) as caught:
        doctor.run_doctor(
            doctor.CANONICAL_PROFILE_ID,
            tuple(bindings),
        )

    error = caught.value
    assert error.exit_code == 2
    assert error.code == "DOCTOR_CONTRACT_INVALID"
    assert str(error) == "doctor contract validation failed"
    assert canary not in str(error)
    assert "raw-config-secret-canary" not in repr(error)
    assert "UNKNOWN_SECRET_CODE" not in repr(error)


def test_invalid_profile_duplicate_missing_and_noncanonical_bindings_are_exit_two():
    doctor = load_doctor()
    observations = make_observations(doctor)
    canonical = make_bindings(doctor, observations)
    canary_profile = "/home/doctor-owner/tok_profile_secret"

    invalid_cases = (
        (canary_profile, canonical),
        (doctor.CANONICAL_PROFILE_ID, canonical[:-1]),
        (
            doctor.CANONICAL_PROFILE_ID,
            canonical[:-1] + (canonical[-2],),
        ),
        (doctor.CANONICAL_PROFILE_ID, tuple(reversed(canonical))),
    )
    for profile_id, bindings in invalid_cases:
        calls = []

        def should_not_run(calls=calls):
            calls.append("called")
            return doctor.ProbeObservation(
                doctor.ProbeStatus.PASS,
                "CONFIG_VALID",
            )

        if bindings:
            bindings = (
                doctor.ProbeBinding(bindings[0].check_id, should_not_run),
                *bindings[1:],
            )
        with pytest.raises(doctor.DoctorContractError) as caught:
            doctor.run_doctor(profile_id, bindings)

        assert caught.value.exit_code == 2
        assert str(caught.value) == "doctor contract validation failed"
        assert canary_profile not in repr(caught.value)
        assert calls == []


def test_renderers_reject_untyped_or_noncanonical_values_without_emitting_them():
    doctor = load_doctor()
    run = run_with(doctor)
    canary = "tok_renderer_secret_canary"
    forged = doctor.project_result(run.result)
    forged["checks"][0]["message"] = canary

    for renderer in (doctor.project_result, doctor.render_json, doctor.render_human):
        with pytest.raises(doctor.DoctorContractError) as caught:
            renderer(forged)
        assert caught.value.exit_code == 2
        assert canary not in str(caught.value)
        assert canary not in repr(caught.value)


@pytest.mark.parametrize(
    "hostile_fields",
    [
        ("doc", "anchor"),
        ("doc",),
        ("anchor",),
    ],
)
def test_public_result_boundaries_reject_exact_forged_nested_remediation(
    hostile_fields,
):
    doctor = load_doctor()
    canonical = run_with(doctor).result
    canary = "tok-live-forged-remediation-secret-canary"
    hostile_calls = []

    class HostileEqual:
        def __eq__(self, other):
            hostile_calls.append(("eq", other))
            return True

        def __hash__(self):
            hostile_calls.append(("hash", None))
            return 0

        def __str__(self):
            hostile_calls.append(("str", None))
            return canary

        def __repr__(self):
            hostile_calls.append(("repr", None))
            return canary

    remediation = object.__new__(doctor.Remediation)
    object.__setattr__(
        remediation,
        "doc",
        HostileEqual() if "doc" in hostile_fields else "docs/doctor.md",
    )
    object.__setattr__(
        remediation,
        "anchor",
        HostileEqual() if "anchor" in hostile_fields else "synthetic-input",
    )

    source_check = canonical.checks[0]
    forged_check = object.__new__(doctor.DoctorCheck)
    for field_name in ("id", "status", "code", "summary"):
        object.__setattr__(
            forged_check,
            field_name,
            getattr(source_check, field_name),
        )
    object.__setattr__(forged_check, "remediation", remediation)

    forged_result = object.__new__(doctor.DoctorResult)
    object.__setattr__(
        forged_result,
        "schema_version",
        canonical.schema_version,
    )
    object.__setattr__(forged_result, "profile_id", canonical.profile_id)
    object.__setattr__(forged_result, "status", canonical.status)
    object.__setattr__(
        forged_result,
        "checks",
        (forged_check, *canonical.checks[1:]),
    )

    for boundary in (
        doctor.validate_result,
        doctor.project_result,
        doctor.render_json,
        doctor.render_human,
    ):
        hostile_calls.clear()
        with pytest.raises(doctor.DoctorContractError) as caught:
            boundary(forged_result)

        error = caught.value
        assert type(error) is doctor.DoctorContractError
        assert error.exit_code == 2
        assert error.code == "DOCTOR_CONTRACT_INVALID"
        assert str(error) == "doctor contract validation failed"
        assert error.__cause__ is None
        assert error.__context__ is None
        assert canary not in str(error)
        assert canary not in repr(error)
        assert hostile_calls == []


@pytest.mark.parametrize(
    "boundary_name",
    ["validate_result", "project_result", "render_json", "render_human"],
)
@pytest.mark.parametrize(
    "attack_kind",
    [
        "subclass",
        "unissued",
        "missing_slot",
        "same_value_mutation",
        "different_value_mutation",
        "hostile_value_mutation",
        "cycle",
        "container_subclass",
    ],
)
def test_every_result_boundary_enforces_root_provenance_before_callbacks(
    boundary_name,
    attack_kind,
):
    doctor = load_doctor()
    _, _, run = make_dto_samples(doctor)
    sample = run.result
    fields = dto_fields("DoctorResult", sample)
    callbacks = []
    canary = f"tok-result-{boundary_name}-{attack_kind}-canary"

    if attack_kind == "subclass":
        result_type = make_hostile_subclass(
            doctor,
            "DoctorResult",
            callbacks,
        )
        candidate = forge_exact(result_type, **fields)
    elif attack_kind == "unissued":
        candidate = forge_exact(doctor.DoctorResult, **fields)
    elif attack_kind == "missing_slot":
        fields.pop("schema_version")
        candidate = forge_exact(doctor.DoctorResult, **fields)
    elif attack_kind == "container_subclass":

        class HostileTuple(tuple):
            def __iter__(self):
                callbacks.append("iter")
                return super().__iter__()

            def __len__(self):
                callbacks.append("len")
                return super().__len__()

            def __bool__(self):
                callbacks.append("bool")
                return True

        object.__setattr__(
            sample,
            "checks",
            HostileTuple(sample.checks),
        )
        candidate = sample
    else:
        candidate = sample
        if attack_kind == "same_value_mutation":
            replacement = sample.schema_version
        elif attack_kind == "different_value_mutation":
            replacement = f"{sample.schema_version}-drift"
        elif attack_kind == "hostile_value_mutation":
            replacement = HostilePrimitive(callbacks, canary)
        else:
            replacement = sample
        object.__setattr__(candidate, "schema_version", replacement)

    callbacks.clear()
    boundary = getattr(doctor, boundary_name)
    with pytest.raises(doctor.DoctorContractError) as caught:
        boundary(candidate)

    assert_safe_contract_error(doctor, caught.value, canary)
    assert callbacks == []


@pytest.mark.parametrize(
    "boundary_name",
    ["project_result", "render_json", "render_human"],
)
def test_result_consumers_use_validator_snapshot_without_rereading_caller_dto(
    monkeypatch,
    boundary_name,
):
    doctor = load_doctor()
    run = run_with(doctor)
    result = run.result
    expected = {
        "project_result": doctor.project_result(result),
        "render_json": doctor.render_json(result),
        "render_human": doctor.render_human(result),
    }[boundary_name]
    callbacks = []
    canary = f"tok-result-{boundary_name}-reread-canary"
    hostile = HostilePrimitive(callbacks, canary)
    original_validator = doctor._validated_result_snapshot

    def validate_then_mutate(candidate):
        snapshot = original_validator(candidate)
        object.__setattr__(candidate, "profile_id", hostile)
        object.__setattr__(candidate, "status", hostile)
        return snapshot

    monkeypatch.setattr(
        doctor,
        "_validated_result_snapshot",
        validate_then_mutate,
    )

    assert getattr(doctor, boundary_name)(result) == expected
    assert callbacks == []


def test_schema_rejects_unknown_fields_values_duplicates_and_wrong_order():
    doctor = load_doctor()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema)
    projection = doctor.project_result(run_with(doctor).result)
    assert validator.is_valid(projection)

    mutations = []
    extra_root = deepcopy(projection)
    extra_root["rawConfig"] = "secret"
    mutations.append(extra_root)

    extra_check = deepcopy(projection)
    extra_check["checks"][0]["message"] = "secret"
    mutations.append(extra_check)

    extra_remediation = deepcopy(projection)
    extra_remediation["checks"][0]["remediation"]["url"] = "secret"
    mutations.append(extra_remediation)

    unknown_status = deepcopy(projection)
    unknown_status["checks"][0]["status"] = "unknown"
    mutations.append(unknown_status)

    unknown_code = deepcopy(projection)
    unknown_code["checks"][0]["code"] = "UNKNOWN_CODE"
    mutations.append(unknown_code)

    duplicate = deepcopy(projection)
    duplicate["checks"][1] = deepcopy(duplicate["checks"][0])
    mutations.append(duplicate)

    wrong_order = deepcopy(projection)
    wrong_order["checks"] = list(reversed(wrong_order["checks"]))
    mutations.append(wrong_order)

    wrong_profile = deepcopy(projection)
    wrong_profile["profileId"] = "/home/owner/profile"
    mutations.append(wrong_profile)

    for mutation in mutations:
        assert not validator.is_valid(mutation)
