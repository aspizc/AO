"""Private-subreaper fixture for exact abrupt process-loss probes."""

from __future__ import annotations

import ctypes
import json
import os
import select
import signal
import subprocess
import sys
import time
from typing import Any


PR_SET_CHILD_SUBREAPER = 36
IDENTITY_FIELDS = ("pid", "startToken", "pgid", "sid")
SUPERVISOR_TERMINATION_GRACE_SECONDS = 0.08
PRODUCT_CLEANUP_HORIZON_SECONDS = 2.0
POST_CLEANUP_OBSERVATION_SLACK_SECONDS = 1.92
POST_SIGKILL_BOUND_SECONDS = (
    SUPERVISOR_TERMINATION_GRACE_SECONDS
    + PRODUCT_CLEANUP_HORIZON_SECONDS
    + POST_CLEANUP_OBSERVATION_SLACK_SECONDS
)
CALLER_EXIT_BOUND_SECONDS = 2.0


def identity(pid: int) -> dict[str, Any] | None:
    try:
        with open(f"/proc/{pid}/stat", "r", encoding="utf-8") as handle:
            stat = handle.read()
    except (FileNotFoundError, PermissionError, OSError):
        return None
    close = stat.rfind(")")
    fields = stat[close + 2 :].strip().split()
    if close < 2 or len(fields) < 20:
        return None
    return {
        "pid": pid,
        "startToken": fields[19],
        "pgid": int(fields[2]),
        "sid": int(fields[3]),
    }


def same(expected: dict[str, Any], current: dict[str, Any] | None) -> bool:
    return current is not None and all(
        expected.get(field) == current.get(field)
        for field in IDENTITY_FIELDS
    )


def activate_subreaper() -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    result = libc.prctl(
        ctypes.c_int(PR_SET_CHILD_SUBREAPER),
        ctypes.c_ulong(1),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
        ctypes.c_ulong(0),
    )
    if result != 0:
        raise RuntimeError("private subreaper unavailable")


def direct_children() -> list[int]:
    try:
        with open(
            f"/proc/self/task/{os.getpid()}/children",
            "r",
            encoding="ascii",
        ) as handle:
            value = handle.read().strip()
    except OSError:
        return []
    return [int(item) for item in value.split()] if value else []


def read_message(
    process: subprocess.Popen[str],
    timeout: float,
    label: str,
) -> dict[str, Any]:
    assert process.stdout is not None
    ready, _, _ = select.select([process.stdout], [], [], timeout)
    if not ready:
        raise RuntimeError(f"{label} timeout")
    line = process.stdout.readline()
    if not line:
        raise RuntimeError(f"caller closed before {label}")
    try:
        value = json.loads(line)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"malformed {label}") from error
    if not isinstance(value, dict):
        raise RuntimeError(f"invalid {label}")
    return value


def read_ready(process: subprocess.Popen[str], timeout: float) -> dict[str, Any]:
    return read_message(process, timeout, "caller readiness")


def require_live_identity(value: object, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise RuntimeError(f"invalid {label} identity")
    pid = value.get("pid")
    start_token = value.get("startToken")
    pgid = value.get("pgid")
    sid = value.get("sid")
    if (
        type(pid) is not int
        or pid <= 1
        or not isinstance(start_token, str)
        or not start_token
        or type(pgid) is not int
        or pgid <= 0
        or type(sid) is not int
        or sid <= 0
    ):
        raise RuntimeError(f"malformed {label} identity")
    sealed = {
        "pid": pid,
        "startToken": start_token,
        "pgid": pgid,
        "sid": sid,
    }
    if not same(sealed, identity(pid)):
        raise RuntimeError(f"{label} identity mismatch")
    return sealed


def reap_exact_owned_children(
    owned: list[dict[str, Any]],
    sentinel: dict[str, Any],
) -> None:
    for pid in direct_children():
        if pid == sentinel["pid"]:
            if not same(sentinel, identity(pid)):
                raise RuntimeError("sentinel identity drift")
            continue
        candidates = [item for item in owned if item["pid"] == pid]
        current = identity(pid)
        if not candidates:
            raise RuntimeError(f"unexpected adopted child {pid}")
        if not any(same(item, current) for item in candidates):
            raise RuntimeError(f"adopted child identity drift {pid}")
        try:
            waited, _ = os.waitpid(pid, os.WNOHANG)
        except ChildProcessError as error:
            raise RuntimeError(f"lost exact wait ownership for {pid}") from error
        if waited not in (0, pid):
            raise RuntimeError(f"unexpected exact wait result for {pid}")


def wait_owned_absent(
    owned: list[dict[str, Any]],
    sentinel: dict[str, Any],
    timeout: float,
) -> list[dict[str, Any]]:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        reap_exact_owned_children(owned, sentinel)
        survivors = [
            item for item in owned
            if same(item, identity(int(item["pid"])))
        ]
        remaining_children = [
            pid for pid in direct_children()
            if pid != sentinel["pid"]
        ]
        if not survivors and not remaining_children:
            return []
        time.sleep(0.01)
    return [
        item for item in owned
        if same(item, identity(int(item["pid"])))
    ]


def run_supervisor_loss(
    caller: subprocess.Popen[str],
    caller_identity: dict[str, Any],
    sentinel: dict[str, Any],
    ready: dict[str, Any],
) -> dict[str, Any]:
    if ready.get("type") != "ready" or ready.get("gate") != "supervisor-loss":
        raise RuntimeError("invalid supervisor-loss readiness")
    reported_caller = require_live_identity(ready.get("caller"), "caller")
    if not same(caller_identity, reported_caller):
        raise RuntimeError("caller identity mismatch")
    identities = {
        "supervisor": require_live_identity(
            ready.get("supervisor"),
            "supervisor",
        ),
        "reaper": require_live_identity(ready.get("reaper"), "reaper"),
        "utility": require_live_identity(ready.get("utility"), "utility"),
        "utilityLeader": require_live_identity(
            ready.get("utilityLeader"),
            "utility leader",
        ),
        "escapedDescendant": require_live_identity(
            ready.get("escapedDescendant"),
            "escaped descendant",
        ),
    }
    if not same(identities["utility"], identities["utilityLeader"]):
        raise RuntimeError("utility leader identity mismatch")
    distinct_pids = {
        reported_caller["pid"],
        sentinel["pid"],
        identities["supervisor"]["pid"],
        identities["reaper"]["pid"],
        identities["utility"]["pid"],
        identities["escapedDescendant"]["pid"],
    }
    if len(distinct_pids) != 6:
        raise RuntimeError("supervisor-loss identities overlap")
    expected_owned = [
        identities["supervisor"],
        identities["reaper"],
        identities["utility"],
        identities["utilityLeader"],
        identities["escapedDescendant"],
    ]
    owned = ready.get("owned")
    if (
        not isinstance(owned, list)
        or len(owned) != len(expected_owned)
        or not all(
            isinstance(actual, dict) and same(expected, actual)
            for expected, actual in zip(expected_owned, owned, strict=True)
        )
    ):
        raise RuntimeError("supervisor-loss owned identities mismatch")
    supervisor = identities["supervisor"]
    reaper = identities["reaper"]
    current_supervisor = identity(supervisor["pid"])
    if not same(supervisor, current_supervisor):
        raise RuntimeError("supervisor changed before exact signal")
    signalled_supervisor = {
        field: current_supervisor[field]
        for field in IDENTITY_FIELDS
    }
    post_sigkill_deadline = time.monotonic() + POST_SIGKILL_BOUND_SECONDS
    os.kill(supervisor["pid"], signal.SIGKILL)

    completion = read_message(
        caller,
        max(0.0, post_sigkill_deadline - time.monotonic()),
        "caller completion",
    )
    if (
        completion.get("type") != "completion"
        or completion.get("gate") != "supervisor-loss"
        or completion.get("outcome") != "rejected"
        or completion.get("code") != "PROCESS_SUPERVISOR_LOST"
    ):
        raise RuntimeError("invalid supervisor-loss completion")

    adopted: list[dict[str, Any]] = []
    reaper_exit_code: int | None = None
    survivors = expected_owned
    while time.monotonic() < post_sigkill_deadline:
        for pid in direct_children():
            if pid == caller_identity["pid"]:
                if not same(caller_identity, identity(pid)):
                    raise RuntimeError("caller direct-child identity drift")
                continue
            if pid == sentinel["pid"]:
                if not same(sentinel, identity(pid)):
                    raise RuntimeError("sentinel direct-child identity drift")
                continue
            current = identity(pid)
            if pid != reaper["pid"]:
                matching_role = next(
                    (
                        name
                        for name, expected in identities.items()
                        if expected["pid"] == pid
                    ),
                    None,
                )
                if matching_role is None:
                    raise RuntimeError(f"unexpected adopted direct child {pid}")
                if same(identities[matching_role], current):
                    raise RuntimeError(
                        f"{matching_role} became an adopted direct child"
                    )
                raise RuntimeError(
                    f"{matching_role} adopted with identity drift"
                )
            if not same(reaper, current):
                raise RuntimeError("adopted reaper identity drift")
            if not adopted:
                adopted.append(reaper)
            if reaper_exit_code is None:
                try:
                    waited, status = os.waitpid(reaper["pid"], os.WNOHANG)
                except ChildProcessError as error:
                    raise RuntimeError(
                        "lost exact reaper wait ownership"
                    ) from error
                if waited == reaper["pid"]:
                    reaper_exit_code = os.waitstatus_to_exitcode(status)
                    if reaper_exit_code != 0:
                        raise RuntimeError(
                            "product reaper exited unexpectedly with "
                            f"{reaper_exit_code}"
                        )
                elif waited != 0:
                    raise RuntimeError("unexpected exact reaper wait result")
        survivors = [
            item
            for item in expected_owned
            if same(item, identity(item["pid"]))
        ]
        if reaper_exit_code is not None and not survivors:
            break
        time.sleep(0.01)
    if not adopted:
        raise RuntimeError("exact product reaper adoption timeout")
    if reaper_exit_code is None:
        raise RuntimeError("exact product reaper reap timeout")
    if survivors:
        raise RuntimeError(
            "supervisor-loss domain cleanup timeout: "
            + json.dumps(survivors, separators=(",", ":"), sort_keys=True)
        )

    try:
        return_code = caller.wait(timeout=CALLER_EXIT_BOUND_SECONDS)
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("caller exit/reap timeout") from error
    if return_code != 0:
        raise RuntimeError(f"caller exited unexpectedly with {return_code}")
    assert caller.stdout is not None
    assert caller.stderr is not None
    if caller.stdout.read():
        raise RuntimeError("unexpected trailing caller message")
    if caller.stderr.read():
        raise RuntimeError("unexpected caller stderr")
    remaining_children = direct_children()
    if remaining_children != [sentinel["pid"]]:
        raise RuntimeError(
            f"unexpected children after caller reap: {remaining_children}"
        )
    sentinel_preserved = same(sentinel, identity(sentinel["pid"]))
    if not sentinel_preserved:
        raise RuntimeError("unrelated sentinel was not preserved")
    return {
        "ok": True,
        "gate": "supervisor-loss",
        "caller": caller_identity,
        "supervisor": supervisor,
        "reaper": reaper,
        "utility": identities["utility"],
        "utilityLeader": identities["utilityLeader"],
        "escapedDescendant": identities["escapedDescendant"],
        "owned": expected_owned,
        "signalledSupervisor": signalled_supervisor,
        "completionCode": completion["code"],
        "adoptedChildren": adopted,
        "reapedChild": reaper,
        "reaperExitCode": reaper_exit_code,
        "survivors": [],
        "sentinel": sentinel,
        "sentinelPreserved": sentinel_preserved,
        "postSigkillBoundMs": int(POST_SIGKILL_BOUND_SECONDS * 1_000),
        "callerExitBoundMs": int(CALLER_EXIT_BOUND_SECONDS * 1_000),
    }


def spawn_sentinel() -> dict[str, Any]:
    pid = os.fork()
    if pid == 0:
        signal.signal(signal.SIGTERM, lambda _number, _frame: sys.exit(0))
        while True:
            signal.pause()
    result = identity(pid)
    if result is None:
        raise RuntimeError("sentinel identity unavailable")
    return result


def stop_sentinel(sentinel: dict[str, Any]) -> None:
    if same(sentinel, identity(int(sentinel["pid"]))):
        os.kill(int(sentinel["pid"]), signal.SIGTERM)
    try:
        os.waitpid(int(sentinel["pid"]), 0)
    except ChildProcessError:
        pass


def main() -> int:
    if len(sys.argv) != 6:
        return 64
    _, node, caller_fixture, gate, workspace, wrapper = sys.argv
    activate_subreaper()
    sentinel = spawn_sentinel()
    caller: subprocess.Popen[str] | None = None
    caller_identity: dict[str, Any] | None = None
    result: dict[str, Any] | None = None
    try:
        caller = subprocess.Popen(
            [node, caller_fixture, gate, workspace, wrapper],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            env={
                "LANG": "C",
                "PATH": "/definitely/no/python",
            },
        )
        caller_identity = identity(caller.pid)
        if caller_identity is None:
            raise RuntimeError("caller identity unavailable")
        ready = read_ready(caller, 4.0)
        if gate == "supervisor-loss":
            result = run_supervisor_loss(
                caller,
                caller_identity,
                sentinel,
                ready,
            )
            print(json.dumps(result, separators=(",", ":"), sort_keys=True))
            return 0
        if not same(caller_identity, ready.get("caller")):
            raise RuntimeError("caller identity mismatch")
        owned = ready.get("owned")
        if not isinstance(owned, list) or not all(
            isinstance(item, dict) and same(item, identity(int(item["pid"])))
            for item in owned
        ):
            raise RuntimeError("owned identity mismatch")
        if not same(caller_identity, identity(caller.pid)):
            raise RuntimeError("caller changed before exact signal")
        os.kill(caller.pid, signal.SIGKILL)
        caller.wait(timeout=2.0)
        survivors = wait_owned_absent(owned, sentinel, 4.0)
        sentinel_preserved = same(
            sentinel,
            identity(int(sentinel["pid"])),
        )
        result = {
            "ok": not survivors and sentinel_preserved,
            "gate": gate,
            "caller": caller_identity,
            "owned": owned,
            "survivors": survivors,
            "sentinel": sentinel,
            "sentinelPreserved": sentinel_preserved,
        }
        print(json.dumps(result, separators=(",", ":"), sort_keys=True))
        return 0 if result["ok"] else 1
    except BaseException as error:
        if (
            caller is not None
            and caller_identity is not None
            and same(caller_identity, identity(caller.pid))
        ):
            os.kill(caller.pid, signal.SIGKILL)
            try:
                caller.wait(timeout=2.0)
            except subprocess.TimeoutExpired:
                pass
        print(
            json.dumps(
                {
                    "ok": False,
                    "gate": gate,
                    "fixtureError": type(error).__name__,
                    "fixtureMessage": str(error),
                },
                separators=(",", ":"),
                sort_keys=True,
            )
        )
        return 2
    finally:
        stop_sentinel(sentinel)


if __name__ == "__main__":
    raise SystemExit(main())
