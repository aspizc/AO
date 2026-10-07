"""Intent tests for durable admission shared by independent local processes."""

from __future__ import annotations

import copy
import gc
import importlib
import json
import multiprocessing
import os
import time
import uuid
from pathlib import Path

import pytest


@pytest.fixture(scope="module", autouse=True)
def owned_spawn_runtime():
    # Spawn starts a stdlib helper that normally outlives pytest. Retire only
    # the tracker created by this module, after its workers and resources exit.
    from multiprocessing import resource_tracker

    tracker = resource_tracker._resource_tracker
    inherited_tracker = (tracker._pid, tracker._fd)
    yield
    assert not multiprocessing.active_children(), "capacity tests left owned workers"
    gc.collect()
    if inherited_tracker == (None, None):
        tracker._stop()  # Close the helper pipe and wait for its owned child.


@pytest.fixture
def budget():
    return importlib.import_module("orchestrator_langgraph.wave_budget")


def limits(**changes):
    value = {
        "gatewayInstances": 2,
        "agentSessions": 2,
        "checkProcesses": 2,
        "providerSessions": {"codex": 2},
        "memoryMiB": 128,
        "memoryHeadroomMiB": 16,
    }
    value.update(changes)
    return value


def units(**changes):
    value = {
        "gatewayInstances": 0,
        "agentSessions": 1,
        "checkProcesses": 0,
        "providerSessions": {"codex": 1},
        "memoryMiB": 32,
    }
    value.update(changes)
    return value


def error(budget, code, call, *args, **kwargs):
    with pytest.raises(budget.WaveError) as exc:
        call(*args, **kwargs)
    assert exc.value.outcome_code == code
    assert exc.value.to_dict()["schemaVersion"] == "wave-error/v1"
    return exc.value


def _contender(path, vector, barrier, queue):
    module = importlib.import_module("orchestrator_langgraph.wave_budget")
    barrier.wait(timeout=10)
    try:
        entry = module.reserve_capacity(path, str(uuid.uuid4()), vector)
        queue.put(("admitted", entry["reservationId"]))
    except module.WaveError as exc:
        queue.put((exc.outcome_code, exc.to_dict()))


def race(path, vector, alias=None):
    context = multiprocessing.get_context("spawn")
    barrier = context.Barrier(3)
    queue = context.Queue()
    children = [
        context.Process(target=_contender, args=(str(target), vector, barrier, queue))
        for target in (path, alias or path)
    ]
    for child in children:
        child.start()
    barrier.wait(timeout=10)
    results = [queue.get(timeout=10) for _ in children]
    for child in children:
        child.join(timeout=10)
        assert child.exitcode == 0
    queue.close()
    return results


@pytest.mark.parametrize("dimension", ["gatewayInstances", "agentSessions", "checkProcesses", "providerSessions"])
def test_two_processes_cannot_oversubscribe_any_dimension(budget, tmp_path, dimension):
    path = tmp_path / "budget.json"
    ceiling = limits(**{dimension: {"codex": 1} if dimension == "providerSessions" else 1})
    budget.initialize_budget(path, ceiling)
    vector = units(gatewayInstances=1, checkProcesses=1)
    results = race(path, vector)
    assert sorted(result[0] for result in results) == ["CAPACITY_EXHAUSTED", "admitted"]
    snapshot = budget.read_budget(path)
    assert len(snapshot["reservations"]) == 1
    assert budget.used_capacity(snapshot) == vector
    assert snapshot["revision"] == 1


def test_two_processes_respect_memory_ceiling_minus_headroom(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(memoryMiB=80, memoryHeadroomMiB=16))
    results = race(path, units(memoryMiB=40))
    assert sorted(result[0] for result in results) == ["CAPACITY_EXHAUSTED", "admitted"]
    rejected = next(item[1] for item in results if item[0] == "CAPACITY_EXHAUSTED")
    assert rejected["resource"] == "memoryMiB"
    assert rejected["counters"] == {"limit": 64, "used": 40, "requested": 40}
    assert budget.used_capacity(budget.read_budget(path))["memoryMiB"] == 40


def test_failed_vector_reservation_has_no_partial_charge(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits(providerSessions={"codex": 1}))
    error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-a", units(providerSessions={"codex": 2}))
    assert budget.read_budget(path) == before


def test_memory_exhaustion_rejects_the_entire_count_and_memory_vector(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits(memoryMiB=64, memoryHeadroomMiB=32))
    error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-a", units(gatewayInstances=1, checkProcesses=1, memoryMiB=33))
    assert budget.read_budget(path) == before
    assert budget.used_capacity(before) == units(agentSessions=0, providerSessions={}, memoryMiB=0)


@pytest.mark.parametrize("change", [
    {"memoryMiB": 0}, {"memoryMiB": None}, {"memoryMiB": True},
    {"extra": 1}, {"agentSessions": -1}, {"providerSessions": {"codex-alias": 1}},
])
def test_memory_headroom_and_missing_declarations_cannot_be_bypassed(budget, tmp_path, change):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    error(budget, "CAPACITY_REQUEST_INVALID", budget.reserve_capacity, path, "run-a", units(**change))
    missing = units()
    del missing["memoryMiB"]
    error(budget, "CAPACITY_REQUEST_INVALID", budget.reserve_capacity, path, "run-a", missing)
    assert budget.read_budget(path) == before


@pytest.mark.parametrize("dimension", ["gatewayInstances", "agentSessions", "checkProcesses", "providerSessions"])
def test_each_effect_dimension_requires_its_own_memory_declaration(budget, tmp_path, dimension):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    vector = units(agentSessions=0, providerSessions={}, memoryMiB=0)
    vector[dimension] = {"codex": 1} if dimension == "providerSessions" else 1
    error(budget, "CAPACITY_REQUEST_INVALID", budget.reserve_capacity, path, "run-a", vector)
    assert budget.read_budget(path) == before


def _crashed_owner(path, queue, state):
    module = importlib.import_module("orchestrator_langgraph.wave_budget")
    entry = module.reserve_capacity(path, "run-crashed", units(memoryMiB=48))
    module.mark_possible_effect(path, "run-crashed", entry["reservationId"])
    if state == "active":
        module.record_effect(path, "run-crashed", entry["reservationId"], {"sessionId": "ss-surviving", "traceId": "tr-surviving"})
    queue.put(entry["reservationId"])
    queue.close()
    queue.join_thread()
    os._exit(23)


def crashed(path, state="possible"):
    context = multiprocessing.get_context("spawn")
    queue = context.Queue()
    child = context.Process(target=_crashed_owner, args=(str(path), queue, state))
    child.start()
    reservation_id = queue.get(timeout=10)
    child.join(timeout=10)
    assert child.exitcode == 23
    queue.close()
    return reservation_id


def test_crashed_owner_possible_effect_keeps_capacity(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    reservation_id = crashed(path)
    error(budget, "CAPACITY_RECOVERY_REQUIRED", budget.release_capacity, path, "run-crashed", reservation_id)
    error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-next", units())
    assert budget.read_budget(path)["reservations"][0]["effectState"] == "possible"


def test_lock_release_does_not_release_surviving_session_capacity(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    context = multiprocessing.get_context("spawn")
    ready, finish = context.Event(), context.Event()
    survivor = context.Process(target=_surviving_effect, args=(ready, finish))
    survivor.start()
    assert ready.wait(timeout=10)
    try:
        reservation_id = crashed(path, "active")
        assert survivor.is_alive()
        snapshot = budget.read_budget(path)
        assert snapshot["reservations"][0]["effects"]["sessionId"] == "ss-surviving"
        error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-next", units())
        error(budget, "CAPACITY_RECOVERY_REQUIRED", budget.release_capacity, path, "run-crashed", reservation_id)
        assert survivor.is_alive()
    finally:
        finish.set()
        survivor.join(timeout=10)
    assert survivor.exitcode == 0
    budget.release_capacity(path, "run-crashed", reservation_id, confirmation="closed")
    assert budget.used_capacity(budget.read_budget(path))["agentSessions"] == 0


def _surviving_effect(ready, finish):
    ready.set()
    assert finish.wait(timeout=10)


def test_crashed_possible_effect_keeps_its_declared_memory_charge(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(memoryMiB=64, memoryHeadroomMiB=16))
    crashed(path)
    exc = error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-next", units(memoryMiB=1))
    assert exc.to_dict()["counters"] == {"limit": 48, "used": 48, "requested": 1}
    assert budget.used_capacity(budget.read_budget(path))["memoryMiB"] == 48


@pytest.mark.parametrize("damage", ["truncated", "version", "extra", "duplicate", "over-limit", "units-extra", "missing", "effect", "effect-state"])
def test_corrupt_ledger_never_initializes_empty_capacity(budget, tmp_path, damage):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    entry = budget.reserve_capacity(path, "run-a", units())
    value = json.loads(path.read_text())
    if damage == "version":
        value["schemaVersion"] = "wave-budget/v2"
    elif damage == "extra":
        value["prompt"] = "private-secret-canary"
    elif damage == "duplicate":
        value["reservations"].append(copy.deepcopy(value["reservations"][0]))
    elif damage == "over-limit":
        value["reservations"][0]["units"]["agentSessions"] = 2
    elif damage == "units-extra":
        value["reservations"][0]["units"]["pid"] = 123
    elif damage == "missing":
        del value["reservations"][0]["effects"]
    elif damage == "effect":
        value["reservations"][0]["effects"] = {"sessionId": "private-secret-canary\n"}
    elif damage == "effect-state":
        value["reservations"][0]["effectState"] = "expired"
    path.write_text("{" if damage == "truncated" else json.dumps(value))
    raw = path.read_bytes()
    for call, args in [(budget.read_budget, ()), (budget.initialize_budget, (limits(),)), (budget.reserve_capacity, ("run-b", units())), (budget.release_capacity, ("run-a", entry["reservationId"]))]:
        exc = error(budget, "CAPACITY_STATE_INVALID", call, path, *args)
        assert "private-secret-canary" not in str(exc) + json.dumps(exc.to_dict())
        assert path.read_bytes() == raw


def test_release_cannot_target_another_runs_reservation(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    entry = budget.reserve_capacity(path, "run-a", units())
    before = budget.read_budget(path)
    error(budget, "CAPACITY_CONFLICT", budget.release_capacity, path, "run-b", entry["reservationId"], confirmation="closed")
    assert budget.read_budget(path) == before


def test_reserved_release_and_confirmed_close_are_owner_scoped_and_idempotent(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    entry = budget.reserve_capacity(path, "run-a", units(), task_id="task-a", attempt=1)
    closed = budget.release_capacity(path, "run-a", entry["reservationId"])
    revision = budget.read_budget(path)["revision"]
    assert closed["effectState"] == "closed"
    assert budget.release_capacity(path, "run-a", entry["reservationId"]) == closed
    assert budget.read_budget(path)["revision"] == revision
    next_entry = budget.reserve_capacity(path, "run-a", units())
    budget.mark_possible_effect(path, "run-a", next_entry["reservationId"])
    budget.release_capacity(path, "run-a", next_entry["reservationId"], confirmation="no_effect")
    assert budget.used_capacity(budget.read_budget(path))["memoryMiB"] == 0


def test_effect_retries_bind_safe_ids_without_contradiction_or_extra_revision(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    entry = budget.reserve_capacity(path, "run-a", units())
    reservation_id = entry["reservationId"]
    error(budget, "CAPACITY_CONFLICT", budget.record_effect, path, "run-a", reservation_id, {"sessionId": "ss-a"})
    possible = budget.mark_possible_effect(path, "run-a", reservation_id)
    assert budget.mark_possible_effect(path, "run-a", reservation_id) == possible
    active = budget.record_effect(path, "run-a", reservation_id, {"sessionId": "ss-a", "traceId": "tr-a"})
    revision = budget.read_budget(path)["revision"]
    assert budget.record_effect(path, "run-a", reservation_id, active["effects"]) == active
    assert budget.read_budget(path)["revision"] == revision
    error(budget, "CAPACITY_CONFLICT", budget.record_effect, path, "run-a", reservation_id, {"sessionId": "ss-b"})
    error(budget, "CAPACITY_REQUEST_INVALID", budget.record_effect, path, "run-a", reservation_id, {"pid": 99})
    closed = budget.release_capacity(path, "run-a", reservation_id, confirmation="closed")
    assert budget.record_effect(path, "run-a", reservation_id, active["effects"]) == closed


def test_unknown_reservation_never_mutates_state(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    for call, tail in [(budget.mark_possible_effect, ()), (budget.record_effect, ({"sessionId": "ss-a"},)), (budget.release_capacity, ())]:
        error(budget, "CAPACITY_RESERVATION_UNKNOWN", call, path, "run-a", str(uuid.uuid4()), *tail)
    assert budget.read_budget(path) == before


def test_atomic_write_failure_preserves_previous_complete_state(budget, tmp_path, monkeypatch):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    raw = path.read_bytes()
    def fail_replace(*_args):
        raise OSError("secret-write-failure-canary")
    monkeypatch.setattr(budget.os, "replace", fail_replace)
    exc = error(budget, "CAPACITY_STATE_UNAVAILABLE", budget.reserve_capacity, path, "run-a", units())
    assert "secret-write-failure-canary" not in str(exc) + json.dumps(exc.to_dict())
    assert budget.read_budget(path) == before
    assert path.read_bytes() == raw
    assert list(tmp_path.glob("*.tmp")) == []


def test_file_sync_failure_cannot_publish_or_return_an_admission(budget, tmp_path, monkeypatch):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    raw = path.read_bytes()
    monkeypatch.setattr(budget.os, "fsync", lambda *_args: (_ for _ in ()).throw(OSError("private-fsync-canary")))
    exc = error(budget, "CAPACITY_STATE_UNAVAILABLE", budget.reserve_capacity, path, "run-a", units())
    assert "private-fsync-canary" not in json.dumps(exc.to_dict())
    assert budget.read_budget(path) == before
    assert path.read_bytes() == raw
    assert list(tmp_path.glob("*.tmp")) == []


def test_failure_after_replace_keeps_observable_charge(budget, tmp_path, monkeypatch):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    with monkeypatch.context() as patch:
        patch.setattr(budget, "_sync_parent", lambda *_args: (_ for _ in ()).throw(OSError("private-canary")))
        error(budget, "CAPACITY_STATE_UNAVAILABLE", budget.reserve_capacity, path, "run-a", units())
    snapshot = budget.read_budget(path)
    assert snapshot["revision"] == 1
    assert budget.used_capacity(snapshot)["agentSessions"] == 1
    error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-b", units())


def test_budget_init_cannot_raise_existing_limits(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits(agentSessions=1))
    assert budget.initialize_budget(path, limits(agentSessions=1)) == before
    error(budget, "CAPACITY_CONFIG_CONFLICT", budget.initialize_budget, path, limits(agentSessions=2))
    assert budget.read_budget(path) == before
    assert path.stat().st_mode & 0o777 == 0o600


def test_created_budget_and_stable_lock_are_0600_under_restrictive_umask(budget, tmp_path):
    path = tmp_path / "budget.json"
    previous = os.umask(0o777)
    try:
        budget.initialize_budget(path, limits())
    finally:
        os.umask(previous)
    assert path.stat().st_mode & 0o777 == 0o600
    assert path.with_name(path.name + ".lock").stat().st_mode & 0o777 == 0o600


def test_canonical_alias_and_atomic_replacement_keep_one_stable_lock(budget, tmp_path):
    path = tmp_path / "budget.json"
    (tmp_path / "child").mkdir(mode=0o700)
    alias = tmp_path / "child" / ".." / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    lock = path.with_name(path.name + ".lock")
    lock_inode = lock.stat().st_ino
    initial_inode = path.stat().st_ino
    budget.reserve_capacity(alias, "run-a", units())
    assert budget.read_budget(alias) == budget.read_budget(path)
    assert path.stat().st_ino != initial_inode
    assert lock.stat().st_ino == lock_inode
    error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-b", units())


def test_two_processes_using_lexical_aliases_share_atomic_admission(budget, tmp_path):
    path = tmp_path / "budget.json"
    (tmp_path / "child").mkdir(mode=0o700)
    alias = tmp_path / "child" / ".." / "budget.json"
    budget.initialize_budget(path, limits(agentSessions=1))
    results = race(path, units(), alias)
    assert sorted(result[0] for result in results) == ["CAPACITY_EXHAUSTED", "admitted"]
    assert len(budget.read_budget(path)["reservations"]) == 1


def test_durable_admission_orders_file_sync_replace_then_parent_sync(budget, tmp_path, monkeypatch):
    import stat
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    events = []
    original_sync, original_replace = budget.os.fsync, budget.os.replace
    def sync(fd):
        events.append("parent-sync" if stat.S_ISDIR(os.fstat(fd).st_mode) else "file-sync")
        return original_sync(fd)
    def replace(source, target):
        saved = json.loads(Path(source).read_text())
        assert saved["reservations"][0]["ownerRunId"] == "run-a"
        assert saved["reservations"][0]["units"] == units()
        events.append("replace")
        return original_replace(source, target)
    monkeypatch.setattr(budget.os, "fsync", sync)
    monkeypatch.setattr(budget.os, "replace", replace)
    entry = budget.reserve_capacity(path, "run-a", units())
    assert events == ["file-sync", "replace", "parent-sync"]
    assert budget.read_budget(path)["reservations"] == [entry]


@pytest.mark.parametrize("target", ["symlink", "hardlink", "lock-symlink", "lock-hardlink", "parent-symlink", "fifo", "unsafe-parent"])
def test_unsafe_paths_cannot_split_or_replace_the_budget_lock(budget, tmp_path, target):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    if target == "symlink":
        path = tmp_path / "alias.json"
        path.symlink_to(tmp_path / "budget.json")
    elif target == "hardlink":
        path = tmp_path / "alias.json"
        os.link(tmp_path / "budget.json", path)
    elif target.startswith("lock-"):
        lock = path.with_name(path.name + ".lock")
        lock.rename(tmp_path / "original.lock")
        if target == "lock-symlink":
            lock.symlink_to(tmp_path / "original.lock")
        else:
            os.link(tmp_path / "original.lock", lock)
    elif target == "parent-symlink":
        (tmp_path / "alias").symlink_to(tmp_path, target_is_directory=True)
        path = tmp_path / "alias" / "budget.json"
    elif target == "fifo":
        path = tmp_path / "special.json"
        os.mkfifo(path)
    else:
        tmp_path.chmod(0o777)
    error(budget, "CAPACITY_CONFIG_INVALID", budget.read_budget, path)


def _lock_holder(path, ready, done):
    import fcntl
    with open(path + ".lock", "rb") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        ready.set()
        assert done.wait(timeout=10)


def test_lock_wait_has_one_bounded_monotonic_deadline(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits())
    context = multiprocessing.get_context("spawn")
    ready, done = context.Event(), context.Event()
    child = context.Process(target=_lock_holder, args=(str(path), ready, done))
    child.start()
    assert ready.wait(timeout=10)
    start = time.monotonic()
    try:
        exc = error(budget, "CAPACITY_BUSY", budget.read_budget, path, lock_timeout_ms=100)
        assert exc.exit_code == 4
        assert 0.09 <= time.monotonic() - start < 1
    finally:
        done.set()
        child.join(timeout=10)
    assert child.exitcode == 0
    assert budget.read_budget(path) == before
    for timeout in [99, 10001, True]:
        error(budget, "CAPACITY_REQUEST_INVALID", budget.read_budget, path, lock_timeout_ms=timeout)


def test_unsupported_platform_stops_before_creating_files(budget, tmp_path, monkeypatch):
    monkeypatch.setattr(budget, "_platform_supported", lambda: False)
    error(budget, "CAPACITY_UNSUPPORTED", budget.initialize_budget, tmp_path / "budget.json", limits())
    assert list(tmp_path.iterdir()) == []


def test_closed_records_remain_bounded_without_silent_history_eviction(budget, tmp_path):
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    entry = budget.reserve_capacity(path, "run-a", units())
    budget.release_capacity(path, "run-a", entry["reservationId"])
    value = budget.read_budget(path)
    template = value["reservations"][0]
    value["reservations"] = [{**template, "reservationId": str(uuid.uuid4())} for _ in range(1024)]
    path.write_text(json.dumps(value))
    before = path.read_bytes()
    assert budget.used_capacity(budget.read_budget(path))["agentSessions"] == 0
    error(budget, "CAPACITY_STATE_FULL", budget.reserve_capacity, path, "run-b", units())
    assert path.read_bytes() == before


def test_provider_absent_from_host_limits_has_zero_capacity(budget, tmp_path):
    path = tmp_path / "budget.json"
    before = budget.initialize_budget(path, limits(providerSessions={}))
    exc = error(budget, "CAPACITY_EXHAUSTED", budget.reserve_capacity, path, "run-a", units())
    assert exc.to_dict()["resource"] == "providerSessions"
    assert exc.to_dict()["counters"] == {"limit": 0, "used": 0, "requested": 1}
    assert budget.read_budget(path) == before


@pytest.mark.parametrize("change", [
    {"memoryHeadroomMiB": 0}, {"memoryHeadroomMiB": 128}, {"memoryMiB": 1},
    {"gatewayInstances": 0}, {"checkProcesses": 129}, {"extra": "secret-canary"},
    {"providerSessions": {"codex": True}}, {"providerSessions": {"secret-canary": 1}},
])
def test_host_limit_contract_is_closed_and_never_echoes_input(budget, tmp_path, change):
    exc = error(budget, "CAPACITY_CONFIG_INVALID", budget.initialize_budget, tmp_path / "budget.json", limits(**change))
    assert "secret-canary" not in json.dumps(exc.to_dict()) + str(exc)
    assert list(tmp_path.iterdir()) == []


def test_shared_wave_error_envelope_has_closed_safe_shapes(budget):
    errors = importlib.import_module("orchestrator_langgraph.wave_errors")
    exc = errors.WaveError("CAPACITY_EXHAUSTED", resource="memoryMiB", counters={"limit": 8, "used": 7, "requested": 2})
    schema = json.loads((Path(__file__).resolve().parents[2] / "schemas" / "wave-error-v1.schema.json").read_text())
    from jsonschema import Draft202012Validator
    validator = Draft202012Validator(schema)
    validator.validate(exc.to_dict())
    assert not validator.is_valid({**exc.to_dict(), "prompt": "secret-canary"})
    assert not validator.is_valid({**exc.to_dict(), "counters": {"limit": -1, "used": 0, "requested": 0}})
    assert not validator.is_valid({**exc.to_dict(), "resource": "memoryMiB\n"})
    with pytest.raises(ValueError):
        errors.WaveError("CAPACITY_EXHAUSTED", resource="/private/secret-canary")


def test_budget_schema_matches_emitted_closed_dtos_and_rejects_invalid_shapes(budget, tmp_path):
    from jsonschema import Draft202012Validator

    root = Path(__file__).resolve().parents[2]
    schema = json.loads((root / "schemas/wave-budget-v1.schema.json").read_text())
    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    canonical = json.loads((root / "schemas/orchestrator-profile-v1.schema.json").read_text())
    assert set(schema["$defs"]["providerId"]["enum"]) == set(canonical["properties"]["providers"]["required"])
    path = tmp_path / "budget.json"
    budget.initialize_budget(path, limits())
    validator.validate(json.loads(path.read_text()))
    entry = budget.reserve_capacity(path, "run-a", units(), task_id="task-a", attempt=1)
    reservation_id = entry["reservationId"]
    for operation in (
        lambda: None,
        lambda: budget.mark_possible_effect(path, "run-a", reservation_id),
        lambda: budget.record_effect(path, "run-a", reservation_id, {"sessionId": "ss-a", "traceId": "tr-a"}),
        lambda: budget.release_capacity(path, "run-a", reservation_id, confirmation="closed"),
    ):
        operation()
        emitted = json.loads(path.read_text())
        validator.validate(emitted)
        assert budget.read_budget(path) == emitted

    base = json.loads(path.read_text())
    changes = [
        (("schemaVersion",), "wave-budget/v2"), (("budgetId",), "not-a-uuid"),
        (("revision",), True), (("revision",), -1), (("prompt",), "secret-canary"),
        (("limits", "extra"), 1), (("limits", "memoryMiB"), 1),
        (("limits", "memoryMiB"), 1048577), (("limits", "memoryHeadroomMiB"), 0),
        (("limits", "memoryHeadroomMiB"), 1048576),
        (("limits", "providerSessions", "codex-alias"), 1),
        (("limits", "providerSessions", "codex"), 0),
        (("limits", "providerSessions", "codex"), 129),
        (("limits", "providerSessions", "codex"), True),
        (("reservations", 0, "reservationId"), "not-a-uuid"),
        (("reservations", 0, "ownerRunId"), "run-a\n"),
        (("reservations", 0, "taskId"), "x" * 129),
        (("reservations", 0, "attempt"), 0), (("reservations", 0, "attempt"), 16),
        (("reservations", 0, "effectState"), "expired"),
        (("reservations", 0, "effectState"), "reserved"),
        (("reservations", 0, "extra"), 1), (("reservations", 0, "units", "extra"), 1),
        (("reservations", 0, "units", "memoryMiB"), 0),
        (("reservations", 0, "units", "providerSessions", "codex"), -1),
        (("reservations", 0, "units", "agentSessions"), 0),
        (("reservations", 0, "effects", "pid"), 123),
        (("reservations", 0, "effects", "sessionId"), "ss-a\n"),
        (("reservations", 0, "effects", "gatewayId"), "gw-a"),
        (("reservations", 0, "effects", "checkId"), "check-a"),
    ]
    for dimension in budget.COUNTS:
        changes.extend([(("limits", dimension), 0), (("limits", dimension), 129),
                        (("reservations", 0, "units", dimension), -1),
                        (("reservations", 0, "units", dimension), True)])
    for pointer, replacement in changes:
        value = copy.deepcopy(base)
        parent = value
        for key in pointer[:-1]:
            parent = parent[key]
        parent[pointer[-1]] = replacement
        assert not validator.is_valid(value), pointer
        error(budget, "CAPACITY_STATE_INVALID", budget._validate_budget, value)

    for pointer in [(), ("limits",), ("reservations", 0), ("reservations", 0, "units")]:
        parent = base
        for key in pointer:
            parent = parent[key]
        for missing in parent:
            value = copy.deepcopy(base)
            target = value
            for key in pointer:
                target = target[key]
            del target[missing]
            assert not validator.is_valid(value), (pointer, missing)
            error(budget, "CAPACITY_STATE_INVALID", budget._validate_budget, value)
    active_without_reference = copy.deepcopy(base)
    active_without_reference["reservations"][0].update(effectState="active", effects={})
    assert not validator.is_valid(active_without_reference)
    error(budget, "CAPACITY_STATE_INVALID", budget._validate_budget, active_without_reference)
    too_many = copy.deepcopy(base)
    too_many["reservations"] = [{**base["reservations"][0], "reservationId": str(uuid.uuid4())} for _ in range(1025)]
    assert not validator.is_valid(too_many)
    error(budget, "CAPACITY_STATE_INVALID", budget._validate_budget, too_many)
