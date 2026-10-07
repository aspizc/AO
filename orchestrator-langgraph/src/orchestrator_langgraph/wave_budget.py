"""Durable declared-capacity accounting for trusted POSIX wave cooperators.

The operator supplies a private runtime directory on a local filesystem with
flock, hard links, atomic rename and durable fsync. Primitive availability is
checked here; remote filesystem detection, RSS and child containment are not.
"""

from __future__ import annotations

import errno
import json
import os
import stat
import tempfile
import time
import uuid
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Literal, TypedDict, cast

from .wave_errors import WaveError, local_id

try:
    import fcntl
except ImportError:
    fcntl = None

SCHEMA_VERSION = "wave-budget/v1"
MAX_RECORDS = 1024
MAX_BYTES = 2 * 1024 * 1024
COUNTS = ("gatewayInstances", "agentSessions", "checkProcesses")
UNIT_KEYS = {*COUNTS, "providerSessions", "memoryMiB"}
LIMIT_KEYS = UNIT_KEYS | {"memoryHeadroomMiB"}
EFFECT_KEYS = {"gatewayId", "traceId", "sessionId", "checkId"}
ENTRY_KEYS = {"reservationId", "ownerRunId", "taskId", "attempt", "units", "effectState", "effects"}


class CapacityUnits(TypedDict):
    gatewayInstances: int
    agentSessions: int
    checkProcesses: int
    providerSessions: dict[str, int]
    memoryMiB: int


class BudgetLimits(CapacityUnits):
    memoryHeadroomMiB: int


class Reservation(TypedDict):
    reservationId: str
    ownerRunId: str
    taskId: str | None
    attempt: int | None
    units: CapacityUnits
    effectState: Literal["reserved", "possible", "active", "closed"]
    effects: dict[str, str]


class Budget(TypedDict):
    schemaVersion: str
    budgetId: str
    revision: int
    limits: BudgetLimits
    reservations: list[Reservation]


def _integer(value: object, low: int = 0, high: int | None = None) -> bool:
    return type(value) is int and value >= low and (high is None or value <= high)


def _uuid(value: object) -> bool:
    if type(value) is not str:
        return False
    try:
        return str(uuid.UUID(value)) == value
    except ValueError:
        return False


def _closed(value: object, keys: set[str]) -> bool:
    return type(value) is dict and set(value) == keys


def _json_pairs(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate JSON field")
        value[key] = item
    return value


@lru_cache(maxsize=1)
def _canonical_providers() -> frozenset[str]:
    # Reuse the existing canonical contract, never a project or task registry.
    path = Path(__file__).resolve().parents[3] / "schemas" / "orchestrator-profile-v1.schema.json"
    try:
        schema = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=_json_pairs)
        providers = schema["properties"]["providers"]
        names = providers["required"]
        if providers["additionalProperties"] is not False or set(names) != set(providers["properties"]):
            raise ValueError("invalid canonical provider contract")
        return frozenset(names)
    except (OSError, ValueError, KeyError, TypeError):
        raise WaveError("CAPACITY_STATE_UNAVAILABLE", field="providerSessions") from None


def _vector(value: object, *, limits: bool, code: str) -> None:
    field = "limits" if limits else "units"
    keys = LIMIT_KEYS if limits else UNIT_KEYS
    valid = _closed(value, keys)
    if valid:
        providers = value["providerSessions"]
        valid = (
            all(_integer(value[key], 1 if limits else 0, 128 if limits else None) for key in COUNTS)
            and type(providers) is dict
            and set(providers) <= _canonical_providers()
            and all(_integer(number, 1 if limits else 0, 128 if limits else None) for number in providers.values())
            and _integer(value["memoryMiB"], 2 if limits else 0, 1048576 if limits else None)
        )
        if valid and limits:
            valid = _integer(value["memoryHeadroomMiB"], 1, value["memoryMiB"] - 1)
        elif valid and (any(value[key] for key in COUNTS) or any(providers.values())):
            valid = value["memoryMiB"] > 0
    if not valid:
        raise WaveError(code, field=field)


def _effects(value: object, units: CapacityUnits, code: str) -> None:
    if (
        type(value) is not dict
        or not set(value) <= EFFECT_KEYS
        or not all(local_id(item) for item in value.values())
        or any(key in value and units[dimension] == 0 for key, dimension in (
            ("gatewayId", "gatewayInstances"), ("sessionId", "agentSessions"), ("checkId", "checkProcesses")
        ))
    ):
        raise WaveError(code, field="effects")


def used_capacity(budget: Budget) -> CapacityUnits:
    """Project only active declared reservations; closed history is retained."""
    used = cast(CapacityUnits, {key: 0 for key in (*COUNTS, "memoryMiB")})
    used["providerSessions"] = {}
    for entry in budget["reservations"]:
        if entry["effectState"] == "closed":
            continue
        for key in (*COUNTS, "memoryMiB"):
            used[key] += entry["units"][key]
        for provider, number in entry["units"]["providerSessions"].items():
            used["providerSessions"][provider] = used["providerSessions"].get(provider, 0) + number
    return used


def _exhausted(budget: Budget, requested: CapacityUnits) -> WaveError | None:
    used = used_capacity(budget)
    ceilings = budget["limits"]
    dimensions = [(key, ceilings[key], used[key], requested[key]) for key in COUNTS]
    dimensions.extend(("providerSessions", ceilings["providerSessions"].get(provider, 0), used["providerSessions"].get(provider, 0), number)
                      for provider, number in sorted(requested["providerSessions"].items()))
    dimensions.append(("memoryMiB", ceilings["memoryMiB"] - ceilings["memoryHeadroomMiB"], used["memoryMiB"], requested["memoryMiB"]))
    for resource, limit, charged, number in dimensions:
        if charged + number > limit:
            return WaveError("CAPACITY_EXHAUSTED", resource=resource, counters={"limit": limit, "used": charged, "requested": number})
    return None


def _validate_budget(value: object) -> Budget:
    code = "CAPACITY_STATE_INVALID"
    if not _closed(value, {"schemaVersion", "budgetId", "revision", "limits", "reservations"}):
        raise WaveError(code, field="budget")
    if value["schemaVersion"] != SCHEMA_VERSION or not _uuid(value["budgetId"]) or not _integer(value["revision"]):
        raise WaveError(code, field="budget")
    _vector(value["limits"], limits=True, code=code)
    entries = value["reservations"]
    if type(entries) is not list or len(entries) > MAX_RECORDS:
        raise WaveError(code, field="reservations")
    seen = set()
    for entry in entries:
        if not _closed(entry, ENTRY_KEYS):
            raise WaveError(code, field="reservations")
        if (
            not _uuid(entry["reservationId"]) or entry["reservationId"] in seen
            or not local_id(entry["ownerRunId"])
            or (entry["taskId"] is not None and not local_id(entry["taskId"]))
            or (entry["attempt"] is not None and not _integer(entry["attempt"], 1, 15))
            or entry["effectState"] not in ("reserved", "possible", "active", "closed")
        ):
            raise WaveError(code, field="reservations")
        seen.add(entry["reservationId"])
        _vector(entry["units"], limits=False, code=code)
        _effects(entry["effects"], entry["units"], code)
        if (entry["effectState"] == "reserved" and entry["effects"]) or (entry["effectState"] == "active" and not entry["effects"]):
            raise WaveError(code, field="effectState")
    result = cast(Budget, value)
    zero = cast(CapacityUnits, {**dict.fromkeys(COUNTS, 0), "providerSessions": used_capacity(result)["providerSessions"].copy(), "memoryMiB": 0})
    zero["providerSessions"] = dict.fromkeys(zero["providerSessions"], 0)
    if _exhausted(result, zero):
        raise WaveError(code, field="units")
    return result


def _platform_supported() -> bool:
    return os.name == "posix" and fcntl is not None and all(hasattr(os, key) for key in ("O_NOFOLLOW", "O_DIRECTORY", "replace", "link", "fsync"))


def _safe_stat(info: os.stat_result, *, directory: bool = False, immediate: bool = False) -> None:
    if directory:
        writable = info.st_mode & 0o022
        sticky_root = info.st_uid == 0 and bool(info.st_mode & stat.S_ISVTX)
        valid = stat.S_ISDIR(info.st_mode) and info.st_uid in (0, os.geteuid()) and (not writable or (sticky_root and not immediate))
        if immediate:
            valid = valid and info.st_uid == os.geteuid() and info.st_mode & 0o077 == 0
    else:
        valid = stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid == os.geteuid() and info.st_mode & 0o777 == 0o600
    if not valid:
        raise WaveError("CAPACITY_CONFIG_INVALID", field="budget")


def _canonical_path(path: str | Path) -> Path:
    try:
        raw = os.fspath(path)
        if type(raw) is not str or not raw.startswith("/"):
            raise WaveError("CAPACITY_CONFIG_INVALID", field="budget")
        # Inspect lexical ancestors before collapsing '..'; symlink aliases are unsupported.
        cursor = Path("/")
        parts = Path(raw).parts[1:]
        for part in parts[:-1]:
            cursor = cursor / part
            _safe_stat(cursor.lstat(), directory=True)
        canonical = Path(os.path.normpath(raw))
        _safe_stat(canonical.parent.lstat(), directory=True, immediate=True)
        try:
            _safe_stat(canonical.lstat())
        except FileNotFoundError:
            pass
        return canonical
    except (OSError, TypeError, ValueError):
        raise WaveError("CAPACITY_CONFIG_INVALID", field="budget") from None


def _bound_file(fd: int, path: Path) -> None:
    info = os.fstat(fd)
    _safe_stat(info)
    named = path.lstat()
    if (info.st_dev, info.st_ino) != (named.st_dev, named.st_ino):
        raise WaveError("CAPACITY_STATE_UNAVAILABLE", field="budget")


@contextmanager
def _locked(path: str | Path, timeout_ms: int):
    if not _integer(timeout_ms, 100, 10000):
        raise WaveError("CAPACITY_REQUEST_INVALID", field="lockTimeoutMs")
    if not _platform_supported():
        raise WaveError("CAPACITY_UNSUPPORTED", field="budget")
    deadline = time.monotonic() + timeout_ms / 1000
    canonical = _canonical_path(path)
    lock_path = canonical.with_name(canonical.name + ".lock")
    fd = None
    try:
        try:
            _safe_stat(lock_path.lstat())
        except FileNotFoundError:
            pass
        flags = os.O_RDWR | os.O_NOFOLLOW | os.O_NONBLOCK
        try:
            fd = os.open(lock_path, flags | os.O_CREAT | os.O_EXCL, 0o600)
            os.fchmod(fd, 0o600)
        except FileExistsError:
            fd = os.open(lock_path, flags)
        _bound_file(fd, lock_path)
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except OSError as exc:
                if exc.errno not in (errno.EAGAIN, errno.EACCES):
                    raise
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise WaveError("CAPACITY_BUSY", field="budget") from None
                time.sleep(min(0.01, remaining))
        _bound_file(fd, lock_path)
        yield canonical
    except OSError:
        raise WaveError("CAPACITY_STATE_UNAVAILABLE", field="budget") from None
    finally:
        if fd is not None:
            os.close(fd)  # Closing releases flock; the stable lock name is never removed.


def _read(path: Path) -> Budget:
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as handle:
        _bound_file(handle.fileno(), path)
        if os.fstat(handle.fileno()).st_size > MAX_BYTES:
            raise WaveError("CAPACITY_STATE_INVALID", field="budget")
        raw = handle.read(MAX_BYTES + 1)
    try:
        if len(raw) > MAX_BYTES:
            raise ValueError("oversized budget")
        value = json.loads(raw, object_pairs_hook=_json_pairs)
        return _validate_budget(value)
    except (ValueError, UnicodeError, RecursionError):
        raise WaveError("CAPACITY_STATE_INVALID", field="budget") from None


def _sync_parent(path: Path) -> None:
    fd = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def _write(path: Path, value: Budget, *, create: bool = False) -> None:
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            os.fchmod(handle.fileno(), 0o600)
            json.dump(value, handle, sort_keys=True, separators=(",", ":"), allow_nan=False)
            handle.flush()
            os.fsync(handle.fileno())
        if create:
            # Atomic exclusive publication: a pre-existing ledger is never replaced.
            os.link(temporary, path, follow_symlinks=False)
            os.unlink(temporary)
        else:
            os.replace(temporary, path)
        _sync_parent(path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def initialize_budget(path: str | Path, limits: BudgetLimits, *, lock_timeout_ms: int = 1000) -> Budget:
    _vector(limits, limits=True, code="CAPACITY_CONFIG_INVALID")
    with _locked(path, lock_timeout_ms) as canonical:
        if canonical.exists():
            existing = _read(canonical)
            if existing["limits"] != limits:
                raise WaveError("CAPACITY_CONFIG_CONFLICT", field="limits")
            return existing
        value = cast(Budget, {"schemaVersion": SCHEMA_VERSION, "budgetId": str(uuid.uuid4()), "revision": 0, "limits": limits, "reservations": []})
        _write(canonical, value, create=True)
        return value


def read_budget(path: str | Path, *, lock_timeout_ms: int = 1000) -> Budget:
    with _locked(path, lock_timeout_ms) as canonical:
        return _read(canonical)


def reserve_capacity(
    path: str | Path, owner_run_id: str, units: CapacityUnits, *,
    task_id: str | None = None, attempt: int | None = None, lock_timeout_ms: int = 1000,
) -> Reservation:
    _vector(units, limits=False, code="CAPACITY_REQUEST_INVALID")
    if not local_id(owner_run_id) or (task_id is not None and not local_id(task_id)) or (attempt is not None and not _integer(attempt, 1, 15)):
        raise WaveError("CAPACITY_REQUEST_INVALID", field="reservation")
    with _locked(path, lock_timeout_ms) as canonical:
        value = _read(canonical)
        if len(value["reservations"]) == MAX_RECORDS:
            raise WaveError("CAPACITY_STATE_FULL", field="reservations")
        exhausted = _exhausted(value, units)
        if exhausted:
            raise exhausted
        entry = cast(Reservation, {"reservationId": str(uuid.uuid4()), "ownerRunId": owner_run_id, "taskId": task_id, "attempt": attempt,
                                  "units": units, "effectState": "reserved", "effects": {}})
        value["reservations"].append(entry)
        value["revision"] += 1
        _write(canonical, value)
        return entry


def _owned(value: Budget, owner: str, reservation_id: str) -> Reservation:
    if not local_id(owner) or not _uuid(reservation_id):
        raise WaveError("CAPACITY_REQUEST_INVALID", field="reservation")
    for entry in value["reservations"]:
        if entry["reservationId"] == reservation_id:
            if entry["ownerRunId"] != owner:
                raise WaveError("CAPACITY_CONFLICT", field="ownerRunId")
            return entry
    raise WaveError("CAPACITY_RESERVATION_UNKNOWN", field="reservationId")


def mark_possible_effect(path: str | Path, owner_run_id: str, reservation_id: str, *, lock_timeout_ms: int = 1000) -> Reservation:
    with _locked(path, lock_timeout_ms) as canonical:
        value = _read(canonical)
        entry = _owned(value, owner_run_id, reservation_id)
        if entry["effectState"] == "reserved":
            entry["effectState"] = "possible"
            value["revision"] += 1
            _write(canonical, value)
        return entry


def record_effect(path: str | Path, owner_run_id: str, reservation_id: str, effects: dict[str, str], *, lock_timeout_ms: int = 1000) -> Reservation:
    with _locked(path, lock_timeout_ms) as canonical:
        value = _read(canonical)
        entry = _owned(value, owner_run_id, reservation_id)
        _effects(effects, entry["units"], "CAPACITY_REQUEST_INVALID")
        if not effects:
            raise WaveError("CAPACITY_REQUEST_INVALID", field="effects")
        if entry["effectState"] == "reserved" or any(key in entry["effects"] and entry["effects"][key] != item for key, item in effects.items()):
            raise WaveError("CAPACITY_CONFLICT", field="effects")
        if all(entry["effects"].get(key) == item for key, item in effects.items()):
            return entry
        if entry["effectState"] == "closed":
            raise WaveError("CAPACITY_CONFLICT", field="effects")
        entry["effects"].update(effects)
        entry["effectState"] = "active"
        value["revision"] += 1
        _write(canonical, value)
        return entry


def release_capacity(
    path: str | Path, owner_run_id: str, reservation_id: str, *,
    confirmation: Literal["no_effect", "closed"] | None = None, lock_timeout_ms: int = 1000,
) -> Reservation:
    """Retire only the owner's record on its explicit knowledge of retirement.

    Confirmation is cooperative caller evidence, not authenticated authority.
    Missing confirmation after dispatch intent keeps the entire vector held.
    """
    if confirmation not in (None, "no_effect", "closed"):
        raise WaveError("CAPACITY_REQUEST_INVALID", field="confirmation")
    with _locked(path, lock_timeout_ms) as canonical:
        value = _read(canonical)
        entry = _owned(value, owner_run_id, reservation_id)
        if entry["effectState"] == "closed":
            return entry
        if entry["effectState"] != "reserved" and confirmation is None:
            raise WaveError("CAPACITY_RECOVERY_REQUIRED", field="effectState")
        entry["effectState"] = "closed"
        value["revision"] += 1
        _write(canonical, value)
        return entry
