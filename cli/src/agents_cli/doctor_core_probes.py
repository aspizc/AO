"""Deterministic bindings for the six injected Doctor core inputs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from . import doctor


@dataclass(frozen=True, slots=True)
class CoreProbeInputs:
    """Closed input signals collected before Doctor composition."""

    config_valid: bool
    dependencies_ready: bool
    policy_valid: bool
    profile_valid: bool
    repository_canonical: bool
    runtime_supported: bool

    def __post_init__(self) -> None:
        if any(
            type(object.__getattribute__(self, name)) is not bool
            for name in self.__dataclass_fields__
        ):
            raise doctor.DoctorContractError() from None


_CORE_SPECS: Final = (
    (
        "CONFIG",
        "config_valid",
        "CONFIG_VALID",
        "CONFIG_MISSING",
    ),
    (
        "DEPENDENCY",
        "dependencies_ready",
        "DEPENDENCIES_READY",
        "REQUIRED_DEPENDENCY_MISSING",
    ),
    (
        "POLICY",
        "policy_valid",
        "POLICY_VALID",
        "POLICY_INVALID",
    ),
    (
        "PROFILE",
        "profile_valid",
        "PROFILE_VALID",
        "PROFILE_INVALID",
    ),
    (
        "REPOSITORY",
        "repository_canonical",
        "REPOSITORY_CANONICAL",
        "REPOSITORY_NONCANONICAL",
    ),
    (
        "RUNTIME",
        "runtime_supported",
        "RUNTIME_SUPPORTED",
        "RUNTIME_UNSUPPORTED",
    ),
)


class _CoreProbe:
    __slots__ = ("_code", "_status")

    def __init__(self, status: doctor.ProbeStatus, code: str) -> None:
        self._status = status
        self._code = code

    def __call__(self) -> doctor.ProbeObservation:
        return doctor.ProbeObservation(self._status, self._code)


def create_doctor_core_bindings(inputs: object) -> tuple[doctor.ProbeBinding, ...]:
    """Bind the six exact core signals in the canonical Doctor order."""

    if type(inputs) is not CoreProbeInputs:
        raise doctor.DoctorContractError() from None

    bindings = []
    for check_id_name, input_name, ready_code, failed_code in _CORE_SPECS:
        ready = object.__getattribute__(inputs, input_name)
        if type(ready) is not bool:
            raise doctor.DoctorContractError() from None
        bindings.append(
            doctor.ProbeBinding(
                doctor.CheckId[check_id_name],
                _CoreProbe(
                    doctor.ProbeStatus.PASS if ready else doctor.ProbeStatus.FAIL,
                    ready_code if ready else failed_code,
                ),
            )
        )
    return tuple(bindings)
