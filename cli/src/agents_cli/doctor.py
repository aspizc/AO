"""Pure, injected doctor result core.

This module deliberately performs no filesystem, command, provider, Gateway,
or coordination work. Probes are injected and may return only a closed
``ProbeObservation``. All user-facing text is selected from the immutable
registry below.
"""

from __future__ import annotations

import gc
import json
import re
import threading
import weakref
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Any, Final

SCHEMA_VERSION: Final = "doctor-result/v1"
CANONICAL_PROFILE_ID: Final = "canonical-orchestrator"
PROFILE_ID_MAX_LENGTH: Final = 64

_CONTRACT_ERROR_CODE = "DOCTOR_CONTRACT_INVALID"
_CONTRACT_ERROR_MESSAGE = "doctor contract validation failed"
_REMEDIATION_DOC = "docs/doctor.md"
_CREDENTIAL_LIKE_PROFILE_PREFIXES: Final = (
    "ghp",
    "github-pat",
    "glpat",
    "sk",
    "tok",
    "xoxb",
    "xoxp",
)
_PROFILE_ID_PATTERN = re.compile(
    rf"^(?!(?:{'|'.join(_CREDENTIAL_LIKE_PROFILE_PREFIXES)})-)"
    r"[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?![\s\S])"
)


class DoctorContractError(RuntimeError):
    """Safe exit-2 error for invalid invocation or internal contracts."""

    code = _CONTRACT_ERROR_CODE
    exit_code = 2

    def __init__(self) -> None:
        super().__init__(_CONTRACT_ERROR_MESSAGE)


def _contract_error() -> DoctorContractError:
    return DoctorContractError()


def _is_canonical_profile_id(value: object) -> bool:
    return (
        type(value) is str
        and 1 <= len(value) <= PROFILE_ID_MAX_LENGTH
        and _PROFILE_ID_PATTERN.fullmatch(value) is not None
    )


class ProbeStatus(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class ResultStatus(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class CheckId(str, Enum):
    CONFIG = "config"
    DEPENDENCY = "dependency"
    POLICY = "policy"
    PROFILE = "profile"
    REPOSITORY = "repository"
    RUNTIME = "runtime"
    CLAUDE_LOGIN = "claude-login"
    CODEX_LOGIN = "codex-login"
    COORDINATION = "coordination"
    COORDINATION_SCOPE = "coordination-scope"
    ISOLATION = "isolation"
    STATE_OWNERSHIP = "state-ownership"


_EXPECTED_CHECK_IDS: Final = (
    CheckId.CONFIG,
    CheckId.DEPENDENCY,
    CheckId.POLICY,
    CheckId.PROFILE,
    CheckId.REPOSITORY,
    CheckId.RUNTIME,
    CheckId.CLAUDE_LOGIN,
    CheckId.CODEX_LOGIN,
    CheckId.COORDINATION,
    CheckId.COORDINATION_SCOPE,
    CheckId.ISOLATION,
    CheckId.STATE_OWNERSHIP,
)


class _IssueRecord:
    __slots__ = ("reference", "tainted")

    def __init__(self, reference: weakref.ReferenceType[object]) -> None:
        self.reference = reference
        self.tainted = False


_ISSUANCE_LEDGER: dict[int, _IssueRecord] = {}
_ISSUANCE_LOCK = threading.RLock()
_ADMISSION_STATE = threading.local()
_SEALED_DTO_TYPES: list[type] = []
_TRACKED_SLOT_STORAGE: dict[int, tuple[_TrackedSlot, object]]


class _RetirementCallback:
    __slots__ = ()

    # Weak references ignore callback returns. This built-in call surface exposes
    # no Python function dictionary through the publicly discoverable reference.
    __call__ = id


_RetirementAuthority = tuple[int, weakref.ReferenceType[object]]
_RETIREMENT_CALLBACK_RECORDS: dict[
    _RetirementCallback,
    _RetirementAuthority,
] = {}


def _retire_dead_issued_dtos() -> None:
    try:
        with _ISSUANCE_LOCK:
            authorities = tuple(_RETIREMENT_CALLBACK_RECORDS.items())
            for callback, authority in authorities:
                try:
                    key, reference = authority
                    record = _ISSUANCE_LEDGER.get(key)
                    if (
                        type(callback) is not _RetirementCallback
                        or type(reference) is not weakref.ReferenceType
                        or reference() is not None
                        or record is None
                        or record.reference is not reference
                        or _ISSUANCE_LEDGER.get(key) is not record
                        or _RETIREMENT_CALLBACK_RECORDS.get(callback) is not authority
                    ):
                        continue
                    del _ISSUANCE_LEDGER[key]
                    if _RETIREMENT_CALLBACK_RECORDS.get(callback) is authority:
                        del _RETIREMENT_CALLBACK_RECORDS[callback]
                except BaseException:
                    continue
    except BaseException:
        return


if "_ISSUANCE_GC_CALLBACK" not in globals():

    def _issuance_gc_callback(
        phase: str,
        _collection_info: dict[str, int],
    ) -> None:
        if phase == "stop":
            _retire_dead_issued_dtos()

    _ISSUANCE_GC_CALLBACK = _issuance_gc_callback

if _ISSUANCE_GC_CALLBACK not in gc.callbacks:
    gc.callbacks.append(_ISSUANCE_GC_CALLBACK)


def _mark_dto_mutated(value: object) -> None:
    with _ISSUANCE_LOCK:
        record = _ISSUANCE_LEDGER.get(id(value))
        if record is not None and record.reference() is value:
            record.tainted = True


def _tracked_slot_storage(tracked_slot: _TrackedSlot) -> object:
    authority, storage = _TRACKED_SLOT_STORAGE[id(tracked_slot)]
    if authority is not tracked_slot:
        raise AttributeError
    return storage


class _TrackedSlot:
    __slots__ = ()

    def __init__(self, slot: object) -> None:
        _TRACKED_SLOT_STORAGE[id(self)] = (self, slot)

    def __get__(self, instance: object, owner: type | None = None) -> object:
        if instance is None:
            return self
        return _tracked_slot_storage(self).__get__(instance, owner)

    def __set__(self, instance: object, value: object) -> None:
        previous = None
        with _ISSUANCE_LOCK:
            storage = _tracked_slot_storage(self)
            try:
                previous = storage.__get__(instance, type(instance))
            except AttributeError:
                pass
            _mark_dto_mutated(instance)
            storage.__set__(instance, value)
        del previous

    def __delete__(self, instance: object) -> None:
        previous = None
        with _ISSUANCE_LOCK:
            storage = _tracked_slot_storage(self)
            try:
                previous = storage.__get__(instance, type(instance))
            except AttributeError:
                pass
            _mark_dto_mutated(instance)
            storage.__delete__(instance)
        del previous


_TRACKED_SLOT_STORAGE = {}


def _is_sealed_dto_type(value: object) -> bool:
    return any(value is dto_type for dto_type in _SEALED_DTO_TYPES)


class _OpaqueDTOType(type):
    def __call__(cls, *args: object, **kwargs: object) -> object:
        instance = None
        try:
            instance = super().__call__(*args, **kwargs)
        except Exception:
            instance = None
        if instance is None:
            raise _contract_error() from None
        if _is_sealed_dto_type(type(instance)):
            _snapshot_and_record_new_dto(instance)
        return instance

    def __setattr__(cls, name: str, value: object) -> None:
        if _is_sealed_dto_type(cls):
            raise TypeError("doctor DTO types are immutable")
        super().__setattr__(name, value)

    def __delattr__(cls, name: str) -> None:
        if _is_sealed_dto_type(cls):
            raise TypeError("doctor DTO types are immutable")
        super().__delattr__(name)


class _OpaqueDTO(metaclass=_OpaqueDTOType):
    __slots__ = ()

    def __repr__(self) -> str:
        return f"<{type(self).__name__} opaque>"

    __str__ = __repr__

    def __eq__(self, other: object) -> bool:
        return self is other

    __hash__ = object.__hash__


def _seal_dto(dto_type: type) -> type:
    label = f"<{dto_type.__name__} opaque>"
    namespace = type.__getattribute__(dto_type, "__dict__")

    def opaque_repr(self: object) -> str:
        return label

    for field_name in namespace["__slots__"]:
        if field_name == "__weakref__":
            continue
        type.__setattr__(
            dto_type,
            field_name,
            _TrackedSlot(namespace[field_name]),
        )
    type.__setattr__(dto_type, "__repr__", opaque_repr)
    type.__setattr__(dto_type, "__str__", opaque_repr)
    type.__setattr__(dto_type, "__eq__", _OpaqueDTO.__eq__)
    type.__setattr__(dto_type, "__hash__", object.__hash__)
    _SEALED_DTO_TYPES.append(dto_type)
    return dto_type


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class Remediation(_OpaqueDTO):
    doc: str
    anchor: str


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class OutcomeDefinition(_OpaqueDTO):
    probe_status: ProbeStatus
    code: str
    result_status: ResultStatus
    summary: str
    remediation: Remediation


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class CheckDefinition(_OpaqueDTO):
    id: CheckId
    outcomes: tuple[OutcomeDefinition, ...]
    exception_code: str


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class ProbeObservation(_OpaqueDTO):
    """The only value a doctor probe may return."""

    status: ProbeStatus
    code: str


Probe = Callable[[], ProbeObservation]


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class ProbeBinding(_OpaqueDTO):
    check_id: CheckId
    probe: Probe


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class DoctorCheck(_OpaqueDTO):
    id: CheckId
    status: ResultStatus
    code: str
    summary: str
    remediation: Remediation


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class DoctorResult(_OpaqueDTO):
    schema_version: str
    profile_id: str
    status: ResultStatus
    checks: tuple[DoctorCheck, ...]


@_seal_dto
@dataclass(frozen=True, slots=True, repr=False, eq=False, weakref_slot=True)
class DoctorRun(_OpaqueDTO):
    result: DoctorResult
    exit_code: int


def _read_field(value: object, name: str) -> object:
    return object.__getattribute__(value, name)


def _record_issue(value: object) -> None:
    with _ISSUANCE_LOCK:
        _retire_dead_issued_dtos()
        key = id(value)
        existing = _ISSUANCE_LEDGER.get(key)
        if existing is not None:
            raise _contract_error() from None
        callback = _RetirementCallback()
        reference = weakref.ref(value, callback)
        _RETIREMENT_CALLBACK_RECORDS[callback] = (key, reference)
        _ISSUANCE_LEDGER[key] = _IssueRecord(reference)


def _issue_record(value: object, expected_type: type) -> _IssueRecord:
    with _ISSUANCE_LOCK:
        record = None
        try:
            if type(value) is expected_type:
                candidate = _ISSUANCE_LEDGER.get(id(value))
                if (
                    candidate is not None
                    and candidate.reference() is value
                    and not candidate.tainted
                ):
                    record = candidate
        except Exception:
            record = None
        if record is None:
            raise _contract_error() from None
        return record


_AdmissionRecord = tuple[int, type, _IssueRecord]


# Recursive captures retain only ledger metadata here. The final locked check is
# the admission linearization point: earlier writes taint, later writes cannot
# change the detached snapshot, and retirement shares the same lock.
def _begin_admission_scope() -> tuple[list[_AdmissionRecord], bool]:
    records = getattr(_ADMISSION_STATE, "records", None)
    if records is None:
        records = []
        _ADMISSION_STATE.records = records
        return records, True
    return records, False


def _end_admission_scope() -> None:
    try:
        del _ADMISSION_STATE.records
    except AttributeError:
        pass


def _verify_admission_records(records: list[_AdmissionRecord]) -> None:
    with _ISSUANCE_LOCK:
        for key, expected_type, expected_record in records:
            referent = expected_record.reference()
            if (
                _ISSUANCE_LEDGER.get(key) is not expected_record
                or referent is None
                or id(referent) != key
                or type(referent) is not expected_type
                or expected_record.tainted
            ):
                raise _contract_error() from None


def _capture_consistently(capture: Callable[[], Any]) -> Any:
    records, owns_scope = _begin_admission_scope()
    try:
        snapshot = capture()
        if owns_scope:
            _verify_admission_records(records)
        return snapshot
    except DoctorContractError:
        raise
    except Exception:
        raise _contract_error() from None
    finally:
        if owns_scope:
            _end_admission_scope()


def _track_issue(value: object, expected_type: type) -> _IssueRecord:
    record = _issue_record(value, expected_type)
    records = getattr(_ADMISSION_STATE, "records", None)
    if records is None:
        raise _contract_error() from None
    records.append((id(value), expected_type, record))
    return record


def _capture_admitted_snapshot(
    value: object,
    expected_type: type,
    capture: Callable[[object], tuple[object, ...]],
) -> tuple[object, ...]:
    def capture_admitted() -> tuple[object, ...]:
        _track_issue(value, expected_type)
        return capture(value)

    return _capture_consistently(capture_admitted)


def _new_remediation_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is Remediation:
            doc = _read_field(value, "doc")
            anchor = _read_field(value, "anchor")
            if (
                type(doc) is str
                and doc == _REMEDIATION_DOC
                and type(anchor) is str
                and anchor
                in {
                    "bootstrap",
                    "coordination",
                    "isolation",
                    "provider-login",
                    "state-ownership",
                    "synthetic-input",
                }
            ):
                snapshot = (doc, anchor)
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_remediation(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        Remediation,
        _new_remediation_snapshot,
    )


def _new_outcome_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is OutcomeDefinition:
            probe_status = _read_field(value, "probe_status")
            code = _read_field(value, "code")
            result_status = _read_field(value, "result_status")
            summary = _read_field(value, "summary")
            remediation = _read_field(value, "remediation")
            if (
                type(probe_status) is ProbeStatus
                and type(code) is str
                and len(code) > 0
                and type(result_status) is ResultStatus
                and type(summary) is str
                and len(summary) > 0
                and type(remediation) is Remediation
            ):
                remediation_snapshot = _admit_remediation(remediation)
                snapshot = (
                    probe_status,
                    code,
                    result_status,
                    summary,
                    remediation,
                    remediation_snapshot,
                )
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_outcome_definition(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        OutcomeDefinition,
        _new_outcome_snapshot,
    )


def _new_check_definition_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is CheckDefinition:
            check_id = _read_field(value, "id")
            outcomes = _read_field(value, "outcomes")
            exception_code = _read_field(value, "exception_code")
            if (
                type(check_id) is CheckId
                and type(outcomes) is tuple
                and len(outcomes) > 0
                and type(exception_code) is str
                and len(exception_code) > 0
            ):
                children = []
                for outcome in outcomes:
                    outcome_snapshot = _admit_outcome_definition(outcome)
                    children.append((outcome, outcome_snapshot))
                child_snapshots = tuple(children)
                pairs = tuple(
                    (child_snapshot[0], child_snapshot[1])
                    for _, child_snapshot in child_snapshots
                )
                exception_count = sum(
                    1
                    for _, child_snapshot in child_snapshots
                    if child_snapshot[0] is ProbeStatus.FAIL
                    and child_snapshot[1] == exception_code
                    and child_snapshot[2] is ResultStatus.FAIL
                )
                if len(pairs) == len(set(pairs)) and exception_count == 1:
                    snapshot = (
                        check_id,
                        outcomes,
                        child_snapshots,
                        exception_code,
                    )
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_check_definition(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        CheckDefinition,
        _new_check_definition_snapshot,
    )


def _new_observation_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is ProbeObservation:
            _validate_registry()
            status = _read_field(value, "status")
            code = _read_field(value, "code")
            if (
                type(status) is ProbeStatus
                and type(code) is str
                and (status, code) in _ALL_OBSERVATION_PAIRS
            ):
                snapshot = (status, code)
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_probe_observation(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        ProbeObservation,
        _new_observation_snapshot,
    )


def _new_binding_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is ProbeBinding:
            check_id = _read_field(value, "check_id")
            probe = _read_field(value, "probe")
            if type(check_id) is CheckId and callable(probe):
                snapshot = (check_id, probe)
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_probe_binding(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        ProbeBinding,
        _new_binding_snapshot,
    )


def _match_check_authority(
    check_id: CheckId,
    status: ResultStatus,
    code: str,
    summary: str,
    remediation_snapshot: tuple[object, ...],
) -> tuple[object, ...]:
    matched = None
    try:
        definition = _DEFINITION_BY_ID.get(check_id)
        if definition is not None:
            definition_snapshot = _admit_check_definition(definition)
            for outcome, outcome_snapshot in definition_snapshot[2]:
                outcome_remediation_snapshot = outcome_snapshot[5]
                if (
                    outcome_snapshot[2] is status
                    and outcome_snapshot[1] == code
                    and outcome_snapshot[3] == summary
                    and outcome_remediation_snapshot[0] == remediation_snapshot[0]
                    and outcome_remediation_snapshot[1] == remediation_snapshot[1]
                ):
                    if matched is not None:
                        matched = None
                        break
                    matched = (
                        definition,
                        definition_snapshot,
                        outcome,
                        outcome_snapshot,
                    )
    except Exception:
        matched = None
    if matched is None:
        raise _contract_error() from None
    return matched


def _new_check_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is DoctorCheck:
            _validate_registry()
            check_id = _read_field(value, "id")
            status = _read_field(value, "status")
            code = _read_field(value, "code")
            summary = _read_field(value, "summary")
            remediation = _read_field(value, "remediation")
            if (
                type(check_id) is CheckId
                and type(status) is ResultStatus
                and type(code) is str
                and type(summary) is str
                and type(remediation) is Remediation
            ):
                remediation_snapshot = _admit_remediation(remediation)
                authority = _match_check_authority(
                    check_id,
                    status,
                    code,
                    summary,
                    remediation_snapshot,
                )
                snapshot = (
                    check_id,
                    status,
                    code,
                    summary,
                    remediation,
                    remediation_snapshot,
                    *authority,
                )
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _admit_doctor_check(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        DoctorCheck,
        _new_check_snapshot,
    )


def _aggregate_check_snapshots(
    children: tuple[tuple[object, tuple[object, ...]], ...],
) -> ResultStatus:
    if any(snapshot[1] is ResultStatus.FAIL for _, snapshot in children):
        return ResultStatus.FAIL
    if any(snapshot[1] is ResultStatus.WARN for _, snapshot in children):
        return ResultStatus.WARN
    return ResultStatus.PASS


def _new_result_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is DoctorResult:
            _validate_registry()
            schema_version = _read_field(value, "schema_version")
            profile_id = _read_field(value, "profile_id")
            status = _read_field(value, "status")
            checks = _read_field(value, "checks")
            if (
                type(schema_version) is str
                and schema_version == SCHEMA_VERSION
                and _is_canonical_profile_id(profile_id)
                and type(status) is ResultStatus
                and type(checks) is tuple
            ):
                children = []
                for check in checks:
                    check_snapshot = _admit_doctor_check(check)
                    children.append((check, check_snapshot))
                child_snapshots = tuple(children)
                if tuple(
                    check_snapshot[0] for _, check_snapshot in child_snapshots
                ) == _CANONICAL_CHECK_IDS and status is _aggregate_check_snapshots(
                    child_snapshots
                ):
                    snapshot = (
                        schema_version,
                        profile_id,
                        status,
                        checks,
                        child_snapshots,
                    )
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _validated_result_snapshot(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        DoctorResult,
        _new_result_snapshot,
    )


def _new_run_snapshot(value: object) -> tuple[object, ...]:
    snapshot = None
    try:
        if type(value) is DoctorRun:
            result = _read_field(value, "result")
            exit_code = _read_field(value, "exit_code")
            if type(result) is DoctorResult and type(exit_code) is int:
                result_snapshot = _validated_result_snapshot(result)
                expected_exit_code = 1 if result_snapshot[2] is ResultStatus.FAIL else 0
                if exit_code == expected_exit_code:
                    snapshot = (
                        result,
                        result_snapshot,
                        exit_code,
                    )
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _validate_doctor_run(value: object) -> tuple[object, ...]:
    return _capture_admitted_snapshot(
        value,
        DoctorRun,
        _new_run_snapshot,
    )


def _snapshot_new_dto(value: object) -> tuple[object, ...]:
    value_type = type(value)
    if value_type is Remediation:
        return _new_remediation_snapshot(value)
    if value_type is OutcomeDefinition:
        return _new_outcome_snapshot(value)
    if value_type is CheckDefinition:
        return _new_check_definition_snapshot(value)
    if value_type is ProbeObservation:
        return _new_observation_snapshot(value)
    if value_type is ProbeBinding:
        return _new_binding_snapshot(value)
    if value_type is DoctorCheck:
        return _new_check_snapshot(value)
    if value_type is DoctorResult:
        return _new_result_snapshot(value)
    if value_type is DoctorRun:
        return _new_run_snapshot(value)
    raise _contract_error() from None


def _snapshot_and_record_new_dto(value: object) -> None:
    previous_records = getattr(_ADMISSION_STATE, "records", None)
    records: list[_AdmissionRecord] = []
    _ADMISSION_STATE.records = records
    try:
        _snapshot_new_dto(value)
        with _ISSUANCE_LOCK:
            _verify_admission_records(records)
            _record_issue(value)
    except DoctorContractError:
        raise
    except Exception:
        raise _contract_error() from None
    finally:
        if previous_records is None:
            _end_admission_scope()
        else:
            _ADMISSION_STATE.records = previous_records


def _validate_remediation(value: object) -> None:
    _admit_remediation(value)


def _validate_outcome_definition(value: object) -> None:
    _admit_outcome_definition(value)


def _validate_check_definition(value: object) -> None:
    _admit_check_definition(value)


def _remediation(anchor: str) -> Remediation:
    return Remediation(doc=_REMEDIATION_DOC, anchor=anchor)


def _outcome(
    probe_status: ProbeStatus,
    code: str,
    result_status: ResultStatus,
    summary: str,
    anchor: str,
) -> OutcomeDefinition:
    return OutcomeDefinition(
        probe_status=probe_status,
        code=code,
        result_status=result_status,
        summary=summary,
        remediation=_remediation(anchor),
    )


_CANONICAL_CHECK_REGISTRY: Final = (
    CheckDefinition(
        id=CheckId.CONFIG,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "CONFIG_VALID",
                ResultStatus.PASS,
                "Configuration paths are valid.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.WARN,
                "CONFIG_DEPRECATED",
                ResultStatus.WARN,
                "Configuration uses a supported legacy layout.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CONFIG_MISSING",
                ResultStatus.FAIL,
                "Required configuration paths are unavailable.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CONFIG_INVALID",
                ResultStatus.FAIL,
                "Configuration paths do not satisfy the supported contract.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CONFIG_PROBE_ERROR",
                ResultStatus.FAIL,
                "The configuration check could not be completed safely.",
                "synthetic-input",
            ),
        ),
        exception_code="CONFIG_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.DEPENDENCY,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "DEPENDENCIES_READY",
                ResultStatus.PASS,
                "Required dependencies are available.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.WARN,
                "DEPENDENCY_UPDATE_AVAILABLE",
                ResultStatus.WARN,
                "An optional dependency update is available.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "OPTIONAL_DEPENDENCY_MISSING",
                ResultStatus.WARN,
                "An optional dependency is unavailable.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REQUIRED_DEPENDENCY_MISSING",
                ResultStatus.FAIL,
                "A required dependency is unavailable.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "DEPENDENCY_VERSION_UNSUPPORTED",
                ResultStatus.FAIL,
                "A dependency version is unsupported.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "DEPENDENCY_PROBE_ERROR",
                ResultStatus.FAIL,
                "The dependency check could not be completed safely.",
                "bootstrap",
            ),
        ),
        exception_code="DEPENDENCY_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.POLICY,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "POLICY_VALID",
                ResultStatus.PASS,
                "The policy registry is valid.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.WARN,
                "POLICY_DEPRECATED",
                ResultStatus.WARN,
                "The policy registry uses a supported legacy contract.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "POLICY_MISSING",
                ResultStatus.FAIL,
                "The policy registry is unavailable.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "POLICY_INVALID",
                ResultStatus.FAIL,
                "The policy registry is invalid.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "POLICY_DRIFTED",
                ResultStatus.FAIL,
                "The policy registry does not match the canonical contract.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "POLICY_PROBE_ERROR",
                ResultStatus.FAIL,
                "The policy check could not be completed safely.",
                "synthetic-input",
            ),
        ),
        exception_code="POLICY_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.PROFILE,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "PROFILE_VALID",
                ResultStatus.PASS,
                "The orchestrator profile is valid.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.WARN,
                "PROFILE_DEPRECATED",
                ResultStatus.WARN,
                "The profile uses a supported legacy contract.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "PROFILE_MISSING",
                ResultStatus.FAIL,
                "The orchestrator profile is unavailable.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "PROFILE_INVALID",
                ResultStatus.FAIL,
                "The orchestrator profile is invalid.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "PROFILE_DRIFTED",
                ResultStatus.FAIL,
                "The profile does not match the canonical contract.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "PROFILE_PROBE_ERROR",
                ResultStatus.FAIL,
                "The profile check could not be completed safely.",
                "synthetic-input",
            ),
        ),
        exception_code="PROFILE_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.REPOSITORY,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "REPOSITORY_CANONICAL",
                ResultStatus.PASS,
                "The repository binding is canonical.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.WARN,
                "REPOSITORY_LEGACY",
                ResultStatus.WARN,
                "The repository uses a supported legacy binding.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REPOSITORY_MISSING",
                ResultStatus.FAIL,
                "The repository binding is unavailable.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REPOSITORY_AMBIGUOUS",
                ResultStatus.FAIL,
                "The repository binding is ambiguous.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REPOSITORY_NONCANONICAL",
                ResultStatus.FAIL,
                "The repository binding is not canonical.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REPOSITORY_ESCAPED",
                ResultStatus.FAIL,
                "The repository binding escapes its allowed boundary.",
                "synthetic-input",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "REPOSITORY_PROBE_ERROR",
                ResultStatus.FAIL,
                "The repository check could not be completed safely.",
                "synthetic-input",
            ),
        ),
        exception_code="REPOSITORY_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.RUNTIME,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "RUNTIME_SUPPORTED",
                ResultStatus.PASS,
                "The runtime is supported.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.WARN,
                "RUNTIME_DEPRECATED",
                ResultStatus.WARN,
                "The runtime is supported but deprecated.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "RUNTIME_UNAVAILABLE",
                ResultStatus.FAIL,
                "The required runtime is unavailable.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "RUNTIME_UNSUPPORTED",
                ResultStatus.FAIL,
                "The runtime version is unsupported.",
                "bootstrap",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "RUNTIME_PROBE_ERROR",
                ResultStatus.FAIL,
                "The runtime check could not be completed safely.",
                "bootstrap",
            ),
        ),
        exception_code="RUNTIME_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.CLAUDE_LOGIN,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "CLAUDE_LOGIN_READY",
                ResultStatus.PASS,
                "Claude Code CLI is installed and authenticated.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.PASS,
                "CLAUDE_LOGIN_NOT_REQUIRED",
                ResultStatus.PASS,
                "Claude Code login is not required for a registry-only provider.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CLAUDE_CLI_UNAVAILABLE",
                ResultStatus.FAIL,
                "Claude Code CLI is unavailable.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CLAUDE_LOGIN_TIMEOUT",
                ResultStatus.FAIL,
                "Claude Code login status did not complete within the safe timeout.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CLAUDE_LOGIN_REQUIRED",
                ResultStatus.FAIL,
                "Claude Code login is missing or stale.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CLAUDE_LOGIN_PROBE_ERROR",
                ResultStatus.FAIL,
                "Claude Code login status could not be checked safely.",
                "provider-login",
            ),
        ),
        exception_code="CLAUDE_LOGIN_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.CODEX_LOGIN,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "CODEX_LOGIN_READY",
                ResultStatus.PASS,
                "Codex CLI is installed and authenticated.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.PASS,
                "CODEX_LOGIN_NOT_REQUIRED",
                ResultStatus.PASS,
                "Codex login is not required for a registry-only provider.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CODEX_CLI_UNAVAILABLE",
                ResultStatus.FAIL,
                "Codex CLI is unavailable.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CODEX_LOGIN_TIMEOUT",
                ResultStatus.FAIL,
                "Codex login status did not complete within the safe timeout.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CODEX_LOGIN_REQUIRED",
                ResultStatus.FAIL,
                "Codex login is missing or stale.",
                "provider-login",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "CODEX_LOGIN_PROBE_ERROR",
                ResultStatus.FAIL,
                "Codex login status could not be checked safely.",
                "provider-login",
            ),
        ),
        exception_code="CODEX_LOGIN_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.COORDINATION,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "COORDINATION_READY",
                ResultStatus.PASS,
                "Coordination is ready.",
                "coordination",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "COORDINATION_UNAVAILABLE",
                ResultStatus.FAIL,
                "Coordination is unavailable.",
                "coordination",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "COORDINATION_PROBE_ERROR",
                ResultStatus.FAIL,
                "Coordination status could not be checked safely.",
                "coordination",
            ),
        ),
        exception_code="COORDINATION_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.COORDINATION_SCOPE,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "COORDINATION_SCOPE_MATCH",
                ResultStatus.PASS,
                "Coordination uses the configured canonical scope.",
                "coordination",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "COORDINATION_SCOPE_MISMATCH",
                ResultStatus.FAIL,
                "Coordination does not use the configured canonical scope.",
                "coordination",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "COORDINATION_SCOPE_PROBE_ERROR",
                ResultStatus.FAIL,
                "Coordination scope could not be checked safely.",
                "coordination",
            ),
        ),
        exception_code="COORDINATION_SCOPE_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.ISOLATION,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "ISOLATION_READY",
                ResultStatus.PASS,
                "The D-owned isolation authority reports ready.",
                "isolation",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "ISOLATION_UNAVAILABLE",
                ResultStatus.FAIL,
                "Isolation authority is unavailable.",
                "isolation",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "ISOLATION_PROBE_ERROR",
                ResultStatus.FAIL,
                "Isolation status could not be checked safely.",
                "isolation",
            ),
        ),
        exception_code="ISOLATION_PROBE_ERROR",
    ),
    CheckDefinition(
        id=CheckId.STATE_OWNERSHIP,
        outcomes=(
            _outcome(
                ProbeStatus.PASS,
                "STATE_OWNERSHIP_OWNED",
                ResultStatus.PASS,
                "The D-owned authority reports exclusive state ownership.",
                "state-ownership",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "STATE_OWNERSHIP_CONFLICT",
                ResultStatus.FAIL,
                "The D-owned authority reports a second writer.",
                "state-ownership",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "STATE_OWNERSHIP_STALE",
                ResultStatus.FAIL,
                "The D-owned authority reports stale state ownership.",
                "state-ownership",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "STATE_OWNERSHIP_UNVERIFIABLE",
                ResultStatus.FAIL,
                "State ownership cannot be verified.",
                "state-ownership",
            ),
            _outcome(
                ProbeStatus.FAIL,
                "STATE_OWNERSHIP_PROBE_ERROR",
                ResultStatus.FAIL,
                "State ownership status could not be checked safely.",
                "state-ownership",
            ),
        ),
        exception_code="STATE_OWNERSHIP_PROBE_ERROR",
    ),
)


def _registry_fingerprint(
    registry: tuple[CheckDefinition, ...],
) -> tuple[
    tuple[
        CheckId,
        str,
        tuple[tuple[ProbeStatus, str, ResultStatus, str, str, str], ...],
    ],
    ...,
]:
    fingerprint = []
    for definition in registry:
        definition_snapshot = _admit_check_definition(definition)
        fingerprint.append(
            (
                definition_snapshot[0],
                definition_snapshot[3],
                tuple(
                    (
                        outcome_snapshot[0],
                        outcome_snapshot[1],
                        outcome_snapshot[2],
                        outcome_snapshot[3],
                        outcome_snapshot[5][0],
                        outcome_snapshot[5][1],
                    )
                    for _, outcome_snapshot in definition_snapshot[2]
                ),
            )
        )
    return tuple(fingerprint)


def _copy_registry(
    registry: tuple[CheckDefinition, ...],
) -> tuple[CheckDefinition, ...]:
    projection = []
    for definition in registry:
        definition_snapshot = _admit_check_definition(definition)
        projection.append(
            CheckDefinition(
                id=definition_snapshot[0],
                outcomes=tuple(
                    OutcomeDefinition(
                        probe_status=outcome_snapshot[0],
                        code=outcome_snapshot[1],
                        result_status=outcome_snapshot[2],
                        summary=outcome_snapshot[3],
                        remediation=Remediation(
                            doc=outcome_snapshot[5][0],
                            anchor=outcome_snapshot[5][1],
                        ),
                    )
                    for _, outcome_snapshot in definition_snapshot[2]
                ),
                exception_code=definition_snapshot[3],
            )
        )
    return tuple(projection)


_CANONICAL_REGISTRY_FINGERPRINT: Final = _registry_fingerprint(
    _CANONICAL_CHECK_REGISTRY
)
_CANONICAL_CHECK_REGISTRY_AUTHORITY: Final = _CANONICAL_CHECK_REGISTRY
_CHECK_REGISTRY_PROJECTION: Final = _copy_registry(_CANONICAL_CHECK_REGISTRY)
_CHECK_REGISTRY_PROJECTION_AUTHORITY: Final = _CHECK_REGISTRY_PROJECTION
CHECK_REGISTRY: Final = _CHECK_REGISTRY_PROJECTION
_CANONICAL_REGISTRY_IDENTITY_GRAPH: Final = tuple(
    (
        definition,
        definition.outcomes,
        tuple((outcome, outcome.remediation) for outcome in definition.outcomes),
    )
    for definition in _CANONICAL_CHECK_REGISTRY
)
_PUBLIC_REGISTRY_IDENTITY_GRAPH: Final = tuple(
    (
        definition,
        definition.outcomes,
        tuple((outcome, outcome.remediation) for outcome in definition.outcomes),
    )
    for definition in _CHECK_REGISTRY_PROJECTION
)

_DEFINITION_BY_ID = MappingProxyType(
    {definition.id: definition for definition in _CANONICAL_CHECK_REGISTRY}
)
_OUTCOME_BY_OBSERVATION = MappingProxyType(
    {
        definition.id: MappingProxyType(
            {
                (outcome.probe_status, outcome.code): outcome
                for outcome in definition.outcomes
            }
        )
        for definition in _CANONICAL_CHECK_REGISTRY
    }
)
_ALL_OBSERVATION_PAIRS = frozenset(
    pair for outcomes in _OUTCOME_BY_OBSERVATION.values() for pair in outcomes
)
_CANONICAL_CHECK_IDS = tuple(definition.id for definition in _CANONICAL_CHECK_REGISTRY)
_DEFINITION_BY_ID_AUTHORITY: Final = _DEFINITION_BY_ID
_OUTCOME_BY_OBSERVATION_AUTHORITY: Final = _OUTCOME_BY_OBSERVATION
_ALL_OBSERVATION_PAIRS_AUTHORITY: Final = _ALL_OBSERVATION_PAIRS
_CANONICAL_CHECK_IDS_AUTHORITY: Final = _CANONICAL_CHECK_IDS
_OUTCOME_MAP_IDENTITY_GRAPH: Final = tuple(
    (
        definition.id,
        _OUTCOME_BY_OBSERVATION[definition.id],
        tuple(
            (
                outcome.probe_status,
                outcome.code,
                outcome,
            )
            for outcome in definition.outcomes
        ),
    )
    for definition in _CANONICAL_CHECK_REGISTRY
)


def _registry_identity_is_valid(
    registry: object,
    authority: tuple[CheckDefinition, ...],
    identity_graph: tuple[
        tuple[
            CheckDefinition,
            tuple[OutcomeDefinition, ...],
            tuple[tuple[OutcomeDefinition, Remediation], ...],
        ],
        ...,
    ],
) -> bool:
    try:
        if (
            registry is not authority
            or type(registry) is not tuple
            or len(registry) != len(identity_graph)
        ):
            return False
        for definition, expected in zip(
            registry,
            identity_graph,
            strict=True,
        ):
            expected_definition, expected_outcomes, expected_children = expected
            if definition is not expected_definition:
                return False
            definition_snapshot = _admit_check_definition(definition)
            if definition_snapshot[1] is not expected_outcomes or len(
                definition_snapshot[2]
            ) != len(expected_children):
                return False
            for child, expected_child in zip(
                definition_snapshot[2],
                expected_children,
                strict=True,
            ):
                outcome, outcome_snapshot = child
                expected_outcome, expected_remediation = expected_child
                if (
                    outcome is not expected_outcome
                    or outcome_snapshot[4] is not expected_remediation
                ):
                    return False
    except Exception:
        return False
    return True


def _private_registry_maps_are_valid() -> bool:
    try:
        if (
            _DEFINITION_BY_ID is not _DEFINITION_BY_ID_AUTHORITY
            or _OUTCOME_BY_OBSERVATION is not _OUTCOME_BY_OBSERVATION_AUTHORITY
            or _ALL_OBSERVATION_PAIRS is not _ALL_OBSERVATION_PAIRS_AUTHORITY
            or _CANONICAL_CHECK_IDS is not _CANONICAL_CHECK_IDS_AUTHORITY
        ):
            return False
        for definition in _CANONICAL_CHECK_REGISTRY:
            definition_snapshot = _admit_check_definition(definition)
            if _DEFINITION_BY_ID.get(definition_snapshot[0]) is not definition:
                return False
        for check_id, outcome_map, expected_entries in _OUTCOME_MAP_IDENTITY_GRAPH:
            if _OUTCOME_BY_OBSERVATION.get(check_id) is not outcome_map:
                return False
            for probe_status, code, outcome in expected_entries:
                if outcome_map.get((probe_status, code)) is not outcome:
                    return False
                _admit_outcome_definition(outcome)
    except Exception:
        return False
    return True


def _validate_registry_snapshot() -> None:
    if not _registry_identity_is_valid(
        _CANONICAL_CHECK_REGISTRY,
        _CANONICAL_CHECK_REGISTRY_AUTHORITY,
        _CANONICAL_REGISTRY_IDENTITY_GRAPH,
    ) or not _registry_identity_is_valid(
        CHECK_REGISTRY,
        _CHECK_REGISTRY_PROJECTION_AUTHORITY,
        _PUBLIC_REGISTRY_IDENTITY_GRAPH,
    ):
        raise _contract_error() from None
    if not _private_registry_maps_are_valid():
        raise _contract_error() from None
    valid = False
    try:
        registry = CHECK_REGISTRY
        if type(registry) is tuple:
            snapshots = tuple(
                _admit_check_definition(definition) for definition in registry
            )
            ids = tuple(snapshot[0] for snapshot in snapshots)
            codes = tuple(
                outcome_snapshot[1]
                for snapshot in snapshots
                for _, outcome_snapshot in snapshot[2]
            )
            valid = (
                ids == _EXPECTED_CHECK_IDS
                and len(ids) == len(set(ids))
                and set(ids) == set(CheckId)
                and len(codes) == len(set(codes))
                and _registry_fingerprint(registry) == _CANONICAL_REGISTRY_FINGERPRINT
                and all(
                    any(
                        outcome_snapshot[0] is ProbeStatus.PASS
                        and outcome_snapshot[2] is ResultStatus.PASS
                        for _, outcome_snapshot in snapshot[2]
                    )
                    for snapshot in snapshots
                )
            )
    except Exception:
        valid = False
    if not valid:
        raise _contract_error() from None


def _validate_registry() -> None:
    _capture_consistently(_validate_registry_snapshot)


_validate_registry()


def _resolve_outcome(
    definition: CheckDefinition,
    observation_snapshot: tuple[object, ...],
) -> tuple[OutcomeDefinition, tuple[object, ...]]:
    resolved = None
    try:
        definition_snapshot = _admit_check_definition(definition)
        status, code = observation_snapshot
        if type(status) is ProbeStatus and type(code) is str:
            outcome_map = _OUTCOME_BY_OBSERVATION.get(definition_snapshot[0])
            if outcome_map is not None:
                outcome = outcome_map.get((status, code))
                if outcome is not None:
                    outcome_snapshot = _admit_outcome_definition(outcome)
                    resolved = (outcome, outcome_snapshot)
    except Exception:
        resolved = None
    if resolved is None:
        raise _contract_error() from None
    return resolved


def _exception_outcome(
    definition: CheckDefinition,
) -> tuple[OutcomeDefinition, tuple[object, ...]]:
    resolved = None
    try:
        definition_snapshot = _admit_check_definition(definition)
        outcomes = _OUTCOME_BY_OBSERVATION.get(definition_snapshot[0])
        if outcomes is not None:
            outcome = outcomes.get((ProbeStatus.FAIL, definition_snapshot[3]))
            if outcome is not None:
                outcome_snapshot = _admit_outcome_definition(outcome)
                resolved = (outcome, outcome_snapshot)
    except Exception:
        resolved = None
    if resolved is None:
        raise _contract_error() from None
    return resolved


def _validate_check(check: DoctorCheck) -> OutcomeDefinition:
    return _admit_doctor_check(check)[8]


def _validated_outcomes(
    result: DoctorResult,
) -> tuple[tuple[CheckDefinition, OutcomeDefinition], ...]:
    snapshot = _validated_result_snapshot(result)
    return tuple(
        (check_snapshot[6], check_snapshot[8]) for _, check_snapshot in snapshot[4]
    )


def _capture_bindings_snapshot(
    bindings: object,
) -> tuple[tuple[CheckId, Probe], ...]:
    snapshot = None
    try:
        if type(bindings) is tuple and len(bindings) == len(_CANONICAL_CHECK_IDS):
            captured = tuple(_admit_probe_binding(binding) for binding in bindings)
            if (
                tuple(binding_snapshot[0] for binding_snapshot in captured)
                == _CANONICAL_CHECK_IDS
            ):
                snapshot = captured
    except Exception:
        snapshot = None
    if snapshot is None:
        raise _contract_error() from None
    return snapshot


def _snapshot_bindings(
    bindings: object,
) -> tuple[tuple[CheckId, Probe], ...]:
    return _capture_consistently(lambda: _capture_bindings_snapshot(bindings))


def run_doctor(
    profile_id: str,
    bindings: object,
) -> DoctorRun:
    """Evaluate one complete injected probe set without emitting partial data."""

    _validate_registry()
    if not _is_canonical_profile_id(profile_id):
        raise _contract_error() from None
    snapshot = _snapshot_bindings(bindings)

    checks = []
    for definition, binding_snapshot in zip(
        _CANONICAL_CHECK_REGISTRY,
        snapshot,
        strict=True,
    ):
        _, probe = binding_snapshot
        probe_failed = False
        observation = None
        try:
            observation = probe()
        except Exception:
            probe_failed = True

        if probe_failed:
            _, outcome_snapshot = _exception_outcome(definition)
        else:
            observation_snapshot = _admit_probe_observation(observation)
            _, outcome_snapshot = _resolve_outcome(
                definition,
                observation_snapshot,
            )
        definition_snapshot = _admit_check_definition(definition)
        checks.append(
            DoctorCheck(
                id=definition_snapshot[0],
                status=outcome_snapshot[2],
                code=outcome_snapshot[1],
                summary=outcome_snapshot[3],
                remediation=_remediation(outcome_snapshot[5][1]),
            )
        )

    immutable_checks = tuple(checks)
    check_snapshots = tuple(
        (check, _admit_doctor_check(check)) for check in immutable_checks
    )
    status = _aggregate_check_snapshots(check_snapshots)
    result = DoctorResult(
        schema_version=SCHEMA_VERSION,
        profile_id=profile_id,
        status=status,
        checks=immutable_checks,
    )
    run = DoctorRun(
        result=result,
        exit_code=1 if status is ResultStatus.FAIL else 0,
    )
    _validate_doctor_run(run)
    return run


def validate_result(result: DoctorResult) -> None:
    """Validate the exact closed result contract without returning raw values."""

    _validated_result_snapshot(result)


def _project_snapshot(snapshot: tuple[object, ...]) -> dict[str, Any]:
    return {
        "schemaVersion": snapshot[0],
        "profileId": snapshot[1],
        "status": snapshot[2].value,
        "checks": [
            {
                "id": check_snapshot[0].value,
                "status": check_snapshot[1].value,
                "code": check_snapshot[2],
                "summary": check_snapshot[3],
                "remediation": {
                    "doc": check_snapshot[5][0],
                    "anchor": check_snapshot[5][1],
                },
            }
            for _, check_snapshot in snapshot[4]
        ],
    }


def project_result(result: DoctorResult) -> dict[str, Any]:
    """Return the only supported JSON projection."""

    return _project_snapshot(_validated_result_snapshot(result))


def render_json(result: DoctorResult) -> str:
    """Render deterministic compact JSON from a validated result."""

    snapshot = _validated_result_snapshot(result)
    return json.dumps(
        _project_snapshot(snapshot),
        ensure_ascii=True,
        separators=(",", ":"),
    )


def render_human(result: DoctorResult) -> str:
    """Render deterministic human diagnostics using only registry text."""

    snapshot = _validated_result_snapshot(result)
    lines = [f"Doctor {snapshot[1]}: {snapshot[2].value.upper()}"]
    lines.extend(
        (
            f"{check_snapshot[1].value.upper()} "
            f"{check_snapshot[0].value} "
            f"{check_snapshot[2]} - {check_snapshot[3]} "
            f"[{check_snapshot[5][0]}#{check_snapshot[5][1]}]"
        )
        for _, check_snapshot in snapshot[4]
    )
    return "\n".join(lines)
