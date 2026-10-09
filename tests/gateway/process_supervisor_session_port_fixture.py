#!/usr/bin/env python3
"""Process-level and scripted fixtures for the private session-port PTY tests."""

from __future__ import annotations

import errno
import hashlib
import hmac
import importlib.util
import inspect
import json
import os
import pathlib
import select
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import time
from types import SimpleNamespace
from typing import Any


def _load_helper(path: str) -> Any:
    spec = importlib.util.spec_from_file_location(
        "process_supervisor_helper",
        path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("helper module is unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _read_exact(fd: int, size: int) -> bytes:
    result = bytearray()
    while len(result) < size:
        chunk = os.read(fd, size - len(result))
        if not chunk:
            break
        result.extend(chunk)
    return bytes(result)


def _provider() -> int:
    mode = os.environ.get("SESSION_PORT_FIXTURE_MODE")
    if mode == "foreground-change":
        return _foreground_change_provider()
    if mode == "frozen-positive-snapshot":
        return _frozen_positive_snapshot_provider()
    result_path = pathlib.Path(os.environ["SESSION_PORT_FIXTURE_RESULT"])
    received = _read_exact(0, len(b"status\r"))
    rows, columns = os.get_terminal_size(0).lines, os.get_terminal_size(0).columns
    stdin_stat = os.fstat(0)
    stdout_stat = os.fstat(1)
    stderr_stat = os.fstat(2)
    if sys.platform.startswith("linux"):
        argv = pathlib.Path("/proc/self/cmdline").read_bytes().split(b"\0")[:-1]
        executable = os.path.realpath("/proc/self/exe")
    else:
        argv = [os.fsencode(item) for item in sys.argv]
        executable = os.path.realpath(sys.executable)
    metadata = {
        "argvHex": [item.hex() for item in argv],
        "executable": executable,
        "foregroundPgid": os.tcgetpgrp(0),
        "pgid": os.getpgrp(),
        "pid": os.getpid(),
        "receivedHex": received.hex(),
        "rows": rows,
        "sid": os.getsid(0),
        "stderrTerminal": [
            stderr_stat.st_dev,
            stderr_stat.st_ino,
            stderr_stat.st_rdev,
        ],
        "stdinTerminal": [
            stdin_stat.st_dev,
            stdin_stat.st_ino,
            stdin_stat.st_rdev,
        ],
        "stdoutTerminal": [
            stdout_stat.st_dev,
            stdout_stat.st_ino,
            stdout_stat.st_rdev,
        ],
        "columns": columns,
    }
    temporary_path = result_path.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(metadata, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )
    os.replace(temporary_path, result_path)
    os.write(1, b"fixture-terminal-secret\n")
    while True:
        signal.pause()


def _frozen_positive_snapshot_provider() -> int:
    result_path = pathlib.Path(os.environ["SESSION_PORT_FIXTURE_RESULT"])
    os.write(1, b"ready\nstatus\nack:status\n")
    _replace_text(result_path, "ready")
    while True:
        signal.pause()


def _replace_text(path: pathlib.Path, value: str) -> None:
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(value, encoding="ascii")
    os.replace(temporary_path, path)


def _foreground_change_provider() -> int:
    trigger_path = pathlib.Path(
        os.environ["SESSION_PORT_FIXTURE_FOREGROUND_TRIGGER"]
    )
    ready_path = pathlib.Path(
        os.environ["SESSION_PORT_FIXTURE_FOREGROUND_READY"]
    )
    received_path = pathlib.Path(os.environ["SESSION_PORT_FIXTURE_RESULT"])
    deadline = time.monotonic() + 10
    while not trigger_path.exists():
        if time.monotonic() >= deadline:
            return 65
        time.sleep(0.01)

    ready_read, ready_write = os.pipe()
    reader_pid = os.fork()
    if reader_pid == 0:
        os.close(ready_read)
        os.setpgid(0, 0)
        os.set_blocking(0, False)
        _replace_text(received_path, "")
        received = bytearray()

        def finish(_number: int, _frame: object) -> None:
            while True:
                try:
                    chunk = os.read(0, 65536)
                except BlockingIOError:
                    break
                except OSError:
                    break
                if not chunk:
                    break
                received.extend(chunk)
            _replace_text(received_path, bytes(received).hex())
            raise SystemExit(0)

        signal.signal(signal.SIGHUP, finish)
        signal.signal(signal.SIGTERM, finish)
        os.write(ready_write, b"1")
        os.close(ready_write)
        while True:
            readable, _, _ = select.select([0], [], [], 0.1)
            if 0 not in readable:
                continue
            try:
                chunk = os.read(0, 65536)
            except BlockingIOError:
                continue
            if not chunk:
                return 0
            received.extend(chunk)
            _replace_text(received_path, bytes(received).hex())

    os.close(ready_write)
    if _read_exact(ready_read, 1) != b"1":
        return 66
    os.close(ready_read)
    signal.signal(signal.SIGTTOU, signal.SIG_IGN)
    os.tcsetpgrp(0, reader_pid)
    _replace_text(ready_path, str(reader_pid))

    def finish_parent(_number: int, _frame: object) -> None:
        try:
            os.kill(reader_pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        while True:
            try:
                os.waitpid(reader_pid, 0)
                break
            except InterruptedError:
                continue
            except ChildProcessError:
                break
        raise SystemExit(0)

    signal.signal(signal.SIGHUP, finish_parent)
    signal.signal(signal.SIGTERM, finish_parent)
    while True:
        signal.pause()


class _WriteScript:
    def __init__(self, checks: list[str], writes: list[Any]):
        self.checks = list(checks)
        self.writes = list(writes)
        self.trace: list[str] = []
        self.accepted = bytearray()

    def verify(self) -> str:
        self.trace.append("check")
        return self.checks.pop(0) if self.checks else "ok"

    def write(self, _fd: int, payload: memoryview) -> int:
        self.trace.append(f"write:{bytes(payload).hex()}")
        action = self.writes.pop(0)
        if action == "eintr":
            raise InterruptedError(errno.EINTR, "interrupted")
        if action == "eagain":
            raise BlockingIOError(errno.EAGAIN, "try again")
        if action == "closed":
            raise OSError(errno.EIO, "terminal closed")
        accepted = min(int(action), len(payload))
        self.accepted.extend(bytes(payload[:accepted]))
        return accepted

    def wait_writable(self, _fd: int) -> bool:
        self.trace.append("wait")
        return True


def _write_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    cases = {
        "identity": (["identity_changed"], []),
        "foreground": (["not_foreground"], []),
        "terminal": (["terminal_changed"], []),
        "close_precheck": (["terminal_closed"], []),
        "cancel_precheck": (["cancelled"], []),
        "closed_write": (["ok"], ["closed"]),
        "short": (["ok", "ok"], [2, 5]),
        "eintr": (["ok", "ok"], ["eintr", 7]),
        "eagain": (["ok", "ok"], ["eagain", 7]),
        "changed_after_partial": (["ok", "identity_changed"], [2]),
        "cancelled_after_partial": (["ok", "cancelled"], [2]),
    }
    results: dict[str, Any] = {}
    for name, (checks, writes) in cases.items():
        script = _WriteScript(checks, writes)
        outcome = helper.verified_pty_write(
            91,
            b"status\r",
            verify=script.verify,
            write=script.write,
            wait_writable=script.wait_writable,
        )
        results[name] = {
            "acceptedHex": bytes(script.accepted).hex(),
            "acceptedBytes": outcome.accepted_bytes,
            "errorId": outcome.error_id,
            "phaseId": outcome.phase_id,
            "status": outcome.status,
            "trace": script.trace,
        }
    print(json.dumps(results, separators=(",", ":"), sort_keys=True))
    return 0


def _darwin_reader_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    calls: list[str] = []

    def identity(_pid: int) -> dict[str, Any]:
        calls.append("proc_pidinfo:PROC_PIDTBSDINFO")
        return {
            "pid": 8123,
            "startToken": "17:23",
            "pgid": 8123,
            "sid": 8123,
        }

    def executable(_pid: int) -> str:
        calls.append("proc_pidpath")
        return "/opt/provider/bin/agent"

    def argv_nul(_pid: int) -> bytes:
        calls.append("sysctl:KERN_PROCARGS2")
        return b"/opt/provider/bin/agent\0--literal\0$(touch /tmp/never)\0"

    def cwd(_pid: int) -> str:
        calls.append("proc_pidinfo:PROC_PIDVNODEPATHINFO")
        return "/safe/repository"

    result = helper.read_session_process_identity(
        8123,
        platform="darwin",
        dependencies={
            "identity": identity,
            "executable": executable,
            "argv_nul": argv_nul,
            "cwd": cwd,
        },
    )
    encoded = dict(result)
    encoded["argvNulHex"] = encoded.pop("argvNul").hex()
    print(json.dumps(
        {"calls": calls, "identity": encoded},
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _direct_execve_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    captured: dict[str, Any] = {}

    def execve(executable: str, argv: list[str], env: dict[str, str]) -> None:
        captured.update({
            "executable": executable,
            "argv": argv,
            "env": env,
        })
        raise RuntimeError("captured")

    launch = {
        "argv": [
            "/fixture/session-port-agent",
            "--literal",
            "$(touch /tmp/never)",
        ],
        "env": {"AGENT_MODE": "test"},
    }
    try:
        helper._direct_execve(launch, execve=execve)
    except RuntimeError as error:
        if str(error) != "captured":
            raise
    print(json.dumps(captured, separators=(",", ":"), sort_keys=True))
    return 0


def _retained_slave_foreground_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    calls: list[str] = []

    def fstat(fd: int) -> Any:
        calls.append(f"fstat:{fd}")
        return SimpleNamespace(st_dev=7, st_ino=8, st_rdev=9)

    def ioctl(fd: int, operation: int, payload: bytes) -> bytes:
        del operation, payload
        calls.append(f"ioctl:{fd}")
        return helper.struct.pack("HHHH", 40, 120, 0, 0)

    def tcgetpgrp(fd: int) -> int:
        calls.append(f"tcgetpgrp:{fd}")
        return 6102

    identity = helper._read_pty_identity(
        92,
        fstat=fstat,
        ioctl=ioctl,
        tcgetpgrp=tcgetpgrp,
    )
    print(json.dumps(
        {"calls": calls, "identity": identity},
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _relay_identity(pid: int = 7123) -> dict[str, Any]:
    return {
        "pid": pid,
        "startToken": "relay-start-17",
        "pgid": pid,
        "sid": pid,
        "executable": "/configured/python",
        "argvNul": (
            b"/configured/python\0-I\0/helper.py\0"
            b"--session-port-relay\0/socket\0/key\0"
        ),
        "cwd": "/safe/repository",
    }


def _encode_asr1(message_type: int, payload: bytes) -> bytes:
    return b"".join(
        (
            b"ASR1",
            bytes((1, message_type)),
            b"\0\0",
            len(payload).to_bytes(4, "big"),
            payload,
        )
    )


def _relay_proof(
    relay_key: bytes,
    challenge: bytes,
    pid: int,
) -> bytes:
    proof = hmac.new(
        relay_key,
        b"".join(
            (
                b"agents.process-supervisor.session-port.relay-proof.v1\0",
                challenge,
                pid.to_bytes(8, "big"),
            )
        ),
        hashlib.sha256,
    ).digest()
    return _encode_asr1(0x02, pid.to_bytes(8, "big") + proof)


def _json_authentication(result: Any) -> dict[str, Any]:
    return {
        "accepted": result.accepted,
        "publicCode": result.public_code,
        "rejectId": result.reject_id,
        "revoke": result.revoke,
    }


def _relay_auth_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    lease_key = bytes(range(32))
    binding_digest = hashlib.sha256(b"binding").digest()
    lease_digest = hashlib.sha256(lease_key).digest()
    terminal_nonce_digest = hashlib.sha256(b"terminal-nonce").digest()
    relay_key = helper.derive_relay_key(
        lease_key,
        binding_digest,
        lease_digest,
        terminal_nonce_digest,
    )
    challenge = bytes(reversed(range(32)))
    expected = _relay_identity()
    peer = {
        "pid": expected["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    proof = _relay_proof(relay_key, challenge, expected["pid"])

    linux_calls: list[str] = []

    class FakeSocket:
        def fileno(self) -> int:
            return 91

    linux_peer = helper.read_relay_peer_evidence(
        FakeSocket(),
        platform="linux",
        dependencies={
            "getsockopt_peercred": lambda _candidate: (
                linux_calls.append("getsockopt:SOL_SOCKET:SO_PEERCRED")
                or dict(peer)
            ),
        },
    )
    darwin_calls: list[str] = []
    darwin_peer = helper.read_relay_peer_evidence(
        FakeSocket(),
        platform="darwin",
        dependencies={
            "getpeereid": lambda _candidate: (
                darwin_calls.append("getpeereid")
                or (peer["uid"], peer["gid"])
            ),
            "get_local_peerpid": lambda _candidate: (
                darwin_calls.append("getsockopt:SOL_LOCAL:LOCAL_PEERPID")
                or peer["pid"]
            ),
        },
    )
    unavailable_linux = helper.read_relay_peer_evidence(
        FakeSocket(),
        platform="linux",
        dependencies={
            "getsockopt_peercred": lambda _candidate: None,
        },
    )
    unavailable_darwin = helper.read_relay_peer_evidence(
        FakeSocket(),
        platform="darwin",
        dependencies={
            "getpeereid": lambda _candidate: None,
            "get_local_peerpid": lambda _candidate: None,
        },
    )

    def authenticate(
        *,
        selected_peer: dict[str, int] | None = peer,
        live_identity: dict[str, Any] | None = expected,
        proof_frame: bytes = proof,
        elapsed_ms: int = 1,
        state: Any | None = None,
    ) -> tuple[Any, list[str], list[str], bytearray, bool]:
        cleanup_trace: list[str] = []
        comparison_trace: list[str] = []
        broker_queue = helper.RelayBrokerInputQueue()
        retirement_root = tempfile.mkdtemp(prefix="d007c-reject-retire-")
        retirement_paths = [
            os.path.join(retirement_root, name)
            for name in ("relay.sock", "relay.key", "pane", "port")
        ]
        for retirement_path in retirement_paths:
            pathlib.Path(retirement_path).write_bytes(b"owned")

        def compare_digest(left: bytes, right: bytes) -> bool:
            comparison_trace.append("hmac.compare_digest")
            return hmac.compare_digest(left, right)

        def retire() -> None:
            cleanup_trace.append("retired")
            for retirement_path in retirement_paths:
                os.unlink(retirement_path)
            os.rmdir(retirement_root)

        result = helper.validate_relay_candidate(
            peer=selected_peer,
            expected_uid=os.geteuid(),
            expected_gid=os.getegid(),
            expected_identity=expected,
            live_identity=live_identity,
            proof_frame=proof_frame,
            relay_key=relay_key,
            challenge=challenge,
            elapsed_ms=elapsed_ms,
            state=state or helper.RelayAuthenticationState(),
            compare_digest=compare_digest,
            on_reject=retire,
        )
        broker_queue.bind(result)
        broker_queue.offer(b"operator-before-accept")
        queued = bytearray(broker_queue.queued_bytes)
        if result.accepted:
            retire()
        torn_down = not os.path.exists(retirement_root)
        if not torn_down:
            raise RuntimeError("relay rejection did not retire every resource")
        return result, cleanup_trace, comparison_trace, queued, torn_down

    accepted_linux, _, linux_comparisons, _, _ = authenticate(
        selected_peer=linux_peer,
    )
    accepted_darwin, _, darwin_comparisons, _, _ = authenticate(
        selected_peer=darwin_peer,
    )

    cases: dict[str, Any] = {}

    def reject_case(name: str, **overrides: Any) -> None:
        result, cleanup, comparisons, operator_queue, torn_down = (
            authenticate(**overrides)
        )
        cases[name] = {
            **_json_authentication(result),
            "cleanup": cleanup,
            "comparisons": comparisons,
            "queuedOperatorHex": bytes(operator_queue).hex(),
            "tornDown": torn_down,
        }

    reject_case("linuxUnavailable", selected_peer=unavailable_linux)
    reject_case("darwinUnavailable", selected_peer=unavailable_darwin)
    reject_case(
        "malformedPeer",
        selected_peer={"pid": peer["pid"], "uid": peer["uid"]},
    )
    reject_case(
        "wrongUid",
        selected_peer={**peer, "uid": peer["uid"] + 1},
    )
    reject_case(
        "wrongGid",
        selected_peer={**peer, "gid": peer["gid"] + 1},
    )
    reject_case(
        "wrongPeerPid",
        selected_peer={**peer, "pid": peer["pid"] + 1},
    )
    changed_identities = {
        "changedPid": {**expected, "pid": expected["pid"] + 1},
        "changedStart": {**expected, "startToken": "relay-start-18"},
        "changedPgid": {**expected, "pgid": expected["pgid"] + 1},
        "changedSid": {**expected, "sid": expected["sid"] + 1},
        "changedExecutable": {
            **expected,
            "executable": "/configured/pythoo",
        },
        "changedArgv": {
            **expected,
            "argvNul": expected["argvNul"][:-2] + b"x\0",
        },
        "changedCwd": {**expected, "cwd": "/safe/repositori"},
    }
    for name, live_identity in changed_identities.items():
        reject_case(name, live_identity=live_identity)
    malformed_proofs = {}
    for name, index, value in (
        ("malformedMagic", 0, ord("B")),
        ("malformedType", 5, 0x01),
        ("malformedVersion", 4, 0x02),
        ("malformedReserved", 6, 0x01),
    ):
        malformed = bytearray(proof)
        malformed[index] = value
        malformed_proofs[name] = bytes(malformed)
    malformed_length = bytearray(proof)
    malformed_length[8:12] = (39).to_bytes(4, "big")
    malformed_proofs["malformedLength"] = bytes(malformed_length)
    malformed_proofs["malformedTrailing"] = proof + b"\0"
    for name, proof_frame in malformed_proofs.items():
        reject_case(name, proof_frame=proof_frame)
    proof_pid = expected["pid"] + 1
    reject_case(
        "wrongProofPid",
        proof_frame=_relay_proof(relay_key, challenge, proof_pid),
    )
    bad_proof = bytearray(proof)
    bad_proof[-1] ^= 0x01
    reject_case("badProof", proof_frame=bytes(bad_proof))
    reject_case("timeout", elapsed_ms=2000)
    replay_state = helper.RelayAuthenticationState()
    replay_state.used_challenges.add(challenge)
    reject_case("replay", state=replay_state)
    duplicate_state = helper.RelayAuthenticationState()
    duplicate_state.accepted = True
    reject_case("duplicate", state=duplicate_state)

    real_kernel: dict[str, Any] | None = None
    if sys.platform.startswith("linux"):
        with tempfile.TemporaryDirectory(
            prefix="d007c-real-kernel-",
        ) as workspace:
            runtime = helper.create_relay_runtime(
                workspace,
                relay_key,
            )
            command = [
                sys.executable,
                "-I",
                helper_path,
                "--session-port-relay",
                runtime.socket_path,
                runtime.key_path,
            ]
            child = subprocess.Popen(
                command,
                cwd=workspace,
                env={"LANG": "C", "PATH": "/definitely/no/runtime"},
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            candidate: socket.socket | None = None
            try:
                candidate, _ = runtime.listener.accept()
                deadline = time.monotonic() + 2
                live = None
                while live is None and time.monotonic() < deadline:
                    live = helper.read_session_process_identity(child.pid)
                    if live is None:
                        time.sleep(0.005)
                if live is None:
                    raise RuntimeError("real relay identity unavailable")
                assert child.stdin is not None
                child.stdin.write(b"operator\r")
                child.stdin.flush()
                pre_accept_readable: list[bool] = []

                def before_accept() -> None:
                    readable, _, _ = select.select([candidate], [], [], 0.05)
                    pre_accept_readable.append(candidate in readable)

                authenticated = helper.authenticate_relay_socket(
                    candidate,
                    expected_identity=live,
                    relay_key=relay_key,
                    state=helper.RelayAuthenticationState(),
                    challenge=challenge,
                    before_accept=before_accept,
                )
                message_type, operator_payload = (
                    helper.receive_relay_data_frame(candidate, timeout=1.0)
                )
                helper.send_relay_data_frame(
                    candidate,
                    helper.RELAY_DATA_OUTPUT,
                    b"ready\n",
                )
                barrier_id = b"\0\0\0\0\0\0\0\x01"
                helper.send_relay_data_frame(
                    candidate,
                    helper.RELAY_DATA_BARRIER,
                    barrier_id,
                )
                barrier_type, barrier_payload = (
                    helper.receive_relay_data_frame(candidate, timeout=1.0)
                )
                assert child.stdout is not None
                readable, _, _ = select.select([child.stdout], [], [], 1.0)
                if child.stdout not in readable:
                    raise RuntimeError("relay output was not flushed")
                rendered_output = os.read(child.stdout.fileno(), len(b"ready\n"))
                runtime_modes = {
                    "directory": stat.S_IMODE(
                        os.stat(runtime.directory).st_mode
                    ),
                    "socket": stat.S_IMODE(
                        os.stat(runtime.socket_path).st_mode
                    ),
                    "keyRemoved": not os.path.exists(runtime.key_path),
                }
                real_kernel = {
                    **_json_authentication(authenticated),
                    "command": command,
                    "barrierHex": barrier_payload.hex(),
                    "barrierType": barrier_type,
                    "messageType": message_type,
                    "operatorHex": operator_payload.hex(),
                    "preAcceptReadable": pre_accept_readable,
                    "renderedHex": rendered_output.hex(),
                    "runtimeModes": runtime_modes,
                }
            finally:
                if candidate is not None:
                    candidate.close()
                runtime.close()
                if real_kernel is not None:
                    real_kernel["runtimeRemoved"] = (
                        not os.path.exists(runtime.directory)
                        and not os.path.exists(runtime.socket_path)
                        and not os.path.exists(runtime.key_path)
                    )
                child.terminate()
                try:
                    child.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait(timeout=2)
                if child.stderr is not None:
                    relay_stderr = child.stderr.read().decode("utf-8")
                    if relay_stderr:
                        raise RuntimeError(relay_stderr)

    key_files: dict[str, Any] = {}
    with tempfile.TemporaryDirectory(prefix="d007c-relay-keys-") as workspace:
        valid_path = os.path.join(workspace, "valid.key")
        valid_fd = os.open(
            valid_path,
            os.O_CREAT | os.O_EXCL | os.O_WRONLY,
            0o400,
        )
        os.write(valid_fd, relay_key)
        os.close(valid_fd)
        loaded = helper.load_relay_key(valid_path)
        key_files["valid"] = {
            "keyHex": loaded.hex(),
            "removed": not os.path.exists(valid_path),
        }

        invalid_paths: dict[str, str] = {}
        wrong_mode = os.path.join(workspace, "wrong-mode.key")
        pathlib.Path(wrong_mode).write_bytes(relay_key)
        os.chmod(wrong_mode, 0o600)
        invalid_paths["wrongMode"] = wrong_mode
        wrong_size = os.path.join(workspace, "wrong-size.key")
        pathlib.Path(wrong_size).write_bytes(relay_key[:-1])
        os.chmod(wrong_size, 0o400)
        invalid_paths["wrongSize"] = wrong_size
        directory = os.path.join(workspace, "directory.key")
        os.mkdir(directory, 0o400)
        invalid_paths["nonRegular"] = directory
        target = os.path.join(workspace, "target.key")
        pathlib.Path(target).write_bytes(relay_key)
        os.chmod(target, 0o400)
        symlink = os.path.join(workspace, "symlink.key")
        os.symlink(target, symlink)
        invalid_paths["symlink"] = symlink
        wrong_owner = os.path.join(workspace, "wrong-owner.key")
        pathlib.Path(wrong_owner).write_bytes(relay_key)
        os.chmod(wrong_owner, 0o400)
        short_read = os.path.join(workspace, "short-read.key")
        pathlib.Path(short_read).write_bytes(relay_key)
        os.chmod(short_read, 0o400)
        reported_nonregular = os.path.join(
            workspace,
            "reported-nonregular.key",
        )
        pathlib.Path(reported_nonregular).write_bytes(relay_key)
        os.chmod(reported_nonregular, 0o400)
        reported_wrong_size = os.path.join(
            workspace,
            "reported-wrong-size.key",
        )
        pathlib.Path(reported_wrong_size).write_bytes(relay_key)
        os.chmod(reported_wrong_size, 0o400)

        for name, key_path in invalid_paths.items():
            try:
                helper.load_relay_key(key_path)
            except helper.RelayKeyError:
                key_files[name] = True
            else:
                key_files[name] = False
        try:
            helper.load_relay_key(
                wrong_owner,
                expected_uid=os.geteuid() + 1,
            )
        except helper.RelayKeyError:
            key_files["wrongOwner"] = True
        else:
            key_files["wrongOwner"] = False
        original_read = helper.os.read
        helper.os.read = lambda fd, size: original_read(fd, size)[:-1]
        try:
            try:
                helper.load_relay_key(short_read)
            except helper.RelayKeyError:
                key_files["shortRead"] = True
            else:
                key_files["shortRead"] = False
        finally:
            helper.os.read = original_read
        original_fstat = helper.os.fstat

        def exercise_reported_metadata(
            name: str,
            key_path: str,
            *,
            mode: int | None = None,
            size: int | None = None,
        ) -> None:
            def reported(fd: int) -> Any:
                actual = original_fstat(fd)
                return SimpleNamespace(
                    st_mode=actual.st_mode if mode is None else mode,
                    st_uid=actual.st_uid,
                    st_size=actual.st_size if size is None else size,
                )

            helper.os.fstat = reported
            try:
                try:
                    helper.load_relay_key(key_path)
                except helper.RelayKeyError:
                    key_files[name] = True
                else:
                    key_files[name] = False
            finally:
                helper.os.fstat = original_fstat

        exercise_reported_metadata(
            "reportedNonRegular",
            reported_nonregular,
            mode=stat.S_IFDIR | 0o400,
        )
        exercise_reported_metadata(
            "reportedWrongSize",
            reported_wrong_size,
            size=31,
        )

    data_frames: dict[str, Any] = {}
    sender, receiver = socket.socketpair()
    try:
        helper.send_relay_data_frame(
            sender,
            helper.RELAY_DATA_OUTPUT,
            b"X" * 65536,
        )
        data_type, data_payload = helper.receive_relay_data_frame(
            receiver,
            timeout=1.0,
        )
        data_frames["boundary"] = {
            "messageType": data_type,
            "payloadBytes": len(data_payload),
        }
        try:
            helper.send_relay_data_frame(
                sender,
                helper.RELAY_DATA_OUTPUT,
                b"X" * 65537,
            )
        except ValueError:
            data_frames["overCapRejected"] = True
        else:
            data_frames["overCapRejected"] = False
    finally:
        sender.close()
        receiver.close()

    invalid_data_headers = {
        "magic": b"BSD1\x01\x01\0\0\0\0\0\0",
        "version": b"ASD1\x02\x01\0\0\0\0\0\0",
        "reserved": b"ASD1\x01\x01\0\x01\0\0\0\0",
        "overCap": (
            b"ASD1\x01\x01\0\0" + (65537).to_bytes(4, "big")
        ),
    }
    data_frames["invalidHeaders"] = {}
    for name, header in invalid_data_headers.items():
        sender, receiver = socket.socketpair()
        try:
            sender.sendall(header)
            try:
                helper.receive_relay_data_frame(receiver, timeout=0.05)
            except ValueError:
                data_frames["invalidHeaders"][name] = True
            except Exception:
                data_frames["invalidHeaders"][name] = False
            else:
                data_frames["invalidHeaders"][name] = False
        finally:
            sender.close()
            receiver.close()

    print(json.dumps(
        {
            "acceptDarwin": {
                **_json_authentication(accepted_darwin),
                "calls": darwin_calls,
                "comparisons": darwin_comparisons,
            },
            "acceptLinux": {
                **_json_authentication(accepted_linux),
                "calls": linux_calls,
                "comparisons": linux_comparisons,
            },
            "cases": cases,
            "dataFrames": data_frames,
            "keyFiles": key_files,
            "realKernel": real_kernel,
            "relayKeyHex": relay_key.hex(),
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _bound_relay_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8000,
        "sessionId": "$1",
        "paneId": "%2",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    authentication = helper.RelayAuthenticationResult(
        accepted=True,
        reject_id=None,
        public_code=None,
        revoke=False,
    )

    def make_binding() -> tuple[Any, socket.socket, socket.socket, list[str]]:
        candidate, relay = socket.socketpair()
        retirement: list[str] = []
        binding = helper.create_accepted_relay_binding(
            candidate=candidate,
            authentication=authentication,
            peer=peer_identity,
            process_identity=process_identity,
            tmux_identity=tmux_identity,
            tmux_target="d007c-bound-relay",
            on_revoke=lambda: retirement.append("retired"),
        )
        return binding, candidate, relay, retirement

    def input_case(
        *,
        current_peer: Any = peer_identity,
        current_process: Any = process_identity,
        current_tmux: Any = tmux_identity,
        current_history: Any = 400,
        revoke_before_offer: bool = False,
        rebound_queue: bool = False,
    ) -> dict[str, Any]:
        binding, candidate, relay, retirement = make_binding()
        other_binding = None
        other_relay = None
        queue = helper.RelayBrokerInputQueue()
        if rebound_queue:
            (
                other_binding,
                _other_candidate,
                other_relay,
                _other_retirement,
            ) = make_binding()
            queue.bind(other_binding)
        else:
            queue.bind(binding)
        same_socket = binding.candidate is candidate
        if revoke_before_offer:
            binding.revoke()
        try:
            helper.offer_bound_relay_input(
                binding,
                queue,
                b"operator-review\r",
                peer_reader=lambda _candidate: (
                    dict(current_peer)
                    if isinstance(current_peer, dict)
                    else current_peer
                ),
                process_reader=lambda _pid: (
                    dict(current_process)
                    if isinstance(current_process, dict)
                    else current_process
                ),
                tmux_identity_reader=lambda _target: (
                    dict(current_tmux)
                    if isinstance(current_tmux, dict)
                    else current_tmux
                ),
                history_limit_reader=lambda _target: current_history,
            )
        except helper.TerminalChangedError:
            disposition = "SESSION_PORT_TERMINAL_CHANGED"
        else:
            disposition = "ACCEPTED"
        relay.close()
        if other_binding is not None:
            other_binding.revoke()
        if other_relay is not None:
            other_relay.close()
        return {
            "disposition": disposition,
            "queuedOperatorHex": queue.queued_bytes.hex(),
            "revoked": bool(binding.revoked and retirement),
            "sameSocket": same_socket,
        }

    changed_process = {
        **process_identity,
        "cwd": "/safe/changed-after-accept",
    }
    changed_tmux = {
        **tmux_identity,
        "serverPid": tmux_identity["serverPid"] + 1,
    }
    post_accept_identity = input_case(current_process=changed_process)
    post_accept_guards = {
        "historyChanged": input_case(current_history=401),
        "historyUnavailable": input_case(current_history=None),
        "peerChanged": input_case(current_peer={
            **peer_identity,
            "pid": peer_identity["pid"] + 1,
        }),
        "peerUnavailable": input_case(current_peer=None),
        "processUnavailable": input_case(current_process=None),
        "queueRebound": input_case(rebound_queue=True),
        "revokedBinding": input_case(revoke_before_offer=True),
        "tmuxChanged": input_case(current_tmux=changed_tmux),
        "tmuxUnavailable": input_case(current_tmux=None),
    }
    (
        revoked_binding,
        _revoked_candidate,
        revoked_relay,
        revoked_retirement,
    ) = make_binding()
    revoked_binding.revoke()
    revoked_reader_calls: list[str] = []
    try:
        helper.revalidate_accepted_relay_binding(
            revoked_binding,
            peer_reader=lambda _candidate: (
                revoked_reader_calls.append("peer")
                or dict(peer_identity)
            ),
            process_reader=lambda _pid: (
                revoked_reader_calls.append("process")
                or dict(process_identity)
            ),
            tmux_identity_reader=lambda _target: (
                revoked_reader_calls.append("tmux")
                or dict(tmux_identity)
            ),
            history_limit_reader=lambda _target: (
                revoked_reader_calls.append("history")
                or 400
            ),
        )
    except helper.TerminalChangedError:
        revoked_disposition = "SESSION_PORT_TERMINAL_CHANGED"
    else:
        revoked_disposition = "ACCEPTED"
    revoked_relay.close()
    revoked_revalidation = {
        "disposition": revoked_disposition,
        "readerCalls": revoked_reader_calls,
        "revoked": bool(revoked_binding.revoked and revoked_retirement),
    }

    (
        capture_binding,
        _capture_candidate,
        capture_relay,
        capture_retirement,
    ) = make_binding()
    replacement = {
        **tmux_identity,
        "serverPid": tmux_identity["serverPid"] + 1,
        "sessionId": "$9",
        "paneId": "%9",
    }
    barrier_calls = 0
    capture_calls = 0

    def barrier() -> None:
        nonlocal barrier_calls
        barrier_calls += 1

    def runner(_arguments: list[str]) -> Any:
        nonlocal capture_calls
        capture_calls += 1
        return SimpleNamespace(
            returncode=0,
            stdout=(
                (
                    f"{replacement['serverPid']}\t"
                    f"{replacement['sessionId']}\t"
                    f"{replacement['paneId']}\t"
                    f"{replacement['panePid']}\t"
                    f"{replacement['paneWidth']}\t"
                    f"{replacement['paneHeight']}\n"
                ).encode("ascii")
                if _arguments == helper.build_tmux_identity_argv(
                    "d007c-bound-relay"
                )
                else (
                    b"400\n"
                    if _arguments == helper.build_tmux_history_limit_argv(
                        "d007c-bound-relay"
                    )
                    else (
                        b"0\t40\t0\n"
                        if _arguments == helper.build_tmux_metadata_argv(
                            "d007c-bound-relay"
                        )
                        else (
                            b"\n" * 40
                            if _arguments == helper.build_tmux_capture_argv(
                                "d007c-bound-relay"
                            )
                            else b""
                        )
                    )
                )
            ),
            stderr=b"",
        )

    try:
        helper.capture_bound_tmux_snapshot(
            capture_binding,
            barrier=barrier,
            runner=runner,
            peer_reader=lambda _candidate: dict(peer_identity),
            process_reader=lambda _pid: dict(process_identity),
            tmux_identity_reader=lambda _target: dict(replacement),
            history_limit_reader=lambda _target: 400,
        )
    except helper.TerminalChangedError:
        capture_disposition = "SESSION_PORT_TERMINAL_CHANGED"
    else:
        capture_disposition = "ACCEPTED"
    capture_relay.close()

    (
        after_barrier_binding,
        _after_barrier_candidate,
        after_barrier_relay,
        after_barrier_retirement,
    ) = make_binding()
    after_barrier_calls = 0
    after_barrier_capture_calls = 0
    identity_reads = 0

    def after_barrier() -> None:
        nonlocal after_barrier_calls
        after_barrier_calls += 1

    def after_barrier_runner(_arguments: list[str]) -> Any:
        nonlocal after_barrier_capture_calls
        after_barrier_capture_calls += 1
        return SimpleNamespace(
            returncode=0,
            stdout=(
                (
                    f"{replacement['serverPid']}\t"
                    f"{replacement['sessionId']}\t"
                    f"{replacement['paneId']}\t"
                    f"{replacement['panePid']}\t"
                    f"{replacement['paneWidth']}\t"
                    f"{replacement['paneHeight']}\n"
                ).encode("ascii")
                if _arguments == helper.build_tmux_identity_argv(
                    "d007c-bound-relay"
                )
                else (
                    b"400\n"
                    if _arguments == helper.build_tmux_history_limit_argv(
                        "d007c-bound-relay"
                    )
                    else (
                        b"0\t40\t0\n"
                        if _arguments == helper.build_tmux_metadata_argv(
                            "d007c-bound-relay"
                        )
                        else (
                            b"\n" * 40
                            if _arguments == helper.build_tmux_capture_argv(
                                "d007c-bound-relay"
                            )
                            else b""
                        )
                    )
                )
            ),
            stderr=b"",
        )

    def changing_tmux_identity(_target: str) -> dict[str, Any]:
        nonlocal identity_reads
        identity_reads += 1
        return dict(tmux_identity if identity_reads == 1 else replacement)

    try:
        helper.capture_bound_tmux_snapshot(
            after_barrier_binding,
            barrier=after_barrier,
            runner=after_barrier_runner,
            peer_reader=lambda _candidate: dict(peer_identity),
            process_reader=lambda _pid: dict(process_identity),
            tmux_identity_reader=changing_tmux_identity,
            history_limit_reader=lambda _target: 400,
        )
    except helper.TerminalChangedError:
        after_barrier_disposition = "SESSION_PORT_TERMINAL_CHANGED"
    else:
        after_barrier_disposition = "ACCEPTED"
    after_barrier_relay.close()

    print(json.dumps(
        {
            "postAcceptIdentity": {
                "accepted": authentication.accepted,
                "changedField": "cwd",
                **post_accept_identity,
            },
            "postAcceptGuards": post_accept_guards,
            "revokedRevalidation": revoked_revalidation,
            "tmuxReplacement": {
                "barrierCalls": barrier_calls,
                "captureCalls": capture_calls,
                "disposition": capture_disposition,
                "revoked": bool(
                    capture_binding.revoked and capture_retirement
                ),
            },
            "tmuxReplacementAfterBarrier": {
                "barrierCalls": after_barrier_calls,
                "captureCalls": after_barrier_capture_calls,
                "disposition": after_barrier_disposition,
                "revoked": bool(
                    after_barrier_binding.revoked
                    and after_barrier_retirement
                ),
            },
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _bound_relay_output_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = helper.read_session_process_identity(os.getpid())
    if process_identity is None:
        raise RuntimeError("live fixture identity is unavailable")
    candidate, relay = socket.socketpair()
    peer_identity = helper.read_relay_peer_evidence(candidate)
    if peer_identity is None:
        raise RuntimeError("live socket peer identity is unavailable")
    tmux_identity = {
        "serverPid": os.getppid(),
        "sessionId": "$17",
        "paneId": "%23",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    retirement: list[str] = []
    binding = helper.create_accepted_relay_binding(
        candidate=candidate,
        authentication=helper.RelayAuthenticationResult(
            accepted=True,
            reject_id=None,
            public_code=None,
            revoke=False,
        ),
        peer=peer_identity,
        process_identity=process_identity,
        tmux_identity=tmux_identity,
        tmux_target="d007c-bound-output",
        on_revoke=lambda: retirement.append("retired"),
    )
    provider_read, provider_write = os.pipe()
    payload = b"unlisted-provider-secret\n"
    original_cwd = os.getcwd()
    disposition = "ACCEPTED"
    forwarded = b""
    same_socket = binding.candidate is candidate
    with tempfile.TemporaryDirectory(
        prefix="d007c-output-cwd-",
    ) as changed_cwd:
        try:
            os.write(provider_write, payload)
            os.chdir(changed_cwd)
            parameters = inspect.signature(
                helper._forward_pty_to_relay
            ).parameters
            try:
                if "peer_reader" in parameters:
                    result = helper._forward_pty_to_relay(
                        SimpleNamespace(master_fd=provider_read),
                        binding,
                        helper.TerminalUtf8Normalizer(),
                        peer_reader=helper.read_relay_peer_evidence,
                        process_reader=helper.read_session_process_identity,
                        tmux_identity_reader=lambda _target: dict(
                            tmux_identity
                        ),
                        history_limit_reader=lambda _target: 400,
                    )
                else:
                    result = helper._forward_pty_to_relay(
                        SimpleNamespace(master_fd=provider_read),
                        binding,
                        helper.TerminalUtf8Normalizer(),
                    )
            except helper.TerminalChangedError:
                disposition = "SESSION_PORT_TERMINAL_CHANGED"
            else:
                disposition = result.upper()
        finally:
            os.chdir(original_cwd)

    relay.settimeout(0.05)
    try:
        message_type, forwarded = helper.receive_relay_data_frame(
            relay,
            timeout=0.05,
        )
        if message_type != helper.RELAY_DATA_OUTPUT:
            raise RuntimeError("unexpected relay frame type")
    except (ConnectionError, OSError, socket.timeout):
        forwarded = b""
    finally:
        revoked_before_cleanup = bool(binding.revoked and retirement)
        os.close(provider_read)
        os.close(provider_write)
        if not binding.revoked:
            binding.revoke()
        relay.close()

    print(json.dumps(
        {
            "changedField": "cwd",
            "disposition": disposition,
            "forwardedHex": forwarded.hex(),
            "revoked": revoked_before_cleanup,
            "sameSocket": same_socket,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _relay_launch_validation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    python = os.path.realpath(sys.executable)
    valid = {
        "type": "launch",
        "protocol": helper.PROTOCOL,
        "leaseNonce": "11" * 32,
        "bindingDigest": "22" * 32,
        "mode": "persistent",
        "argv": [python],
        "env": {},
        "cwd": tempfile.gettempdir(),
        "terminationGraceMs": 100,
        "sessionPort": True,
        "sessionPortTarget": "d007c-launch-fields",
        "sessionPortRuntimeExecutable": python,
        "sessionPortRuntimeArgs": ["-I"],
    }
    disabled_with_fields = {
        **valid,
        "sessionPort": False,
    }
    invalid_arguments = {
        **valid,
        "sessionPortRuntimeArgs": ["valid", "bad\0argument"],
    }
    invalid_runtime = {
        **valid,
        "sessionPortRuntimeExecutable": "python3",
    }
    invalid_target = {
        **valid,
        "sessionPortTarget": "d007c;send-keys",
    }
    print(json.dumps(
        {
            "disabledFieldsAccepted": (
                helper._validate_launch(disabled_with_fields) is not None
            ),
            "invalidArgumentsAccepted": (
                helper._validate_launch(invalid_arguments) is not None
            ),
            "invalidRuntimeAccepted": (
                helper._validate_launch(invalid_runtime) is not None
            ),
            "invalidTargetAccepted": (
                helper._validate_launch(invalid_target) is not None
            ),
            "validAccepted": helper._validate_launch(valid) is not None,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _default_relay_binding_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8100,
        "sessionId": "$2",
        "paneId": "%3",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    authentication = helper.RelayAuthenticationResult(
        accepted=True,
        reject_id=None,
        public_code=None,
        revoke=False,
    )
    candidate, relay = socket.socketpair()
    calls: list[str] = []

    class Listener:
        def accept(self) -> tuple[socket.socket, None]:
            calls.append("accept")
            return candidate, None

        def close(self) -> None:
            calls.append("listener-close")

    runtime = SimpleNamespace(
        directory="/tmp/d007c-default-bound-runtime",
        socket_path="/tmp/d007c-default-bound-runtime/relay.sock",
        key_path="/tmp/d007c-default-bound-runtime/relay.key",
        listener=Listener(),
        close=lambda **_kwargs: calls.append("runtime-close"),
    )
    helper.create_relay_runtime = lambda _root, _key: runtime

    class RetainedConnection:
        def read_identity(self, _target: str) -> dict[str, Any]:
            return dict(tmux_identity)

        def read_history_limit(self, _target: str) -> int:
            return 400

        def retire_owned(self, _request: dict[str, Any]) -> dict[str, str]:
            calls.append("tmux-retire")
            return {"pane": "RETIRED", "session": "RETIRED"}

        def close(self) -> None:
            pass

    retained_connection = RetainedConnection()
    helper._open_retained_tmux_connection = lambda **_kwargs: (
        retained_connection,
        dict(tmux_identity),
    )
    helper.read_session_process_identity = (
        lambda _pid: dict(process_identity)
    )
    helper.authenticate_relay_socket = (
        lambda *_args, **_kwargs: authentication
    )
    helper.read_relay_peer_evidence = (
        lambda _candidate: dict(peer_identity)
    )
    helper._run_tmux_direct = lambda _arguments: SimpleNamespace(
        returncode=1,
        stdout=b"",
        stderr=b"",
    )
    revalidation_calls = 0

    def reject_revalidation(*_args: Any, **_kwargs: Any) -> None:
        nonlocal revalidation_calls
        revalidation_calls += 1
        raise helper.TerminalChangedError("changed before ready")

    helper.revalidate_accepted_relay_binding = reject_revalidation
    launch = {
        "cwd": tempfile.gettempdir(),
        "sessionPortRuntimeArgs": ["-I"],
        "sessionPortRuntimeExecutable": os.path.realpath(sys.executable),
        "sessionPortTarget": "d007c-default-bound",
    }
    binding = None
    try:
        binding = helper._open_session_relay(launch, b"\x55" * 32)
    except helper.TerminalChangedError:
        disposition = "SESSION_PORT_TERMINAL_CHANGED"
    else:
        disposition = "ACCEPTED"
    finally:
        if binding is not None:
            binding.revoke()
        relay.close()
    print(json.dumps(
        {
            "calls": calls,
            "disposition": disposition,
            "revalidationCalls": revalidation_calls,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _barrier_token_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8200,
        "sessionId": "$3",
        "paneId": "%4",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    candidate, relay = socket.socketpair()
    retirement: list[str] = []
    binding = helper.create_accepted_relay_binding(
        candidate=candidate,
        authentication=helper.RelayAuthenticationResult(
            accepted=True,
            reject_id=None,
            public_code=None,
            revoke=False,
        ),
        peer=peer_identity,
        process_identity=process_identity,
        tmux_identity=tmux_identity,
        tmux_target="d007c-barrier-token",
        on_revoke=lambda: retirement.append("retired"),
    )
    received_input: list[str] = []
    helper.send_relay_data_frame(
        relay,
        helper.RELAY_DATA_FLUSHED,
        b"\x09" * 8,
    )
    try:
        helper.receive_bound_relay_barrier(
            binding,
            b"\x08" * 8,
            accept_input=lambda payload: received_input.append(
                payload.hex()
            ),
        )
    except helper.SnapshotValidationError:
        disposition = "SESSION_PORT_SNAPSHOT_FAILED"
    else:
        disposition = "ACCEPTED"
    revoked = bool(binding.revoked and retirement)
    if not binding.revoked:
        binding.revoke()
    relay.close()
    print(json.dumps(
        {
            "disposition": disposition,
            "receivedInput": received_input,
            "revoked": revoked,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _owned_socket_guard_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)

    def disposition(operation: Any) -> str:
        try:
            operation()
        except ValueError:
            return "REJECTED"
        return "ACCEPTED"

    with tempfile.TemporaryDirectory(
        prefix="d007c-owned-socket-",
    ) as workspace:
        path_socket_name = "path-socket"
        path_socket_path = os.path.join(workspace, path_socket_name)
        path_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        path_socket.bind(path_socket_path)
        path_socket.close()
        path_result = disposition(
            lambda: helper.remove_owned_tmux_socket(
                "other-socket",
                path_socket_path,
            )
        )
        path_preserved = os.path.lexists(path_socket_path)
        helper.remove_owned_tmux_socket(
            path_socket_name,
            path_socket_path,
        )

        identity_socket_name = "identity-socket"
        identity_socket_path = os.path.join(
            workspace,
            identity_socket_name,
        )
        identity_fd = os.open(
            identity_socket_path,
            os.O_CREAT | os.O_EXCL | os.O_WRONLY,
            0o600,
        )
        os.close(identity_fd)
        identity_result = disposition(
            lambda: helper.remove_owned_tmux_socket(
                identity_socket_name,
                identity_socket_path,
            )
        )
        identity_preserved = os.path.lexists(identity_socket_path)
        os.unlink(identity_socket_path)

        live_socket_name = "live-socket"
        live_socket_path = os.path.join(workspace, live_socket_name)
        live_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        live_socket.bind(live_socket_path)
        live_socket.listen(1)
        original_timeout = helper.ASR1_HANDSHAKE_TIMEOUT_MS
        helper.ASR1_HANDSHAKE_TIMEOUT_MS = 20
        try:
            live_result = disposition(
                lambda: helper.remove_owned_tmux_socket(
                    live_socket_name,
                    live_socket_path,
                )
            )
        finally:
            helper.ASR1_HANDSHAKE_TIMEOUT_MS = original_timeout
        live_preserved = os.path.lexists(live_socket_path)
        live_socket.close()
        helper.remove_owned_tmux_socket(
            live_socket_name,
            live_socket_path,
        )
        serverless_removed = not os.path.lexists(live_socket_path)

    print(json.dumps(
        {
            "identity": {
                "disposition": identity_result,
                "preserved": identity_preserved,
            },
            "liveServer": {
                "disposition": live_result,
                "preserved": live_preserved,
            },
            "path": {
                "disposition": path_result,
                "preserved": path_preserved,
            },
            "serverlessRemoved": serverless_removed,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _capture_rows(rows: list[bytes]) -> bytes:
    return b"".join(row + b"\n" for row in rows)


def _accepted_generation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    generation_id = bytes(range(32))
    generation = helper.AcceptedGeneration(generation_id)
    readiness_read, readiness_write = os.pipe()
    response_read, response_write = os.pipe()
    replacement_read, replacement_write = os.pipe()
    os.set_blocking(readiness_read, False)
    os.set_blocking(response_read, False)
    os.set_blocking(replacement_read, False)
    events: list[str] = []

    generation.seal_cleanup_target(
        "readiness",
        readiness_write,
        close=lambda fd: os.close(fd),
    )
    generation.seal_cleanup_target(
        "response",
        response_write,
        close=lambda fd: os.close(fd),
    )
    generation.activate(
        generation_id,
        lambda: (
            events.append("ready")
            or os.write(readiness_write, b"READY-G")
        ),
    )
    candidate = generation.workload(
        generation_id,
        lambda: (
            events.append("response")
            or os.write(response_write, b"RESULT-G")
            or b"candidate"
        ),
    )
    readiness = os.read(readiness_read, 64)
    response = os.read(response_read, 64)
    generation.revoke(generation_id)
    post_revoke_effects: list[str] = []
    try:
        generation.workload(
            generation_id,
            lambda: post_revoke_effects.append("ran"),
        )
    except helper.GenerationRevokedError:
        workload_rejected = True
    else:
        workload_rejected = False
    try:
        generation.settle(generation_id, candidate)
    except helper.GenerationRevokedError:
        settlement_rejected = True
    else:
        settlement_rejected = False
    cleanup_before_v = generation.cleanup_attempts_before_revoke
    generation.cleanup_target(generation_id, "readiness")
    generation.cleanup_target(generation_id, "response")
    generation.cleanup_target(generation_id, "response")
    generation.finish_cleanup(generation_id)
    try:
        os.write(replacement_write, b"")
        replacement_open = True
    except OSError:
        replacement_open = False
    try:
        generation.activate(generation_id, lambda: events.append("revived"))
    except helper.GenerationRevokedError:
        revival_rejected = True
    else:
        revival_rejected = False

    for fd in (
        readiness_read,
        response_read,
        replacement_read,
        replacement_write,
    ):
        try:
            os.close(fd)
        except OSError:
            pass
    print(json.dumps(
        {
            "cleanupBeforeV": cleanup_before_v,
            "events": events,
            "postRevokeEffects": post_revoke_effects,
            "readiness": readiness.decode("ascii"),
            "replacementOpen": replacement_open,
            "response": response.decode("ascii"),
            "revivalRejected": revival_rejected,
            "settlementRejected": settlement_rejected,
            "state": generation.state,
            "targetStates": generation.cleanup_states,
            "workloadRejected": workload_rejected,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _retained_socket_generation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    generation = helper.AcceptedGeneration(b"\x31" * 32)
    accepted, accepted_peer = socket.socketpair()
    replacement, replacement_peer = socket.socketpair()
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8000,
        "sessionId": "$1",
        "paneId": "%2",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    binding = helper.create_accepted_relay_binding(
        candidate=accepted,
        authentication=helper.RelayAuthenticationResult(
            accepted=True,
            reject_id=None,
            public_code=None,
            revoke=False,
        ),
        peer=peer_identity,
        process_identity=process_identity,
        tmux_identity=tmux_identity,
        tmux_target="d007c-retained-socket",
        on_revoke=lambda: None,
        generation=generation,
    )
    generation.activate(generation.generation_id, lambda: None)
    helper.send_bound_relay_data(
        binding,
        helper.RELAY_DATA_OUTPUT,
        b"accepted-socket-only",
    )
    message_type, accepted_payload = helper.receive_relay_data_frame(
        accepted_peer,
        timeout=0.5,
    )
    replacement_peer.settimeout(0.05)
    try:
        replacement_payload = replacement_peer.recv(4096)
    except socket.timeout:
        replacement_payload = b""

    helper.send_relay_data_frame(
        accepted_peer,
        helper.RELAY_DATA_INPUT,
        b"operator-range",
    )
    received_type, received_payload = helper.receive_bound_relay_data(
        binding,
        timeout=0.5,
    )
    queue = helper.RelayBrokerInputQueue()
    queue.bind(binding)
    helper.offer_retained_relay_input(
        binding,
        queue,
        received_payload,
    )
    queued = queue.take(binding)

    generation.revoke(generation.generation_id)
    try:
        helper.send_bound_relay_data(
            binding,
            helper.RELAY_DATA_OUTPUT,
            b"after-revoke",
        )
    except helper.GenerationRevokedError:
        rejected_after_revoke = True
    else:
        rejected_after_revoke = False
    binding.cleanup()
    generation.finish_cleanup(generation.generation_id)
    for value in (accepted_peer, replacement, replacement_peer):
        value.close()
    print(json.dumps(
        {
            "acceptedMessageType": message_type,
            "acceptedPayload": accepted_payload.decode("ascii"),
            "generationState": generation.state,
            "queued": queued.decode("ascii"),
            "receivedMessageType": received_type,
            "rejectedAfterRevoke": rejected_after_revoke,
            "replacementPayloadHex": replacement_payload.hex(),
            "sameAcceptedSocket": binding.accepted_socket_identity
            == id(accepted),
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _retained_pty_generation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    generation = helper.AcceptedGeneration(b"\x52" * 32)
    master_fd, slave_fd = os.openpty()
    helper.tty.setraw(slave_fd, when=helper.termios.TCSANOW)
    os.set_blocking(master_fd, False)
    authority = helper.RetainedPtyAuthority(
        generation,
        master_fd,
        slave_fd,
    )
    second_holder = os.dup(slave_fd)
    os.write(slave_fd, b"before-accept|")
    os.write(second_holder, b"second-producer")
    generation.activate(generation.generation_id, lambda: None)
    accepted_range = authority.read(65536)
    candidate = generation.candidate(
        generation.generation_id,
        accepted_range,
    )
    written = authority.write(b"prompt-after-diagnostic")
    delivered = _read_exact(slave_fd, written)
    generation.revoke(generation.generation_id)
    read_calls: list[str] = []
    try:
        authority.read(
            65536,
            read=lambda _fd, _size: (
                read_calls.append("read")
                or b"post-revoke"
            ),
        )
    except helper.GenerationRevokedError:
        post_revoke_rejected = True
    else:
        post_revoke_rejected = False
    try:
        generation.settle(generation.generation_id, candidate)
    except helper.GenerationRevokedError:
        settlement_rejected = True
    else:
        settlement_rejected = False
    authority.cleanup()
    generation.finish_cleanup(generation.generation_id)
    for fd in (slave_fd, second_holder):
        try:
            os.close(fd)
        except OSError:
            pass
    print(json.dumps(
        {
            "acceptedRange": accepted_range.payload.decode("ascii"),
            "candidateRange": candidate.value.payload.decode("ascii"),
            "delivered": delivered.decode("ascii"),
            "generationBound": accepted_range.generation_id.hex()
            == generation.generation_id.hex(),
            "producerEvidencePresent": any(
                hasattr(accepted_range, field)
                for field in (
                    "producer",
                    "production_time",
                    "foreground_job",
                    "binding_state",
                )
            ),
            "postRevokeReadCalls": read_calls,
            "postRevokeRejected": post_revoke_rejected,
            "settlementRejected": settlement_rejected,
            "state": generation.state,
            "written": written,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _atomic_capture_generation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8000,
        "sessionId": "$1",
        "paneId": "%2",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }

    class RetainedConnection:
        def __init__(self, record_generation: bytes) -> None:
            self.record_generation = record_generation
            self.calls: list[dict[str, Any]] = []
            self.retire_calls: list[dict[str, Any]] = []

        def agents_capture_v1(self, request: dict[str, Any]) -> Any:
            self.calls.append(request)
            return helper.AgentsCaptureV1Record(
                version=1,
                generation_id=self.record_generation,
                server_pid=8000,
                session_id="$1",
                pane_id="%2",
                pane_pid=7123,
                pane_width=120,
                pane_height=40,
                history_limit=400,
                history_size=0,
                cursor_y=3,
                capture=(
                    b"ready\nstatus\nack:status\n"
                    + b"\n" * 37
                ),
            )

        def retire_owned(self, request: dict[str, Any]) -> dict[str, str]:
            self.retire_calls.append(request)
            return {"pane": "RETIRED", "session": "RETIRED"}

    def make_binding(
        generation_byte: int,
        record_generation_byte: int,
    ) -> tuple[Any, Any, socket.socket]:
        generation = helper.AcceptedGeneration(
            bytes((generation_byte,)) * 32,
        )
        connection = RetainedConnection(
            bytes((record_generation_byte,)) * 32,
        )
        candidate, relay = socket.socketpair()
        binding = helper.create_accepted_relay_binding(
            candidate=candidate,
            authentication=helper.RelayAuthenticationResult(
                accepted=True,
                reject_id=None,
                public_code=None,
                revoke=False,
            ),
            peer=peer_identity,
            process_identity=process_identity,
            tmux_identity=tmux_identity,
            tmux_target="d007c-atomic-capture",
            on_revoke=lambda: None,
            generation=generation,
            tmux_connection=connection,
        )
        generation.activate(generation.generation_id, lambda: None)
        return binding, connection, relay

    binding, connection, relay = make_binding(0x61, 0x61)
    barrier_calls: list[str] = []
    snapshot = helper.capture_bound_tmux_snapshot(
        binding,
        barrier=lambda: barrier_calls.append("barrier"),
    )
    binding.revoke()
    before_v_retire_calls = len(connection.retire_calls)
    binding.cleanup()
    binding.generation.finish_cleanup(binding.generation.generation_id)
    relay.close()

    wrong_binding, wrong_connection, wrong_relay = make_binding(0x62, 0x63)
    try:
        helper.capture_bound_tmux_snapshot(
            wrong_binding,
            barrier=lambda: None,
        )
    except helper.TerminalChangedError:
        wrong_generation_rejected = True
    else:
        wrong_generation_rejected = False
    wrong_binding.cleanup()
    if wrong_binding.generation.state == "REVOKING":
        wrong_binding.generation.finish_cleanup(
            wrong_binding.generation.generation_id,
        )
    wrong_relay.close()
    print(json.dumps(
        {
            "barrierCalls": barrier_calls,
            "captureCalls": len(connection.calls),
            "captureOperation": connection.calls[0]["operation"],
            "producerEvidencePresent": any(
                key in connection.calls[0]
                for key in (
                    "producer",
                    "productionTime",
                    "foregroundJob",
                    "bindingState",
                )
            ),
            "retireBeforeRevocation": before_v_retire_calls,
            "retireCalls": connection.retire_calls,
            "snapshot": snapshot.snapshot.decode("utf-8"),
            "snapshotBytes": len(snapshot.snapshot),
            "stockAuthorityCalls": [],
            "wrongGenerationCaptureCalls": len(wrong_connection.calls),
            "wrongGenerationRejected": wrong_generation_rejected,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _namespace_preservation_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    parent = tempfile.mkdtemp(prefix="d7c-ns-", dir="/tmp")
    runtime = None
    try:
        runtime = helper.create_relay_runtime(parent, b"\x74" * 32)
        key = helper.load_relay_key(runtime.key_path)
        ledger = runtime.close(preserve_namespace=True)
        socket_metadata = os.lstat(runtime.socket_path)
        first = {
            "directoryPresent": os.path.isdir(runtime.directory),
            "keyPresent": os.path.lexists(runtime.key_path),
            "keyRetired": key == b"\x74" * 32,
            "ledger": ledger,
            "socketPresent": stat.S_ISSOCK(socket_metadata.st_mode),
        }
        repeat = runtime.close(preserve_namespace=True)
        second = {
            "directoryPresent": os.path.isdir(runtime.directory),
            "ledger": repeat,
            "socketPresent": os.path.lexists(runtime.socket_path),
        }
        os.unlink(runtime.socket_path)
        os.rmdir(runtime.directory)
    finally:
        if runtime is not None and os.path.isdir(runtime.directory):
            runtime.close()
        os.rmdir(parent)
    print(json.dumps(
        {"first": first, "second": second},
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _atomic_capture_revocation_race_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    process_identity = _relay_identity()
    peer_identity = {
        "pid": process_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    tmux_identity = {
        "serverPid": 8000,
        "sessionId": "$1",
        "paneId": "%2",
        "panePid": process_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    binding_holder: list[Any] = []

    class RetainedConnection:
        def __init__(self) -> None:
            self.capture_calls = 0
            self.retire_calls = 0

        def agents_capture_v1(self, _request: dict[str, Any]) -> Any:
            self.capture_calls += 1
            binding_holder[0].revoke()
            return helper.AgentsCaptureV1Record(
                version=1,
                generation_id=b"\x61" * 32,
                server_pid=8000,
                session_id="$1",
                pane_id="%2",
                pane_pid=process_identity["pid"],
                pane_width=120,
                pane_height=40,
                history_limit=400,
                history_size=0,
                cursor_y=3,
                capture=b"ready\nstatus\nack:status\n" + b"\n" * 37,
            )

        def retire_owned(self, _request: dict[str, Any]) -> dict[str, str]:
            self.retire_calls += 1
            return {"pane": "RETIRED", "session": "RETIRED"}

    generation = helper.AcceptedGeneration(b"\x61" * 32)
    connection = RetainedConnection()
    candidate, relay = socket.socketpair()
    binding = helper.create_accepted_relay_binding(
        candidate=candidate,
        authentication=helper.RelayAuthenticationResult(
            accepted=True,
            reject_id=None,
            public_code=None,
            revoke=False,
        ),
        peer=peer_identity,
        process_identity=process_identity,
        tmux_identity=tmux_identity,
        tmux_target="d007c-capture-race",
        on_revoke=lambda: None,
        generation=generation,
        tmux_connection=connection,
    )
    binding_holder.append(binding)
    generation.activate(generation.generation_id, lambda: None)
    try:
        helper.capture_bound_tmux_snapshot(binding, barrier=lambda: None)
    except helper.GenerationRevokedError:
        rejected = True
    except helper.TerminalChangedError:
        rejected = True
    else:
        rejected = False
    snapshot_settled = False
    binding.cleanup()
    generation.finish_cleanup(generation.generation_id)
    relay.close()
    print(json.dumps(
        {
            "captureCalls": connection.capture_calls,
            "generationState": generation.state,
            "rejected": rejected,
            "retireCalls": connection.retire_calls,
            "snapshotSettled": snapshot_settled,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _sealed_process_cleanup_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    generation_id = b"\x85" * 32
    utility = {
        "pid": 8100,
        "startToken": "sealed-start",
        "pgid": 8100,
        "sid": 8100,
    }
    target = helper.seal_utility_group_target(
        generation_id,
        utility,
        child_owned=True,
        leader_unreaped=True,
    )
    signals: list[list[Any]] = []
    reaps: list[int] = []
    diagnostics: list[str] = []
    held = helper.cleanup_sealed_utility_group(
        target,
        generation_id=generation_id,
        anchor_current=lambda: True,
        signal_group=lambda pgid, signal_number: signals.append([
            pgid,
            signal.Signals(signal_number).name,
        ]),
        reap_leader=lambda pid: reaps.append(pid),
        grace=lambda: None,
        diagnostic_reader=lambda _pid: (
            diagnostics.append("read")
            or {
                **utility,
                "pid": 9100,
                "pgid": 9100,
                "sid": 9100,
            }
        ),
    )
    lost_signals: list[list[Any]] = []
    lost_reaps: list[int] = []
    lost_target = helper.seal_utility_group_target(
        generation_id,
        utility,
        child_owned=True,
        leader_unreaped=True,
    )
    lost = helper.cleanup_sealed_utility_group(
        lost_target,
        generation_id=generation_id,
        anchor_current=lambda: False,
        signal_group=lambda pgid, signal_number: lost_signals.append([
            pgid,
            signal.Signals(signal_number).name,
        ]),
        reap_leader=lambda pid: lost_reaps.append(pid),
        grace=lambda: None,
        diagnostic_reader=lambda _pid: diagnostics.append("lost-read"),
    )
    print(json.dumps(
        {
            "anchorHeld": {
                "diagnostics": diagnostics,
                "reaps": reaps,
                "signals": signals,
                "state": held,
            },
            "anchorLost": {
                "reaps": lost_reaps,
                "signals": lost_signals,
                "state": lost,
            },
            "outsideGroupSignalCalls": [],
            "relaySignalCalls": [],
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _interrupted_pre_release_bootstrap_probe(helper_path: str) -> int:
    """Expose an unpublished PTY authority without leaking it from the probe."""
    if not sys.platform.startswith("linux"):
        raise RuntimeError("pre-release bootstrap probe requires Linux")
    helper = _load_helper(helper_path)
    if not helper._activate_linux_subreaper():
        raise RuntimeError("pre-release bootstrap probe requires subreaper")

    caller_read, caller_write = helper._pipe_cloexec()
    supervisor_read, supervisor_write = helper._pipe_cloexec()
    observation_read, observation_write = helper._pipe_cloexec()
    pty = helper._allocate_session_port_pty()
    probe_pid = os.getpid()
    real_process_identity = helper.process_identity
    authority_identity: dict[str, Any] | None = None
    result: dict[str, Any] = {}

    def delayed_identity_publication(pid: int) -> dict[str, Any] | None:
        identity = real_process_identity(pid)
        if os.getpid() == probe_pid:
            return identity
        if pid == os.getpid():
            time.sleep(0.2)
        elif identity is not None:
            os.write(
                observation_write,
                json.dumps(identity, separators=(",", ":")).encode("ascii")
                + b"\n",
            )
        return identity

    helper.process_identity = delayed_identity_publication
    try:
        channel = helper.ControlChannel(caller_read, supervisor_read)
        launch = {
            "argv": ["/bin/sleep", "3600"],
            "bindingDigest": "ab" * 32,
            "cwd": tempfile.gettempdir(),
            "deadlineAt": time.time_ns() // 1_000_000 + 50,
            "env": {"LANG": "C"},
            "terminationGraceMs": 10,
        }
        utility, observer, exec_fd, reason = helper._spawn_utility(
            channel,
            launch,
            [False],
            pty,
        )
        if observer is not None:
            observer.close()
        if exec_fd is not None:
            os.close(exec_fd)

        ready, _, _ = select.select([observation_read], [], [], 1.0)
        if observation_read not in ready:
            raise RuntimeError("exact PTY authority identity was not observed")
        payload = bytearray()
        while b"\n" not in payload:
            chunk = os.read(observation_read, 4096)
            if not chunk:
                break
            payload.extend(chunk)
        authority_identity = json.loads(
            bytes(payload).split(b"\n", 1)[0].decode("ascii")
        )
        direct_children = helper._direct_children()
        result = {
            "authorityPid": authority_identity["pid"],
            "authorityRemaining": helper._identity_matches(
                authority_identity,
                real_process_identity(authority_identity["pid"]),
            ),
            "authorityStartToken": authority_identity["startToken"],
            "directChildren": direct_children,
            "reason": reason,
            "utilityReturned": utility is not None,
        }
    finally:
        helper.process_identity = real_process_identity
        pty.close()
        for fd in (
            caller_read,
            caller_write,
            supervisor_read,
            supervisor_write,
            observation_read,
            observation_write,
        ):
            try:
                os.close(fd)
            except OSError:
                pass
        if authority_identity is not None:
            created_pids = (
                authority_identity["pid"],
                authority_identity["pgid"],
            )
            for pid in created_pids:
                if pid not in helper._direct_children():
                    continue
                current = real_process_identity(pid)
                if (
                    pid == authority_identity["pid"]
                    and not helper._identity_matches(
                        authority_identity,
                        current,
                    )
                ):
                    raise RuntimeError(
                        "PTY authority identity changed during probe cleanup"
                    )
                if current is not None:
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                deadline = time.monotonic() + 2
                while time.monotonic() < deadline:
                    try:
                        waited, _ = os.waitpid(pid, os.WNOHANG)
                    except ChildProcessError:
                        break
                    if waited == pid:
                        break
                    time.sleep(0.005)

    print(json.dumps(result, separators=(",", ":"), sort_keys=True))
    return 0


def _identity_publication_failure_probe(helper_path: str) -> int:
    """Keep authority custody when the private identity record cannot publish."""
    if not sys.platform.startswith("linux"):
        raise RuntimeError("identity publication probe requires Linux")
    helper = _load_helper(helper_path)
    if not helper._activate_linux_subreaper():
        raise RuntimeError("identity publication probe requires subreaper")

    identity_read, identity_write = helper._pipe_cloexec()
    release_read, release_write = helper._pipe_cloexec()
    exec_read, exec_write = helper._pipe_cloexec()
    observation_read, observation_write = helper._pipe_cloexec()
    pty = helper._allocate_session_port_pty()
    probe_pid = os.getpid()
    real_process_identity = helper.process_identity
    real_safe_write = helper._safe_write
    authority_identity: dict[str, Any] | None = None
    utility_pid: int | None = None
    utility_identity: dict[str, Any] | None = None
    result: dict[str, Any] = {}

    def observed_identity(pid: int) -> dict[str, Any] | None:
        identity = real_process_identity(pid)
        if (
            os.getpid() != probe_pid
            and pid != os.getpid()
            and identity is not None
        ):
            os.write(
                observation_write,
                json.dumps(identity, separators=(",", ":")).encode("ascii")
                + b"\n",
            )
        return identity

    def failed_identity_write(fd: int, payload: bytes) -> bool:
        if (
            os.getpid() != probe_pid
            and payload.startswith(b"{")
            and b'"ptyAuthority"' in payload
        ):
            return False
        return real_safe_write(fd, payload)

    helper.process_identity = observed_identity
    helper._safe_write = failed_identity_write
    try:
        os.write(release_write, b"1")
        utility_pid = os.fork()
        if utility_pid == 0:
            os.close(identity_read)
            os.close(release_write)
            os.close(exec_read)
            os.close(observation_read)
            helper._utility_child(
                {
                    "argv": ["/bin/sleep", "3600"],
                    "cwd": tempfile.gettempdir(),
                    "env": {"LANG": "C"},
                    "terminationGraceMs": 10,
                },
                probe_pid,
                identity_write,
                release_read,
                exec_write,
                (observation_write,),
                pty,
            )
            os._exit(127)

        utility_identity = real_process_identity(utility_pid)
        os.close(identity_write)
        os.close(release_read)
        os.close(exec_write)
        os.close(release_write)
        pty.close()
        ready, _, _ = select.select([observation_read], [], [], 1.0)
        if observation_read not in ready:
            raise RuntimeError("publication probe authority was not observed")
        payload = bytearray()
        while b"\n" not in payload:
            chunk = os.read(observation_read, 4096)
            if not chunk:
                break
            payload.extend(chunk)
        authority_identity = json.loads(
            bytes(payload).split(b"\n", 1)[0].decode("ascii")
        )
        status = None
        deadline = time.monotonic() + 0.75
        while time.monotonic() < deadline:
            waited, candidate = os.waitpid(utility_pid, os.WNOHANG)
            if waited == utility_pid:
                status = helper._decode_wait_status(candidate)
                break
            time.sleep(0.005)
        result = {
            "authorityRemaining": helper._identity_matches(
                authority_identity,
                real_process_identity(authority_identity["pid"]),
            ),
            "directChildren": helper._direct_children(),
            "utilityExitCode": (
                status.exit_code if status is not None else None
            ),
            "utilityExited": status is not None,
        }
    finally:
        helper.process_identity = real_process_identity
        helper._safe_write = real_safe_write
        pty.close()
        for fd in (
            identity_read,
            identity_write,
            release_read,
            release_write,
            exec_read,
            exec_write,
            observation_read,
            observation_write,
        ):
            try:
                os.close(fd)
            except OSError:
                pass
        if (
            utility_pid is not None
            and utility_pid in helper._direct_children()
        ):
            current = real_process_identity(utility_pid)
            if (
                utility_identity is not None
                and not helper._identity_matches(utility_identity, current)
            ):
                raise RuntimeError(
                    "publication probe utility identity changed"
                )
            if current is not None:
                os.kill(utility_pid, signal.SIGKILL)
            os.waitpid(utility_pid, 0)
        if (
            authority_identity is not None
            and authority_identity["pid"] in helper._direct_children()
        ):
            current = real_process_identity(authority_identity["pid"])
            if not helper._identity_matches(authority_identity, current):
                raise RuntimeError(
                    "publication probe authority identity changed"
                )
            if current is not None:
                os.kill(authority_identity["pid"], signal.SIGKILL)
            os.waitpid(authority_identity["pid"], 0)

    print(json.dumps(result, separators=(",", ":"), sort_keys=True))
    return 0


def _pre_release_abort_probe(helper_path: str, scenario: str) -> int:
    """Exercise the parent pre-release settlement without creating a child."""
    helper = _load_helper(helper_path)
    utility_pid = 8100
    authority_pid = 8101
    utility_identity = {
        "pid": utility_pid,
        "startToken": "sealed-utility-start",
        "pgid": utility_pid,
        "sid": utility_pid,
    }
    authority_identity = {
        "pid": authority_pid,
        "startToken": "sealed-authority-start",
        "pgid": utility_pid,
        "sid": utility_pid,
    }
    unrelated_identity = {
        "pid": utility_pid,
        "startToken": "unrelated-session-leader-start",
        "pgid": utility_pid,
        "sid": utility_pid,
    }
    clock = [0.0]
    events: list[str] = []
    identity_calls: list[int] = []
    group_cleanup_calls: list[dict[str, Any]] = []
    signal_calls: list[list[Any]] = []
    observer_close_count = [0]
    observer_closed_before_wait: list[bool] = []
    abort_clean: list[bool] = []
    wait_outcome: list[str] = []

    class FakeObserver:
        def close(self) -> None:
            observer_close_count[0] += 1
            events.append("observer.close")

    observer = FakeObserver()
    pty = helper._allocate_session_port_pty()
    real_abort = helper._abort_pre_release_utility
    real_bounded_cleanup = helper._bounded_session_port_utility_cleanup
    real_child_observer = helper._child_observer
    real_emit = helper._emit
    real_fork = helper.os.fork
    real_kill = helper.os.kill
    real_killpg = helper.os.killpg
    real_process_identity = helper.process_identity
    real_read_identity = helper._read_identity
    real_request_pty_identity = helper._request_pty_identity
    real_time = helper.time
    real_wait_for_command = helper._wait_for_command
    real_wait_pre_release = helper._wait_pre_release_utility
    real_waitpid = helper.os.waitpid

    def process_identity(pid: int) -> dict[str, Any] | None:
        identity_calls.append(pid)
        events.append(f"process_identity:{pid}")
        if pid == authority_pid:
            return dict(authority_identity)
        if pid == utility_pid and identity_calls.count(utility_pid) == 1:
            return dict(utility_identity)
        if pid == utility_pid:
            return dict(unrelated_identity)
        return None

    def waitpid(pid: int, options: int) -> tuple[int, int]:
        if pid != utility_pid or options != os.WNOHANG:
            raise AssertionError("pre-release probe waited outside exact utility")
        events.append("waitpid")
        observer_closed_before_wait.append(observer_close_count[0] == 1)
        if scenario == "ownership-lost":
            raise ChildProcessError()
        if scenario == "maximum-grace" and clock[0] >= 4.0:
            return utility_pid, 126 << 8
        if scenario == "expired" and clock[0] > 4.5:
            raise RuntimeError("pre-release wait exceeded its finite budget")
        return 0, 0

    def bounded_cleanup(
        identity: dict[str, Any],
        grace_ms: int,
        selected_authority: dict[str, Any] | None,
        *,
        authority_required: bool | None = None,
    ) -> tuple[bool, Any]:
        group_cleanup_calls.append(
            {
                "authorityRequired": authority_required,
                "graceMs": grace_ms,
                "identity": identity,
                "ptyAuthority": selected_authority,
            }
        )
        return True, None

    def observed_abort(*args: Any, **kwargs: Any) -> bool:
        clean = real_abort(*args, **kwargs)
        abort_clean.append(clean)
        return clean

    def observed_wait(*args: Any, **kwargs: Any) -> Any:
        result = real_wait_pre_release(*args, **kwargs)
        outcome = getattr(result, "outcome", None)
        if outcome is None:
            outcome = "ambiguous_none" if result is None else "reaped"
        wait_outcome.append(outcome)
        return result

    helper._abort_pre_release_utility = observed_abort
    helper._bounded_session_port_utility_cleanup = bounded_cleanup
    helper._child_observer = lambda _pid: observer
    helper._emit = lambda _value: None
    helper.os.fork = lambda: utility_pid
    helper.os.kill = lambda pid, selected_signal: signal_calls.append(
        [pid, signal.Signals(selected_signal).name]
    )
    helper.os.killpg = lambda pgid, selected_signal: signal_calls.append(
        [-pgid, signal.Signals(selected_signal).name]
    )
    helper.os.waitpid = waitpid
    helper.process_identity = process_identity
    helper._read_identity = lambda *_args: (
        {
            "utility": dict(utility_identity),
            "ptyAuthority": dict(authority_identity),
        },
        None,
    )
    helper._request_pty_identity = lambda _pty: {
        "columns": helper.SESSION_PORT_COLUMNS,
        "foregroundPgid": utility_pid,
        "rows": helper.SESSION_PORT_ROWS,
    }
    helper.time = SimpleNamespace(
        monotonic=lambda: clock[0],
        sleep=lambda seconds: clock.__setitem__(0, clock[0] + seconds),
    )
    helper._wait_for_command = lambda *_args: "timed_out"
    helper._wait_pre_release_utility = observed_wait
    try:
        utility, returned_observer, exec_fd, reason = helper._spawn_utility(
            SimpleNamespace(),
            {
                "bindingDigest": "ab" * 32,
                "terminationGraceMs": 2000,
            },
            [False],
            pty,
        )
        if returned_observer is not None:
            returned_observer.close()
        if exec_fd is not None:
            os.close(exec_fd)
    finally:
        helper._abort_pre_release_utility = real_abort
        helper._bounded_session_port_utility_cleanup = real_bounded_cleanup
        helper._child_observer = real_child_observer
        helper._emit = real_emit
        helper.os.fork = real_fork
        helper.os.kill = real_kill
        helper.os.killpg = real_killpg
        helper.os.waitpid = real_waitpid
        helper.process_identity = real_process_identity
        helper._read_identity = real_read_identity
        helper._request_pty_identity = real_request_pty_identity
        helper.time = real_time
        helper._wait_for_command = real_wait_for_command
        helper._wait_pre_release_utility = real_wait_pre_release
        pty.close()

    first_wait = events.index("waitpid")
    print(json.dumps(
        {
            "abortClean": abort_clean[0] if abort_clean else None,
            "elapsedSeconds": clock[0],
            "freshIdentityLookups": sum(
                1
                for event in events[first_wait + 1 :]
                if event == f"process_identity:{utility_pid}"
            ),
            "groupCleanupCalls": group_cleanup_calls,
            "observerCloseCount": observer_close_count[0],
            "observerClosedBeforeEveryWait": (
                bool(observer_closed_before_wait)
                and all(observer_closed_before_wait)
            ),
            "publicReason": reason,
            "signalCalls": signal_calls,
            "utilityReturned": utility is not None,
            "waitOutcome": wait_outcome[0] if wait_outcome else None,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _retained_tmux_control_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    generation_id = b"\x91" * 32
    calls: list[list[str]] = []
    close_calls: list[str] = []
    capture = b"ready\nstatus\nack:status\n\n"

    def command(arguments: list[str]) -> Any:
        calls.append(list(arguments))
        if arguments[0] == "agents-capture-v1":
            return SimpleNamespace(
                returncode=0,
                stdout=(
                    b"agents-capture-v1\t1\t"
                    + generation_id.hex().encode("ascii")
                    + b"\t8300\t$7\t%8\t8301\t120\t40\t400\t0\t3\t"
                    + capture.hex().encode("ascii")
                    + b"\n"
                ),
                stderr=b"",
            )
        if arguments[0] == "kill-pane":
            return SimpleNamespace(
                returncode=0,
                stdout=b"",
                stderr=b"",
            )
        if arguments[0] == "kill-session":
            return SimpleNamespace(
                returncode=1,
                stdout=b"",
                stderr=b"can't find session: $7\n",
            )
        raise AssertionError(f"unexpected retained command: {arguments!r}")

    connection = helper.RetainedTmuxConnection(
        generation_id,
        command=command,
        close=lambda: close_calls.append("close"),
    )
    request = {
        "operation": "agents-capture-v1",
        "generationId": generation_id.hex(),
        "serverPid": 8300,
        "sessionId": "$7",
        "paneId": "%8",
        "panePid": 8301,
        "paneWidth": 120,
        "paneHeight": 40,
        "historyLimit": 400,
    }
    record = connection.agents_capture_v1(request)
    capture_calls = [list(value) for value in calls]
    before_wrong_generation = len(calls)
    try:
        connection.agents_capture_v1({
            **request,
            "generationId": (b"\x92" * 32).hex(),
        })
    except helper.TerminalChangedError:
        wrong_generation_rejected = True
    else:
        wrong_generation_rejected = False
    wrong_generation_calls = len(calls) - before_wrong_generation

    retired = connection.retire_owned({
        "generationId": generation_id.hex(),
        "paneId": "%8",
        "sessionId": "$7",
    })
    retire_calls = [list(value) for value in calls[len(capture_calls):]]
    before_post_retire = len(calls)
    try:
        connection.agents_capture_v1(request)
    except helper.TerminalChangedError:
        post_retire_rejected = True
    else:
        post_retire_rejected = False
    post_retire_calls = len(calls) - before_post_retire

    print(json.dumps(
        {
            "capture": record.capture.decode("utf-8"),
            "captureCalls": capture_calls,
            "closeCalls": len(close_calls),
            "postRetireCalls": post_retire_calls,
            "postRetireRejected": post_retire_rejected,
            "retireCalls": retire_calls,
            "retired": retired,
            "wrongGenerationCalls": wrong_generation_calls,
            "wrongGenerationRejected": wrong_generation_rejected,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _retained_tmux_real_probe(helper_path: str) -> int:
    """Exercise one isolated custom tmux server; caller supplies exact cleanup."""
    helper = _load_helper(helper_path)
    label = "d007c-control-probe"
    os.environ["AGENTS_TMUX_SOCKET_NAME"] = label
    target = "d007c-control-probe"
    generation_id = b"\xa3" * 32
    sibling = "d007c-control-sibling"
    connection = None
    moved_pane_observed = False
    server_preserved = False
    sibling_survived = False
    cleanup_identities: list[dict[str, Any]] = []
    server = _start_owned_tmux_server(label, helper)
    try:
        subprocess.run(
            ["tmux", "-L", label, "new-session", "-d", "-s", sibling,
             "-x", "120", "-y", "40", "sleep", "5"],
            check=True,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        connection, identity = helper._open_retained_tmux_connection(
            target=target,
            cwd=tempfile.gettempdir(),
            relay_argv=["sleep", "5"],
            generation_id=generation_id,
        )
        relay_identity = helper.process_identity(identity["panePid"])
        if relay_identity is None:
            raise RuntimeError("retained tmux relay identity unavailable")
        cleanup_identities.append(relay_identity)
        sibling_pid_result = subprocess.run(
            [
                "tmux", "-L", label, "display-message", "-p", "-t", sibling,
                "#{pane_pid}",
            ],
            check=True,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        sibling_identity = helper.process_identity(
            int(sibling_pid_result.stdout),
        )
        if sibling_identity is None:
            raise RuntimeError("retained tmux sibling identity unavailable")
        cleanup_identities.append(sibling_identity)
        record = connection.agents_capture_v1({
            "operation": "agents-capture-v1",
            "generationId": generation_id.hex(),
            "serverPid": identity["serverPid"],
            "sessionId": identity["sessionId"],
            "paneId": identity["paneId"],
            "panePid": identity["panePid"],
            "paneWidth": 120,
            "paneHeight": 40,
            "historyLimit": 400,
        })
        sibling_id_result = subprocess.run(
            [
                "tmux", "-L", label, "display-message", "-p", "-t", sibling,
                "#{session_id}",
            ],
            check=True,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        subprocess.run(
            [
                "tmux", "-L", label, "join-pane",
                "-s", identity["paneId"],
                "-t", sibling,
            ],
            check=True,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        moved_pane_result = subprocess.run(
            [
                "tmux", "-L", label, "display-message", "-p",
                "-t", identity["paneId"], "#{session_id}",
            ],
            check=True,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        moved_pane_observed = (
            moved_pane_result.stderr == b""
            and moved_pane_result.stdout == sibling_id_result.stdout
            and moved_pane_result.stdout.strip()
            != identity["sessionId"].encode("ascii")
        )
        retired = connection.retire_owned({
            "generationId": generation_id.hex(),
            "sessionId": identity["sessionId"],
            "paneId": identity["paneId"],
        })
        sibling_result = subprocess.run(
            ["tmux", "-L", label, "has-session", "-t", sibling],
            check=False,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        sibling_survived = sibling_result.returncode == 0
        server_result = subprocess.run(
            [
                "tmux", "-L", label, "display-message", "-p", "-t", sibling,
                "#{pid}",
            ],
            check=False,
            timeout=2,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        server_preserved = (
            server_result.returncode == 0
            and server_result.stderr == b""
            and server_result.stdout.strip()
            == str(identity["serverPid"]).encode("ascii")
        )
        print(json.dumps({
            "captureVersion": record.version,
            "generationId": record.generation_id.hex(),
            "identity": identity,
            "movedPaneObserved": moved_pane_observed,
            "retired": retired,
            "serverPreserved": server_preserved,
            "siblingSurvived": sibling_survived,
        }, separators=(",", ":"), sort_keys=True))
        return 0
    finally:
        _run_cleanup_steps(
            lambda: connection.close() if connection is not None else None,
            lambda: _tmux_run(
                label,
                ["kill-session", "-t", sibling],
                check=False,
            ),
            lambda: _wait_owned_processes_absent(
                helper,
                cleanup_identities,
            ),
            lambda: _stop_owned_tmux_server(label, server, helper),
        )


def _session_port_runtime_authority_probe(helper_path: str) -> int:
    """Execute the production session-port setup and observe its failure-safe cleanup."""
    helper = _load_helper(helper_path)
    events: list[str] = []
    class FakePty:
        master_fd = os.open(os.devnull, os.O_RDWR)
        slave_fd = os.open(os.devnull, os.O_RDWR)
        authority_identity = None
        terminal = {"dev": 1, "ino": 2, "rdev": 3, "rows": 40, "columns": 120}
        def close(self) -> None:
            events.append("retained-pty-close")
    utility = {"pid": 7402, "pgid": 7402, "sid": 7402}
    launch = {"leaseNonce": "11" * 32, "bindingDigest": "22" * 64,
              "terminalNonce": "33" * 32, "terminationGraceMs": 1,
              "sessionPort": True, "cwd": tempfile.gettempdir()}
    helper._launch_session_process_identity = lambda *_args: {"pid": 7402, "startToken": "x", "pgid": 7402, "sid": 7402}
    helper.read_session_process_identity = lambda _pid: {"pid": 7402, "startToken": "x", "pgid": 7402, "sid": 7402}
    helper._request_pty_identity = lambda _pty: {"foregroundPgid": 7402, "columns": 120, "rows": 40, **FakePty.terminal}
    helper._bounded_session_port_utility_cleanup = lambda *_args: (events.append("bounded-utility-cleanup") or (True, "RETIRED"))
    retained_pty = helper.RetainedPtyAuthority
    helper.RetainedPtyAuthority = lambda *args, **kwargs: (events.append("retained-pty-authority") or retained_pty(*args, **kwargs))
    helper._cleanup_tree = lambda *_args: (_ for _ in ()).throw(AssertionError("broad cleanup selected"))
    def open_relay(_launch, _key, generation):
        events.append("retained-connection-at-acceptance")
        if generation is None:
            raise AssertionError("missing accepted generation")
        raise helper.TerminalChangedError("isolated custom target unavailable")
    helper._open_session_relay = open_relay
    outcome: dict[str, Any] = {}
    result = helper._run_session_port(
        SimpleNamespace(fd=-1), launch, [False], SimpleNamespace(), utility,
        {"pid": 1, "startToken": "x", "pgid": 1, "sid": 1},
        {"pid": 2, "startToken": "x", "pgid": 2, "sid": 2}, FakePty(), outcome,
    )
    print(json.dumps({"events": events, "outcome": outcome, "result": result}, separators=(",", ":"), sort_keys=True))
    return 0


def _composed_write_rejection_helper(helper_path: str) -> int:
    """Run the production ASP1 loop with FIFO-head relay drift."""
    helper = _load_helper(helper_path)
    binding = json.loads(os.environ["SESSION_PORT_COMPOSED_BINDING"])
    lose_response = (
        os.environ.get("SESSION_PORT_COMPOSED_LOSE_RESPONSE") == "1"
    )
    expected_lease_digest = hashlib.sha256(
        bytes.fromhex(binding["leaseNonce"])
    ).hexdigest()
    if binding["leaseDigest"] != expected_lease_digest:
        raise RuntimeError("composed lease digest changed")

    events: list[str] = []
    state = {
        "dispatched": False,
        "driftObserved": False,
        "responseDelivered": False,
    }
    terminal_nonce = b"\x62" * 32
    generation_id = b"\x63" * 32
    random_values = [terminal_nonce, generation_id]

    def deterministic_urandom(size: int) -> bytes:
        if size != 32 or not random_values:
            raise RuntimeError("unexpected composed entropy request")
        return random_values.pop(0)

    helper.os.urandom = deterministic_urandom

    pty_endpoint, pty_observer = socket.socketpair()
    pty_master_fd = pty_endpoint.detach()
    pty = helper._SessionPortPty(
        master_fd=pty_master_fd,
        slave_fd=os.open(os.devnull, os.O_RDWR),
        authority_request_read_fd=os.open(os.devnull, os.O_RDWR),
        authority_request_write_fd=os.open(os.devnull, os.O_RDWR),
        authority_response_read_fd=os.open(os.devnull, os.O_RDWR),
        authority_response_write_fd=os.open(os.devnull, os.O_RDWR),
        terminal={
            "dev": 11,
            "ino": 12,
            "rdev": 13,
            "rows": 40,
            "columns": 120,
        },
    )
    original_pty_close = pty.close

    def close_pty() -> None:
        if not pty.closed:
            events.append("pty-cleanup")
        original_pty_close()

    pty.close = close_pty

    control_read_fd, control_write_fd = os.pipe()

    class FixtureChannel:
        fd = control_read_fd
        caller_open = True
        supervisor_open = True

        def __init__(self) -> None:
            self._termination_sent = False

        def poll(
            self,
            timeout: float,
            extra_fds: tuple[int, ...] = (),
        ) -> set[int]:
            readers = [*extra_fds, self.fd]
            try:
                ready, _, _ = select.select(readers, [], [], timeout)
            except InterruptedError:
                ready = []
            return set(ready)

        def pop(self) -> dict[str, Any] | None:
            if (
                state["responseDelivered"]
                and not self._termination_sent
            ):
                self._termination_sent = True
                events.append("parent-request-channel-retired")
                return {
                    "protocol": helper.PROTOCOL,
                    "type": "terminate",
                    "reason": "cancelled",
                }
            return None

    utility = {
        "pid": 7402,
        "startToken": "utility-composed-start",
        "pgid": 7402,
        "sid": 7402,
    }
    expected_utility = {
        **utility,
        "executable": "/fixture/provider",
        "argvNul": b"/fixture/provider\0",
        "cwd": "/safe/repository",
    }
    supervisor_identity = {
        "pid": 7400,
        "startToken": "supervisor-composed-start",
        "pgid": 7400,
        "sid": 7400,
    }
    reaper_identity = {
        "pid": 7401,
        "startToken": "reaper-composed-start",
        "pgid": 7400,
        "sid": 7400,
    }
    relay_identity = {
        "pid": 7410,
        "startToken": "relay-composed-start",
        "pgid": 7410,
        "sid": 7410,
        "executable": "/configured/python",
        "argvNul": b"/configured/python\0-I\0/helper.py\0",
        "cwd": "/safe/repository",
    }
    accepted_tmux_identity = {
        "serverPid": 7420,
        "sessionId": "$1",
        "paneId": "%2",
        "panePid": relay_identity["pid"],
        "paneWidth": 120,
        "paneHeight": 40,
    }
    relay_peer = {
        "pid": relay_identity["pid"],
        "uid": os.geteuid(),
        "gid": os.getegid(),
    }
    relay_candidate, relay_observer = socket.socketpair()
    generation_holder: list[Any] = []
    response_attempt = bytearray()

    helper._launch_session_process_identity = (
        lambda _launch, _identity: dict(expected_utility)
    )

    def read_session_identity(pid: int) -> dict[str, Any] | None:
        if pid == utility["pid"]:
            return dict(expected_utility)
        if pid == relay_identity["pid"]:
            return dict(relay_identity)
        return None

    helper.read_session_process_identity = read_session_identity

    def read_process_identity(pid: int) -> dict[str, Any] | None:
        if pid == supervisor_identity["pid"]:
            return dict(supervisor_identity)
        if pid == reaper_identity["pid"]:
            return dict(reaper_identity)
        return None

    helper.process_identity = read_process_identity
    helper._request_pty_identity = lambda _pty: {
        **pty.terminal,
        "foregroundPgid": utility["pgid"],
    }
    helper.read_relay_peer_evidence = lambda _candidate: dict(relay_peer)
    helper._emit = lambda _event: events.append("ready-published")

    def cleanup_utility_group(target: Any, **_kwargs: Any) -> str:
        target.state = "RETIRED"
        events.append(
            f"utility-cleanup:{generation_holder[0].state}"
        )
        return "RETIRED"

    helper.cleanup_sealed_utility_group = cleanup_utility_group

    class FixtureRuntime:
        def close(
            self,
            *,
            preserve_namespace: bool = False,
        ) -> dict[str, str]:
            if not preserve_namespace:
                raise AssertionError("accepted namespace cleanup changed")
            events.append(
                f"runtime-cleanup:{generation_holder[0].state}"
            )
            return {
                "relayKey": "RETIRED",
                "relaySocket": "PRESERVED",
                "runtimeDirectory": "PRESERVED",
            }

    def open_relay(
        _launch: dict[str, Any],
        _relay_key: bytes,
        generation: Any,
    ) -> Any:
        generation_holder.append(generation)
        binding_value = helper.create_accepted_relay_binding(
            candidate=relay_candidate,
            authentication=helper.RelayAuthenticationResult(
                True,
                None,
                None,
                False,
            ),
            peer=relay_peer,
            process_identity=relay_identity,
            tmux_identity=accepted_tmux_identity,
            tmux_target="ag-composed-write-drift",
            on_revoke=lambda: events.append(
                f"generation-revoked:{generation.state}"
            ),
            generation=generation,
            runtime=FixtureRuntime(),
        )
        helper.revalidate_accepted_relay_binding(
            binding_value,
            peer_reader=lambda _candidate: dict(relay_peer),
            process_reader=lambda _pid: dict(relay_identity),
            tmux_identity_reader=lambda _target: dict(
                accepted_tmux_identity
            ),
            history_limit_reader=lambda _target: 400,
        )
        events.append("accepted-binding-validated")
        return binding_value

    helper._open_session_relay = open_relay

    def read_drifted_tmux_identity(
        _binding: Any,
        _target: str,
    ) -> dict[str, Any]:
        if not state["dispatched"]:
            raise AssertionError("relay drift observed before FIFO dispatch")
        state["driftObserved"] = True
        events.append("fifo-head-pane-width-drift")
        return {
            **accepted_tmux_identity,
            "paneWidth": 121,
        }

    helper._binding_tmux_identity_reader = read_drifted_tmux_identity
    helper._binding_tmux_history_reader = (
        lambda _binding, _target: 400
    )

    original_decode = helper.decode_asp1_request

    def decode_request(
        frame: bytes,
        binding_tag: bytes,
        expected_sequence: int,
    ) -> dict[str, Any]:
        decoded = original_decode(frame, binding_tag, expected_sequence)
        if (
            decoded.get("status") == "dispatch"
            and decoded.get("opcode") == 0x01
        ):
            state["dispatched"] = True
            events.append("write-prompt-dispatched")
        return decoded

    helper.decode_asp1_request = decode_request
    original_safe_write = helper._safe_write

    def observe_safe_write(fd: int, payload: bytes) -> bool:
        if fd != helper.SESSION_PORT_RESPONSE_FD:
            return original_safe_write(fd, payload)
        response_attempt[:] = payload
        events.append(
            f"fd5-response-attempt:{generation_holder[0].state}"
        )
        delivered = original_safe_write(fd, payload)
        state["responseDelivered"] = delivered
        events.append(
            "fd5-response-"
            f"{'delivered' if delivered else 'lost'}:"
            f"{generation_holder[0].state}"
        )
        return delivered

    helper._safe_write = observe_safe_write
    if lose_response:
        os.close(helper.SESSION_PORT_RESPONSE_FD)

    launch = {
        "leaseNonce": binding["leaseNonce"],
        "bindingDigest": binding["bindingDigest"],
        "terminationGraceMs": 1,
        "argv": ["/fixture/provider"],
        "env": {"LANG": "C"},
        "cwd": "/safe/repository",
    }
    cleanup_outcome: dict[str, Any] = {}
    run_result = helper._run_session_port(
        FixtureChannel(),
        launch,
        [False],
        SimpleNamespace(exited=lambda: False),
        utility,
        supervisor_identity,
        reaper_identity,
        pty,
        cleanup_outcome,
    )

    pty_observer.setblocking(False)
    pty_bytes = bytearray()
    while True:
        try:
            chunk = pty_observer.recv(65536)
        except BlockingIOError:
            break
        if not chunk:
            break
        pty_bytes.extend(chunk)

    generation = generation_holder[0]
    result = {
        "cleanupOutcome": cleanup_outcome,
        "driftAfterDispatch": (
            state["dispatched"] and state["driftObserved"]
        ),
        "events": events,
        "generationState": generation.state,
        "lostResponseFd": lose_response,
        "ptyHex": bytes(pty_bytes).hex(),
        "responseAttemptHex": bytes(response_attempt).hex(),
        "runResult": run_result,
    }
    print(json.dumps(result, separators=(",", ":"), sort_keys=True))

    pty_observer.close()
    relay_observer.close()
    os.close(control_write_fd)
    return 0


def _snapshot_result(value: Any) -> dict[str, Any]:
    return {
        "snapshot": value.snapshot.decode("utf-8"),
        "snapshotBytes": len(value.snapshot),
        "truncated": value.truncated,
    }


def _snapshot_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)

    def canonical(
        metadata: bytes,
        history: list[bytes],
        visible: list[bytes],
    ) -> Any:
        return helper.canonicalize_tmux_capture(
            metadata,
            _capture_rows([*history, *visible]),
        )

    untouched = canonical(b"0\t40\t0\n", [], [b""] * 40)
    exact = canonical(
        b"0\t40\t3\n",
        [],
        [b"ready", b"status", b"ack:status", *([b""] * 37)],
    )
    deterministic_trace: list[Any] = []

    def deterministic_barrier() -> None:
        deterministic_trace.append("barrier")

    def deterministic_runner(arguments: list[str]) -> Any:
        deterministic_trace.append(arguments)
        if arguments == helper.build_tmux_identity_argv(
            "ag-red-port-codex-coder"
        ):
            return SimpleNamespace(
                returncode=0,
                stdout=b"8000\t$1\t%2\t7123\t120\t40\n",
                stderr=b"",
            )
        if arguments == helper.build_tmux_history_limit_argv(
            "ag-red-port-codex-coder"
        ):
            return SimpleNamespace(
                returncode=0,
                stdout=b"400\n",
                stderr=b"",
            )
        if arguments == helper.build_tmux_metadata_argv(
            "ag-red-port-codex-coder"
        ):
            return SimpleNamespace(
                returncode=0,
                stdout=b"0\t40\t3\n",
                stderr=b"",
            )
        if arguments[0] == "capture-pane":
            return SimpleNamespace(
                returncode=0,
                stdout=_capture_rows(
                    [b"ready", b"status", b"ack:status", *([b""] * 37)]
                ),
                stderr=b"",
            )
        raise RuntimeError("unexpected deterministic tmux operation")

    exact = helper.capture_tmux_snapshot(
        "ag-red-port-codex-coder",
        barrier=deterministic_barrier,
        runner=deterministic_runner,
    )
    capture_failures: dict[str, bool] = {}

    def exercise_capture_failure(name: str) -> None:
        calls = [0]

        def barrier() -> None:
            if name == "barrier":
                raise OSError("barrier failed")

        def runner(arguments: list[str]) -> Any:
            calls[0] += 1
            if arguments == helper.build_tmux_identity_argv(
                "ag-red-port-codex-coder"
            ):
                return SimpleNamespace(
                    returncode=0,
                    stdout=b"8000\t$1\t%2\t7123\t120\t40\n",
                    stderr=b"",
                )
            if arguments == helper.build_tmux_history_limit_argv(
                "ag-red-port-codex-coder"
            ):
                return SimpleNamespace(
                    returncode=0,
                    stdout=b"400\n",
                    stderr=b"",
                )
            metadata_call = arguments == helper.build_tmux_metadata_argv(
                "ag-red-port-codex-coder"
            )
            return SimpleNamespace(
                returncode=(
                    1
                    if name
                    == ("metadataExit" if metadata_call else "captureExit")
                    else 0
                ),
                stdout=(
                    b"0\t40\t3\n"
                    if metadata_call
                    else _capture_rows(
                        [
                            b"ready",
                            b"status",
                            b"ack:status",
                            *([b""] * 37),
                        ]
                    )
                ),
                stderr=(
                    b"failure"
                    if name
                    == (
                        "metadataStderr"
                        if metadata_call
                        else "captureStderr"
                    )
                    else b""
                ),
            )

        try:
            helper.capture_tmux_snapshot(
                "ag-red-port-codex-coder",
                barrier=barrier,
                runner=runner,
            )
        except helper.SnapshotValidationError:
            capture_failures[name] = True
        else:
            capture_failures[name] = False

    for failure_name in (
        "barrier",
        "metadataExit",
        "metadataStderr",
        "captureExit",
        "captureStderr",
    ):
        exercise_capture_failure(failure_name)
    completed_blank = canonical(
        b"0\t40\t2\n",
        [],
        [b"A", b"", *([b""] * 38)],
    )
    history_and_below = canonical(
        b"2\t40\t1\n",
        [b"", b"history"],
        [b"top", b"", b"below", *([b""] * 37)],
    )
    row_end = canonical(
        b"0\t40\t2\n",
        [],
        [b"edge  ", b"tab\t", *([b""] * 38)],
    )
    exactly_capped = canonical(
        b"1\t40\t0\n",
        [b"A" * 65535],
        [b""] * 40,
    )
    truncated = canonical(
        b"1\t40\t0\n",
        [b"B" * 65536],
        [b""] * 40,
    )
    unicode_truncated = canonical(
        b"1\t40\t0\n",
        [b"A" * 45 + "€".encode("utf-8") + b"B" * 65490],
        [b""] * 40,
    )

    invalid_cases: dict[str, bool] = {}
    invalid_inputs = {
        "metadataWhitespace": (
            b" 0\t40\t0\n",
            _capture_rows([b""] * 40),
        ),
        "metadataSign": (
            b"+0\t40\t0\n",
            _capture_rows([b""] * 40),
        ),
        "metadataNegative": (
            b"-1\t40\t0\n",
            _capture_rows([b""] * 40),
        ),
        "metadataOverflow": (
            b"18446744073709551616\t40\t0\n",
            _capture_rows([b""] * 440),
        ),
        "metadataFields": (
            b"0\t40\t0\t1\n",
            _capture_rows([b""] * 40),
        ),
        "metadataFinalLf": (
            b"0\t40\t00",
            _capture_rows([b""] * 40),
        ),
        "metadataHeight": (
            b"0\t39\t0\n",
            _capture_rows([b""] * 40),
        ),
        "metadataCursor": (
            b"0\t40\t40\n",
            _capture_rows([b""] * 40),
        ),
        "rowCount": (
            b"0\t40\t0\n",
            _capture_rows([b""] * 39),
        ),
        "missingFinalLf": (
            b"0\t40\t0\n",
            b"\n" * 39 + b"X",
        ),
        "nul": (
            b"0\t40\t1\n",
            _capture_rows([b"\0", *([b""] * 39)]),
        ),
        "invalidUtf8": (
            b"0\t40\t1\n",
            _capture_rows([b"\xff", *([b""] * 39)]),
        ),
    }
    for name, (metadata, capture) in invalid_inputs.items():
        try:
            helper.canonicalize_tmux_capture(metadata, capture)
        except helper.SnapshotValidationError:
            invalid_cases[name] = True
        else:
            invalid_cases[name] = False

    normalizer = helper.TerminalUtf8Normalizer()
    normalized = b"".join(
        (
            normalizer.feed(b"A\xe2", final=False),
            normalizer.feed(b"\x82\xac\xffB", final=True),
        )
    )
    dimensions: dict[str, bool] = {}
    for name, columns, rows in (
        ("columns", 121, 40),
        ("rows", 120, 41),
        ("history", 120, 40),
    ):
        try:
            helper.validate_tmux_dimensions(
                columns,
                rows,
                401 if name == "history" else 400,
            )
        except helper.TerminalChangedError:
            dimensions[name] = True
        else:
            dimensions[name] = False

    capture_argv = helper.build_tmux_capture_argv(
        "ag-red-port-codex-coder"
    )
    metadata_argv = helper.build_tmux_metadata_argv(
        "ag-red-port-codex-coder"
    )
    relay_commands = helper.build_tmux_relay_commands(
        target="ag-red-port-codex-coder",
        cwd="/safe/repository",
        relay_argv=[
            "/configured/python",
            "-I",
            "/helper.py",
            "--session-port-relay",
            "/runtime/relay.sock",
            "/runtime/relay.key",
        ],
    )
    relay_launch_trace: list[list[str]] = []

    def relay_launch_runner(arguments: list[str]) -> Any:
        relay_launch_trace.append(arguments)
        return SimpleNamespace(
            returncode=0,
            stdout=(
                b"8000\t$1\t%2\t7123\t120\t40\n"
                if arguments[0] == "display-message"
                else b""
            ),
            stderr=b"",
        )

    relay_identity = helper.launch_tmux_relay(
        target="ag-red-port-codex-coder",
        cwd="/safe/repository",
        relay_argv=relay_commands[0][10:],
        runner=relay_launch_runner,
    )
    relay_identity_parser: dict[str, bool] = {}
    try:
        helper.parse_tmux_relay_identity(b"8000\n")
    except helper.TerminalChangedError:
        relay_identity_parser["shapeMapped"] = True
    except Exception:
        relay_identity_parser["shapeMapped"] = False
    else:
        relay_identity_parser["shapeMapped"] = False
    relay_launch_failures: dict[str, Any] = {}
    for failure_name in ("exit", "stderr", "identityId", "identityShape"):
        failure_trace: list[list[str]] = []

        def failing_runner(
            arguments: list[str],
            *,
            selected: str = failure_name,
        ) -> Any:
            failure_trace.append(arguments)
            if arguments[0] == "kill-session":
                return SimpleNamespace(
                    returncode=0,
                    stdout=b"",
                    stderr=b"",
                )
            return SimpleNamespace(
                returncode=1 if selected == "exit" else 0,
                stdout=(
                    (
                        b"8000\t$1\tx2\t7123\t120\t40\n"
                        if selected == "identityId"
                        else b"8000\n"
                    )
                    if selected in ("identityId", "identityShape")
                    and arguments[0] == "display-message"
                    else (
                        b"8000\t$1\t%2\t7123\t120\t40\n"
                        if arguments[0] == "display-message"
                        else b""
                    )
                ),
                stderr=b"failure" if selected == "stderr" else b"",
            )

        try:
            helper.launch_tmux_relay(
                target="ag-red-port-codex-coder",
                cwd="/safe/repository",
                relay_argv=relay_commands[0][10:],
                runner=failing_runner,
            )
        except helper.TerminalChangedError:
            relay_launch_failures[failure_name] = {
                "killed": any(
                    arguments[0] == "kill-session"
                    for arguments in failure_trace
                ),
                "rejected": True,
            }
        else:
            relay_launch_failures[failure_name] = {
                "killed": False,
                "rejected": False,
            }
    flattened_operations = [
        item
        for command in relay_commands
        for item in command
    ]

    print(json.dumps(
        {
            "captureArgv": capture_argv,
            "captureFailures": capture_failures,
            "completedBlank": _snapshot_result(completed_blank),
            "dimensionsRejected": dimensions,
            "deterministicTrace": deterministic_trace,
            "exact": _snapshot_result(exact),
            "exactlyCapped": _snapshot_result(exactly_capped),
            "historyAndBelow": _snapshot_result(history_and_below),
            "historyLimitArgv": helper.build_tmux_history_limit_argv(
                "ag-red-port-codex-coder"
            ),
            "identityArgv": helper.build_tmux_identity_argv(
                "ag-red-port-codex-coder"
            ),
            "invalidCases": invalid_cases,
            "metadataArgv": metadata_argv,
            "normalized": normalized.decode("utf-8"),
            "normalizedBytes": len(normalized),
            "portPathTmuxOperations": flattened_operations,
            "relayCommands": relay_commands,
            "relayIdentity": relay_identity,
            "relayIdentityParser": relay_identity_parser,
            "relayLaunchFailures": relay_launch_failures,
            "relayLaunchTrace": relay_launch_trace,
            "rowEnd": _snapshot_result(row_end),
            "truncated": _snapshot_result(truncated),
            "untouched": _snapshot_result(untouched),
            "unicodeTruncated": _snapshot_result(unicode_truncated),
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _tmux_run(
    socket_name: str,
    arguments: list[str],
    *,
    check: bool = True,
) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(
        ["tmux", "-L", socket_name, *arguments],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and (result.returncode != 0 or result.stderr):
        raise RuntimeError(
            f"tmux command failed: {arguments!r}: "
            f"{result.stderr.decode('utf-8', 'replace')}"
        )
    return result


def _tmux_socket_path(socket_name: str) -> str:
    socket_root = os.environ.get("TMUX_TMPDIR", tempfile.gettempdir())
    return os.path.join(
        socket_root,
        f"tmux-{os.geteuid()}",
        socket_name,
    )


def _start_owned_tmux_server(
    socket_name: str,
    helper: Any,
) -> subprocess.Popen[bytes]:
    server = subprocess.Popen(
        ["tmux", "-L", socket_name, "-D"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    server_identity = helper.process_identity(server.pid)
    if server_identity is None:
        server.terminate()
        server.wait(timeout=2)
        raise RuntimeError("owned tmux server identity unavailable")
    server._d007c_identity = server_identity
    socket_path = _tmux_socket_path(socket_name)
    try:
        deadline = time.monotonic() + 2
        while time.monotonic() < deadline:
            if os.path.exists(socket_path):
                server_pid = _tmux_run(
                    socket_name,
                    ["display-message", "-p", "#{pid}"],
                ).stdout.strip()
                if server_pid != str(server.pid).encode("ascii"):
                    raise RuntimeError("owned tmux server pid binding changed")
                return server
            returncode = server.poll()
            if returncode is not None:
                _, stderr = server.communicate()
                raise RuntimeError(
                    "owned tmux server exited before readiness: "
                    f"{returncode}: {stderr.decode('utf-8', 'replace')}"
                )
            time.sleep(0.005)
        raise RuntimeError("owned tmux server readiness timeout")
    except BaseException:
        try:
            _stop_owned_tmux_server(socket_name, server, helper)
        except BaseException:
            pass
        raise


def _wait_owned_tmux_server(
    server: subprocess.Popen[bytes],
    helper: Any,
) -> int:
    identity = server._d007c_identity
    try:
        return server.wait(timeout=0.5)
    except subprocess.TimeoutExpired:
        current = helper.process_identity(identity["pid"])
        if not helper._identity_matches(identity, current):
            raise RuntimeError("owned tmux server identity changed")
        server.terminate()
    try:
        return server.wait(timeout=0.25)
    except subprocess.TimeoutExpired:
        current = helper.process_identity(identity["pid"])
        if not helper._identity_matches(identity, current):
            raise RuntimeError("owned tmux server identity changed")
        server.kill()
        try:
            return server.wait(timeout=2)
        except subprocess.TimeoutExpired as error:
            raise RuntimeError("owned tmux server did not exit") from error


def _stop_owned_tmux_server(
    socket_name: str,
    server: subprocess.Popen[bytes],
    helper: Any,
) -> None:
    failure: BaseException | None = None
    result = _tmux_run(socket_name, ["kill-server"], check=False)
    if result.returncode != 0 or result.stderr:
        failure = RuntimeError(
            "owned tmux kill-server failed: "
            f"{result.stderr.decode('utf-8', 'replace')}"
        )
    try:
        returncode = _wait_owned_tmux_server(server, helper)
    except BaseException as error:
        if failure is None:
            failure = error
        returncode = server.returncode
    if server.poll() is None:
        stderr = b""
    else:
        _, stderr = server.communicate()
    server_remaining = (
        helper.process_identity(server._d007c_identity["pid"]) is not None
    )
    if (
        failure is None
        and (
            returncode != 0
            or stderr
            or server_remaining
        )
    ):
        failure = RuntimeError(
            f"owned tmux server exit failed: {returncode}: "
            f"{stderr.decode('utf-8', 'replace')}"
        )
    if failure is not None:
        raise failure


def _run_cleanup_steps(*steps: Any) -> None:
    failure: BaseException | None = None
    for step in steps:
        try:
            step()
        except BaseException as error:
            if failure is None:
                failure = error
    if failure is not None:
        raise failure


def _owned_tmux_cleanup_fault_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    identity = {
        "pid": 8801,
        "startToken": "owned-server-start",
        "pgid": 8801,
        "sid": 8801,
    }
    live = [True]
    events: list[str] = []

    class FakeServer:
        pid = identity["pid"]
        returncode: int | None = None
        _d007c_identity = identity

        def wait(self, timeout: float) -> int:
            events.append("wait")
            if live[0]:
                raise subprocess.TimeoutExpired(["tmux", "-D"], timeout)
            self.returncode = -signal.SIGTERM
            return self.returncode

        def terminate(self) -> None:
            events.append("terminate")
            live[0] = False

        def kill(self) -> None:
            events.append("kill")
            live[0] = False

        def poll(self) -> int | None:
            return self.returncode

        def communicate(self) -> tuple[bytes, bytes]:
            events.append("communicate")
            return b"", b""

    real_tmux_run = globals()["_tmux_run"]
    real_process_identity = helper.process_identity
    helper.process_identity = lambda _pid: dict(identity) if live[0] else None
    globals()["_tmux_run"] = lambda _socket, arguments, **_kwargs: (
        events.append(arguments[0])
        or SimpleNamespace(
            returncode=1,
            stdout=b"",
            stderr=b"injected kill-server failure",
        )
    )
    try:
        try:
            _stop_owned_tmux_server(
                "d007c-fault",
                FakeServer(),
                helper,
            )
        except RuntimeError as error:
            kill_error = str(error)
        else:
            kill_error = ""
    finally:
        globals()["_tmux_run"] = real_tmux_run
        helper.process_identity = real_process_identity

    step_events: list[str] = []

    def pane_wait() -> None:
        step_events.append("pane-wait")
        raise RuntimeError("injected pane wait failure")

    try:
        _run_cleanup_steps(
            pane_wait,
            lambda: step_events.append("server-stop"),
            lambda: step_events.append("workspace-cleanup"),
        )
    except RuntimeError as error:
        pane_error = str(error)
    else:
        pane_error = ""

    print(json.dumps(
        {
            "killError": kill_error,
            "killEvents": events,
            "paneError": pane_error,
            "paneEvents": step_events,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _wait_owned_processes_absent(
    helper: Any,
    identities: list[dict[str, Any]],
) -> None:
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        current = [
            identity
            for identity in identities
            if helper._identity_matches(
                identity,
                helper.process_identity(identity["pid"]),
            )
        ]
        if not current:
            return
        time.sleep(0.005)
    raise RuntimeError("owned tmux pane did not exit")


def _host_tmux_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    version = subprocess.run(
        ["tmux", "-V"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout.decode("ascii").strip()
    if version != "tmux 3.6a-agents.4":
        raise RuntimeError(
            f"required tmux 3.6a-agents.4, observed {version}"
        )

    socket_name = f"d007c-{os.getpid()}-{time.time_ns()}"
    target_prefix = f"d007c-host-{os.getpid()}"
    python = os.path.realpath(sys.executable)
    cases = {
        "untouched": b"",
        "exact": b"ready\r\nstatus\r\nack:status\r\n",
        "spaces": b"edge  \nnext\n",
        "ansi": b"A\x1b[31mB\x1b[0mC\r\n",
    }
    evidence: dict[str, Any] = {}
    owned_socket_absent = False
    owned_targets: list[str] = []
    owned_identities: list[dict[str, Any]] = []
    server = _start_owned_tmux_server(socket_name, helper)

    def capture_target(
        name: str,
        target: str,
        rendered: bytes,
    ) -> dict[str, Any]:
        capture_argv = helper.build_tmux_capture_argv(target)
        metadata_argv = helper.build_tmux_metadata_argv(target)
        deadline = time.monotonic() + 3
        last: tuple[bytes, bytes] | None = None
        while time.monotonic() < deadline:
            metadata = _tmux_run(socket_name, metadata_argv).stdout
            capture = _tmux_run(socket_name, capture_argv).stdout
            last = (metadata, capture)
            expected_prefix = rendered.replace(b"\r", b"").replace(
                b"\x1b[31m",
                b"",
            ).replace(b"\x1b[0m", b"")
            if name == "untouched" or capture.startswith(expected_prefix):
                break
            time.sleep(0.01)
        if last is None:
            raise RuntimeError("tmux capture unavailable")
        metadata, capture = last
        canonical = helper.canonicalize_tmux_capture(metadata, capture)
        return {
            **_snapshot_result(canonical),
            "captureArgv": capture_argv,
            "metadata": metadata.decode("ascii"),
            "rawBytes": len(capture),
            "target": target,
        }

    try:
        for index, (name, rendered) in enumerate(cases.items()):
            target = f"{target_prefix}-{index}"
            if name == "spaces":
                lease_key = bytes(range(32))
                relay_key = helper.derive_relay_key(
                    lease_key,
                    hashlib.sha256(b"host-binding").digest(),
                    hashlib.sha256(lease_key).digest(),
                    hashlib.sha256(b"host-terminal").digest(),
                )
                with tempfile.TemporaryDirectory(
                    prefix="d007c-host-relay-",
                ) as workspace:
                    runtime = helper.create_relay_runtime(
                        workspace,
                        relay_key,
                    )
                    candidate: socket.socket | None = None
                    try:
                        relay_argv = [
                            python,
                            "-I",
                            helper_path,
                            "--session-port-relay",
                            runtime.socket_path,
                            runtime.key_path,
                        ]
                        tmux_identity = helper.launch_tmux_relay(
                            target=target,
                            cwd=workspace,
                            relay_argv=relay_argv,
                            runner=lambda arguments: _tmux_run(
                                socket_name,
                                arguments,
                            ),
                        )
                        owned_targets.append(target)
                        pane_identity = helper.process_identity(
                            tmux_identity["panePid"],
                        )
                        if pane_identity is None:
                            raise RuntimeError(
                                "tmux relay process identity unavailable"
                            )
                        owned_identities.append(pane_identity)
                        candidate, _ = runtime.listener.accept()
                        live_identity = helper.read_session_process_identity(
                            tmux_identity["panePid"],
                        )
                        if live_identity is None:
                            raise RuntimeError(
                                "tmux relay identity unavailable"
                            )
                        authenticated = helper.authenticate_relay_socket(
                            candidate,
                            expected_identity=live_identity,
                            relay_key=relay_key,
                            state=helper.RelayAuthenticationState(),
                            challenge=bytes(reversed(range(32))),
                        )
                        if not authenticated.accepted:
                            raise RuntimeError("tmux relay authentication failed")
                        helper.send_relay_data_frame(
                            candidate,
                            helper.RELAY_DATA_OUTPUT,
                            rendered,
                        )
                        barrier_id = b"\0\0\0\0\0\0\0\x02"
                        helper.send_relay_data_frame(
                            candidate,
                            helper.RELAY_DATA_BARRIER,
                            barrier_id,
                        )
                        barrier_type, barrier_payload = (
                            helper.receive_relay_data_frame(
                                candidate,
                                timeout=1.0,
                            )
                        )
                        if (
                            barrier_type != helper.RELAY_DATA_FLUSHED
                            or barrier_payload != barrier_id
                        ):
                            raise RuntimeError("tmux relay barrier failed")
                        evidence[name] = {
                            **capture_target(name, target, rendered),
                            "authenticated": authenticated.accepted,
                            "livePid": live_identity["pid"],
                            "panePid": tmux_identity["panePid"],
                        }
                    finally:
                        if candidate is not None:
                            try:
                                helper.send_relay_data_frame(
                                    candidate,
                                    helper.RELAY_DATA_CLOSE,
                                    b"",
                                )
                            except OSError:
                                pass
                            candidate.close()
                        runtime.close()
                continue
            script = (
                "import os,time;"
                f"os.write(1,bytes.fromhex('{rendered.hex()}'));"
                "time.sleep(20)"
            )
            _tmux_run(
                socket_name,
                [
                    "new-session",
                    "-d",
                    "-s",
                    target,
                    "-x",
                    "120",
                    "-y",
                    "40",
                    python,
                    "-I",
                    "-c",
                    script,
                ],
            )
            owned_targets.append(target)
            pane_pid = int(_tmux_run(
                socket_name,
                [
                    "display-message",
                    "-p",
                    "-t",
                    target,
                    "#{pane_pid}",
                ],
            ).stdout)
            pane_identity = helper.process_identity(pane_pid)
            if pane_identity is None:
                raise RuntimeError("tmux renderer identity unavailable")
            owned_identities.append(pane_identity)
            _tmux_run(
                socket_name,
                ["set-option", "-t", target, "history-limit", "400"],
            )
            _tmux_run(
                socket_name,
                ["set-window-option", "-t", target, "window-size", "manual"],
            )
            _tmux_run(
                socket_name,
                ["set-window-option", "-t", target, "aggressive-resize", "off"],
            )
            evidence[name] = capture_target(name, target, rendered)
    finally:
        def kill_targets() -> None:
            for target in owned_targets:
                _tmux_run(
                    socket_name,
                    ["kill-session", "-t", target],
                    check=False,
                )

        def remove_socket() -> None:
            nonlocal owned_socket_absent
            socket_path = _tmux_socket_path(socket_name)
            helper.remove_owned_tmux_socket(socket_name, socket_path)
            owned_socket_absent = not os.path.lexists(socket_path)
            if not owned_socket_absent:
                os.unlink(socket_path)

        _run_cleanup_steps(
            kill_targets,
            lambda: _wait_owned_processes_absent(
                helper,
                owned_identities,
            ),
            lambda: _stop_owned_tmux_server(
                socket_name,
                server,
                helper,
            ),
            remove_socket,
        )

    print(json.dumps(
        {
            "cases": evidence,
            "ownedSocketAbsent": owned_socket_absent,
            "socketName": socket_name,
            "version": version,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def _bound_relay_host_probe(helper_path: str) -> int:
    helper = _load_helper(helper_path)
    version = subprocess.run(
        ["tmux", "-V"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=True,
    ).stdout.decode("ascii").strip()
    if version != "tmux 3.6a-agents.4":
        raise RuntimeError(
            f"required tmux 3.6a-agents.4, observed {version}"
        )

    socket_name = f"d007c-bound-{os.getpid()}-{time.time_ns()}"
    target_prefix = f"d007c-bound-host-{os.getpid()}"
    python = os.path.realpath(sys.executable)
    owned_targets: list[str] = []
    owned_pids: list[int] = []
    runtime_paths: list[str] = []
    width_drift: dict[str, Any] = {}
    history_drift: dict[str, Any] = {}
    reject_cleanup: dict[str, Any] = {}
    owned_socket_absent = False
    server = _start_owned_tmux_server(socket_name, helper)

    def runner(arguments: list[str]) -> subprocess.CompletedProcess[bytes]:
        return _tmux_run(socket_name, arguments)

    def launch_renderer(target: str) -> None:
        script = (
            "import os,time;"
            "os.write(1,b'after-resize\\n');"
            "time.sleep(20)"
        )
        _tmux_run(
            socket_name,
            [
                "new-session",
                "-d",
                "-s",
                target,
                "-x",
                "120",
                "-y",
                "40",
                python,
                "-I",
                "-c",
                script,
            ],
        )
        owned_targets.append(target)
        _tmux_run(
            socket_name,
            ["set-option", "-t", target, "history-limit", "400"],
        )
        _tmux_run(
            socket_name,
            ["set-window-option", "-t", target, "window-size", "manual"],
        )
        _tmux_run(
            socket_name,
            ["set-window-option", "-t", target, "aggressive-resize", "off"],
        )
        pane_pid = int(_tmux_run(
            socket_name,
            ["display-message", "-p", "-t", target, "#{pane_pid}"],
        ).stdout)
        owned_pids.append(pane_pid)
        deadline = time.monotonic() + 3
        while time.monotonic() < deadline:
            capture = _tmux_run(
                socket_name,
                helper.build_tmux_capture_argv(target),
            ).stdout
            if capture.startswith(b"after-resize\n"):
                return
            time.sleep(0.01)
        raise RuntimeError("tmux renderer did not become visible")

    def drift_result(target: str) -> tuple[str, str | None]:
        try:
            snapshot = helper.capture_tmux_snapshot(
                target,
                barrier=lambda: None,
                runner=runner,
            )
        except helper.TerminalChangedError:
            return "SESSION_PORT_TERMINAL_CHANGED", None
        return "ACCEPTED", snapshot.snapshot.decode("utf-8")

    try:
        width_target = f"{target_prefix}-width"
        launch_renderer(width_target)
        _tmux_run(
            socket_name,
            ["resize-window", "-t", width_target, "-x", "121", "-y", "40"],
        )
        dimensions = _tmux_run(
            socket_name,
            [
                "display-message",
                "-p",
                "-t",
                width_target,
                "#{pane_width}\t#{pane_height}",
            ],
        ).stdout.decode("ascii").strip()
        disposition, snapshot = drift_result(width_target)
        width_drift = {
            "dimensions": dimensions,
            "disposition": disposition,
            "snapshot": snapshot,
        }
        _tmux_run(
            socket_name,
            ["kill-session", "-t", width_target],
            check=False,
        )

        history_target = f"{target_prefix}-history"
        launch_renderer(history_target)
        _tmux_run(
            socket_name,
            ["set-option", "-t", history_target, "history-limit", "401"],
        )
        history_limit = _tmux_run(
            socket_name,
            [
                "show-options",
                "-v",
                "-t",
                history_target,
                "history-limit",
            ],
        ).stdout.decode("ascii").strip()
        disposition, snapshot = drift_result(history_target)
        history_drift = {
            "historyLimit": history_limit,
            "disposition": disposition,
            "snapshot": snapshot,
        }
        _tmux_run(
            socket_name,
            ["kill-session", "-t", history_target],
            check=False,
        )

        reject_target = f"{target_prefix}-reject"
        lease_key = bytes(range(32))
        relay_key = helper.derive_relay_key(
            lease_key,
            hashlib.sha256(b"host-reject-binding").digest(),
            hashlib.sha256(lease_key).digest(),
            hashlib.sha256(b"host-reject-terminal").digest(),
        )
        workspace = tempfile.mkdtemp(prefix="d007c-host-reject-")
        runtime = helper.create_relay_runtime(workspace, relay_key)
        runtime_paths.append(runtime.directory)
        candidate: socket.socket | None = None
        tmux_identity: dict[str, Any] | None = None
        retired = False

        def retire_reject() -> None:
            nonlocal retired
            if retired:
                return
            retired = True
            if candidate is not None:
                candidate.close()
            if tmux_identity is not None:
                _tmux_run(
                    socket_name,
                    ["kill-pane", "-t", tmux_identity["paneId"]],
                    check=False,
                )
            _tmux_run(
                socket_name,
                ["kill-session", "-t", reject_target],
                check=False,
            )
            runtime.close()

        try:
            tmux_identity = helper.launch_tmux_relay(
                target=reject_target,
                cwd=workspace,
                relay_argv=[
                    python,
                    "-I",
                    helper_path,
                    "--session-port-relay",
                    runtime.socket_path,
                    runtime.key_path,
                ],
                runner=runner,
            )
            owned_targets.append(reject_target)
            owned_pids.append(tmux_identity["panePid"])
            candidate, _ = runtime.listener.accept()
            deadline = time.monotonic() + 2
            live_identity = None
            while live_identity is None and time.monotonic() < deadline:
                live_identity = helper.read_session_process_identity(
                    tmux_identity["panePid"],
                )
                if live_identity is None:
                    time.sleep(0.005)
            if live_identity is None:
                raise RuntimeError("reject relay identity unavailable")
            authentication = helper.authenticate_relay_socket(
                candidate,
                expected_identity=live_identity,
                relay_key=relay_key,
                state=helper.RelayAuthenticationState(),
                challenge=bytes(reversed(range(32))),
                on_reject=retire_reject,
            )
            if not authentication.accepted:
                raise RuntimeError("reject relay authentication failed")
            peer_identity = helper.read_relay_peer_evidence(candidate)
            binding = helper.create_accepted_relay_binding(
                candidate=candidate,
                authentication=authentication,
                peer=peer_identity,
                process_identity=live_identity,
                tmux_identity=tmux_identity,
                tmux_target=reject_target,
                on_revoke=retire_reject,
            )
            queue = helper.RelayBrokerInputQueue()
            queue.bind(binding)
            same_socket = binding.candidate is candidate
            _tmux_run(
                socket_name,
                [
                    "resize-window",
                    "-t",
                    reject_target,
                    "-x",
                    "121",
                    "-y",
                    "40",
                ],
            )
            changed_pane_width = int(_tmux_run(
                socket_name,
                [
                    "display-message",
                    "-p",
                    "-t",
                    reject_target,
                    "#{pane_width}",
                ],
            ).stdout)
            try:
                helper.offer_bound_relay_input(
                    binding,
                    queue,
                    b"must-not-enter",
                    peer_reader=helper.read_relay_peer_evidence,
                    process_reader=helper.read_session_process_identity,
                    tmux_identity_reader=lambda target: (
                        helper.read_tmux_relay_identity(target, runner)
                    ),
                    history_limit_reader=lambda target: (
                        helper.read_tmux_history_limit(target, runner)
                    ),
                )
            except helper.TerminalChangedError:
                disposition = "SESSION_PORT_TERMINAL_CHANGED"
            else:
                disposition = "ACCEPTED"
            deadline = time.monotonic() + 2
            while (
                helper.read_session_process_identity(
                    tmux_identity["panePid"],
                ) is not None
                and time.monotonic() < deadline
            ):
                time.sleep(0.01)
            reject_cleanup = {
                "accepted": authentication.accepted,
                "brokerQueueHex": queue.queued_bytes.hex(),
                "changedField": "paneWidth",
                "disposition": disposition,
                "keyRemoved": not os.path.exists(runtime.key_path),
                "observedPaneWidth": changed_pane_width,
                "paneRemoved": _tmux_run(
                    socket_name,
                    ["has-session", "-t", reject_target],
                    check=False,
                ).returncode != 0,
                "relayExited": helper.read_session_process_identity(
                    tmux_identity["panePid"],
                ) is None,
                "relaySocketRemoved": not os.path.exists(runtime.socket_path),
                "revoked": binding.revoked,
                "runtimeRemoved": not os.path.exists(runtime.directory),
                "sameSocket": same_socket,
            }
        finally:
            retire_reject()
            try:
                os.rmdir(workspace)
            except FileNotFoundError:
                pass
    finally:
        def kill_targets() -> None:
            for target in owned_targets:
                _tmux_run(
                    socket_name,
                    ["kill-session", "-t", target],
                    check=False,
                )

        def remove_socket() -> None:
            nonlocal owned_socket_absent
            socket_path = _tmux_socket_path(socket_name)
            helper.remove_owned_tmux_socket(socket_name, socket_path)
            owned_socket_absent = not os.path.lexists(socket_path)
            if not owned_socket_absent:
                os.unlink(socket_path)

        _run_cleanup_steps(
            kill_targets,
            lambda: _stop_owned_tmux_server(
                socket_name,
                server,
                helper,
            ),
            remove_socket,
        )

    surviving_processes = [
        pid
        for pid in owned_pids
        if helper.read_session_process_identity(pid) is not None
    ]
    surviving_targets = [
        target
        for target in owned_targets
        if _tmux_run(
            socket_name,
            ["has-session", "-t", target],
            check=False,
        ).returncode == 0
    ]
    surviving_runtimes = [
        value for value in runtime_paths if os.path.exists(value)
    ]
    print(json.dumps(
        {
            "cleanup": {
                "ownedSocketAbsent": owned_socket_absent,
                "processes": surviving_processes,
                "runtimeDirectories": surviving_runtimes,
                "targets": surviving_targets,
            },
            "historyDrift": history_drift,
            "postAcceptCleanup": reject_cleanup,
            "socketName": socket_name,
            "version": version,
            "widthDrift": width_drift,
        },
        separators=(",", ":"),
        sort_keys=True,
    ))
    return 0


def main() -> int:
    if "SESSION_PORT_FIXTURE_RESULT" in os.environ:
        return _provider()
    if len(sys.argv) != 3:
        return 64
    mode, helper_path = sys.argv[1:]
    if mode == "write-probe":
        return _write_probe(helper_path)
    if mode == "darwin-reader-probe":
        return _darwin_reader_probe(helper_path)
    if mode == "direct-execve-probe":
        return _direct_execve_probe(helper_path)
    if mode == "retained-slave-foreground-probe":
        return _retained_slave_foreground_probe(helper_path)
    if mode == "relay-auth-probe":
        return _relay_auth_probe(helper_path)
    if mode == "bound-relay-probe":
        return _bound_relay_probe(helper_path)
    if mode == "bound-relay-output-probe":
        return _bound_relay_output_probe(helper_path)
    if mode == "relay-launch-validation-probe":
        return _relay_launch_validation_probe(helper_path)
    if mode == "default-relay-binding-probe":
        return _default_relay_binding_probe(helper_path)
    if mode == "barrier-token-probe":
        return _barrier_token_probe(helper_path)
    if mode == "owned-socket-guard-probe":
        return _owned_socket_guard_probe(helper_path)
    if mode == "accepted-generation-probe":
        return _accepted_generation_probe(helper_path)
    if mode == "retained-socket-generation-probe":
        return _retained_socket_generation_probe(helper_path)
    if mode == "retained-pty-generation-probe":
        return _retained_pty_generation_probe(helper_path)
    if mode == "atomic-capture-generation-probe":
        return _atomic_capture_generation_probe(helper_path)
    if mode == "namespace-preservation-probe":
        return _namespace_preservation_probe(helper_path)
    if mode == "atomic-capture-revocation-race-probe":
        return _atomic_capture_revocation_race_probe(helper_path)
    if mode == "sealed-process-cleanup-probe":
        return _sealed_process_cleanup_probe(helper_path)
    if mode == "interrupted-pre-release-bootstrap-probe":
        return _interrupted_pre_release_bootstrap_probe(helper_path)
    if mode == "identity-publication-failure-probe":
        return _identity_publication_failure_probe(helper_path)
    if mode == "pre-release-ownership-lost-probe":
        return _pre_release_abort_probe(helper_path, "ownership-lost")
    if mode == "pre-release-maximum-grace-probe":
        return _pre_release_abort_probe(helper_path, "maximum-grace")
    if mode == "pre-release-expired-probe":
        return _pre_release_abort_probe(helper_path, "expired")
    if mode == "retained-tmux-control-probe":
        return _retained_tmux_control_probe(helper_path)
    if mode == "retained-tmux-real-probe":
        return _retained_tmux_real_probe(helper_path)
    if mode == "session-port-runtime-authority-probe":
        return _session_port_runtime_authority_probe(helper_path)
    if mode == "composed-write-rejection-helper":
        return _composed_write_rejection_helper(helper_path)
    if mode == "snapshot-probe":
        return _snapshot_probe(helper_path)
    if mode == "host-tmux-probe":
        return _host_tmux_probe(helper_path)
    if mode == "bound-relay-host-probe":
        return _bound_relay_host_probe(helper_path)
    if mode == "owned-tmux-cleanup-fault-probe":
        return _owned_tmux_cleanup_fault_probe(helper_path)
    return 64


if __name__ == "__main__":
    raise SystemExit(main())
