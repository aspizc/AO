"""Closed, injected provider-login, coordination, and authority probes.

The probes retain only the reviewed execution mode and an injected command
capability. Command output is outside this module's contract and is never
accepted or inspected.
"""

from __future__ import annotations

from enum import Enum
from typing import Final, Protocol

from . import doctor

FINAL_PROBE_CHECK_ORDER: Final = (
    "claude-login",
    "codex-login",
    "coordination",
    "coordination-scope",
    "isolation",
    "state-ownership",
)
PROVIDER_COMMAND_TIMEOUT_SECONDS: Final = 5.0

_CLAUDE_VERSION_ARGV: Final = ("claude", "--version")
_CLAUDE_LOGIN_STATUS_ARGV: Final = ("claude", "auth", "status")
_CODEX_VERSION_ARGV: Final = ("codex", "--version")
_CODEX_LOGIN_STATUS_ARGV: Final = ("codex", "login", "status")

_COORDINATION_READY: Final = "COORDINATION_READY"
_COORDINATION_UNAVAILABLE: Final = "COORDINATION_UNAVAILABLE"
_COORDINATION_PROBE_ERROR: Final = "COORDINATION_PROBE_ERROR"
_COORDINATION_SCOPE_MATCH: Final = "COORDINATION_SCOPE_MATCH"
_COORDINATION_SCOPE_MISMATCH: Final = "COORDINATION_SCOPE_MISMATCH"
_COORDINATION_SCOPE_PROBE_ERROR: Final = "COORDINATION_SCOPE_PROBE_ERROR"

_ISOLATION_READY: Final = "ISOLATION_READY"
_ISOLATION_UNAVAILABLE: Final = "ISOLATION_UNAVAILABLE"
_ISOLATION_PROBE_ERROR: Final = "ISOLATION_PROBE_ERROR"
_STATE_OWNERSHIP_OWNED: Final = "STATE_OWNERSHIP_OWNED"
_STATE_OWNERSHIP_CONFLICT: Final = "STATE_OWNERSHIP_CONFLICT"
_STATE_OWNERSHIP_STALE: Final = "STATE_OWNERSHIP_STALE"
_STATE_OWNERSHIP_UNVERIFIABLE: Final = "STATE_OWNERSHIP_UNVERIFIABLE"
_STATE_OWNERSHIP_PROBE_ERROR: Final = "STATE_OWNERSHIP_PROBE_ERROR"

_AUTHORITY_UNAVAILABLE_CODES: Final = (
    _ISOLATION_UNAVAILABLE,
    _STATE_OWNERSHIP_UNVERIFIABLE,
)
_AUTHORITY_PROBE_ERROR_CODES: Final = (
    _ISOLATION_PROBE_ERROR,
    _STATE_OWNERSHIP_PROBE_ERROR,
)


class CommandStatus(str, Enum):
    """The complete output-blind result accepted from a bounded runner."""

    SUCCESS = "success"
    NOT_FOUND = "not-found"
    FAILED = "failed"
    TIMED_OUT = "timed-out"


class IsolationStatus(Enum):
    """The complete isolation status accepted from D-owned authority."""

    READY = "ready"
    UNAVAILABLE = "unavailable"


class StateOwnershipStatus(Enum):
    """The complete state-ownership status accepted from D-owned authority."""

    OWNED = "owned"
    FOREIGN_SECOND_WRITER = "foreign-second-writer"
    STALE = "stale"
    OPAQUE = "opaque"


class BoundedRunner(Protocol):
    """Run fixed argv within the supplied finite bound and discard all output."""

    def __call__(
        self,
        argv: tuple[str, ...],
        *,
        timeout_seconds: float,
    ) -> CommandStatus: ...


class _ExecutionMode(Enum):
    AVAILABLE = "available"
    REGISTRY_ONLY = "registry-only"
    INVALID = "invalid"


class _Provider(Enum):
    CLAUDE = "claude-code"
    CODEX = "codex"


def _execution_mode(providers: object, provider: _Provider) -> _ExecutionMode:
    if type(providers) is not dict:
        return _ExecutionMode.INVALID
    try:
        entry = dict.get(providers, provider.value)
        if type(entry) is not dict:
            return _ExecutionMode.INVALID
        execution = dict.get(entry, "execution")
        if type(execution) is not str:
            return _ExecutionMode.INVALID
        if execution == _ExecutionMode.AVAILABLE.value:
            return _ExecutionMode.AVAILABLE
        if execution == _ExecutionMode.REGISTRY_ONLY.value:
            return _ExecutionMode.REGISTRY_ONLY
        return _ExecutionMode.INVALID
    except Exception:
        return _ExecutionMode.INVALID


def _observation(
    status: doctor.ProbeStatus,
    code: str,
) -> doctor.ProbeObservation:
    return doctor.ProbeObservation(status, code)


class _ProviderLoginProbe:
    __slots__ = ("_execution", "_provider", "_runner")

    def __init__(
        self,
        provider: _Provider,
        execution: _ExecutionMode,
        runner: BoundedRunner,
    ) -> None:
        self._provider = provider
        self._execution = execution
        self._runner = runner

    def __call__(self) -> doctor.ProbeObservation:
        if self._execution is _ExecutionMode.REGISTRY_ONLY:
            return _not_required(self._provider)
        if self._execution is not _ExecutionMode.AVAILABLE:
            return _probe_error(self._provider)

        version_argv, login_argv = _commands(self._provider)
        try:
            version_status = self._runner(
                version_argv,
                timeout_seconds=PROVIDER_COMMAND_TIMEOUT_SECONDS,
            )
            version_observation = _version_failure(
                self._provider,
                version_status,
            )
            if version_observation is not None:
                return version_observation

            login_status = self._runner(
                login_argv,
                timeout_seconds=PROVIDER_COMMAND_TIMEOUT_SECONDS,
            )
            return _login_observation(self._provider, login_status)
        except FileNotFoundError:
            return _unavailable(self._provider)
        except TimeoutError:
            return _timed_out(self._provider)
        except Exception:
            return _probe_error(self._provider)


class _StaticProbe:
    __slots__ = ("_code", "_status")

    def __init__(self, status: doctor.ProbeStatus, code: str) -> None:
        self._status = status
        self._code = code

    def __call__(self) -> doctor.ProbeObservation:
        return _observation(self._status, self._code)


def _commands(
    provider: _Provider,
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    if provider is _Provider.CLAUDE:
        return _CLAUDE_VERSION_ARGV, _CLAUDE_LOGIN_STATUS_ARGV
    return _CODEX_VERSION_ARGV, _CODEX_LOGIN_STATUS_ARGV


def _prefix(provider: _Provider) -> str:
    if provider is _Provider.CLAUDE:
        return "CLAUDE"
    return "CODEX"


def _not_required(provider: _Provider) -> doctor.ProbeObservation:
    return _observation(
        doctor.ProbeStatus.PASS,
        f"{_prefix(provider)}_LOGIN_NOT_REQUIRED",
    )


def _unavailable(provider: _Provider) -> doctor.ProbeObservation:
    return _observation(
        doctor.ProbeStatus.FAIL,
        f"{_prefix(provider)}_CLI_UNAVAILABLE",
    )


def _timed_out(provider: _Provider) -> doctor.ProbeObservation:
    return _observation(
        doctor.ProbeStatus.FAIL,
        f"{_prefix(provider)}_LOGIN_TIMEOUT",
    )


def _login_required(provider: _Provider) -> doctor.ProbeObservation:
    return _observation(
        doctor.ProbeStatus.FAIL,
        f"{_prefix(provider)}_LOGIN_REQUIRED",
    )


def _probe_error(provider: _Provider) -> doctor.ProbeObservation:
    return _observation(
        doctor.ProbeStatus.FAIL,
        f"{_prefix(provider)}_LOGIN_PROBE_ERROR",
    )


def _version_failure(
    provider: _Provider,
    status: object,
) -> doctor.ProbeObservation | None:
    if status is CommandStatus.SUCCESS:
        return None
    if status is CommandStatus.NOT_FOUND or status is CommandStatus.FAILED:
        return _unavailable(provider)
    if status is CommandStatus.TIMED_OUT:
        return _timed_out(provider)
    return _probe_error(provider)


def _login_observation(
    provider: _Provider,
    status: object,
) -> doctor.ProbeObservation:
    if status is CommandStatus.SUCCESS:
        return _observation(
            doctor.ProbeStatus.PASS,
            f"{_prefix(provider)}_LOGIN_READY",
        )
    if status is CommandStatus.NOT_FOUND:
        return _unavailable(provider)
    if status is CommandStatus.TIMED_OUT:
        return _timed_out(provider)
    if status is CommandStatus.FAILED:
        return _login_required(provider)
    return _probe_error(provider)


def create_provider_login_bindings(
    providers: object,
    runner: BoundedRunner,
) -> tuple[doctor.ProbeBinding, doctor.ProbeBinding]:
    """Create the two provider bindings without retaining provider config."""

    return (
        doctor.ProbeBinding(
            doctor.CheckId.CLAUDE_LOGIN,
            _ProviderLoginProbe(
                _Provider.CLAUDE,
                _execution_mode(providers, _Provider.CLAUDE),
                runner,
            ),
        ),
        doctor.ProbeBinding(
            doctor.CheckId.CODEX_LOGIN,
            _ProviderLoginProbe(
                _Provider.CODEX,
                _execution_mode(providers, _Provider.CODEX),
                runner,
            ),
        ),
    )


def _coordination_snapshot_codes(snapshot: object) -> tuple[str, str]:
    probe_error = (
        _COORDINATION_PROBE_ERROR,
        _COORDINATION_SCOPE_PROBE_ERROR,
    )
    if type(snapshot) is not dict or dict.__len__(snapshot) != 2:
        return probe_error

    coordination = None
    coordination_scope = None
    try:
        for key, value in dict.items(snapshot):
            if type(key) is not str or type(value) is not str:
                return probe_error
            if key == "coordination":
                coordination = value
            elif key == "coordinationScope":
                coordination_scope = value
            else:
                return probe_error
    except Exception:
        return probe_error

    allowed = (
        (_COORDINATION_READY, _COORDINATION_SCOPE_MATCH),
        (_COORDINATION_READY, _COORDINATION_SCOPE_MISMATCH),
        (_COORDINATION_READY, _COORDINATION_SCOPE_PROBE_ERROR),
        (_COORDINATION_UNAVAILABLE, _COORDINATION_SCOPE_PROBE_ERROR),
        (_COORDINATION_PROBE_ERROR, _COORDINATION_SCOPE_PROBE_ERROR),
    )
    for expected_coordination, expected_scope in allowed:
        if (
            coordination == expected_coordination
            and coordination_scope == expected_scope
        ):
            return expected_coordination, expected_scope
    return probe_error


def create_coordination_bindings(
    snapshot: object,
) -> tuple[doctor.ProbeBinding, doctor.ProbeBinding]:
    """Map one detached Gateway snapshot into the two coordination checks."""

    coordination, coordination_scope = _coordination_snapshot_codes(snapshot)
    coordination_status = (
        doctor.ProbeStatus.PASS
        if coordination == _COORDINATION_READY
        else doctor.ProbeStatus.FAIL
    )
    scope_status = (
        doctor.ProbeStatus.PASS
        if coordination_scope == _COORDINATION_SCOPE_MATCH
        else doctor.ProbeStatus.FAIL
    )
    return (
        doctor.ProbeBinding(
            doctor.CheckId.COORDINATION,
            _StaticProbe(coordination_status, coordination),
        ),
        doctor.ProbeBinding(
            doctor.CheckId.COORDINATION_SCOPE,
            _StaticProbe(scope_status, coordination_scope),
        ),
    )


def _authority_status_codes(candidate: object) -> tuple[str, str]:
    if type(candidate) is not tuple or tuple.__len__(candidate) != 2:
        return _AUTHORITY_UNAVAILABLE_CODES

    isolation = tuple.__getitem__(candidate, 0)
    ownership = tuple.__getitem__(candidate, 1)
    if (
        type(isolation) is not IsolationStatus
        or type(ownership) is not StateOwnershipStatus
    ):
        return _AUTHORITY_UNAVAILABLE_CODES

    isolation_code = (
        _ISOLATION_READY
        if isolation is IsolationStatus.READY
        else _ISOLATION_UNAVAILABLE
    )
    if ownership is StateOwnershipStatus.OWNED:
        ownership_code = _STATE_OWNERSHIP_OWNED
    elif ownership is StateOwnershipStatus.FOREIGN_SECOND_WRITER:
        ownership_code = _STATE_OWNERSHIP_CONFLICT
    elif ownership is StateOwnershipStatus.STALE:
        ownership_code = _STATE_OWNERSHIP_STALE
    else:
        ownership_code = _STATE_OWNERSHIP_UNVERIFIABLE
    return isolation_code, ownership_code


class _AuthoritySnapshot:
    __slots__ = ("_capability", "_codes")

    def __init__(self, capability: object) -> None:
        self._capability = capability if callable(capability) else None
        self._codes: tuple[str, str] | None = None

    def codes(self) -> tuple[str, str]:
        codes = self._codes
        if codes is not None:
            return codes

        capability = self._capability
        self._capability = None
        if capability is None:
            codes = _AUTHORITY_UNAVAILABLE_CODES
        else:
            try:
                candidate = capability()
            except Exception:
                codes = _AUTHORITY_PROBE_ERROR_CODES
            else:
                codes = _authority_status_codes(candidate)
        self._codes = codes
        return codes


class _AuthorityProbe:
    __slots__ = ("_index", "_snapshot")

    def __init__(self, snapshot: _AuthoritySnapshot, index: int) -> None:
        self._snapshot = snapshot
        self._index = index

    def __call__(self) -> doctor.ProbeObservation:
        code = self._snapshot.codes()[self._index]
        status = (
            doctor.ProbeStatus.PASS
            if code in (_ISOLATION_READY, _STATE_OWNERSHIP_OWNED)
            else doctor.ProbeStatus.FAIL
        )
        return _observation(status, code)


def create_authority_bindings(
    capability: object = None,
) -> tuple[doctor.ProbeBinding, doctor.ProbeBinding]:
    """Create fail-closed authority bindings around one optional capability."""

    snapshot = _AuthoritySnapshot(capability)
    return (
        doctor.ProbeBinding(
            doctor.CheckId.ISOLATION,
            _AuthorityProbe(snapshot, 0),
        ),
        doctor.ProbeBinding(
            doctor.CheckId.STATE_OWNERSHIP,
            _AuthorityProbe(snapshot, 1),
        ),
    )


def create_doctor_probe_bindings(
    *,
    providers: object,
    runner: BoundedRunner,
    coordination_snapshot: object,
    authority_capability: object = None,
) -> tuple[doctor.ProbeBinding, ...]:
    """Compose all six final Doctor probe bindings in canonical order."""

    return (
        create_provider_login_bindings(providers, runner)
        + create_coordination_bindings(coordination_snapshot)
        + create_authority_bindings(authority_capability)
    )
