"""Private process boundary for the standalone async supervisor.

The configured runtime executes this file directly.  It never resolves another
interpreter, invokes a shell, or includes utility argv/environment/output in
its transcript.
"""

from __future__ import annotations

import codecs
import ctypes
import errno
import fcntl
import hashlib
import hmac
import json
import os
import re
import select
import signal
import socket
import stat
import struct
import subprocess
import sys
import termios
import tempfile
import threading
import time
import tty
from dataclasses import dataclass, field
from typing import Any, Callable


PROTOCOL = "agents.process-supervisor.v1"
TRANSCRIPT_FD = 3
SESSION_PORT_REQUEST_FD = 4
SESSION_PORT_RESPONSE_FD = 5
PR_SET_PDEATHSIG = 1
PR_SET_CHILD_SUBREAPER = 36
DARWIN_CLEANUP_SCOPE = "child-leader+same-pgid"
PRE_RELEASE_CLEANUP_FAILED_EXIT = 124
PRE_RELEASE_CHILD_REAP_SECONDS = 2.0
PRE_RELEASE_SCHEDULING_SLACK_SECONDS = 0.25
MAX_CONTROL_BYTES = 1024 * 1024
MAX_ARGV_ITEMS = 4096
MAX_ENVIRONMENT_ENTRIES = 4096
MAX_ARGUMENT_BYTES = 256 * 1024
MAX_ENVIRONMENT_KEY_BYTES = 4096
MAX_ENVIRONMENT_VALUE_BYTES = 256 * 1024
MAX_PATH_BYTES = 4096
POLL_SECONDS = 0.025
ASP1_MAGIC = b"ASP1"
ASP1_VERSION = 1
ASP1_HEADER_BYTES = 48
ASP1_MAX_PAYLOAD_BYTES = 65536
ASP1_MAX_REQUEST_BYTES = 65585
ASP1_MAX_RESPONSE_BYTES = 65584
ASP1_TRUNCATION_MARKER = b"[... older terminal content truncated ...]\n"
SESSION_PORT_COLUMNS = 120
SESSION_PORT_ROWS = 40
SESSION_PORT_BINDING_DOMAIN = (
    b"agents.process-supervisor.session-port.binding-tag.v1\0"
)
SESSION_PORT_RELAY_KEY_DOMAIN = (
    b"agents.process-supervisor.session-port.relay-key.v1\0"
)
SESSION_PORT_RELAY_PROOF_DOMAIN = (
    b"agents.process-supervisor.session-port.relay-proof.v1\0"
)
ASR1_MAGIC = b"ASR1"
ASR1_VERSION = 1
ASR1_HEADER_BYTES = 12
ASR1_CHALLENGE_BYTES = 32
ASR1_PROOF_BYTES = 40
ASR1_HANDSHAKE_TIMEOUT_MS = 2000
RELAY_DATA_MAGIC = b"ASD1"
RELAY_DATA_VERSION = 1
RELAY_DATA_HEADER_BYTES = 12
RELAY_DATA_MAX_PAYLOAD_BYTES = 65536
RELAY_DATA_OUTPUT = 0x01
RELAY_DATA_INPUT = 0x02
RELAY_DATA_BARRIER = 0x03
RELAY_DATA_FLUSHED = 0x04
RELAY_DATA_CLOSE = 0x7F
TMUX_HISTORY_LINES = 400
TMUX_METADATA_FORMAT = "#{history_size}\t#{pane_height}\t#{cursor_y}"
TMUX_IDENTITY_FORMAT = (
    "#{pid}\t#{session_id}\t#{pane_id}\t#{pane_pid}"
    "\t#{pane_width}\t#{pane_height}"
)
SAFE_TMUX_TARGET = re.compile(r"^[a-z0-9][a-z0-9-]{0,95}$")
SAFE_TMUX_SOCKET_NAME = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
PTY_IDENTITY_RECORD = struct.Struct("!BQQQIII")
ASP1_ERROR_PHASES = {
    0x0001: frozenset((0x02,)),
    0x0002: frozenset((0x01,)),
    0x0003: frozenset((0x01, 0x03)),
    0x0004: frozenset((0x06,)),
    0x0005: frozenset((0x06,)),
    0x0006: frozenset((0x02,)),
    0x0007: frozenset((0x03,)),
    0x0008: frozenset((0x03,)),
    0x0009: frozenset((0x03,)),
    0x000A: frozenset((0x06,)),
    0x000B: frozenset((0x04,)),
    0x000C: frozenset((0x05,)),
}


def _set_cloexec(fd: int) -> None:
    flags = fcntl.fcntl(fd, fcntl.F_GETFD)
    fcntl.fcntl(fd, fcntl.F_SETFD, flags | fcntl.FD_CLOEXEC)


def _pipe_cloexec() -> tuple[int, int]:
    if hasattr(os, "pipe2"):
        return os.pipe2(os.O_CLOEXEC)
    read_fd, write_fd = os.pipe()
    _set_cloexec(read_fd)
    _set_cloexec(write_fd)
    return read_fd, write_fd


def _safe_write(fd: int, payload: bytes) -> bool:
    view = memoryview(payload)
    while view:
        try:
            written = os.write(fd, view)
        except InterruptedError:
            continue
        except (BrokenPipeError, OSError):
            return False
        view = view[written:]
    return True


def _encode_asp1_frame(
    opcode: int,
    sequence: int,
    payload: bytes,
    binding_tag: bytes,
    *,
    allow_zero_sequence: bool = False,
) -> bytes:
    if (
        not isinstance(opcode, int)
        or not 0 <= opcode <= 0xFF
        or not isinstance(sequence, int)
        or sequence < (0 if allow_zero_sequence else 1)
        or sequence > 0xFFFFFFFF
        or not isinstance(payload, bytes)
        or not isinstance(binding_tag, bytes)
        or len(binding_tag) != 32
    ):
        raise ValueError("invalid ASP1 frame")
    return b"".join(
        (
            ASP1_MAGIC,
            bytes((ASP1_VERSION, opcode)),
            b"\x00\x00",
            sequence.to_bytes(4, "big"),
            len(payload).to_bytes(4, "big"),
            binding_tag,
            payload,
        )
    )


def encode_asp1_response(
    opcode: int,
    sequence: int,
    payload: bytes,
    binding_tag: bytes,
    *,
    request_prompt_bytes: int | None = None,
) -> bytes:
    """Encode one bounded helper-to-parent ASP1 response frame."""
    if not isinstance(payload, bytes):
        raise ValueError("invalid ASP1 response")
    if opcode == 0x81:
        valid = (
            len(payload) == 4
            and isinstance(request_prompt_bytes, int)
            and not isinstance(request_prompt_bytes, bool)
            and 1 <= request_prompt_bytes <= ASP1_MAX_PAYLOAD_BYTES
            and int.from_bytes(payload, "big") == request_prompt_bytes
        )
    elif opcode == 0x82:
        valid = len(payload) <= ASP1_MAX_PAYLOAD_BYTES
        if valid:
            try:
                payload.decode("utf-8", "strict")
            except UnicodeDecodeError:
                valid = False
    elif opcode == 0x83:
        valid = (
            len(ASP1_TRUNCATION_MARKER)
            <= len(payload)
            <= ASP1_MAX_PAYLOAD_BYTES
            and payload.startswith(ASP1_TRUNCATION_MARKER)
        )
        if valid:
            try:
                payload.decode("utf-8", "strict")
            except UnicodeDecodeError:
                valid = False
    elif opcode == 0xFF:
        valid = (
            len(payload) == 4
            and payload[3] == 0
            and int.from_bytes(payload[:2], "big") in ASP1_ERROR_PHASES
            and payload[2]
            in ASP1_ERROR_PHASES[int.from_bytes(payload[:2], "big")]
        )
    else:
        valid = False
    if not valid:
        raise ValueError("invalid ASP1 response")
    frame = _encode_asp1_frame(
        opcode,
        sequence,
        payload,
        binding_tag,
        allow_zero_sequence=opcode == 0xFF,
    )
    if len(frame) > ASP1_MAX_RESPONSE_BYTES:
        raise ValueError("invalid ASP1 response")
    return frame


def _asp1_disposition(
    status: str,
    *,
    sequence: int | None,
    opcode: int | None = None,
    payload: bytes | None = None,
    response: bytes | None = None,
    revoke: bool,
) -> dict[str, Any]:
    return {
        "status": status,
        "sequence": sequence,
        "opcode": opcode,
        "payload": payload,
        "response": response,
        "revoke": revoke,
    }


def _asp1_error_disposition(
    sequence: int,
    error_id: int,
    phase_id: int,
    binding_tag: bytes,
) -> dict[str, Any]:
    payload = (
        error_id.to_bytes(2, "big")
        + bytes((phase_id, 0))
    )
    return _asp1_disposition(
        "error",
        sequence=sequence,
        response=encode_asp1_response(
            0xFF,
            sequence,
            payload,
            binding_tag,
        ),
        revoke=True,
    )


def decode_asp1_request(
    frame: bytes,
    binding_tag: bytes,
    expected_sequence: int,
) -> dict[str, Any]:
    """Validate one complete parent-to-helper frame before any dispatch."""
    if (
        not isinstance(frame, bytes)
        or not isinstance(binding_tag, bytes)
        or len(binding_tag) != 32
        or not isinstance(expected_sequence, int)
        or not 1 <= expected_sequence <= 0xFFFFFFFF
    ):
        return _asp1_disposition(
            "close",
            sequence=None,
            response=None,
            revoke=True,
        )
    if len(frame) < ASP1_HEADER_BYTES:
        return _asp1_disposition(
            "close",
            sequence=None,
            response=None,
            revoke=True,
        )

    sequence = int.from_bytes(frame[8:12], "big")
    payload_length = int.from_bytes(frame[12:16], "big")
    malformed_header = (
        frame[:4] != ASP1_MAGIC
        or frame[4] != ASP1_VERSION
        or frame[6:8] != b"\x00\x00"
        or payload_length > ASP1_MAX_PAYLOAD_BYTES + 1
        or len(frame) > ASP1_MAX_REQUEST_BYTES
    )
    if malformed_header:
        return _asp1_error_disposition(
            sequence,
            0x0001,
            0x02,
            binding_tag,
        )

    expected_bytes = ASP1_HEADER_BYTES + payload_length
    if len(frame) < expected_bytes:
        return _asp1_disposition(
            "close",
            sequence=sequence,
            response=None,
            revoke=True,
        )
    if len(frame) != expected_bytes:
        return _asp1_error_disposition(
            sequence,
            0x0001,
            0x02,
            binding_tag,
        )
    if not hmac.compare_digest(frame[16:48], binding_tag):
        return _asp1_error_disposition(
            sequence,
            0x0003,
            0x03,
            binding_tag,
        )
    if sequence == 0 or sequence != expected_sequence:
        return _asp1_error_disposition(
            sequence,
            0x0003,
            0x03,
            binding_tag,
        )

    opcode = frame[5]
    payload = frame[ASP1_HEADER_BYTES:]
    if opcode == 0x01:
        prompt = payload[:-1]
        valid = (
            1 <= len(prompt) <= ASP1_MAX_PAYLOAD_BYTES
            and payload[-1:] == b"\x0d"
            and b"\x0d" not in prompt
            and b"\x00" not in prompt
        )
        if valid:
            try:
                prompt.decode("utf-8", "strict")
            except UnicodeDecodeError:
                valid = False
    elif opcode == 0x02:
        valid = len(payload) == 0
    else:
        valid = False
    if not valid:
        return _asp1_error_disposition(
            sequence,
            0x0001,
            0x02,
            binding_tag,
        )
    return _asp1_disposition(
        "dispatch",
        sequence=sequence,
        opcode=opcode,
        payload=payload,
        response=None,
        revoke=False,
    )


@dataclass(frozen=True)
class VerifiedWriteOutcome:
    status: str
    accepted_bytes: int
    error_id: int | None
    phase_id: int | None


_PREWRITE_DISPOSITIONS = {
    "cancelled": (0x0005, 0x06),
    "identity_changed": (0x0007, 0x03),
    "not_foreground": (0x0008, 0x03),
    "terminal_changed": (0x0009, 0x03),
    "terminal_closed": (0x000A, 0x06),
}


def _wait_pty_writable(fd: int) -> bool:
    try:
        _, writable, _ = select.select([], [fd], [], POLL_SECONDS)
    except InterruptedError:
        return True
    except OSError as error:
        if error.errno == errno.EINTR:
            return True
        return False
    return fd in writable


def verified_pty_write(
    fd: int,
    frame: bytes,
    *,
    verify: Callable[[], str],
    write: Callable[[int, memoryview], int] = os.write,
    wait_writable: Callable[[int], bool] = _wait_pty_writable,
    effect: Callable[[Callable[[], int]], int] | None = None,
) -> VerifiedWriteOutcome:
    """Write one frame only while every fresh authority check remains valid."""
    if (
        not isinstance(fd, int)
        or fd < 0
        or not isinstance(frame, bytes)
        or not frame
        or not callable(verify)
        or not callable(write)
        or not callable(wait_writable)
        or (effect is not None and not callable(effect))
    ):
        raise ValueError("invalid verified PTY write")

    selected_effect = effect or (lambda operation: operation())
    accepted = 0
    while accepted < len(frame):
        disposition = verify()
        if disposition != "ok":
            if disposition == "helper_lost":
                return VerifiedWriteOutcome(
                    "helper_lost",
                    accepted,
                    None,
                    None,
                )
            if accepted > 0:
                return VerifiedWriteOutcome(
                    "error",
                    accepted,
                    0x000B,
                    0x04,
                )
            error = _PREWRITE_DISPOSITIONS.get(disposition)
            if error is None:
                error = (0x0007, 0x03)
            return VerifiedWriteOutcome(
                "error",
                0,
                error[0],
                error[1],
            )

        remaining = memoryview(frame)[accepted:]
        try:
            written = selected_effect(
                lambda: write(fd, remaining)
            )
        except InterruptedError:
            continue
        except BlockingIOError:
            if not wait_writable(fd):
                return VerifiedWriteOutcome(
                    "error",
                    accepted,
                    0x000B if accepted else 0x000A,
                    0x04 if accepted else 0x06,
                )
            continue
        except OSError as error:
            if error.errno == errno.EINTR:
                continue
            if error.errno in (errno.EAGAIN, errno.EWOULDBLOCK):
                if wait_writable(fd):
                    continue
            return VerifiedWriteOutcome(
                "error",
                accepted,
                0x000B if accepted else 0x000A,
                0x04 if accepted else 0x06,
            )
        if (
            not isinstance(written, int)
            or isinstance(written, bool)
            or written <= 0
            or written > len(remaining)
        ):
            return VerifiedWriteOutcome(
                "error",
                accepted,
                0x000B if accepted else 0x000A,
                0x04 if accepted else 0x06,
            )
        accepted += written

    return VerifiedWriteOutcome("ok", accepted, None, None)


def _emit(event: dict[str, Any]) -> None:
    serialized = json.dumps(
        event,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8") + b"\n"
    _safe_write(TRANSCRIPT_FD, serialized)


def _linux_identity(pid: int) -> dict[str, Any] | None:
    try:
        with open(f"/proc/{pid}/stat", "r", encoding="utf-8") as handle:
            stat = handle.read()
    except (FileNotFoundError, PermissionError, OSError):
        return None
    close = stat.rfind(")")
    if close < 2:
        return None
    fields = stat[close + 2 :].strip().split()
    if len(fields) < 20:
        return None
    try:
        parsed_pid = int(stat[: stat.index(" ")])
        pgid = int(fields[2])
        sid = int(fields[3])
    except (ValueError, IndexError):
        return None
    if parsed_pid != pid or not fields[19].isdigit():
        return None
    return {
        "pid": pid,
        "startToken": fields[19],
        "pgid": pgid,
        "sid": sid,
    }


class _ProcBsdInfo(ctypes.Structure):
    _fields_ = [
        ("pbi_flags", ctypes.c_uint32),
        ("pbi_status", ctypes.c_uint32),
        ("pbi_xstatus", ctypes.c_uint32),
        ("pbi_pid", ctypes.c_uint32),
        ("pbi_ppid", ctypes.c_uint32),
        ("pbi_uid", ctypes.c_uint32),
        ("pbi_gid", ctypes.c_uint32),
        ("pbi_ruid", ctypes.c_uint32),
        ("pbi_rgid", ctypes.c_uint32),
        ("pbi_svuid", ctypes.c_uint32),
        ("pbi_svgid", ctypes.c_uint32),
        ("rfu_1", ctypes.c_uint32),
        ("pbi_comm", ctypes.c_char * 16),
        ("pbi_name", ctypes.c_char * 32),
        ("pbi_nfiles", ctypes.c_uint32),
        ("pbi_pgid", ctypes.c_uint32),
        ("pbi_pjobc", ctypes.c_uint32),
        ("e_tdev", ctypes.c_uint32),
        ("e_tpgid", ctypes.c_uint32),
        ("pbi_nice", ctypes.c_int32),
        ("pbi_start_tvsec", ctypes.c_uint64),
        ("pbi_start_tvusec", ctypes.c_uint64),
    ]


def _darwin_identity(pid: int) -> dict[str, Any] | None:
    try:
        library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        info = _ProcBsdInfo()
        copied = library.proc_pidinfo(
            ctypes.c_int(pid),
            ctypes.c_int(3),
            ctypes.c_uint64(0),
            ctypes.byref(info),
            ctypes.c_int(ctypes.sizeof(info)),
        )
        if copied != ctypes.sizeof(info) or info.pbi_pid != pid:
            return None
        sid = os.getsid(pid)
    except (AttributeError, OSError, ValueError):
        return None
    return {
        "pid": pid,
        "startToken": f"{info.pbi_start_tvsec}:{info.pbi_start_tvusec}",
        "pgid": int(info.pbi_pgid),
        "sid": int(sid),
    }


def process_identity(pid: int) -> dict[str, Any] | None:
    if sys.platform.startswith("linux"):
        return _linux_identity(pid)
    if sys.platform == "darwin":
        return _darwin_identity(pid)
    return None


class _VinfoStat(ctypes.Structure):
    _fields_ = [
        ("vst_dev", ctypes.c_uint32),
        ("vst_mode", ctypes.c_uint16),
        ("vst_nlink", ctypes.c_uint16),
        ("vst_ino", ctypes.c_uint64),
        ("vst_uid", ctypes.c_uint32),
        ("vst_gid", ctypes.c_uint32),
        ("vst_atime", ctypes.c_int64),
        ("vst_atimensec", ctypes.c_int64),
        ("vst_mtime", ctypes.c_int64),
        ("vst_mtimensec", ctypes.c_int64),
        ("vst_ctime", ctypes.c_int64),
        ("vst_ctimensec", ctypes.c_int64),
        ("vst_birthtime", ctypes.c_int64),
        ("vst_birthtimensec", ctypes.c_int64),
        ("vst_size", ctypes.c_int64),
        ("vst_blocks", ctypes.c_int64),
        ("vst_blksize", ctypes.c_int32),
        ("vst_flags", ctypes.c_uint32),
        ("vst_gen", ctypes.c_uint32),
        ("vst_rdev", ctypes.c_uint32),
        ("vst_qspare", ctypes.c_int64 * 2),
    ]


class _VnodeInfo(ctypes.Structure):
    _fields_ = [
        ("vi_stat", _VinfoStat),
        ("vi_type", ctypes.c_int32),
        ("vi_pad", ctypes.c_int32),
        ("vi_fsid", ctypes.c_int32 * 2),
    ]


class _VnodeInfoPath(ctypes.Structure):
    _fields_ = [
        ("vip_vi", _VnodeInfo),
        ("vip_path", ctypes.c_char * 1024),
    ]


class _ProcVnodePathInfo(ctypes.Structure):
    _fields_ = [
        ("pvi_cdir", _VnodeInfoPath),
        ("pvi_rdir", _VnodeInfoPath),
    ]


def _read_bounded_file(path: str) -> bytes | None:
    try:
        with open(path, "rb", buffering=0) as handle:
            value = handle.read(MAX_CONTROL_BYTES + 1)
    except (FileNotFoundError, PermissionError, OSError):
        return None
    if len(value) > MAX_CONTROL_BYTES:
        return None
    return value


def _linux_session_executable(pid: int) -> str | None:
    try:
        return os.path.realpath(os.readlink(f"/proc/{pid}/exe"))
    except (FileNotFoundError, PermissionError, OSError):
        return None


def _linux_session_argv_nul(pid: int) -> bytes | None:
    value = _read_bounded_file(f"/proc/{pid}/cmdline")
    if value is None or not value or not value.endswith(b"\0"):
        return None
    return value


def _linux_session_cwd(pid: int) -> str | None:
    try:
        return os.path.realpath(os.readlink(f"/proc/{pid}/cwd"))
    except (FileNotFoundError, PermissionError, OSError):
        return None


def _darwin_session_executable(pid: int) -> str | None:
    try:
        library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        buffer = ctypes.create_string_buffer(MAX_PATH_BYTES)
        copied = library.proc_pidpath(
            ctypes.c_int(pid),
            buffer,
            ctypes.c_uint32(len(buffer)),
        )
    except (AttributeError, OSError, ValueError):
        return None
    if copied <= 0 or copied >= len(buffer):
        return None
    try:
        encoded = buffer.raw[:copied].split(b"\0", 1)[0]
        return os.path.realpath(os.fsdecode(encoded))
    except (UnicodeDecodeError, ValueError):
        return None


def _darwin_session_argv_nul(pid: int) -> bytes | None:
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        mib = (ctypes.c_int * 3)(1, 49, pid)
        size = ctypes.c_size_t(0)
        if libc.sysctl(mib, 3, None, ctypes.byref(size), None, 0) != 0:
            return None
        if size.value < ctypes.sizeof(ctypes.c_int) or size.value > MAX_CONTROL_BYTES:
            return None
        buffer = ctypes.create_string_buffer(size.value)
        if (
            libc.sysctl(
                mib,
                3,
                buffer,
                ctypes.byref(size),
                None,
                0,
            )
            != 0
        ):
            return None
        payload = bytes(buffer.raw[: size.value])
        argc = int.from_bytes(
            payload[: ctypes.sizeof(ctypes.c_int)],
            sys.byteorder,
            signed=True,
        )
    except (AttributeError, OSError, OverflowError, ValueError):
        return None
    if argc <= 0 or argc > MAX_ARGV_ITEMS:
        return None
    cursor = ctypes.sizeof(ctypes.c_int)
    executable_end = payload.find(b"\0", cursor)
    if executable_end < 0:
        return None
    cursor = executable_end + 1
    while cursor < len(payload) and payload[cursor] == 0:
        cursor += 1
    arguments = bytearray()
    for _ in range(argc):
        end = payload.find(b"\0", cursor)
        if end < 0:
            return None
        arguments.extend(payload[cursor : end + 1])
        cursor = end + 1
    return bytes(arguments)


def _darwin_session_cwd(pid: int) -> str | None:
    try:
        library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
        info = _ProcVnodePathInfo()
        copied = library.proc_pidinfo(
            ctypes.c_int(pid),
            ctypes.c_int(9),
            ctypes.c_uint64(0),
            ctypes.byref(info),
            ctypes.c_int(ctypes.sizeof(info)),
        )
    except (AttributeError, OSError, ValueError):
        return None
    if copied != ctypes.sizeof(info):
        return None
    raw_path = bytes(info.pvi_cdir.vip_path).split(b"\0", 1)[0]
    if not raw_path:
        return None
    try:
        return os.path.realpath(os.fsdecode(raw_path))
    except (UnicodeDecodeError, ValueError):
        return None


def read_session_process_identity(
    pid: int,
    *,
    platform: str | None = None,
    dependencies: dict[str, Callable[[int], Any]] | None = None,
) -> dict[str, Any] | None:
    """Read exact process and launch evidence for a private PTY binding."""
    if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 1:
        return None
    selected = platform or (
        "linux" if sys.platform.startswith("linux") else sys.platform
    )
    if dependencies is not None:
        required = ("identity", "executable", "argv_nul", "cwd")
        if (
            not isinstance(dependencies, dict)
            or any(not callable(dependencies.get(key)) for key in required)
        ):
            return None
        identity_reader = dependencies["identity"]
        executable_reader = dependencies["executable"]
        argv_reader = dependencies["argv_nul"]
        cwd_reader = dependencies["cwd"]
    elif selected == "linux":
        identity_reader = _linux_identity
        executable_reader = _linux_session_executable
        argv_reader = _linux_session_argv_nul
        cwd_reader = _linux_session_cwd
    elif selected == "darwin":
        identity_reader = _darwin_identity
        executable_reader = _darwin_session_executable
        argv_reader = _darwin_session_argv_nul
        cwd_reader = _darwin_session_cwd
    else:
        return None
    try:
        identity = identity_reader(pid)
        executable = executable_reader(pid)
        argv_nul = argv_reader(pid)
        cwd = cwd_reader(pid)
    except (OSError, TypeError, ValueError):
        return None
    if (
        not isinstance(identity, dict)
        or identity.get("pid") != pid
        or not isinstance(identity.get("startToken"), str)
        or not isinstance(identity.get("pgid"), int)
        or not isinstance(identity.get("sid"), int)
        or not isinstance(executable, str)
        or not executable.startswith("/")
        or "\0" in executable
        or not isinstance(argv_nul, bytes)
        or not argv_nul
        or not argv_nul.endswith(b"\0")
        or len(argv_nul) > MAX_CONTROL_BYTES
        or not isinstance(cwd, str)
        or not cwd.startswith("/")
        or "\0" in cwd
    ):
        return None
    return {
        "pid": pid,
        "startToken": identity["startToken"],
        "pgid": identity["pgid"],
        "sid": identity["sid"],
        "executable": executable,
        "argvNul": argv_nul,
        "cwd": cwd,
    }


def _identity_matches(
    expected: dict[str, Any] | None,
    actual: dict[str, Any] | None,
) -> bool:
    if expected is None or actual is None:
        return False
    return all(
        expected.get(field) == actual.get(field)
        for field in ("pid", "startToken", "pgid", "sid")
    )


def _activate_linux_subreaper() -> bool:
    if not sys.platform.startswith("linux"):
        return False
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        result = libc.prctl(
            ctypes.c_int(PR_SET_CHILD_SUBREAPER),
            ctypes.c_ulong(1),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
        )
    except (AttributeError, OSError):
        return False
    return result == 0


def _set_parent_death_signal() -> bool:
    if not sys.platform.startswith("linux"):
        return True
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        result = libc.prctl(
            ctypes.c_int(PR_SET_PDEATHSIG),
            ctypes.c_ulong(signal.SIGKILL),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
        )
    except (AttributeError, OSError):
        return False
    return result == 0


def _valid_string(
    value: Any,
    *,
    absolute: bool = False,
    max_bytes: int = MAX_ARGUMENT_BYTES,
) -> bool:
    return (
        isinstance(value, str)
        and bool(value)
        and "\x00" not in value
        and (not absolute or value.startswith("/"))
        and len(value.encode("utf-8")) <= max_bytes
    )


def _valid_string_list(value: Any, *, nonempty: bool = False) -> bool:
    return (
        isinstance(value, list)
        and len(value) <= MAX_ARGV_ITEMS
        and (not nonempty or bool(value))
        and all(
            isinstance(item, str)
            and "\x00" not in item
            and len(item.encode("utf-8")) <= MAX_ARGUMENT_BYTES
            for item in value
        )
    )


def _valid_environment(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and len(value) <= MAX_ENVIRONMENT_ENTRIES
        and all(
            _valid_string(key, max_bytes=MAX_ENVIRONMENT_KEY_BYTES)
            and "=" not in key
            and isinstance(item, str)
            and "\x00" not in item
            and len(item.encode("utf-8")) <= MAX_ENVIRONMENT_VALUE_BYTES
            for key, item in value.items()
        )
    )


def _valid_digest(value: Any) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def _validate_launch(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    mode = value.get("mode")
    deadline = value.get("deadlineAt")
    grace = value.get("terminationGraceMs")
    session_port = value.get("sessionPort", False)
    session_port_target = value.get("sessionPortTarget")
    session_port_runtime = value.get("sessionPortRuntimeExecutable")
    session_port_runtime_args = value.get("sessionPortRuntimeArgs")
    if (
        value.get("type") != "launch"
        or value.get("protocol") != PROTOCOL
        or not _valid_digest(value.get("leaseNonce"))
        or not _valid_digest(value.get("bindingDigest"))
        or mode not in ("one-shot", "persistent")
        or not _valid_string_list(value.get("argv"), nonempty=True)
        or not _valid_string(
            value["argv"][0],
            absolute=True,
            max_bytes=MAX_PATH_BYTES,
        )
        or not _valid_environment(value.get("env"))
        or not _valid_string(
            value.get("cwd"),
            absolute=True,
            max_bytes=MAX_PATH_BYTES,
        )
        or not isinstance(grace, int)
        or not 10 <= grace <= 2000
        or not isinstance(session_port, bool)
        or (session_port and mode != "persistent")
    ):
        return None
    if session_port:
        if (
            not isinstance(session_port_target, str)
            or SAFE_TMUX_TARGET.fullmatch(session_port_target) is None
            or not _valid_string(
                session_port_runtime,
                absolute=True,
                max_bytes=MAX_PATH_BYTES,
            )
            or not _valid_string_list(session_port_runtime_args)
        ):  # D007C_T2_GUARD:relay_launch_fields
            return None
    elif any(
        key in value
        for key in (
            "sessionPortTarget",
            "sessionPortRuntimeExecutable",
            "sessionPortRuntimeArgs",
        )
    ):  # D007C_T2_GUARD:relay_launch_disabled_fields
        return None
    if mode == "one-shot":
        if not isinstance(deadline, int) or deadline <= 0:
            return None
    elif deadline is not None:
        return None
    return value


class ControlChannel:
    def __init__(self, fd: int, supervisor_fd: int):
        self.fd = fd
        self.supervisor_fd = supervisor_fd
        self.buffer = bytearray()
        self.commands: list[dict[str, Any]] = []
        self.caller_open = True
        self.supervisor_open = True
        os.set_blocking(fd, False)
        os.set_blocking(supervisor_fd, False)

    def _read_caller(self) -> None:
        try:
            chunk = os.read(self.fd, 65536)
        except BlockingIOError:
            return
        except OSError:
            self.caller_open = False
            return
        if not chunk:
            self.caller_open = False
            return
        self.buffer.extend(chunk)
        if len(self.buffer) >= MAX_CONTROL_BYTES:
            self.caller_open = False
            self.buffer.clear()
            return
        while b"\n" in self.buffer:
            line, _, remainder = self.buffer.partition(b"\n")
            self.buffer = bytearray(remainder)
            try:
                value = json.loads(line)
            except (UnicodeDecodeError, json.JSONDecodeError):
                self.caller_open = False
                self.commands.clear()
                return
            if not isinstance(value, dict):
                self.caller_open = False
                self.commands.clear()
                return
            self.commands.append(value)

    def _read_supervisor(self) -> None:
        try:
            chunk = os.read(self.supervisor_fd, 1)
        except BlockingIOError:
            return
        except OSError:
            self.supervisor_open = False
            return
        if not chunk:
            self.supervisor_open = False

    def poll(
        self,
        timeout: float,
        extra_fds: tuple[int, ...] = (),
    ) -> set[int]:
        readers: list[int] = list(extra_fds)
        if self.caller_open:
            readers.append(self.fd)
        if self.supervisor_open:
            readers.append(self.supervisor_fd)
        try:
            ready, _, _ = select.select(readers, [], [], timeout)
        except InterruptedError:
            ready = []
        ready_set = set(ready)
        if self.supervisor_fd in ready_set:
            self._read_supervisor()
        if self.fd in ready_set:
            self._read_caller()
        return ready_set

    def pop(self) -> dict[str, Any] | None:
        if not self.commands:
            return None
        return self.commands.pop(0)


def _deadline_reason(launch: dict[str, Any]) -> str | None:
    deadline = launch.get("deadlineAt")
    if deadline is not None and time.time_ns() // 1_000_000 >= deadline:
        return "timed_out"
    return None


def _poll_timeout(launch: dict[str, Any]) -> float:
    deadline = launch.get("deadlineAt")
    if deadline is None:
        return POLL_SECONDS
    remaining = (deadline - time.time_ns() // 1_000_000) / 1000
    return max(0.0, min(POLL_SECONDS, remaining))


def _control_reason(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
) -> str | None:
    reason = _deadline_reason(launch)
    if reason:
        return reason
    if not channel.supervisor_open:
        return "supervisor_lost"
    if signal_received[0]:
        return "supervisor_lost"
    if not channel.caller_open:
        return "caller_lost"
    return None


def _wait_for_command(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    expected: str,
) -> str | None:
    while True:
        reason = _control_reason(channel, launch, signal_received)
        if reason:
            return reason
        command = channel.pop()
        if command is not None:
            if (
                command.get("protocol") != PROTOCOL
                or command.get("type") not in ("release", "continue", "terminate")
            ):
                return "cancelled"
            if command["type"] == "terminate":
                requested = command.get("reason")
                return requested if requested in ("cancelled", "timed_out") else "cancelled"
            if command["type"] == expected:
                return None
            return "cancelled"
        channel.poll(_poll_timeout(launch))


@dataclass
class ChildStatus:
    exit_code: int
    signal_name: str | None


@dataclass(frozen=True)
class _PreReleaseUtilityWait:
    outcome: str
    status: ChildStatus | None = None


def _decode_wait_status(status: int) -> ChildStatus:
    if os.WIFEXITED(status):
        return ChildStatus(os.WEXITSTATUS(status), None)
    if os.WIFSIGNALED(status):
        number = os.WTERMSIG(status)
        try:
            name = signal.Signals(number).name
        except ValueError:
            name = f"SIG{number}"
        return ChildStatus(128 + number, name)
    return ChildStatus(255, None)


class ChildObserver:
    def __init__(self, pid: int):
        self.pid = pid

    def exited(self) -> bool:
        try:
            result = os.waitid(
                os.P_PID,
                self.pid,
                os.WEXITED | os.WNOHANG | os.WNOWAIT,
            )
        except (AttributeError, ChildProcessError, OSError):
            return False
        return result is not None

    def close(self) -> None:
        return None


class DarwinChildObserver(ChildObserver):
    def __init__(self, pid: int):
        super().__init__(pid)
        self.kqueue = select.kqueue()
        event = select.kevent(
            pid,
            filter=select.KQ_FILTER_PROC,
            flags=select.KQ_EV_ADD | select.KQ_EV_ENABLE,
            fflags=select.KQ_NOTE_EXIT,
        )
        self.kqueue.control([event], 0, 0)

    def exited(self) -> bool:
        return bool(self.kqueue.control(None, 1, 0))

    def close(self) -> None:
        self.kqueue.close()


def _child_observer(pid: int) -> ChildObserver:
    if sys.platform == "darwin":
        return DarwinChildObserver(pid)
    return ChildObserver(pid)


def _arm_observer_before_release(
    pid: int,
    observer_factory: Callable[[int], ChildObserver],
    ready_callback: Callable[[ChildObserver], None],
    wait_callback: Callable[[], str | None],
    release_callback: Callable[[], bool],
) -> tuple[ChildObserver, str | None]:
    observer = observer_factory(pid)
    ready_callback(observer)
    reason = wait_callback()
    if reason is None and not release_callback():
        reason = "exec_error"
    return observer, reason


def probe_darwin_kqueue_ordering() -> list[str]:
    events: list[str] = []

    class FakeObserver(ChildObserver):
        def __init__(self, pid: int) -> None:
            events.append("kqueue_created")
            super().__init__(pid)
            events.append("note_exit_registered")

    _arm_observer_before_release(
        42,
        FakeObserver,
        lambda _observer: None,
        lambda: None,
        lambda: not events.append("utility_released"),
    )
    return events


def _write_exec_error(fd: int) -> None:
    _safe_write(fd, b'{"code":"exec_failed"}\n')


def _direct_execve(
    launch: dict[str, Any],
    *,
    execve: Callable[[str, list[str], dict[str, str]], None] = os.execve,
) -> None:
    if execve is os.execve:
        os.execve(launch["argv"][0], launch["argv"], launch["env"])
    execve(launch["argv"][0], launch["argv"], launch["env"])


@dataclass
class _SessionPortPty:
    master_fd: int
    slave_fd: int
    authority_request_read_fd: int
    authority_request_write_fd: int
    authority_response_read_fd: int
    authority_response_write_fd: int
    terminal: dict[str, int]
    authority_identity: dict[str, Any] | None = None
    closed: bool = False

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        descriptors = (
            "master_fd",
            "slave_fd",
            "authority_request_read_fd",
            "authority_request_write_fd",
            "authority_response_read_fd",
            "authority_response_write_fd",
        )
        for name in descriptors:
            fd = getattr(self, name)
            if fd < 0:
                continue
            try:
                os.close(fd)
            except OSError:
                pass
            setattr(self, name, -1)


def _read_pty_identity(
    retained_slave_fd: int,
    *,
    fstat: Callable[[int], Any] = os.fstat,
    ioctl: Callable[[int, int, bytes], bytes] = fcntl.ioctl,
    tcgetpgrp: Callable[[int], int] = os.tcgetpgrp,
) -> dict[str, int] | None:
    try:
        stat = fstat(retained_slave_fd)
        packed = ioctl(
            retained_slave_fd,
            termios.TIOCGWINSZ,
            struct.pack("HHHH", 0, 0, 0, 0),
        )
        rows, columns, _, _ = struct.unpack("HHHH", packed)
        foreground_pgid = tcgetpgrp(retained_slave_fd)
    except (OSError, ValueError):
        return None
    return {
        "dev": int(stat.st_dev),
        "ino": int(stat.st_ino),
        "rdev": int(stat.st_rdev),
        "rows": int(rows),
        "columns": int(columns),
        "foregroundPgid": int(foreground_pgid),
    }


def _allocate_session_port_pty() -> _SessionPortPty:
    opened: list[int] = []
    try:
        master_fd, slave_fd = os.openpty()
        opened.extend((master_fd, slave_fd))
        authority_request_read_fd, authority_request_write_fd = _pipe_cloexec()
        opened.extend((
            authority_request_read_fd,
            authority_request_write_fd,
        ))
        authority_response_read_fd, authority_response_write_fd = (
            _pipe_cloexec()
        )
        opened.extend((
            authority_response_read_fd,
            authority_response_write_fd,
        ))
        _set_cloexec(master_fd)
        _set_cloexec(slave_fd)
        fcntl.ioctl(
            slave_fd,
            termios.TIOCSWINSZ,
            struct.pack(
                "HHHH",
                SESSION_PORT_ROWS,
                SESSION_PORT_COLUMNS,
                0,
                0,
            ),
        )
        tty.setraw(slave_fd, when=termios.TCSANOW)
        os.set_blocking(master_fd, False)
        stat = os.fstat(slave_fd)
        terminal = {
            "dev": int(stat.st_dev),
            "ino": int(stat.st_ino),
            "rdev": int(stat.st_rdev),
            "rows": SESSION_PORT_ROWS,
            "columns": SESSION_PORT_COLUMNS,
        }
        return _SessionPortPty(
            master_fd,
            slave_fd,
            authority_request_read_fd,
            authority_request_write_fd,
            authority_response_read_fd,
            authority_response_write_fd,
            terminal,
        )
    except BaseException:
        for fd in opened:
            try:
                os.close(fd)
            except OSError:
                pass
        raise


def _run_pty_identity_authority(
    retained_slave_fd: int,
    expected_parent_pid: int,
    request_fd: int,
    response_fd: int,
    close_fds: tuple[int, ...],
) -> int:
    signal.signal(signal.SIGHUP, signal.SIG_DFL)
    signal.signal(signal.SIGTERM, signal.SIG_DFL)
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    if not _set_parent_death_signal():
        return 70
    if sys.platform.startswith("linux") and os.getppid() != expected_parent_pid:
        return 70
    retained = {retained_slave_fd, request_fd, response_fd}
    for fd in set(close_fds):
        if fd in retained:
            continue
        try:
            os.close(fd)
        except OSError:
            pass

    while True:
        try:
            request = os.read(request_fd, 1)
        except InterruptedError:
            continue
        except OSError:
            return 0
        if request != b"I":
            return 0
        identity = _read_pty_identity(retained_slave_fd)
        try:
            if identity is None:
                response = PTY_IDENTITY_RECORD.pack(0, 0, 0, 0, 0, 0, 0)
            else:
                response = PTY_IDENTITY_RECORD.pack(
                    1,
                    identity["dev"],
                    identity["ino"],
                    identity["rdev"],
                    identity["rows"],
                    identity["columns"],
                    identity["foregroundPgid"],
                )
        except (KeyError, OverflowError, struct.error):
            response = PTY_IDENTITY_RECORD.pack(0, 0, 0, 0, 0, 0, 0)
        if not _safe_write(response_fd, response):
            return 0


def _request_pty_identity(
    pty: _SessionPortPty,
) -> dict[str, int] | None:
    if not _safe_write(pty.authority_request_write_fd, b"I"):
        return None
    payload = bytearray()
    deadline = time.monotonic() + 1.0
    while len(payload) < PTY_IDENTITY_RECORD.size:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return None
        try:
            readable, _, _ = select.select(
                [pty.authority_response_read_fd],
                [],
                [],
                remaining,
            )
        except InterruptedError:
            continue
        except OSError:
            return None
        if pty.authority_response_read_fd not in readable:
            return None
        try:
            chunk = os.read(
                pty.authority_response_read_fd,
                PTY_IDENTITY_RECORD.size - len(payload),
            )
        except InterruptedError:
            continue
        except OSError:
            return None
        if not chunk:
            return None
        payload.extend(chunk)
    try:
        status, dev, ino, rdev, rows, columns, foreground_pgid = (
            PTY_IDENTITY_RECORD.unpack(payload)
        )
    except struct.error:
        return None
    if status != 1:
        return None
    return {
        "dev": int(dev),
        "ino": int(ino),
        "rdev": int(rdev),
        "rows": int(rows),
        "columns": int(columns),
        "foregroundPgid": int(foreground_pgid),
    }


def _cleanup_pre_release_pty_authority(
    authority_pid: int,
    authority_identity: dict[str, Any] | None,
    grace_ms: int,
) -> bool:
    if (
        not isinstance(authority_pid, int)
        or isinstance(authority_pid, bool)
        or authority_pid <= 1
        or not isinstance(grace_ms, int)
        or isinstance(grace_ms, bool)
        or grace_ms < 0
    ):
        return False
    if (
        authority_identity is not None
        and not _identity_matches(
            authority_identity,
            process_identity(authority_pid),
        )
    ):
        return False

    def reap_until(deadline: float) -> bool | None:
        while True:
            try:
                waited, _ = os.waitpid(authority_pid, os.WNOHANG)
            except InterruptedError:
                continue
            except ChildProcessError:
                return None
            if waited == authority_pid:
                return True
            if time.monotonic() >= deadline:
                return False
            time.sleep(0.005)

    reaped = reap_until(time.monotonic())
    if reaped is not False:
        return reaped is True
    if (
        authority_identity is not None
        and not _identity_matches(
            authority_identity,
            process_identity(authority_pid),
        )
    ):
        return False
    try:
        os.kill(authority_pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    except OSError:
        return False
    reaped = reap_until(time.monotonic() + grace_ms / 1000)
    if reaped is not False:
        return reaped is True
    if (
        authority_identity is not None
        and not _identity_matches(
            authority_identity,
            process_identity(authority_pid),
        )
    ):
        return False
    try:
        os.kill(authority_pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    except OSError:
        return False
    return reap_until(
        time.monotonic() + PRE_RELEASE_CHILD_REAP_SECONDS
    ) is True


def _utility_child(
    launch: dict[str, Any],
    expected_parent_pid: int,
    identity_fd: int,
    release_fd: int,
    exec_error_fd: int,
    close_fds: tuple[int, ...],
    pty: _SessionPortPty | None = None,
) -> None:
    authority_pid: int | None = None
    authority_identity: dict[str, Any] | None = None
    authority_transferred = False
    try:
        signal.signal(signal.SIGHUP, signal.SIG_IGN)
        if not _set_parent_death_signal():
            raise OSError(errno.ENOSYS, "parent-death signal unavailable")
        if sys.platform.startswith("linux") and os.getppid() != expected_parent_pid:
            os.kill(os.getpid(), signal.SIGKILL)
        os.setsid()
        if pty is not None:
            fcntl.ioctl(pty.slave_fd, termios.TIOCSCTTY, 0)
            os.tcsetpgrp(pty.slave_fd, os.getpid())
            for target_fd in (0, 1, 2):
                os.dup2(pty.slave_fd, target_fd)
            authority_parent_pid = os.getpid()
            authority_pid = os.fork()
            if authority_pid == 0:
                authority_status = _run_pty_identity_authority(
                    pty.slave_fd,
                    authority_parent_pid,
                    pty.authority_request_read_fd,
                    pty.authority_response_write_fd,
                    (
                        *close_fds,
                        identity_fd,
                        release_fd,
                        exec_error_fd,
                        pty.master_fd,
                        pty.authority_request_write_fd,
                        pty.authority_response_read_fd,
                        TRANSCRIPT_FD,
                        0,
                        1,
                        2,
                    ),
                )
                os._exit(authority_status)
            authority_identity = process_identity(authority_pid)
            if authority_identity is None:
                raise OSError(errno.ESRCH, "PTY authority identity unavailable")
            for fd in (
                pty.authority_request_read_fd,
                pty.authority_request_write_fd,
                pty.authority_response_read_fd,
                pty.authority_response_write_fd,
            ):
                try:
                    os.close(fd)
                except OSError:
                    pass
        if sys.platform.startswith("linux") and os.getppid() != expected_parent_pid:
            os.kill(os.getpid(), signal.SIGKILL)
        identity = process_identity(os.getpid())
        if identity is None:
            raise OSError(errno.ESRCH, "identity unavailable")
        identity_record: dict[str, Any] = identity
        if pty is not None:
            identity_record = {
                "utility": identity,
                "ptyAuthority": authority_identity,
            }
        if not _safe_write(
            identity_fd,
            json.dumps(identity_record, separators=(",", ":")).encode("utf-8")
            + b"\n",
        ):
            raise OSError(errno.EPIPE, "identity publication failed")
        os.close(identity_fd)
        while True:
            try:
                released = os.read(release_fd, 1)
                break
            except InterruptedError:
                continue
        os.close(release_fd)
        if released != b"1":
            raise OSError(errno.ECANCELED, "utility release was not granted")
        authority_transferred = True
        signal.signal(signal.SIGHUP, signal.SIG_DFL)
        os.chdir(launch["cwd"])
        for fd in close_fds:
            try:
                os.close(fd)
            except OSError:
                pass
        try:
            os.close(TRANSCRIPT_FD)
        except OSError:
            pass
        if pty is None:
            try:
                os.close(0)
            except OSError:
                pass
        _direct_execve(launch)
    except BaseException:
        clean = True
        if (
            pty is not None
            and authority_pid is not None
            and authority_pid > 0
            and not authority_transferred
        ):
            pty.close()
            clean = _cleanup_pre_release_pty_authority(
                authority_pid,
                authority_identity,
                launch["terminationGraceMs"],
            )
        _write_exec_error(exec_error_fd)
        os._exit(126 if clean else PRE_RELEASE_CLEANUP_FAILED_EXIT)


def _read_identity(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    identity_fd: int,
    payload: bytearray | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    retained_payload = payload if payload is not None else bytearray()
    os.set_blocking(identity_fd, False)
    while True:
        reason = _control_reason(channel, launch, signal_received)
        if reason:
            return None, reason
        ready = channel.poll(_poll_timeout(launch), (identity_fd,))
        if identity_fd not in ready:
            continue
        try:
            chunk = os.read(identity_fd, 4096)
        except BlockingIOError:
            continue
        if not chunk:
            return None, "exec_error"
        retained_payload.extend(chunk)
        if len(retained_payload) > 4096:
            return None, "exec_error"
        if b"\n" not in retained_payload:
            continue
        line = bytes(
            retained_payload[: retained_payload.index(b"\n")]
        )
        try:
            identity = json.loads(line)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None, "exec_error"
        return identity if isinstance(identity, dict) else None, None


def _direct_children() -> list[int]:
    if not sys.platform.startswith("linux"):
        return []
    try:
        with open(
            f"/proc/self/task/{os.getpid()}/children",
            "r",
            encoding="ascii",
        ) as handle:
            value = handle.read().strip()
    except (FileNotFoundError, PermissionError, OSError):
        return []
    if not value:
        return []
    result = []
    for item in value.split():
        try:
            pid = int(item)
        except ValueError:
            continue
        if pid > 1:
            result.append(pid)
    return result


def _signal_exact(identity: dict[str, Any], signal_number: int) -> None:
    current = process_identity(int(identity["pid"]))
    if not _identity_matches(identity, current):
        return
    try:
        os.kill(int(identity["pid"]), signal_number)
    except ProcessLookupError:
        pass


def _signal_utility_group(
    identity: dict[str, Any],
    signal_number: int,
) -> None:
    current = process_identity(int(identity["pid"]))
    if not _identity_matches(identity, current):
        return
    if current["pgid"] != identity["pid"] or current["sid"] != identity["pid"]:
        return
    try:
        os.killpg(int(identity["pid"]), signal_number)
    except ProcessLookupError:
        pass


def _capture_adopted(
    leader_pid: int,
    known: dict[int, dict[str, Any]],
) -> None:
    if not sys.platform.startswith("linux"):
        return
    for pid in _direct_children():
        if pid == leader_pid or pid in known:
            continue
        identity = process_identity(pid)
        if identity is not None:
            known[pid] = identity


def _reap_nonblocking(
    statuses: dict[int, ChildStatus],
    hold_pid: int | None = None,
) -> None:
    if sys.platform.startswith("linux"):
        candidates = _direct_children()
    elif hold_pid is None:
        candidates = [-1]
    else:
        candidates = []
    for candidate in candidates:
        if candidate == hold_pid:
            continue
        try:
            pid, status = os.waitpid(candidate, os.WNOHANG)
        except ChildProcessError:
            continue
        except InterruptedError:
            continue
        if pid == 0:
            continue
        statuses[pid] = _decode_wait_status(status)


def _cleanup_tree(
    utility: dict[str, Any],
    grace_ms: int,
) -> tuple[bool, ChildStatus | None]:
    leader_pid = int(utility["pid"])
    adopted: dict[int, dict[str, Any]] = {}
    statuses: dict[int, ChildStatus] = {}
    _signal_utility_group(utility, signal.SIGTERM)
    grace_end = time.monotonic() + grace_ms / 1000
    while time.monotonic() < grace_end:
        _capture_adopted(leader_pid, adopted)
        for identity in adopted.values():
            _signal_exact(identity, signal.SIGTERM)
        _reap_nonblocking(statuses, hold_pid=leader_pid)
        if leader_pid in statuses and not _direct_children():
            break
        time.sleep(0.005)

    _signal_utility_group(utility, signal.SIGKILL)
    _capture_adopted(leader_pid, adopted)
    for identity in adopted.values():
        _signal_exact(identity, signal.SIGKILL)

    cleanup_end = time.monotonic() + 2.0
    while time.monotonic() < cleanup_end:
        _reap_nonblocking(statuses)
        _capture_adopted(leader_pid, adopted)
        for identity in adopted.values():
            _signal_exact(identity, signal.SIGKILL)
        children = _direct_children()
        if sys.platform.startswith("linux"):
            if not children:
                break
        elif leader_pid in statuses:
            break
        time.sleep(0.005)
    _reap_nonblocking(statuses)
    if sys.platform.startswith("linux"):
        clean = not _direct_children()
    else:
        clean = leader_pid in statuses
    return clean, statuses.get(leader_pid)


@dataclass
class SealedUtilityGroupTarget:
    generation_id: bytes
    pid: int
    pgid: int
    sid: int
    child_owned: bool
    leader_unreaped: bool
    state: str = "PENDING"


def seal_utility_group_target(
    generation_id: bytes,
    utility: dict[str, Any],
    *,
    child_owned: bool,
    leader_unreaped: bool,
) -> SealedUtilityGroupTarget:
    if (
        not isinstance(generation_id, bytes)
        or len(generation_id) != 32
        or not isinstance(utility, dict)
        or not all(
            isinstance(utility.get(field), int)
            and not isinstance(utility.get(field), bool)
            for field in ("pid", "pgid", "sid")
        )
        or utility["pid"] <= 1
        or utility["pid"] != utility["pgid"]
        or utility["pid"] != utility["sid"]
        or not isinstance(child_owned, bool)
        or not isinstance(leader_unreaped, bool)
    ):
        raise ValueError("invalid sealed utility group")
    return SealedUtilityGroupTarget(
        generation_id=generation_id,
        pid=utility["pid"],
        pgid=utility["pgid"],
        sid=utility["sid"],
        child_owned=child_owned,
        leader_unreaped=leader_unreaped,
    )


def cleanup_sealed_utility_group(
    target: SealedUtilityGroupTarget,
    *,
    generation_id: bytes,
    anchor_current: Callable[[], bool],
    signal_group: Callable[[int, int], None],
    reap_leader: Callable[[int], None],
    grace: Callable[[], None],
    diagnostic_reader: Callable[[int], Any] | None = None,
) -> str:
    del diagnostic_reader
    if (
        not isinstance(target, SealedUtilityGroupTarget)
        or not isinstance(generation_id, bytes)
        or not hmac.compare_digest(
            target.generation_id,
            generation_id,
        )
        or not callable(anchor_current)
        or not callable(signal_group)
        or not callable(reap_leader)
        or not callable(grace)
    ):
        raise ValueError("invalid sealed utility cleanup")
    if target.state != "PENDING":
        return target.state
    if (
        not target.child_owned
        or not target.leader_unreaped
        or anchor_current() is not True
    ):
        target.state = "PRESERVED"
        return target.state
    try:
        signal_group(target.pgid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    else:
        grace()
        try:
            signal_group(target.pgid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    reap_leader(target.pid)
    target.leader_unreaped = False
    target.state = "RETIRED"
    return target.state


def _reap_exact_adopted_child(identity: dict[str, Any]) -> None:
    if (
        not sys.platform.startswith("linux")
        or not isinstance(identity, dict)
        or not isinstance(identity.get("pid"), int)
        or isinstance(identity.get("pid"), bool)
        or identity["pid"] <= 1
    ):
        raise OSError(errno.EINVAL, "invalid adopted child identity")
    pid = identity["pid"]
    deadline = time.monotonic() + 2.0
    while time.monotonic() < deadline:
        current = process_identity(pid)
        if not _identity_matches(identity, current):
            raise OSError(errno.ESRCH, "adopted child identity changed")
        if pid not in _direct_children():
            time.sleep(0.005)
            continue
        try:
            waited, _ = os.waitpid(pid, os.WNOHANG)
        except ChildProcessError as error:
            raise OSError(errno.ECHILD, "adopted child unavailable") from error
        if waited == pid:
            return
        time.sleep(0.005)
    raise TimeoutError("adopted child reap timeout")


def _bounded_session_port_utility_cleanup(
    utility: dict[str, Any],
    grace_ms: int,
    authority_identity: dict[str, Any] | None = None,
    *,
    authority_required: bool | None = None,
) -> tuple[bool, ChildStatus | None]:
    if authority_required is None:
        authority_required = sys.platform.startswith("linux")
    generation = AcceptedGeneration(os.urandom(32))
    target = seal_utility_group_target(
        generation.generation_id,
        utility,
        child_owned=True,
        leader_unreaped=True,
    )
    status: ChildStatus | None = None

    def reap_leader(pid: int) -> None:
        nonlocal status
        deadline = time.monotonic() + 2.0
        while time.monotonic() < deadline:
            waited, value = os.waitpid(pid, os.WNOHANG)
            if waited == pid:
                status = _decode_wait_status(value)
                return
            time.sleep(0.005)
        raise TimeoutError("utility leader reap timeout")

    def close_target(selected: SealedUtilityGroupTarget) -> None:
        result = cleanup_sealed_utility_group(
            selected,
            generation_id=generation.generation_id,
            anchor_current=lambda: selected.child_owned
            and selected.leader_unreaped,
            signal_group=lambda pgid, selected_signal: os.kill(
                -pgid,
                selected_signal,
            ),
            reap_leader=reap_leader,
            grace=lambda: time.sleep(grace_ms / 1000),
        )
        if result != "RETIRED":
            raise OSError(errno.EIO, "utility group preserved")

    generation.seal_cleanup_target("utility-group", target, close=close_target)
    authority_target = None
    if sys.platform.startswith("linux") and authority_identity is not None:
        authority_target = "pty-identity-authority"
        generation.seal_cleanup_target(
            authority_target,
            authority_identity,
            close=_reap_exact_adopted_child,
        )
    generation.activate(generation.generation_id, lambda: None)
    generation.revoke(generation.generation_id)
    generation.cleanup_target(generation.generation_id, "utility-group")
    if authority_target is not None:
        generation.cleanup_target(
            generation.generation_id,
            authority_target,
        )
    generation.finish_cleanup(generation.generation_id)
    return (
        target.state == "RETIRED"
        and (
            (authority_target is None and not authority_required)
            or (
                authority_target is not None
                and generation.cleanup_states[authority_target] == "RETIRED"
            )
        ),
        status,
    )


def _decode_retained_identity(
    payload: bytearray,
) -> dict[str, Any] | None:
    if b"\n" not in payload:
        return None
    line = bytes(payload[: payload.index(b"\n")])
    try:
        identity = json.loads(line)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return identity if isinstance(identity, dict) else None


def _drain_retained_identity(
    identity_fd: int,
    payload: bytearray,
) -> bool:
    while len(payload) <= 4096:
        try:
            ready, _, _ = select.select([identity_fd], [], [], 0)
        except InterruptedError:
            continue
        except OSError:
            return False
        if identity_fd not in ready:
            return True
        try:
            chunk = os.read(identity_fd, 4096 - len(payload) + 1)
        except BlockingIOError:
            return True
        except InterruptedError:
            continue
        except OSError:
            return False
        if not chunk:
            return True
        payload.extend(chunk)
    return False


def _wait_pre_release_utility(
    pid: int,
    identity_fd: int,
    identity_payload: bytearray,
    deadline: float,
) -> _PreReleaseUtilityWait:
    while time.monotonic() < deadline:
        _drain_retained_identity(identity_fd, identity_payload)
        try:
            waited, status = os.waitpid(pid, os.WNOHANG)
        except InterruptedError:
            continue
        except ChildProcessError:
            return _PreReleaseUtilityWait("ownership_lost")
        if waited == pid:
            _drain_retained_identity(identity_fd, identity_payload)
            return _PreReleaseUtilityWait(
                "reaped",
                _decode_wait_status(status),
            )
        time.sleep(0.005)
    _drain_retained_identity(identity_fd, identity_payload)
    return _PreReleaseUtilityWait("running")


def _pty_spawn_identities(
    identity_record: dict[str, Any] | None,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    if (
        not isinstance(identity_record, dict)
        or set(identity_record) != {"utility", "ptyAuthority"}
        or not isinstance(identity_record.get("utility"), dict)
        or not isinstance(identity_record.get("ptyAuthority"), dict)
    ):
        return None, None
    return identity_record["utility"], identity_record["ptyAuthority"]


def _abort_pre_release_utility(
    pid: int,
    release_write: int,
    exec_read: int,
    identity_read: int,
    identity_payload: bytearray,
    launch: dict[str, Any],
    pty: _SessionPortPty,
    identity: dict[str, Any] | None,
    authority_identity: dict[str, Any] | None,
    observer: ChildObserver | None = None,
) -> bool:
    try:
        os.close(release_write)
    except OSError:
        pass
    pty.close()
    try:
        os.close(exec_read)
    except OSError:
        pass
    if observer is not None:
        observer.close()
    try:
        wait_result = _wait_pre_release_utility(
            pid,
            identity_read,
            identity_payload,
            time.monotonic()
            + launch["terminationGraceMs"] / 1000
            + PRE_RELEASE_CHILD_REAP_SECONDS
            + PRE_RELEASE_SCHEDULING_SLACK_SECONDS,
        )
        late_record = _decode_retained_identity(identity_payload)
        late_identity, late_authority = _pty_spawn_identities(late_record)
        if identity is None:
            identity = late_identity
        if authority_identity is None:
            authority_identity = late_authority
        if authority_identity is not None:
            pty.authority_identity = authority_identity
        if wait_result.outcome != "reaped":
            return False
        status = wait_result.status
        return bool(
            status is not None
            and status.signal_name is None
            and status.exit_code == 126
        )
    finally:
        try:
            os.close(identity_read)
        except OSError:
            pass


def _spawn_utility(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    pty: _SessionPortPty | None = None,
) -> tuple[
    dict[str, Any] | None,
    ChildObserver | None,
    int | None,
    str | None,
]:
    identity_read, identity_write = _pipe_cloexec()
    release_read, release_write = _pipe_cloexec()
    exec_read, exec_write = _pipe_cloexec()
    reaper_pid = os.getpid()
    pid = os.fork()
    if pid == 0:
        os.close(identity_read)
        os.close(release_write)
        os.close(exec_read)
        _utility_child(
            launch,
            reaper_pid,
            identity_write,
            release_read,
            exec_write,
            (
                channel.supervisor_fd,
                release_write,
                exec_read,
                SESSION_PORT_REQUEST_FD,
                SESSION_PORT_RESPONSE_FD,
                *((pty.master_fd, pty.slave_fd) if pty is not None else ()),
            ),
            pty,
        )
        os._exit(126)

    os.close(identity_write)
    os.close(release_read)
    os.close(exec_write)
    if pty is not None:
        os.close(pty.authority_request_read_fd)
        pty.authority_request_read_fd = -1
        os.close(pty.authority_response_write_fd)
        pty.authority_response_write_fd = -1
    identity_payload = bytearray()
    identity_record, reason = _read_identity(
        channel,
        launch,
        signal_received,
        identity_read,
        identity_payload,
    )
    authority_identity: dict[str, Any] | None = None
    if pty is None:
        identity = identity_record
    else:
        identity, authority_identity = _pty_spawn_identities(
            identity_record,
        )
        if authority_identity is not None:
            pty.authority_identity = authority_identity

    invalid_identity = (
        identity is None
        or identity.get("pid") != pid
        or identity.get("pgid") != pid
        or identity.get("sid") != pid
        or not _identity_matches(identity, process_identity(pid))
    )
    if pty is not None:
        invalid_identity = (
            invalid_identity
            or authority_identity is None
            or (
                authority_identity is not None
                and (
                    authority_identity.get("pid") == pid
                    or authority_identity.get("pgid") != pid
                    or authority_identity.get("sid") != pid
                    or not _identity_matches(
                        authority_identity,
                        process_identity(
                            authority_identity.get("pid", -1)
                        ),
                    )
                )
            )
        )

    if reason is not None or invalid_identity:
        if pty is not None:
            clean = _abort_pre_release_utility(
                pid,
                release_write,
                exec_read,
                identity_read,
                identity_payload,
                launch,
                pty,
                identity,
                authority_identity,
            )
            return (
                None,
                None,
                None,
                (reason or "exec_error")
                if clean
                else "supervisor_lost",
            )
        os.close(identity_read)
        if identity is None:
            identity = process_identity(pid)
        if identity is not None:
            _cleanup_tree(identity, launch["terminationGraceMs"])
        os.close(release_write)
        os.close(exec_read)
        return None, None, None, reason or "exec_error"

    terminal = _request_pty_identity(pty) if pty is not None else None
    if pty is not None and (
        terminal is None
        or terminal["foregroundPgid"] != pid
        or terminal["columns"] != SESSION_PORT_COLUMNS
        or terminal["rows"] != SESSION_PORT_ROWS
    ):
        clean = _abort_pre_release_utility(
            pid,
            release_write,
            exec_read,
            identity_read,
            identity_payload,
            launch,
            pty,
            identity,
            authority_identity,
        )
        return (
            None,
            None,
            None,
            "exec_error" if clean else "supervisor_lost",
        )

    if pty is None:
        os.close(identity_read)

    def ready_callback(_observer: ChildObserver) -> None:
        _emit(
            {
                "type": "utility_ready",
                "protocol": PROTOCOL,
                "bindingDigest": launch["bindingDigest"],
                "utility": identity,
            }
        )

    def wait_callback() -> str | None:
        return _wait_for_command(
            channel,
            launch,
            signal_received,
            "continue",
        )

    def release_callback() -> bool:
        return _safe_write(release_write, b"1")

    observer, reason = _arm_observer_before_release(
        pid,
        _child_observer,
        ready_callback,
        wait_callback,
        release_callback,
    )
    if reason is not None:
        if pty is not None:
            clean = _abort_pre_release_utility(
                pid,
                release_write,
                exec_read,
                identity_read,
                identity_payload,
                launch,
                pty,
                identity,
                authority_identity,
                observer,
            )
        else:
            os.close(release_write)
            os.close(exec_read)
            clean, _ = _cleanup_tree(identity, launch["terminationGraceMs"])
        return None, None, None, reason if clean else "supervisor_lost"

    os.close(release_write)
    if pty is not None:
        os.close(identity_read)
    return identity, observer, exec_read, None


def _wait_for_exec(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    exec_fd: int,
) -> str | None:
    os.set_blocking(exec_fd, False)
    while True:
        reason = _control_reason(channel, launch, signal_received)
        if reason:
            return reason
        command = channel.pop()
        if command is not None:
            if (
                command.get("protocol") != PROTOCOL
                or command.get("type") != "terminate"
            ):
                return "cancelled"
            requested = command.get("reason")
            return requested if requested in ("cancelled", "timed_out") else "cancelled"
        ready = channel.poll(_poll_timeout(launch), (exec_fd,))
        if exec_fd not in ready:
            continue
        try:
            payload = os.read(exec_fd, 4096)
        except BlockingIOError:
            continue
        if payload:
            return "exec_error"
        _emit({"type": "utility_exec", "protocol": PROTOCOL})
        return None


def _wait_for_terminal(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    observer: ChildObserver,
) -> str:
    while True:
        reason = _control_reason(channel, launch, signal_received)
        if reason:
            return reason
        command = channel.pop()
        if command is not None:
            if (
                command.get("protocol") != PROTOCOL
                or command.get("type") != "terminate"
            ):
                return "cancelled"
            requested = command.get("reason")
            return requested if requested in ("cancelled", "timed_out") else "cancelled"
        if observer.exited():
            return "exited"
        channel.poll(_poll_timeout(launch))


def _terminal_event(reason: str, status: ChildStatus | None = None) -> dict[str, Any]:
    event: dict[str, Any] = {
        "type": "terminal",
        "protocol": PROTOCOL,
        "reason": reason,
    }
    if reason == "exited":
        event["exitCode"] = status.exit_code if status is not None else 255
        event["signal"] = status.signal_name if status is not None else None
    return event


def _read_launch(
    channel: ControlChannel,
    signal_received: list[bool],
) -> dict[str, Any] | None:
    while True:
        if (
            not channel.supervisor_open
            or not channel.caller_open
            or signal_received[0]
        ):
            return None
        command = channel.pop()
        if command is not None:
            return _validate_launch(command)
        channel.poll(POLL_SECONDS)


def _same_session_process_identity(
    expected: dict[str, Any],
    actual: dict[str, Any] | None,
) -> bool:
    return bool(
        actual is not None
        and all(
            expected.get(field) == actual.get(field)
            for field in (
                "pid",
                "startToken",
                "pgid",
                "sid",
                "executable",
                "argvNul",
                "cwd",
            )
        )
    )


class RelayKeyError(ValueError):
    pass


class SnapshotValidationError(ValueError):
    pass


class TerminalChangedError(ValueError):
    pass


class GenerationRevokedError(RuntimeError):
    pass


@dataclass(frozen=True)
class GenerationCandidate:
    generation_id: bytes
    value: Any


@dataclass
class _CleanupTarget:
    handle: Any
    close: Callable[[Any], None]
    state: str = "PENDING"


class AcceptedGeneration:
    """One irreversible workload generation and its sealed cleanup ledger."""

    def __init__(self, generation_id: bytes) -> None:
        if not isinstance(generation_id, bytes) or len(generation_id) != 32:
            raise ValueError("invalid accepted generation")
        self._generation_id = generation_id
        self._state = "BOOTSTRAPPING"
        self._lock = threading.RLock()
        self._cleanup_targets: dict[str, _CleanupTarget] = {}
        self._cleanup_attempts_before_revoke = 0

    @property
    def generation_id(self) -> bytes:
        return self._generation_id

    @property
    def state(self) -> str:
        with self._lock:
            return self._state

    @property
    def cleanup_states(self) -> dict[str, str]:
        with self._lock:
            return {
                name: target.state
                for name, target in self._cleanup_targets.items()
            }

    @property
    def cleanup_attempts_before_revoke(self) -> int:
        with self._lock:
            return self._cleanup_attempts_before_revoke

    def _require_generation(self, generation_id: bytes) -> None:
        if (
            not isinstance(generation_id, bytes)
            or not hmac.compare_digest(
                generation_id,
                self._generation_id,
            )
        ):
            raise GenerationRevokedError("accepted generation changed")

    def seal_cleanup_target(
        self,
        name: str,
        handle: Any,
        *,
        close: Callable[[Any], None],
    ) -> None:
        with self._lock:
            if (
                self._state != "BOOTSTRAPPING"
                or not isinstance(name, str)
                or not name
                or name in self._cleanup_targets
                or not callable(close)
            ):
                raise ValueError("invalid cleanup target")
            self._cleanup_targets[name] = _CleanupTarget(handle, close)

    def activate(
        self,
        generation_id: bytes,
        effect: Callable[[], Any],
    ) -> Any:
        with self._lock:
            self._require_generation(generation_id)
            if self._state != "BOOTSTRAPPING":
                raise GenerationRevokedError(
                    "accepted generation is not activatable"
                )
            if not callable(effect):
                raise ValueError("invalid activation effect")
            self._state = "ACTIVE"
            try:
                return effect()
            except BaseException:
                self._state = "REVOKING"
                raise

    def workload(
        self,
        generation_id: bytes,
        effect: Callable[[], Any],
    ) -> Any:
        with self._lock:
            self._require_generation(generation_id)
            if self._state != "ACTIVE":
                raise GenerationRevokedError(
                    "accepted generation is not active"
                )
            if not callable(effect):
                raise ValueError("invalid workload effect")
            return effect()

    def candidate(
        self,
        generation_id: bytes,
        value: Any,
    ) -> GenerationCandidate:
        with self._lock:
            self._require_generation(generation_id)
            if self._state != "ACTIVE":
                raise GenerationRevokedError(
                    "accepted generation is not active"
                )
            return GenerationCandidate(self._generation_id, value)

    def settle(
        self,
        generation_id: bytes,
        candidate: GenerationCandidate,
    ) -> Any:
        with self._lock:
            self._require_generation(generation_id)
            if (
                self._state != "ACTIVE"
                or not isinstance(candidate, GenerationCandidate)
                or not hmac.compare_digest(
                    candidate.generation_id,
                    self._generation_id,
                )
            ):
                raise GenerationRevokedError(
                    "accepted generation cannot settle"
                )
            return candidate.value

    def revoke(self, generation_id: bytes) -> bool:
        with self._lock:
            self._require_generation(generation_id)
            if self._state in ("REVOKING", "REVOKED"):
                return False
            self._state = "REVOKING"
            return True

    def cleanup_target(
        self,
        generation_id: bytes,
        name: str,
    ) -> str:
        with self._lock:
            self._require_generation(generation_id)
            if self._state not in ("REVOKING", "REVOKED"):
                self._cleanup_attempts_before_revoke += 1
                return "PENDING"
            target = self._cleanup_targets.get(name)
            if target is None:
                raise ValueError("unknown cleanup target")
            if target.state != "PENDING":
                return target.state
            try:
                target.close(target.handle)
            except BaseException:
                target.state = "PRESERVED"
            else:
                target.state = "RETIRED"
            return target.state

    def preserve_target(
        self,
        generation_id: bytes,
        name: str,
    ) -> str:
        with self._lock:
            self._require_generation(generation_id)
            if self._state not in ("REVOKING", "REVOKED"):
                self._cleanup_attempts_before_revoke += 1
                return "PENDING"
            target = self._cleanup_targets.get(name)
            if target is None:
                raise ValueError("unknown cleanup target")
            if target.state == "PENDING":
                target.state = "PRESERVED"
            return target.state

    def finish_cleanup(self, generation_id: bytes) -> None:
        with self._lock:
            self._require_generation(generation_id)
            if self._state not in ("REVOKING", "REVOKED"):
                raise GenerationRevokedError(
                    "cleanup is not authorized"
                )
            if any(
                target.state == "PENDING"
                for target in self._cleanup_targets.values()
            ):
                raise GenerationRevokedError(
                    "cleanup ledger is incomplete"
                )
            self._state = "REVOKED"


@dataclass(frozen=True)
class RelayAuthenticationResult:
    accepted: bool
    reject_id: int | None
    public_code: str | None
    revoke: bool


@dataclass
class RelayAuthenticationState:
    accepted: bool = False
    used_challenges: set[bytes] = field(default_factory=set)


@dataclass(frozen=True)
class CanonicalSnapshot:
    snapshot: bytes
    truncated: bool


@dataclass(frozen=True)
class RetainedPtyRange:
    generation_id: bytes
    payload: bytes


class RetainedPtyAuthority:
    """Read and write only the PTY master retained for one generation."""

    def __init__(
        self,
        generation: AcceptedGeneration,
        master_fd: int,
        slave_fd: int,
        *,
        close_master: Callable[[int], None] = os.close,
    ) -> None:
        if (
            not isinstance(generation, AcceptedGeneration)
            or not isinstance(master_fd, int)
            or master_fd < 0
            or not isinstance(slave_fd, int)
            or slave_fd < 0
        ):
            raise ValueError("invalid retained PTY authority")
        self._generation = generation
        self._master_fd = master_fd
        self._slave_fd = slave_fd
        self._close_master = close_master
        self._cleanup_name = f"pty-master-{id(self)}"
        generation.seal_cleanup_target(
            self._cleanup_name,
            master_fd,
            close=close_master,
        )

    def read(
        self,
        size: int,
        *,
        read: Callable[[int, int], bytes] = os.read,
    ) -> RetainedPtyRange:
        if (
            not isinstance(size, int)
            or isinstance(size, bool)
            or size <= 0
            or size > RELAY_DATA_MAX_PAYLOAD_BYTES
            or not callable(read)
        ):
            raise ValueError("invalid retained PTY read")
        payload = self._generation.workload(
            self._generation.generation_id,
            lambda: read(self._master_fd, size),
        )
        if not isinstance(payload, bytes):
            raise OSError(errno.EIO, "invalid retained PTY read")
        return RetainedPtyRange(
            self._generation.generation_id,
            payload,
        )

    def write(
        self,
        payload: bytes,
        *,
        write: Callable[[int, memoryview], int] = os.write,
    ) -> int:
        if (
            not isinstance(payload, bytes)
            or not payload
            or not callable(write)
        ):
            raise ValueError("invalid retained PTY write")
        accepted = 0
        while accepted < len(payload):
            remaining = memoryview(payload)[accepted:]
            written = self._generation.workload(
                self._generation.generation_id,
                lambda: write(self._master_fd, remaining),
            )
            if (
                not isinstance(written, int)
                or isinstance(written, bool)
                or written <= 0
                or written > len(remaining)
            ):
                raise OSError(errno.EIO, "invalid retained PTY write")
            accepted += written
        return accepted

    def cleanup(self) -> str:
        return self._generation.cleanup_target(
            self._generation.generation_id,
            self._cleanup_name,
        )


@dataclass(frozen=True)
class AgentsCaptureV1Record:
    version: int
    generation_id: bytes
    server_pid: int
    session_id: str
    pane_id: str
    pane_pid: int
    pane_width: int
    pane_height: int
    history_limit: int
    history_size: int
    cursor_y: int
    capture: bytes


class RetainedTmuxConnection:
    """One control-mode client bound to one accepted tmux generation."""

    def __init__(
        self,
        generation_id: bytes,
        *,
        command: Callable[[list[str]], Any],
        close: Callable[[], None],
    ) -> None:
        if (
            not isinstance(generation_id, bytes)
            or len(generation_id) != 32
            or not callable(command)
            or not callable(close)
        ):
            raise ValueError("invalid retained tmux connection")
        self.generation_id = generation_id
        self._command = command
        self._close = close
        self._closed = False

    def _require_open_generation(self, generation_id: str) -> None:
        if (
            self._closed
            or not isinstance(generation_id, str)
            or not hmac.compare_digest(
                generation_id.encode("ascii", "strict"),
                self.generation_id.hex().encode("ascii"),
            )
        ):
            raise TerminalChangedError("retained tmux connection changed")

    def _run(self, arguments: list[str]) -> Any:
        if self._closed:
            raise TerminalChangedError("retained tmux connection closed")
        result = self._command(arguments)
        if (
            not isinstance(getattr(result, "returncode", None), int)
            or not isinstance(getattr(result, "stdout", None), bytes)
            or not isinstance(getattr(result, "stderr", None), bytes)
        ):
            raise TerminalChangedError("invalid retained tmux response")
        return result

    @staticmethod
    def _numeric(value: str, *, minimum: int = 0) -> int:
        if (
            not isinstance(value, str)
            or not value.isdigit()
            or (value != "0" and value.startswith("0"))
        ):
            raise TerminalChangedError("invalid retained tmux record")
        parsed = int(value)
        if parsed < minimum or parsed > 0x7FFFFFFFFFFFFFFF:
            raise TerminalChangedError("invalid retained tmux record")
        return parsed

    def agents_capture_v1(
        self,
        request: dict[str, Any],
    ) -> AgentsCaptureV1Record:
        if not isinstance(request, dict):
            raise TerminalChangedError("invalid retained tmux request")
        expected_keys = {
            "operation", "generationId", "serverPid", "sessionId",
            "paneId", "panePid", "paneWidth", "paneHeight", "historyLimit",
        }
        if set(request) != expected_keys or request["operation"] != "agents-capture-v1":
            raise TerminalChangedError("invalid retained tmux request")
        generation_id = request["generationId"]
        self._require_open_generation(generation_id)
        if (
            not isinstance(request["sessionId"], str)
            or not re.fullmatch(r"\$[0-9]+", request["sessionId"])
            or not isinstance(request["paneId"], str)
            or not re.fullmatch(r"%[0-9]+", request["paneId"])
        ):
            raise TerminalChangedError("invalid retained tmux request")
        arguments = [
            "agents-capture-v1",
            "-g", generation_id,
            "-r", str(request["serverPid"]),
            "-s", request["sessionId"],
            "-p", str(request["panePid"]),
            "-x", str(request["paneWidth"]),
            "-y", str(request["paneHeight"]),
            "-H", str(request["historyLimit"]),
            "-t", request["paneId"],
        ]
        result = self._run(arguments)
        if result.returncode != 0 or result.stderr != b"":
            raise TerminalChangedError("agents-capture-v1 rejected")
        fields = result.stdout.split(b"\t")
        if len(fields) != 13 or not fields[-1].endswith(b"\n"):
            raise TerminalChangedError("invalid retained tmux record")
        fields[-1] = fields[-1][:-1]
        try:
            operation = fields[0].decode("ascii")
            version = self._numeric(fields[1].decode("ascii"), minimum=1)
            record_generation = fields[2].decode("ascii")
            server_pid = self._numeric(fields[3].decode("ascii"), minimum=2)
            session_id = fields[4].decode("ascii")
            pane_id = fields[5].decode("ascii")
            pane_pid = self._numeric(fields[6].decode("ascii"), minimum=2)
            pane_width = self._numeric(fields[7].decode("ascii"), minimum=1)
            pane_height = self._numeric(fields[8].decode("ascii"), minimum=1)
            history_limit = self._numeric(fields[9].decode("ascii"))
            history_size = self._numeric(fields[10].decode("ascii"))
            cursor_y = self._numeric(fields[11].decode("ascii"))
            capture_hex = fields[12].decode("ascii")
            capture = bytes.fromhex(capture_hex)
        except (UnicodeDecodeError, ValueError):
            raise TerminalChangedError("invalid retained tmux record") from None
        if (
            operation != "agents-capture-v1"
            or not re.fullmatch(r"[0-9a-f]{64}", record_generation)
            or not re.fullmatch(r"\$[0-9]+", session_id)
            or not re.fullmatch(r"%[0-9]+", pane_id)
            or len(capture) > 65536
        ):
            raise TerminalChangedError("invalid retained tmux record")
        return AgentsCaptureV1Record(
            version=version,
            generation_id=bytes.fromhex(record_generation),
            server_pid=server_pid,
            session_id=session_id,
            pane_id=pane_id,
            pane_pid=pane_pid,
            pane_width=pane_width,
            pane_height=pane_height,
            history_limit=history_limit,
            history_size=history_size,
            cursor_y=cursor_y,
            capture=capture,
        )

    def retire_owned(self, request: dict[str, Any]) -> dict[str, str]:
        if not isinstance(request, dict):
            raise TerminalChangedError("invalid retained tmux cleanup")
        generation_id = request.get("generationId")
        self._require_open_generation(generation_id)
        pane_id = request.get("paneId")
        session_id = request.get("sessionId")
        if (
            not isinstance(pane_id, str)
            or not re.fullmatch(r"%[0-9]+", pane_id)
            or not isinstance(session_id, str)
            or not re.fullmatch(r"\$[0-9]+", session_id)
        ):
            raise TerminalChangedError("invalid retained tmux cleanup")
        try:
            pane_result = self._run(["kill-pane", "-t", pane_id])
            expected_pane = f"can't find pane: {pane_id}".encode("ascii")
            if not (
                (pane_result.returncode == 0 and pane_result.stderr == b"")
                or (
                    pane_result.returncode == 1
                    and pane_result.stderr.rstrip(b"\n") == expected_pane
                )
            ):
                raise OSError(errno.EIO, "retained tmux cleanup failed")
            session_result = self._run(["kill-session", "-t", session_id])
            expected_session = (
                f"can't find session: {session_id}".encode("ascii")
            )
            if not (
                (
                    session_result.returncode == 0
                    and session_result.stderr == b""
                )
                or (
                    session_result.returncode == 1
                    and session_result.stderr.rstrip(b"\n")
                    == expected_session
                )
            ):
                raise OSError(errno.EIO, "retained tmux cleanup failed")
            return {"pane": "RETIRED", "session": "RETIRED"}
        finally:
            self.close()

    def retire_target(self, target: str) -> None:
        if not isinstance(target, str) or SAFE_TMUX_TARGET.fullmatch(target) is None:
            raise ValueError("invalid retained tmux target")
        result = self._run(["kill-session", "-t", target])
        if result.returncode != 0 and result.stderr.rstrip(b"\n") != (
            f"can't find session: {target}".encode("ascii")
        ):
            raise OSError(errno.EIO, "retained tmux cleanup failed")
        self.close()

    def read_identity(self, target: str) -> dict[str, Any]:
        result = self._run(build_tmux_identity_argv(target))
        if result.returncode != 0 or result.stderr != b"":
            raise TerminalChangedError("tmux relay identity changed")
        return parse_tmux_relay_identity(result.stdout)

    def read_history_limit(self, target: str) -> int:
        result = self._run(build_tmux_history_limit_argv(target))
        if result.returncode != 0 or result.stderr != b"":
            raise TerminalChangedError("tmux history limit changed")
        if not result.stdout.endswith(b"\n") or not result.stdout[:-1].isdigit():
            raise TerminalChangedError("tmux history limit changed")
        value = int(result.stdout[:-1])
        if value > 0x7FFFFFFFFFFFFFFF:
            raise TerminalChangedError("tmux history limit changed")
        return value

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._close()


@dataclass
class RelayRuntime:
    directory: str
    socket_path: str
    key_path: str
    listener: socket.socket
    closed: bool = False
    namespace_ledger: dict[str, str] | None = None

    def close(
        self,
        *,
        preserve_namespace: bool = False,
    ) -> dict[str, str]:
        if self.closed:
            return dict(self.namespace_ledger or {})
        self.closed = True
        self.listener.close()
        if preserve_namespace:
            self.namespace_ledger = {
                "relayKey": (
                    "PRESERVED"
                    if os.path.lexists(self.key_path)
                    else "RETIRED"
                ),
                "relaySocket": (
                    "PRESERVED"
                    if os.path.lexists(self.socket_path)
                    else "RETIRED"
                ),
                "runtimeDirectory": (
                    "PRESERVED"
                    if os.path.isdir(self.directory)
                    else "RETIRED"
                ),
            }
            return dict(self.namespace_ledger)
        for path in (self.key_path, self.socket_path):
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass
        try:
            os.rmdir(self.directory)
        except FileNotFoundError:
            pass
        self.namespace_ledger = {
            "relayKey": "RETIRED",
            "relaySocket": "RETIRED",
            "runtimeDirectory": "RETIRED",
        }
        return dict(self.namespace_ledger)


@dataclass
class AcceptedRelayBinding:
    candidate: socket.socket
    peer: dict[str, int]
    process_identity: dict[str, Any]
    tmux_identity: dict[str, Any]
    tmux_target: str
    on_revoke: Callable[[], None]
    generation: AcceptedGeneration
    tmux_connection: Any = None
    runtime: RelayRuntime | None = None
    revoked: bool = False
    cleaned: bool = False
    _revocation_deferred: bool = field(init=False, default=False)
    _revocation_pending: bool = field(init=False, default=False)
    _accepted_socket_identity: int = field(init=False)
    _relay_cleanup_name: str = field(init=False)
    _tmux_cleanup_name: str | None = field(init=False, default=None)

    def __post_init__(self) -> None:
        self._accepted_socket_identity = id(self.candidate)
        self._relay_cleanup_name = (
            f"relay-socket-{self._accepted_socket_identity}"
        )
        self.generation.seal_cleanup_target(
            self._relay_cleanup_name,
            self.candidate,
            close=self._close_relay_socket,
        )
        if self.tmux_connection is not None:
            self._tmux_cleanup_name = (
                f"tmux-owned-{id(self.tmux_connection)}"
            )
            self.generation.seal_cleanup_target(
                self._tmux_cleanup_name,
                self.tmux_connection,
                close=self._retire_owned_tmux,
            )

    @property
    def accepted_socket_identity(self) -> int:
        return self._accepted_socket_identity

    @staticmethod
    def _close_relay_socket(candidate: socket.socket) -> None:
        try:
            candidate.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass
        candidate.close()

    def _retire_owned_tmux(self, connection: Any) -> None:
        if not callable(getattr(connection, "retire_owned", None)):
            raise OSError(errno.ENOSYS, "retained tmux cleanup unavailable")
        result = connection.retire_owned({
            "generationId": self.generation.generation_id.hex(),
            "paneId": self.tmux_identity["paneId"],
            "sessionId": self.tmux_identity["sessionId"],
        })
        if (
            not isinstance(result, dict)
            or result.get("pane") != "RETIRED"
            or result.get("session") != "RETIRED"
        ):
            raise OSError(errno.EIO, "retained tmux cleanup failed")

    def revoke(self) -> None:
        if self.revoked:
            return
        self.revoked = True
        if self._revocation_deferred:
            self._revocation_pending = True
            return
        self.generation.revoke(self.generation.generation_id)
        self.on_revoke()

    def defer_revocation(self) -> None:
        if self.revoked or self._revocation_deferred:
            raise GenerationRevokedError(
                "accepted generation cannot defer revocation"
            )
        self._revocation_deferred = True

    def flush_deferred_revocation(self) -> None:
        if not self._revocation_deferred:
            return
        self._revocation_deferred = False
        if not self._revocation_pending:
            return
        self._revocation_pending = False
        self.generation.revoke(self.generation.generation_id)
        self.on_revoke()

    def cleanup(self) -> None:
        if self.cleaned:
            return
        if self.generation.state not in ("REVOKING", "REVOKED"):
            return
        self.cleaned = True
        self.generation.cleanup_target(
            self.generation.generation_id,
            self._relay_cleanup_name,
        )
        if self._tmux_cleanup_name is not None:
            self.generation.cleanup_target(
                self.generation.generation_id,
                self._tmux_cleanup_name,
            )
        if self.runtime is not None:
            self.runtime.close(preserve_namespace=True)


class TerminalUtf8Normalizer:
    def __init__(self) -> None:
        self._decoder = codecs.getincrementaldecoder("utf-8")("replace")
        self._finished = False

    def feed(self, payload: bytes, *, final: bool) -> bytes:
        if (
            self._finished
            or not isinstance(payload, bytes)
            or not isinstance(final, bool)
        ):
            raise ValueError("invalid terminal normalization input")
        text = self._decoder.decode(payload, final=final)
        if final:
            self._finished = True
        return text.encode("utf-8")


class RelayBrokerInputQueue:
    def __init__(self) -> None:
        self._binding: AcceptedRelayBinding | None = None
        self._queued: list[tuple[bytes, int, bytes]] = []

    @property
    def queued_bytes(self) -> bytes:
        return b"".join(entry[2] for entry in self._queued)

    def bind(self, value: Any) -> None:
        self._binding = (
            value
            if isinstance(value, AcceptedRelayBinding)
            and not value.revoked
            else None
        )

    def offer(
        self,
        binding_or_payload: Any,
        payload: bytes | None = None,
    ) -> bool:
        binding = (
            self._binding
            if payload is None
            else binding_or_payload
        )
        selected_payload = (
            binding_or_payload
            if payload is None
            else payload
        )
        if (
            binding is not self._binding
            or binding is None
            or binding.revoked
            or not isinstance(selected_payload, bytes)
        ):  # D007C_GUARD:operator_queue_accept
            return False
        self._queued.append((
            binding.generation.generation_id,
            binding.accepted_socket_identity,
            bytes(selected_payload),
        ))
        return True

    def take(
        self,
        binding: AcceptedRelayBinding | None = None,
    ) -> bytes:
        selected = binding or self._binding
        if selected is None or selected is not self._binding:
            return b""
        if any(
            not hmac.compare_digest(
                generation_id,
                selected.generation.generation_id,
            )
            or socket_identity != selected.accepted_socket_identity
            for generation_id, socket_identity, _payload in self._queued
        ):
            return b""
        payload = b"".join(entry[2] for entry in self._queued)
        self._queued.clear()
        return payload


def create_accepted_relay_binding(
    *,
    candidate: socket.socket,
    authentication: RelayAuthenticationResult,
    peer: dict[str, int] | None,
    process_identity: dict[str, Any] | None,
    tmux_identity: dict[str, Any] | None,
    tmux_target: str,
    on_revoke: Callable[[], None],
    generation: AcceptedGeneration | None = None,
    tmux_connection: Any = None,
    runtime: RelayRuntime | None = None,
) -> AcceptedRelayBinding:
    if (
        not isinstance(candidate, socket.socket)
        or authentication.accepted is not True
        or not _valid_relay_peer(peer)
        or not isinstance(process_identity, dict)
        or not isinstance(tmux_identity, dict)
        or set(tmux_identity) != {
            "serverPid",
            "sessionId",
            "paneId",
            "panePid",
            "paneWidth",
            "paneHeight",
        }
        or tmux_identity.get("panePid") != process_identity.get("pid")
        or not isinstance(tmux_target, str)
        or SAFE_TMUX_TARGET.fullmatch(tmux_target) is None
        or not callable(on_revoke)
    ):
        raise TerminalChangedError("relay binding is unavailable")
    validate_tmux_dimensions(
        tmux_identity["paneWidth"],
        tmux_identity["paneHeight"],
        TMUX_HISTORY_LINES,
    )
    auto_activate = generation is None
    selected_generation = generation or AcceptedGeneration(os.urandom(32))
    binding = AcceptedRelayBinding(
        candidate=candidate,
        peer=dict(peer),
        process_identity=dict(process_identity),
        tmux_identity=dict(tmux_identity),
        tmux_target=tmux_target,
        on_revoke=on_revoke,
        generation=selected_generation,
        tmux_connection=tmux_connection,
        runtime=runtime,
    )
    if auto_activate:
        selected_generation.activate(
            selected_generation.generation_id,
            lambda: None,
        )
    return binding


def revalidate_accepted_relay_binding(
    binding: AcceptedRelayBinding,
    *,
    peer_reader: Callable[[socket.socket], dict[str, int] | None],
    process_reader: Callable[[int], dict[str, Any] | None],
    tmux_identity_reader: Callable[[str], dict[str, Any] | None],
    history_limit_reader: Callable[[str], int | None],
) -> None:
    try:
        if binding.revoked:  # D007C_T2_GUARD:bound_active
            raise TerminalChangedError("relay binding changed")
        current_peer = peer_reader(binding.candidate)
        if (
            not _valid_relay_peer(current_peer)
            or current_peer != binding.peer
        ):  # D007C_T2_GUARD:bound_peer
            raise TerminalChangedError("relay binding changed")
        current_process = process_reader(
            binding.process_identity["pid"],
        )
        if not _same_session_process_identity(
            binding.process_identity,
            current_process,
        ):  # D007C_T2_GUARD:bound_process
            raise TerminalChangedError("relay binding changed")
        current_tmux = tmux_identity_reader(binding.tmux_target)
        if (
            not isinstance(current_tmux, dict)
            or current_tmux != binding.tmux_identity
        ):  # D007C_T2_GUARD:bound_tmux
            raise TerminalChangedError("tmux relay identity changed")
        if (
            history_limit_reader(binding.tmux_target)
            != TMUX_HISTORY_LINES
        ):  # D007C_T2_GUARD:bound_history
            raise TerminalChangedError("terminal dimensions changed")
    except BaseException:
        binding.revoke()
        raise


def offer_bound_relay_input(
    binding: AcceptedRelayBinding,
    queue: RelayBrokerInputQueue,
    payload: bytes,
    *,
    peer_reader: Callable[[socket.socket], dict[str, int] | None],
    process_reader: Callable[[int], dict[str, Any] | None],
    tmux_identity_reader: Callable[[str], dict[str, Any] | None],
    history_limit_reader: Callable[[str], int | None],
) -> None:
    revalidate_accepted_relay_binding(
        binding,
        peer_reader=peer_reader,
        process_reader=process_reader,
        tmux_identity_reader=tmux_identity_reader,
        history_limit_reader=history_limit_reader,
    )
    offer_retained_relay_input(
        binding,
        queue,
        payload,
    )  # D007C_T2_GUARD:bound_queue_offer


def derive_relay_key(
    lease_key: bytes,
    binding_digest: bytes,
    lease_digest: bytes,
    terminal_nonce_digest: bytes,
) -> bytes:
    return hmac.new(
        lease_key,
        b"".join(
            (
                SESSION_PORT_RELAY_KEY_DOMAIN,
                binding_digest,
                lease_digest,
                terminal_nonce_digest,
            )
        ),
        hashlib.sha256,
    ).digest()


def _relay_rejection(
    reject_id: int,
    public_code: str,
    on_reject: Callable[[], None],
) -> RelayAuthenticationResult:
    on_reject()
    return RelayAuthenticationResult(
        accepted=False,
        reject_id=reject_id,
        public_code=public_code,
        revoke=True,
    )


def _valid_relay_peer(peer: Any) -> bool:
    return bool(
        isinstance(peer, dict)
        and set(peer) == {"pid", "uid", "gid"}
        and all(
            isinstance(peer[field], int)
            and not isinstance(peer[field], bool)
            for field in ("pid", "uid", "gid")
        )
        and peer["pid"] > 1
        and peer["uid"] >= 0
        and peer["gid"] >= 0
    )


def validate_relay_candidate(
    *,
    peer: dict[str, int] | None,
    expected_uid: int,
    expected_gid: int,
    expected_identity: dict[str, Any],
    live_identity: dict[str, Any] | None,
    proof_frame: bytes,
    relay_key: bytes,
    challenge: bytes,
    elapsed_ms: int,
    state: RelayAuthenticationState,
    compare_digest: Callable[[bytes, bytes], bool] = hmac.compare_digest,
    on_reject: Callable[[], None] = lambda: None,
) -> RelayAuthenticationResult:
    if state.accepted:  # D007C_GUARD:relay_duplicate
        return _relay_rejection(
            0x0007,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if challenge in state.used_challenges:  # D007C_GUARD:relay_replay
        return _relay_rejection(
            0x0007,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    state.used_challenges.add(challenge)
    if not _valid_relay_peer(peer):  # D007C_GUARD:relay_peer_shape
        return _relay_rejection(
            0x0002,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if peer["uid"] != expected_uid:  # D007C_GUARD:relay_peer_uid
        return _relay_rejection(
            0x0003,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if peer["gid"] != expected_gid:  # D007C_GUARD:relay_peer_gid
        return _relay_rejection(
            0x0003,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if peer["pid"] != expected_identity["pid"]:  # D007C_GUARD:relay_peer_pid
        return _relay_rejection(
            0x0004,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if not _same_session_process_identity(
        expected_identity,
        live_identity,
    ):  # D007C_GUARD:relay_live_identity
        return _relay_rejection(
            0x0005,
            "SESSION_PORT_TERMINAL_CHANGED",
            on_reject,
        )
    if elapsed_ms >= ASR1_HANDSHAKE_TIMEOUT_MS:  # D007C_GUARD:relay_timeout
        return _relay_rejection(
            0x0008,
            "SESSION_PORT_TERMINAL_CLOSED",
            on_reject,
        )
    if len(proof_frame) != ASR1_HEADER_BYTES + ASR1_PROOF_BYTES:  # D007C_GUARD:proof_size
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if proof_frame[:4] != ASR1_MAGIC:  # D007C_GUARD:proof_magic
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if proof_frame[4] != ASR1_VERSION:  # D007C_GUARD:proof_version
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if proof_frame[5] != 0x02:  # D007C_GUARD:proof_type
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if proof_frame[6:8] != b"\0\0":  # D007C_GUARD:proof_reserved
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    if int.from_bytes(proof_frame[8:12], "big") != ASR1_PROOF_BYTES:  # D007C_GUARD:proof_payload_size
        return _relay_rejection(
            0x0001,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    proof_pid = int.from_bytes(proof_frame[12:20], "big")
    if (
        (proof_pid, proof_pid)
        != (peer["pid"], expected_identity["pid"])
    ):  # D007C_GUARD:proof_pid
        return _relay_rejection(
            0x0006,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    expected_proof = hmac.new(
        relay_key,
        b"".join(
            (
                SESSION_PORT_RELAY_PROOF_DOMAIN,
                challenge,
                proof_pid.to_bytes(8, "big"),
            )
        ),
        hashlib.sha256,
    ).digest()
    if not compare_digest(
        expected_proof,
        proof_frame[20:52],
    ):  # D007C_GUARD:proof_digest
        return _relay_rejection(
            0x0006,
            "SESSION_PORT_UNAUTHORIZED",
            on_reject,
        )
    state.accepted = True
    return RelayAuthenticationResult(
        accepted=True,
        reject_id=None,
        public_code=None,
        revoke=False,
    )


def read_relay_peer_evidence(
    candidate: socket.socket,
    *,
    platform: str | None = None,
    dependencies: dict[str, Callable[..., Any]] | None = None,
) -> dict[str, int] | None:
    selected = platform or (
        "linux" if sys.platform.startswith("linux") else sys.platform
    )
    try:
        if selected == "linux":
            if dependencies is not None:
                reader = dependencies.get("getsockopt_peercred")
                if not callable(reader):
                    return None
                value = reader(candidate)
                return value if _valid_relay_peer(value) else None
            size = struct.calcsize("3i")
            payload = candidate.getsockopt(
                socket.SOL_SOCKET,
                socket.SO_PEERCRED,
                size,
            )
            if len(payload) != size:
                return None
            pid, uid, gid = struct.unpack("3i", payload)
            value = {"pid": pid, "uid": uid, "gid": gid}
            return value if _valid_relay_peer(value) else None
        if selected == "darwin":
            if dependencies is not None:
                identity_reader = dependencies.get("getpeereid")
                pid_reader = dependencies.get("get_local_peerpid")
                if not callable(identity_reader) or not callable(pid_reader):
                    return None
                identity = identity_reader(candidate)
                pid = pid_reader(candidate)
            else:
                libc = ctypes.CDLL(None, use_errno=True)
                uid = ctypes.c_uint()
                gid = ctypes.c_uint()
                result = libc.getpeereid(
                    ctypes.c_int(candidate.fileno()),
                    ctypes.byref(uid),
                    ctypes.byref(gid),
                )
                if result != 0:
                    return None
                identity = (int(uid.value), int(gid.value))
                level = getattr(socket, "SOL_LOCAL", 0)
                payload = candidate.getsockopt(level, 0x002, 4)
                if len(payload) != 4:
                    return None
                pid = struct.unpack("i", payload)[0]
            if (
                not isinstance(identity, tuple)
                or len(identity) != 2
            ):
                return None
            value = {
                "pid": pid,
                "uid": identity[0],
                "gid": identity[1],
            }
            return value if _valid_relay_peer(value) else None
    except (AttributeError, OSError, TypeError, ValueError, struct.error):
        return None
    return None


def _encode_asr1_frame(message_type: int, payload: bytes) -> bytes:
    return b"".join(
        (
            ASR1_MAGIC,
            bytes((ASR1_VERSION, message_type)),
            b"\0\0",
            len(payload).to_bytes(4, "big"),
            payload,
        )
    )


def _receive_exact_socket(
    candidate: socket.socket,
    size: int,
) -> bytes:
    payload = bytearray()
    while len(payload) < size:
        chunk = candidate.recv(size - len(payload))
        if not chunk:
            raise ConnectionError("relay connection closed")
        payload.extend(chunk)
    return bytes(payload)


def _receive_asr1_frame(candidate: socket.socket) -> tuple[int, bytes]:
    header = _receive_exact_socket(candidate, ASR1_HEADER_BYTES)
    if (
        header[:4] != ASR1_MAGIC
        or header[4] != ASR1_VERSION
        or header[6:8] != b"\0\0"
    ):
        raise ValueError("invalid ASR1 frame")
    payload_size = int.from_bytes(header[8:12], "big")
    if payload_size > ASR1_PROOF_BYTES:
        raise ValueError("invalid ASR1 frame")
    return header[5], _receive_exact_socket(candidate, payload_size)


def authenticate_relay_socket(
    candidate: socket.socket,
    *,
    expected_identity: dict[str, Any],
    relay_key: bytes,
    state: RelayAuthenticationState,
    challenge: bytes | None = None,
    before_accept: Callable[[], None] | None = None,
    on_reject: Callable[[], None] = lambda: None,
) -> RelayAuthenticationResult:
    started = time.monotonic()
    candidate.settimeout(ASR1_HANDSHAKE_TIMEOUT_MS / 1000)
    peer = read_relay_peer_evidence(candidate)
    selected_challenge = challenge or os.urandom(ASR1_CHALLENGE_BYTES)
    proof_frame = b""
    timed_out = False
    if peer is not None:
        candidate.sendall(_encode_asr1_frame(0x01, selected_challenge))
        try:
            message_type, proof_payload = _receive_asr1_frame(candidate)
            proof_frame = _encode_asr1_frame(message_type, proof_payload)
        except socket.timeout:
            timed_out = True
        except (ConnectionError, OSError, ValueError):
            proof_frame = b""
    live_identity = read_session_process_identity(
        expected_identity["pid"],
    )
    elapsed_ms = int((time.monotonic() - started) * 1000)
    if timed_out:
        elapsed_ms = ASR1_HANDSHAKE_TIMEOUT_MS
    result = validate_relay_candidate(
        peer=peer,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        expected_identity=expected_identity,
        live_identity=live_identity,
        proof_frame=proof_frame,
        relay_key=relay_key,
        challenge=selected_challenge,
        elapsed_ms=elapsed_ms,
        state=state,
        on_reject=on_reject,
    )
    if result.accepted:
        if before_accept is not None:
            before_accept()
        candidate.sendall(_encode_asr1_frame(0x03, b""))
    else:
        try:
            candidate.sendall(_encode_asr1_frame(
                0x7F,
                int(result.reject_id).to_bytes(2, "big"),
            ))
        except OSError:
            pass
    return result


def load_relay_key(
    key_path: str,
    *,
    expected_uid: int | None = None,
) -> bytes:
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW  # D007C_GUARD:key_nofollow
    try:
        fd = os.open(key_path, flags)
    except OSError as error:
        raise RelayKeyError("relay key unavailable") from error
    try:
        metadata = os.fstat(fd)
        if not stat.S_ISREG(metadata.st_mode):  # D007C_GUARD:key_regular
            raise RelayKeyError("relay key unavailable")
        owner = os.geteuid() if expected_uid is None else expected_uid
        if metadata.st_uid != owner:  # D007C_GUARD:key_owner
            raise RelayKeyError("relay key unavailable")
        if stat.S_IMODE(metadata.st_mode) != 0o400:  # D007C_GUARD:key_mode
            raise RelayKeyError("relay key unavailable")
        if metadata.st_size != 32:  # D007C_GUARD:key_size
            raise RelayKeyError("relay key unavailable")
        value = os.read(fd, 33)
        if len(value) != 32:  # D007C_GUARD:key_read_size
            raise RelayKeyError("relay key unavailable")
    finally:
        os.close(fd)
    try:
        os.unlink(key_path)
    except OSError as error:
        raise RelayKeyError("relay key unavailable") from error
    return value


def create_relay_runtime(
    base_directory: str,
    relay_key: bytes,
) -> RelayRuntime:
    directory = tempfile.mkdtemp(
        prefix="session-port-relay-",
        dir=base_directory,
    )
    os.chmod(directory, 0o700)
    socket_path = os.path.join(directory, "relay.sock")
    key_path = os.path.join(directory, "relay.key")
    listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        listener.bind(socket_path)
        os.chmod(socket_path, 0o600)
        listener.listen(1)
        listener.settimeout(ASR1_HANDSHAKE_TIMEOUT_MS / 1000)
        flags = (
            os.O_CREAT
            | os.O_EXCL
            | os.O_WRONLY
            | os.O_CLOEXEC
            | os.O_NOFOLLOW
        )
        key_fd = os.open(key_path, flags, 0o400)
        try:
            os.fchmod(key_fd, 0o400)
            if not _safe_write(key_fd, relay_key):
                raise OSError(errno.EIO, "relay key write failed")
        finally:
            os.close(key_fd)
        return RelayRuntime(
            directory=directory,
            socket_path=socket_path,
            key_path=key_path,
            listener=listener,
        )
    except BaseException:
        listener.close()
        for path in (key_path, socket_path):
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass
        try:
            os.rmdir(directory)
        except FileNotFoundError:
            pass
        raise


def _encode_relay_data_frame(
    message_type: int,
    payload: bytes,
) -> bytes:
    if len(payload) > RELAY_DATA_MAX_PAYLOAD_BYTES:  # D007C_GUARD:relay_data_send_cap
        raise ValueError("relay data frame is too large")
    return b"".join(
        (
            RELAY_DATA_MAGIC,
            bytes((RELAY_DATA_VERSION, message_type)),
            b"\0\0",
            len(payload).to_bytes(4, "big"),
            payload,
        )
    )


def _send_relay_data_frame(
    candidate: socket.socket,
    message_type: int,
    payload: bytes,
) -> None:
    candidate.sendall(_encode_relay_data_frame(message_type, payload))


def send_relay_data_frame(
    candidate: socket.socket,
    message_type: int,
    payload: bytes,
) -> None:
    _send_relay_data_frame(candidate, message_type, payload)


def send_bound_relay_data(
    binding: AcceptedRelayBinding,
    message_type: int,
    payload: bytes,
) -> None:
    if not isinstance(binding, AcceptedRelayBinding):
        raise ValueError("invalid retained relay binding")
    frame = _encode_relay_data_frame(message_type, payload)
    offset = 0
    try:
        while offset < len(frame):
            view = memoryview(frame)[offset:]
            written = binding.generation.workload(
                binding.generation.generation_id,
                lambda: binding.candidate.send(view),
            )
            if (
                not isinstance(written, int)
                or isinstance(written, bool)
                or written <= 0
                or written > len(view)
            ):
                raise ConnectionError("retained relay write failed")
            offset += written
    except GenerationRevokedError:
        raise
    except BaseException:
        binding.revoke()
        raise


def receive_relay_data_frame(
    candidate: socket.socket,
    *,
    timeout: float | None = None,
) -> tuple[int, bytes]:
    if timeout is not None:
        candidate.settimeout(timeout)
    header = _receive_exact_socket(candidate, RELAY_DATA_HEADER_BYTES)
    if (
        header[:4] != RELAY_DATA_MAGIC
        or header[4] != RELAY_DATA_VERSION
        or header[6:8] != b"\0\0"
    ):  # D007C_GUARD:relay_data_header
        raise ValueError("invalid relay data frame")
    payload_size = int.from_bytes(header[8:12], "big")
    if payload_size > RELAY_DATA_MAX_PAYLOAD_BYTES:  # D007C_GUARD:relay_data_receive_cap
        raise ValueError("invalid relay data frame")
    return header[5], _receive_exact_socket(candidate, payload_size)


def _receive_exact_bound_relay(
    binding: AcceptedRelayBinding,
    size: int,
) -> bytes:
    payload = bytearray()
    while len(payload) < size:
        chunk = binding.generation.workload(
            binding.generation.generation_id,
            lambda: binding.candidate.recv(size - len(payload)),
        )
        if not chunk:
            raise ConnectionError("retained relay connection closed")
        payload.extend(chunk)
    return bytes(payload)


def receive_bound_relay_data(
    binding: AcceptedRelayBinding,
    *,
    timeout: float | None = None,
) -> tuple[int, bytes]:
    if not isinstance(binding, AcceptedRelayBinding):
        raise ValueError("invalid retained relay binding")
    try:
        if timeout is not None:
            binding.generation.workload(
                binding.generation.generation_id,
                lambda: binding.candidate.settimeout(timeout),
            )
        header = _receive_exact_bound_relay(
            binding,
            RELAY_DATA_HEADER_BYTES,
        )
        if (
            header[:4] != RELAY_DATA_MAGIC
            or header[4] != RELAY_DATA_VERSION
            or header[6:8] != b"\0\0"
        ):
            raise ValueError("invalid retained relay data frame")
        payload_size = int.from_bytes(header[8:12], "big")
        if payload_size > RELAY_DATA_MAX_PAYLOAD_BYTES:
            raise ValueError("invalid retained relay data frame")
        return (
            header[5],
            _receive_exact_bound_relay(binding, payload_size),
        )
    except GenerationRevokedError:
        raise
    except BaseException:
        binding.revoke()
        raise


def offer_retained_relay_input(
    binding: AcceptedRelayBinding,
    queue: RelayBrokerInputQueue,
    payload: bytes,
) -> None:
    if (
        not isinstance(binding, AcceptedRelayBinding)
        or not isinstance(queue, RelayBrokerInputQueue)
        or not isinstance(payload, bytes)
    ):
        raise ValueError("invalid retained relay input")
    accepted = binding.generation.workload(
        binding.generation.generation_id,
        lambda: queue.offer(binding, payload),
    )
    if not accepted:
        binding.revoke()
        raise TerminalChangedError("retained relay input changed")


def receive_bound_relay_barrier(
    binding: AcceptedRelayBinding,
    token: bytes,
    *,
    accept_input: Callable[[bytes], None],
) -> None:
    try:
        while True:
            message_type, payload = receive_bound_relay_data(
                binding,
                timeout=ASR1_HANDSHAKE_TIMEOUT_MS / 1000,
            )
            if message_type == RELAY_DATA_INPUT:
                accept_input(payload)
                continue
            if (
                message_type == RELAY_DATA_FLUSHED
                and payload == token
            ):  # D007C_T2_GUARD:barrier_token
                return
            raise SnapshotValidationError("tmux barrier failed")
    except BaseException:
        binding.revoke()
        raise


def _run_session_port_relay(socket_path: str, key_path: str) -> int:
    relay_key = bytearray(load_relay_key(key_path))
    candidate = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        candidate.connect(socket_path)
        candidate.settimeout(ASR1_HANDSHAKE_TIMEOUT_MS / 1000)
        message_type, challenge = _receive_asr1_frame(candidate)
        if message_type != 0x01 or len(challenge) != ASR1_CHALLENGE_BYTES:
            return 76
        pid_bytes = os.getpid().to_bytes(8, "big")
        proof = hmac.new(
            relay_key,
            b"".join(
                (
                    SESSION_PORT_RELAY_PROOF_DOMAIN,
                    challenge,
                    pid_bytes,
                )
            ),
            hashlib.sha256,
        ).digest()
        candidate.sendall(_encode_asr1_frame(
            0x02,
            pid_bytes + proof,
        ))
        message_type, payload = _receive_asr1_frame(candidate)
        if message_type == 0x7F and len(payload) == 2:
            return 77
        if message_type != 0x03 or payload:
            return 76

        candidate.settimeout(None)
        os.set_blocking(0, False)
        stdin_open = True
        while True:
            readers: list[Any] = [candidate]
            if stdin_open:
                readers.append(0)
            try:
                readable, _, _ = select.select(readers, [], [], POLL_SECONDS)
            except InterruptedError:
                continue
            if candidate in readable:
                message_type, payload = receive_relay_data_frame(candidate)
                if message_type == RELAY_DATA_OUTPUT:
                    if not _safe_write(1, payload):
                        return 76
                elif message_type == RELAY_DATA_BARRIER:
                    _send_relay_data_frame(
                        candidate,
                        RELAY_DATA_FLUSHED,
                        payload,
                    )
                elif message_type == RELAY_DATA_CLOSE:
                    return 0
                else:
                    return 76
            if stdin_open and 0 in readable:
                try:
                    operator_input = os.read(
                        0,
                        RELAY_DATA_MAX_PAYLOAD_BYTES,
                    )
                except BlockingIOError:
                    continue
                if not operator_input:
                    stdin_open = False
                    continue
                _send_relay_data_frame(
                    candidate,
                    RELAY_DATA_INPUT,
                    operator_input,
                )
    except (ConnectionError, OSError, RelayKeyError, ValueError):
        return 76
    finally:
        relay_key[:] = b"\0" * len(relay_key)
        candidate.close()


def build_tmux_capture_argv(tmux_target: str) -> list[str]:
    return [
        "capture-pane",
        "-p",
        "-N",
        "-T",
        "-t",
        tmux_target,
        "-S",
        "-400",
    ]


def _quote_tmux_control_word(value: str) -> str:
    if not isinstance(value, str) or "\x00" in value or "\n" in value:
        raise ValueError("invalid tmux control word")
    return "'" + value.replace("'", "'\\''") + "'"


class _TmuxControlTransport:
    """Bounded control-mode transport; it never reconnects or resolves names."""

    def __init__(self, argv: list[str], env: dict[str, str]) -> None:
        self.process = subprocess.Popen(
            argv,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            close_fds=True,
        )
        assert self.process.stdin is not None
        assert self.process.stdout is not None
        assert self.process.stderr is not None
        self._stdin = self.process.stdin
        self._stdout = self.process.stdout
        self._stderr = self.process.stderr
        os.set_blocking(self._stdout.fileno(), False)
        os.set_blocking(self._stderr.fileno(), False)
        self._buffer = bytearray()
        self._stderr_buffer = bytearray()
        self._command_number = 0
        self._read_block()

    def _read_available(self) -> None:
        for stream, destination in (
            (self._stdout, self._buffer),
            (self._stderr, self._stderr_buffer),
        ):
            while True:
                try:
                    chunk = os.read(stream.fileno(), 65536)
                except BlockingIOError:
                    break
                if not chunk:
                    break
                destination.extend(chunk)
                if len(destination) > 2 * 1024 * 1024:
                    raise TerminalChangedError("tmux control response too large")

    def _read_line(self, deadline: float) -> bytes:
        while True:
            newline = self._buffer.find(b"\n")
            if newline >= 0:
                line = bytes(self._buffer[:newline + 1])
                del self._buffer[:newline + 1]
                return line
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("tmux control response timeout")
            readable, _, _ = select.select(
                [self._stdout, self._stderr],
                [],
                [],
                remaining,
            )
            if not readable:
                raise TimeoutError("tmux control response timeout")
            self._read_available()
            if self.process.poll() is not None and not self._buffer:
                raise TerminalChangedError("tmux control connection closed")

    def _read_block(self) -> tuple[bytes, bytes]:
        deadline = time.monotonic() + ASR1_HANDSHAKE_TIMEOUT_MS / 1000
        body = bytearray()
        started = False
        failed = False
        while True:
            line = self._read_line(deadline)
            if line.startswith(b"%begin "):
                started = True
                body.clear()
                failed = False
                continue
            if line.startswith(b"%end ") or line.startswith(b"%error "):
                if not started:
                    continue
                failed = line.startswith(b"%error ")
                stderr = (
                    bytes(body)
                    if failed
                    else bytes(self._stderr_buffer)
                )
                self._stderr_buffer.clear()
                return (bytes(body), stderr if failed else b"")
            if started:
                body.extend(line)

    def command(self, arguments: list[str]) -> subprocess.CompletedProcess[bytes]:
        if self.process.poll() is not None:
            raise TerminalChangedError("tmux control connection closed")
        command = " ".join(_quote_tmux_control_word(value) for value in arguments)
        try:
            self._stdin.write((command + "\n").encode("utf-8"))
            self._stdin.flush()
        except (BrokenPipeError, OSError) as error:
            raise TerminalChangedError("tmux control connection closed") from error
        self._command_number += 1
        stdout, stderr = self._read_block()
        return subprocess.CompletedProcess(
            args=arguments,
            returncode=1 if stderr else 0,
            stdout=stdout,
            stderr=stderr,
        )

    def close(self) -> None:
        if self.process.stdin is not None:
            try:
                self.process.stdin.close()
            except OSError:
                pass
        try:
            self.process.wait(timeout=ASR1_HANDSHAKE_TIMEOUT_MS / 1000)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try:
                self.process.wait(timeout=ASR1_HANDSHAKE_TIMEOUT_MS / 1000)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=ASR1_HANDSHAKE_TIMEOUT_MS / 1000)


def _open_retained_tmux_connection(
    *,
    target: str,
    cwd: str,
    relay_argv: list[str],
    generation_id: bytes,
) -> tuple[RetainedTmuxConnection, dict[str, Any]]:
    generation_hex = generation_id.hex()
    environment = os.environ.copy()
    environment["AGENTS_TMUX_GENERATION_ID"] = generation_hex
    socket_name = environment.get("AGENTS_TMUX_SOCKET_NAME")
    socket_args: list[str] = []
    if socket_name is not None:
        if SAFE_TMUX_SOCKET_NAME.fullmatch(socket_name) is None:
            raise ValueError("invalid retained tmux socket name")
        socket_args = ["-L", socket_name]
    transport = _TmuxControlTransport(
        [
            "tmux", *socket_args, "-C", "new-session", "-s", target,
            "-x", str(SESSION_PORT_COLUMNS), "-y", str(SESSION_PORT_ROWS),
            "-c", cwd, *relay_argv,
        ],
        environment,
    )
    connection = RetainedTmuxConnection(
        generation_id,
        command=transport.command,
        close=transport.close,
    )
    try:
        version_result = transport.command(["display-message", "-p", "#{version}"])
        if version_result.returncode != 0 or version_result.stderr != b"":
            raise TerminalChangedError("tmux custom runtime handshake failed")
        reported_version = version_result.stdout.strip().decode("ascii", "strict")
        if reported_version != "3.6a-agents.3":
            raise TerminalChangedError("tmux custom runtime version mismatch")
        commands_result = transport.command(["list-commands"])
        if (commands_result.returncode != 0
                or b"agents-capture-v1" not in commands_result.stdout):
            raise TerminalChangedError("tmux custom protocol unavailable")
        for arguments in (
            ["refresh-client", "-f", "no-detach-on-destroy"],
            ["set-option", "-t", target, "history-limit", "400"],
            ["set-window-option", "-t", target, "window-size", "manual"],
            ["set-window-option", "-t", target, "aggressive-resize", "off"],
        ):
            result = transport.command(arguments)
            if result.returncode != 0 or result.stderr != b"":
                raise TerminalChangedError("tmux relay launch failed")
        identity = connection.read_identity(target)
        return connection, identity
    except BaseException:
        connection.close()
        raise


def build_tmux_metadata_argv(tmux_target: str) -> list[str]:
    return [
        "display-message",
        "-p",
        "-t",
        tmux_target,
        TMUX_METADATA_FORMAT,
    ]


def build_tmux_identity_argv(tmux_target: str) -> list[str]:
    return [
        "display-message",
        "-p",
        "-t",
        tmux_target,
        TMUX_IDENTITY_FORMAT,
    ]


def build_tmux_history_limit_argv(tmux_target: str) -> list[str]:
    return [
        "show-options",
        "-v",
        "-t",
        tmux_target,
        "history-limit",
    ]


def build_tmux_relay_commands(
    *,
    target: str,
    cwd: str,
    relay_argv: list[str],
) -> list[list[str]]:
    return [
        [
            "new-session",
            "-d",
            "-s",
            target,
            "-x",
            str(SESSION_PORT_COLUMNS),
            "-y",
            str(SESSION_PORT_ROWS),
            "-c",
            cwd,
            *relay_argv,
        ],
        ["set-option", "-t", target, "history-limit", "400"],
        [
            "set-window-option",
            "-t",
            target,
            "window-size",
            "manual",
        ],
        [
            "set-window-option",
            "-t",
            target,
            "aggressive-resize",
            "off",
        ],
        build_tmux_identity_argv(target),
    ]


def parse_tmux_relay_identity(payload: bytes) -> dict[str, Any]:
    if (
        not isinstance(payload, bytes)
        or not payload.endswith(b"\n")
        or payload[:-1].count(b"\t") != 5
    ):  # D007C_GUARD:tmux_identity_shape
        raise TerminalChangedError("tmux relay identity changed")
    fields = payload[:-1].split(b"\t")
    try:
        server_pid = int(fields[0])
        session_id = fields[1].decode("ascii")
        pane_id = fields[2].decode("ascii")
        pane_pid = int(fields[3])
        pane_width = int(fields[4])
        pane_height = int(fields[5])
    except (UnicodeDecodeError, ValueError) as error:
        raise TerminalChangedError(
            "tmux relay identity changed"
        ) from error
    if (
        not fields[0].isdigit()
        or not fields[3].isdigit()
        or not fields[4].isdigit()
        or not fields[5].isdigit()
        or server_pid <= 1
        or pane_pid <= 1
        or server_pid > 0x7FFFFFFFFFFFFFFF
        or pane_pid > 0x7FFFFFFFFFFFFFFF
        or not session_id.startswith("$")
        or not session_id[1:].isdigit()
        or not pane_id.startswith("%")
        or not pane_id[1:].isdigit()
    ):  # D007C_GUARD:tmux_identity_values
        raise TerminalChangedError("tmux relay identity changed")
    validate_tmux_dimensions(
        pane_width,
        pane_height,
        TMUX_HISTORY_LINES,
    )
    return {
        "serverPid": server_pid,
        "sessionId": session_id,
        "paneId": pane_id,
        "panePid": pane_pid,
        "paneWidth": pane_width,
        "paneHeight": pane_height,
    }


def launch_tmux_relay(
    *,
    target: str,
    cwd: str,
    relay_argv: list[str],
    runner: Callable[[list[str]], Any],
) -> dict[str, Any]:
    commands = build_tmux_relay_commands(
        target=target,
        cwd=cwd,
        relay_argv=relay_argv,
    )
    try:
        identity_payload: bytes | None = None
        for arguments in commands:
            result = runner(arguments)
            if result.returncode != 0:  # D007C_GUARD:tmux_launch_exit
                raise TerminalChangedError("tmux relay launch failed")
            if result.stderr != b"":  # D007C_GUARD:tmux_launch_stderr
                raise TerminalChangedError("tmux relay launch failed")
            if arguments[0] == "display-message":
                identity_payload = result.stdout
        if identity_payload is None:
            raise TerminalChangedError("tmux relay identity changed")
        return parse_tmux_relay_identity(identity_payload)
    except BaseException as error:
        try:
            runner(["kill-session", "-t", target])
        except BaseException:
            pass
        if isinstance(error, TerminalChangedError):
            raise
        raise TerminalChangedError("tmux relay launch failed") from error


def read_tmux_relay_identity(
    tmux_target: str,
    runner: Callable[[list[str]], Any],
) -> dict[str, Any]:
    result = runner(build_tmux_identity_argv(tmux_target))
    if (
        result.returncode != 0
        or result.stderr != b""
    ):
        raise TerminalChangedError("tmux relay identity changed")
    return parse_tmux_relay_identity(result.stdout)


def read_tmux_history_limit(
    tmux_target: str,
    runner: Callable[[list[str]], Any],
) -> int:
    result = runner(build_tmux_history_limit_argv(tmux_target))
    if (
        result.returncode != 0
        or result.stderr != b""
        or not isinstance(result.stdout, bytes)
        or not result.stdout.endswith(b"\n")
        or not result.stdout[:-1].isdigit()
    ):
        raise TerminalChangedError("tmux history limit changed")
    value = int(result.stdout[:-1])
    if value > 0x7FFFFFFFFFFFFFFF:
        raise TerminalChangedError("tmux history limit changed")
    return value


def _binding_tmux_identity_reader(
    binding: AcceptedRelayBinding,
    target: str,
) -> dict[str, Any]:
    connection = binding.tmux_connection
    if not isinstance(connection, RetainedTmuxConnection):
        raise TerminalChangedError("retained tmux connection unavailable")
    return connection.read_identity(target)


def _binding_tmux_history_reader(
    binding: AcceptedRelayBinding,
    target: str,
) -> int:
    connection = binding.tmux_connection
    if not isinstance(connection, RetainedTmuxConnection):
        raise TerminalChangedError("retained tmux connection unavailable")
    return connection.read_history_limit(target)


def remove_owned_tmux_socket(
    socket_name: str,
    socket_path: str,
) -> None:
    if (
        not isinstance(socket_name, str)
        or SAFE_TMUX_SOCKET_NAME.fullmatch(socket_name) is None
        or os.path.basename(socket_path) != socket_name
        or not os.path.isabs(socket_path)
    ):  # D007C_T2_GUARD:owned_socket_path
        raise ValueError("tmux socket ownership is invalid")
    try:
        metadata = os.lstat(socket_path)
    except FileNotFoundError:
        return
    if (
        not stat.S_ISSOCK(metadata.st_mode)
        or metadata.st_uid != os.geteuid()
    ):  # D007C_T2_GUARD:owned_socket_identity
        raise ValueError("tmux socket ownership is invalid")
    deadline = time.monotonic() + ASR1_HANDSHAKE_TIMEOUT_MS / 1000
    connected = True
    while connected and time.monotonic() < deadline:
        probe = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        try:
            connected = probe.connect_ex(socket_path) == 0
        finally:
            probe.close()
        if connected:
            time.sleep(0.01)
    if connected:  # D007C_T2_GUARD:owned_socket_serverless
        raise ValueError("tmux socket server is still running")
    os.unlink(socket_path)


def validate_tmux_dimensions(
    columns: int,
    rows: int,
    history_lines: int,
) -> None:
    if columns != SESSION_PORT_COLUMNS:  # D007C_GUARD:tmux_columns
        raise TerminalChangedError("terminal dimensions changed")
    if rows != SESSION_PORT_ROWS:  # D007C_GUARD:tmux_rows
        raise TerminalChangedError("terminal dimensions changed")
    if history_lines != TMUX_HISTORY_LINES:  # D007C_GUARD:tmux_history
        raise TerminalChangedError("terminal dimensions changed")


def _parse_tmux_metadata(metadata: bytes) -> tuple[int, int, int]:
    if not isinstance(metadata, bytes):
        raise SnapshotValidationError("invalid tmux metadata")
    if not metadata.endswith(b"\n"):  # D007C_GUARD:metadata_final_lf
        raise SnapshotValidationError("invalid tmux metadata")
    body = metadata[:-1]
    if body.count(b"\t") != 2:  # D007C_GUARD:metadata_fields
        raise SnapshotValidationError("invalid tmux metadata")
    fields = body.split(b"\t")
    if any(
        not field or any(byte < 0x30 or byte > 0x39 for byte in field)
        for field in fields
    ):  # D007C_GUARD:metadata_digits
        raise SnapshotValidationError("invalid tmux metadata")
    values = tuple(int(field) for field in fields)
    if any(value > 0x7FFFFFFFFFFFFFFF for value in values):  # D007C_GUARD:metadata_overflow
        raise SnapshotValidationError("invalid tmux metadata")
    history_size, pane_height, cursor_y = values
    if pane_height != SESSION_PORT_ROWS:  # D007C_GUARD:metadata_height
        raise SnapshotValidationError("invalid tmux metadata")
    if cursor_y >= SESSION_PORT_ROWS:  # D007C_GUARD:metadata_cursor
        raise SnapshotValidationError("invalid tmux metadata")
    return history_size, pane_height, cursor_y


def canonicalize_tmux_capture(
    metadata: bytes,
    capture: bytes,
) -> CanonicalSnapshot:
    history_size, _pane_height, cursor_y = _parse_tmux_metadata(metadata)
    if not isinstance(capture, bytes):
        raise SnapshotValidationError("invalid tmux capture")
    if not capture.endswith(b"\n"):  # D007C_GUARD:capture_final_lf
        raise SnapshotValidationError("invalid tmux capture")
    if b"\0" in capture:  # D007C_GUARD:capture_nul
        raise SnapshotValidationError("invalid tmux capture")
    try:
        capture.decode("utf-8", "strict")
    except UnicodeDecodeError as error:  # D007C_GUARD:capture_utf8
        raise SnapshotValidationError("invalid tmux capture") from error
    rows = capture[:-1].split(b"\n")
    history_rows = min(history_size, TMUX_HISTORY_LINES)
    if len(rows) != history_rows + SESSION_PORT_ROWS:  # D007C_GUARD:capture_rows
        raise SnapshotValidationError("invalid tmux capture")
    history = rows[:history_rows]
    visible = rows[history_rows:]
    emitted_extent = 0
    for index, row in enumerate(visible):
        if row:  # D007C_GUARD:visible_emitted_extent
            emitted_extent = index + 1
    used_visible = max(cursor_y, emitted_extent)
    retained = [*history, *visible[:used_visible]]
    canonical = b"".join(row + b"\n" for row in retained)
    if len(canonical) <= ASP1_MAX_PAYLOAD_BYTES:  # D007C_GUARD:snapshot_cap
        return CanonicalSnapshot(canonical, False)
    suffix_budget = (
        ASP1_MAX_PAYLOAD_BYTES - len(ASP1_TRUNCATION_MARKER)
    )
    suffix_start = len(canonical) - suffix_budget
    while (
        suffix_start < len(canonical)
        and canonical[suffix_start] & 0xC0 == 0x80
    ):  # D007C_GUARD:truncation_scalar_boundary
        suffix_start += 1
    truncated = ASP1_TRUNCATION_MARKER + canonical[suffix_start:]
    return CanonicalSnapshot(truncated, True)


def capture_tmux_snapshot(
    tmux_target: str,
    *,
    barrier: Callable[[], None],
    runner: Callable[[list[str]], Any],
) -> CanonicalSnapshot:
    current_identity = read_tmux_relay_identity(
        tmux_target,
        runner,
    )
    current_history_limit = read_tmux_history_limit(
        tmux_target,
        runner,
    )
    validate_tmux_dimensions(
        current_identity["paneWidth"],
        current_identity["paneHeight"],
        current_history_limit,
    )  # D007C_T2_GUARD:capture_preflight
    try:
        barrier()
    except BaseException as error:  # D007C_GUARD:capture_barrier
        raise SnapshotValidationError("tmux barrier failed") from error
    metadata_result = runner(build_tmux_metadata_argv(tmux_target))
    if metadata_result.returncode != 0:  # D007C_GUARD:metadata_exit
        raise SnapshotValidationError("tmux metadata failed")
    if metadata_result.stderr != b"":  # D007C_GUARD:metadata_stderr
        raise SnapshotValidationError("tmux metadata failed")
    capture_result = runner(build_tmux_capture_argv(tmux_target))
    if capture_result.returncode != 0:  # D007C_GUARD:capture_exit
        raise SnapshotValidationError("tmux capture failed")
    if capture_result.stderr != b"":  # D007C_GUARD:capture_stderr
        raise SnapshotValidationError("tmux capture failed")
    try:
        return canonicalize_tmux_capture(
            metadata_result.stdout,
            capture_result.stdout,
        )
    except SnapshotValidationError:
        raise
    except BaseException as error:
        raise SnapshotValidationError("tmux capture failed") from error


def capture_bound_tmux_snapshot(
    binding: AcceptedRelayBinding,
    *,
    barrier: Callable[[], None],
    defer_revoke: bool = False,
    runner: Callable[[list[str]], Any] | None = None,
    peer_reader: Callable[
        [socket.socket],
        dict[str, int] | None,
    ] = read_relay_peer_evidence,
    process_reader: Callable[
        [int],
        dict[str, Any] | None,
    ] = read_session_process_identity,
    tmux_identity_reader: Callable[
        [str],
        dict[str, Any] | None,
    ] | None = None,
    history_limit_reader: Callable[
        [str],
        int | None,
    ] | None = None,
) -> CanonicalSnapshot:
    if binding.tmux_connection is not None:
        try:
            barrier()
            request = {
                "operation": "agents-capture-v1",
                "generationId": binding.generation.generation_id.hex(),
                "serverPid": binding.tmux_identity["serverPid"],
                "sessionId": binding.tmux_identity["sessionId"],
                "paneId": binding.tmux_identity["paneId"],
                "panePid": binding.tmux_identity["panePid"],
                "paneWidth": SESSION_PORT_COLUMNS,
                "paneHeight": SESSION_PORT_ROWS,
                "historyLimit": TMUX_HISTORY_LINES,
            }
            def capture_effect() -> CanonicalSnapshot:
                record = binding.tmux_connection.agents_capture_v1(request)
                if (
                    not isinstance(record, AgentsCaptureV1Record)
                    or record.version != 1
                    or not isinstance(record.generation_id, bytes)
                    or not hmac.compare_digest(
                        record.generation_id,
                        binding.generation.generation_id,
                    )
                    or record.server_pid
                    != binding.tmux_identity["serverPid"]
                    or record.session_id
                    != binding.tmux_identity["sessionId"]
                    or record.pane_id
                    != binding.tmux_identity["paneId"]
                    or record.pane_pid
                    != binding.tmux_identity["panePid"]
                    or record.pane_width != SESSION_PORT_COLUMNS
                    or record.pane_height != SESSION_PORT_ROWS
                    or record.history_limit != TMUX_HISTORY_LINES
                ):
                    raise TerminalChangedError(
                        "atomic tmux capture binding changed"
                    )
                metadata = (
                    f"{record.history_size}\t"
                    f"{record.pane_height}\t"
                    f"{record.cursor_y}\n"
                ).encode("ascii")
                return canonicalize_tmux_capture(metadata, record.capture)

            snapshot = binding.generation.workload(
                binding.generation.generation_id,
                capture_effect,
            )
            candidate = binding.generation.candidate(
                binding.generation.generation_id,
                snapshot,
            )
            return binding.generation.settle(
                binding.generation.generation_id,
                candidate,
            )
        except BaseException:
            if not defer_revoke:
                binding.revoke()
            raise

    if not defer_revoke:
        binding.revoke()
    raise TerminalChangedError("retained tmux capture connection unavailable")


def _launch_session_process_identity(
    launch: dict[str, Any],
    identity: dict[str, Any],
) -> dict[str, Any]:
    return {
        **identity,
        "executable": os.path.realpath(launch["argv"][0]),
        "argvNul": b"".join(
            os.fsencode(argument) + b"\0"
            for argument in launch["argv"]
        ),
        "cwd": os.path.realpath(launch["cwd"]),
    }


def _open_session_relay(
    launch: dict[str, Any],
    relay_key: bytes,
    generation: AcceptedGeneration | None = None,
) -> AcceptedRelayBinding:
    temporary_root = tempfile.gettempdir()
    runtime = create_relay_runtime(temporary_root, relay_key)
    target = launch["sessionPortTarget"]
    selected_generation = generation or AcceptedGeneration(os.urandom(32))
    candidate: socket.socket | None = None
    tmux_identity: dict[str, Any] | None = None
    tmux_connection: RetainedTmuxConnection | None = None
    binding: AcceptedRelayBinding | None = None
    accepted = False
    retired = False

    def retire() -> None:
        nonlocal retired
        if retired:
            return
        retired = True
        if accepted:
            return
        if tmux_connection is not None:
            try:
                if tmux_identity is None:
                    tmux_connection.retire_target(target)
                else:
                    tmux_connection.retire_owned({
                        "generationId": selected_generation.generation_id.hex(),
                        "paneId": tmux_identity["paneId"],
                        "sessionId": tmux_identity["sessionId"],
                    })
            except BaseException:
                tmux_connection.close()
        runtime.close()

    try:
        relay_argv = [
            launch["sessionPortRuntimeExecutable"],
            *launch["sessionPortRuntimeArgs"],
            os.path.realpath(__file__),
            "--session-port-relay",
            runtime.socket_path,
            runtime.key_path,
        ]
        tmux_connection, tmux_identity = _open_retained_tmux_connection(
            target=target,
            cwd=launch["cwd"],
            relay_argv=relay_argv,
            generation_id=selected_generation.generation_id,
        )
        candidate, _ = runtime.listener.accept()
        runtime.listener.close()
        deadline = time.monotonic() + ASR1_HANDSHAKE_TIMEOUT_MS / 1000
        process_identity = None
        while process_identity is None and time.monotonic() < deadline:
            process_identity = read_session_process_identity(
                tmux_identity["panePid"],
            )
            if process_identity is None:
                time.sleep(0.005)
        if process_identity is None:
            raise TerminalChangedError("relay identity is unavailable")
        authentication = authenticate_relay_socket(
            candidate,
            expected_identity=process_identity,
            relay_key=relay_key,
            state=RelayAuthenticationState(),
            on_reject=retire,
        )
        if not authentication.accepted:
            raise TerminalChangedError("relay authentication failed")
        peer = read_relay_peer_evidence(candidate)
        binding = create_accepted_relay_binding(
            candidate=candidate,
            authentication=authentication,
            peer=peer,
            process_identity=process_identity,
            tmux_identity=tmux_identity,
            tmux_target=target,
            on_revoke=retire,
            generation=selected_generation,
            tmux_connection=tmux_connection,
            runtime=runtime,
        )
        accepted = True
        revalidate_accepted_relay_binding(
            binding,
            peer_reader=read_relay_peer_evidence,
            process_reader=read_session_process_identity,
            tmux_identity_reader=lambda selected: (
                tmux_connection.read_identity(selected)
            ),
            history_limit_reader=lambda selected: (
                tmux_connection.read_history_limit(selected)
            ),
        )  # D007C_T2_GUARD:default_relay_bound
        return binding
    except BaseException:
        if binding is not None:
            binding.revoke()
            binding.cleanup()
        elif candidate is not None:
            try:
                candidate.close()
            except OSError:
                pass
        retire()
        raise


def _forward_pty_to_relay(
    pty: _SessionPortPty,
    binding: AcceptedRelayBinding,
    normalizer: TerminalUtf8Normalizer,
    pty_authority: RetainedPtyAuthority | None = None,
    *,
    peer_reader: Callable[
        [socket.socket],
        dict[str, int] | None,
    ] = read_relay_peer_evidence,
    process_reader: Callable[
        [int],
        dict[str, Any] | None,
    ] = read_session_process_identity,
    tmux_identity_reader: Callable[
        [str],
        dict[str, Any] | None,
    ] | None = None,
    history_limit_reader: Callable[
        [str],
        int | None,
    ] | None = None,
) -> str:
    selected_tmux_reader = (
        tmux_identity_reader
        if tmux_identity_reader is not None
        else lambda target: _binding_tmux_identity_reader(binding, target)
    )
    selected_history_reader = (
        history_limit_reader
        if history_limit_reader is not None
        else lambda target: _binding_tmux_history_reader(binding, target)
    )
    try:
        revalidate_accepted_relay_binding(
            binding,
            peer_reader=peer_reader,
            process_reader=process_reader,
            tmux_identity_reader=selected_tmux_reader,
            history_limit_reader=selected_history_reader,
        )  # Diagnostic-only rejection; it never selects the I/O object.
        if pty_authority is not None:
            payload = pty_authority.read(
                RELAY_DATA_MAX_PAYLOAD_BYTES // 4,
            ).payload
        else:
            payload = binding.generation.workload(
                binding.generation.generation_id,
                lambda: os.read(
                    pty.master_fd,
                    RELAY_DATA_MAX_PAYLOAD_BYTES // 4,
                ),
            )
    except BlockingIOError:
        return "idle"
    except GenerationRevokedError:
        raise TerminalChangedError("relay generation changed")
    except OSError as error:
        if error.errno in (errno.EIO, errno.ENXIO, errno.EBADF):
            return "closed"
        return "idle"
    if not payload:
        return "closed"
    normalized = normalizer.feed(payload, final=False)
    if normalized:
        try:
            send_bound_relay_data(
                binding,
                RELAY_DATA_OUTPUT,
                normalized,
            )  # D007C_T2_GUARD:default_output_forward
        except TerminalChangedError:  # D007C_T3_GUARD:output_terminal_changed
            raise
        except (ConnectionError, OSError, ValueError):
            binding.revoke()
            return "closed"
    return "forwarded"


def _derive_session_port_binding(
    launch: dict[str, Any],
) -> tuple[bytes, str, str, bytes]:
    lease_key = bytearray.fromhex(launch["leaseNonce"])
    terminal_nonce = bytearray(os.urandom(32))
    try:
        lease_digest = hashlib.sha256(lease_key).digest()
        terminal_nonce_digest = hashlib.sha256(terminal_nonce).digest()
        binding_tag = hmac.new(
            lease_key,
            b"".join(
                (
                    SESSION_PORT_BINDING_DOMAIN,
                    bytes.fromhex(launch["bindingDigest"]),
                    lease_digest,
                    terminal_nonce_digest,
                )
            ),
            hashlib.sha256,
        ).digest()
        relay_key = derive_relay_key(
            bytes(lease_key),
            bytes.fromhex(launch["bindingDigest"]),
            lease_digest,
            terminal_nonce_digest,
        )
        return (
            binding_tag,
            lease_digest.hex(),
            terminal_nonce_digest.hex(),
            relay_key,
        )
    finally:
        lease_key[:] = b"\0" * len(lease_key)
        terminal_nonce[:] = b"\0" * len(terminal_nonce)


def _asp1_runtime_error(
    sequence: int,
    error_id: int,
    phase_id: int,
    binding_tag: bytes,
) -> bytes:
    return encode_asp1_response(
        0xFF,
        sequence,
        error_id.to_bytes(2, "big") + bytes((phase_id, 0)),
        binding_tag,
    )


def _drain_pty_once(pty: _SessionPortPty) -> bool:
    try:
        payload = os.read(pty.master_fd, 65536)
    except BlockingIOError:
        return True
    except OSError as error:
        return error.errno not in (errno.EIO, errno.ENXIO, errno.EBADF)
    return bool(payload)


def _run_session_port(
    channel: ControlChannel,
    launch: dict[str, Any],
    signal_received: list[bool],
    observer: ChildObserver,
    utility: dict[str, Any],
    supervisor_identity: dict[str, Any],
    reaper_identity: dict[str, Any],
    pty: _SessionPortPty,
    cleanup_outcome: dict[str, Any] | None = None,
) -> str:
    binding_tag, lease_digest, terminal_nonce_digest, derived_relay_key = (
        _derive_session_port_binding(launch)
    )
    relay_key = bytearray(derived_relay_key)
    relay_binding: AcceptedRelayBinding | None = None
    generation = AcceptedGeneration(os.urandom(32))
    utility_group = seal_utility_group_target(
        generation.generation_id,
        utility,
        child_owned=True,
        leader_unreaped=True,
    )
    utility_status: ChildStatus | None = None

    def close_utility_group(target: SealedUtilityGroupTarget) -> None:
        nonlocal utility_status
        statuses: list[ChildStatus] = []

        def reap_leader(pid: int) -> None:
            deadline = time.monotonic() + 2.0
            while time.monotonic() < deadline:
                try:
                    waited, status = os.waitpid(pid, os.WNOHANG)
                except ChildProcessError as error:
                    raise OSError(errno.ECHILD, "utility leader unavailable") from error
                if waited == pid:
                    utility_status = _decode_wait_status(status)
                    return
                time.sleep(0.005)
            raise TimeoutError("utility leader reap timeout")

        result = cleanup_sealed_utility_group(
            target,
            generation_id=generation.generation_id,
            anchor_current=lambda: target.child_owned and target.leader_unreaped,
            signal_group=lambda pgid, selected_signal: os.kill(
                -pgid,
                selected_signal,
            ),
            reap_leader=reap_leader,
            grace=lambda: time.sleep(
                launch["terminationGraceMs"] / 1000,
            ),
        )
        if result != "RETIRED":
            raise OSError(errno.EIO, "utility group preserved")
        if cleanup_outcome is not None:
            cleanup_outcome["utilityGroup"] = result
            cleanup_outcome["status"] = utility_status

    generation.seal_cleanup_target(
        "utility-group",
        utility_group,
        close=close_utility_group,
    )
    authority_cleanup_name = None
    if (
        sys.platform.startswith("linux")
        and pty.authority_identity is not None
    ):
        authority_cleanup_name = "pty-identity-authority"
        generation.seal_cleanup_target(
            authority_cleanup_name,
            pty.authority_identity,
            close=_reap_exact_adopted_child,
        )
    pty_authority = RetainedPtyAuthority(
        generation,
        pty.master_fd,
        pty.slave_fd,
        close_master=lambda _fd: pty.close(),
    )
    retained_descriptor_targets = {
        "control-fd-0": channel.fd,
        "pty-descriptors": pty,
        "sideband-request-fd-4": SESSION_PORT_REQUEST_FD,
        "sideband-response-fd-5": SESSION_PORT_RESPONSE_FD,
    }
    for name, fd in retained_descriptor_targets.items():
        generation.seal_cleanup_target(
            name,
            fd,
            close=(
                (lambda selected_pty: selected_pty.close())
                if isinstance(fd, _SessionPortPty)
                else (lambda selected_fd: os.close(selected_fd))
            ),
        )
    expected_utility = _launch_session_process_identity(launch, utility)
    current_utility = read_session_process_identity(utility["pid"])
    terminal = _request_pty_identity(pty)
    if (
        not _same_session_process_identity(
            expected_utility,
            current_utility,
        )
        or terminal is None
        or terminal["foregroundPgid"] != utility["pgid"]
        or terminal["columns"] != SESSION_PORT_COLUMNS
        or terminal["rows"] != SESSION_PORT_ROWS
        or any(
            terminal[field] != pty.terminal[field]
            for field in ("dev", "ino", "rdev", "rows", "columns")
        )
    ):
        binding_tag = b"\0" * len(binding_tag)
        relay_key[:] = b"\0" * len(relay_key)
        if cleanup_outcome is not None:
            pty.close()
            cleanup_outcome["clean"], cleanup_outcome["status"] = (
                _bounded_session_port_utility_cleanup(
                    utility,
                    launch["terminationGraceMs"],
                    pty.authority_identity,
                )
            )
        return "exec_error"
    try:
        relay_binding = _open_session_relay(
            launch,
            bytes(relay_key),
            generation,
        )
    except BaseException:
        binding_tag = b"\0" * len(binding_tag)
        relay_key[:] = b"\0" * len(relay_key)
        if cleanup_outcome is not None:
            pty.close()
            cleanup_outcome["clean"], cleanup_outcome["status"] = (
                _bounded_session_port_utility_cleanup(
                    utility,
                    launch["terminationGraceMs"],
                    pty.authority_identity,
                )
            )
        return "exec_error"

    generation.activate(
        generation.generation_id,
        lambda: _emit(
            {
                "type": "session_port_ready",
                "protocol": PROTOCOL,
                "bindingDigest": launch["bindingDigest"],
                "leaseDigest": lease_digest,
                "terminalNonceDigest": terminal_nonce_digest,
                "utility": utility,
                "terminal": terminal,
            }
        ),
    )
    os.set_blocking(SESSION_PORT_REQUEST_FD, False)
    expected_sequence = 1
    request_buffer = bytearray()
    terminal_closed = [False]
    requested_reason: list[str | None] = [None]
    relay_queue = RelayBrokerInputQueue()
    relay_queue.bind(relay_binding)
    normalizer = TerminalUtf8Normalizer()
    barrier_sequence = [0]

    def control_disposition() -> str:
        channel.poll(0)
        reason = _control_reason(channel, launch, signal_received)
        if reason is not None:
            requested_reason[0] = reason
            return "helper_lost"
        if observer.exited() or terminal_closed[0]:
            requested_reason[0] = "exited" if observer.exited() else "cancelled"
            return "terminal_closed"
        command = channel.pop()
        if command is not None:
            if (
                command.get("protocol") != PROTOCOL
                or command.get("type") != "terminate"
            ):
                requested_reason[0] = "cancelled"
            else:
                candidate = command.get("reason")
                requested_reason[0] = (
                    candidate
                    if candidate in ("cancelled", "timed_out")
                    else "cancelled"
                )
            return "cancelled"
        return "ok"

    def revalidate_relay() -> None:
        if relay_binding is None:
            raise TerminalChangedError("relay binding changed")
        revalidate_accepted_relay_binding(
            relay_binding,
            peer_reader=read_relay_peer_evidence,
            process_reader=read_session_process_identity,
            tmux_identity_reader=lambda selected: (
                _binding_tmux_identity_reader(relay_binding, selected)
            ),
            history_limit_reader=lambda selected: (
                _binding_tmux_history_reader(relay_binding, selected)
            ),
        )

    def verify() -> str:
        disposition = control_disposition()
        if disposition != "ok":
            return disposition
        current_supervisor = process_identity(supervisor_identity["pid"])
        current_reaper = process_identity(reaper_identity["pid"])
        if (
            not _identity_matches(supervisor_identity, current_supervisor)
            or not _identity_matches(reaper_identity, current_reaper)
        ):
            requested_reason[0] = "supervisor_lost"
            return "helper_lost"
        fresh_utility = read_session_process_identity(utility["pid"])
        if not _same_session_process_identity(
            expected_utility,
            fresh_utility,
        ):
            return "identity_changed"
        fresh_terminal = _request_pty_identity(pty)
        if fresh_terminal is None or any(
            fresh_terminal[field] != pty.terminal[field]
            for field in ("dev", "ino", "rdev", "rows", "columns")
        ):
            return "terminal_changed"
        if (
            fresh_utility["pid"] != fresh_utility["pgid"]
            or fresh_utility["pid"] != fresh_utility["sid"]
            or fresh_terminal["foregroundPgid"] != fresh_utility["pgid"]
        ):
            return "not_foreground"
        try:
            revalidate_relay()
        except TerminalChangedError:
            return "terminal_changed"
        return "ok"

    def accept_operator_input(payload: bytes) -> None:
        if relay_binding is None:
            raise TerminalChangedError("relay binding changed")
        offer_bound_relay_input(
            relay_binding,
            relay_queue,
            payload,
            peer_reader=read_relay_peer_evidence,
            process_reader=read_session_process_identity,
            tmux_identity_reader=lambda selected: (
                _binding_tmux_identity_reader(relay_binding, selected)
            ),
            history_limit_reader=lambda selected: (
                _binding_tmux_history_reader(relay_binding, selected)
            ),
        )
        queued = relay_binding.generation.workload(
            relay_binding.generation.generation_id,
            lambda: relay_queue.take(relay_binding),
        )
        outcome = verified_pty_write(
            pty.master_fd,
            queued,
            verify=verify,
            effect=lambda operation: relay_binding.generation.workload(
                relay_binding.generation.generation_id,
                operation,
            ),
        )
        if outcome.status != "ok":
            relay_binding.revoke()
            if outcome.error_id == 0x0009:
                raise TerminalChangedError("relay input binding changed")
            raise ConnectionError("relay input failed")

    def relay_barrier() -> None:
        if relay_binding is None:
            raise TerminalChangedError("relay binding changed")
        barrier_sequence[0] += 1
        token = barrier_sequence[0].to_bytes(8, "big")
        send_bound_relay_data(
            relay_binding,
            RELAY_DATA_BARRIER,
            token,
        )
        receive_bound_relay_barrier(
            relay_binding,
            token,
            accept_input=accept_operator_input,
        )

    def respond(payload: bytes) -> bool:
        if relay_binding is None:
            return False
        try:
            return relay_binding.generation.workload(
                relay_binding.generation.generation_id,
                lambda: _safe_write(
                    SESSION_PORT_RESPONSE_FD,
                    payload,
                ),
            )
        except GenerationRevokedError:
            return False

    def settle_rejection(response: bytes) -> str:
        if relay_binding is None:
            return "supervisor_lost"
        if not respond(response):
            relay_binding.revoke()
            relay_binding.flush_deferred_revocation()
            return "supervisor_lost"
        relay_binding.flush_deferred_revocation()
        relay_binding.revoke()
        while True:
            ready = channel.poll(
                _poll_timeout(launch),
                (SESSION_PORT_REQUEST_FD,),
            )
            reason = _control_reason(channel, launch, signal_received)
            if reason is not None:
                requested_reason[0] = reason
                return reason
            command = channel.pop()
            if command is not None:
                if (
                    command.get("protocol") != PROTOCOL
                    or command.get("type") != "terminate"
                ):
                    return "cancelled"
                candidate = command.get("reason")
                return (
                    candidate
                    if candidate in ("cancelled", "timed_out")
                    else "cancelled"
                )
            if SESSION_PORT_REQUEST_FD in ready:
                return "cancelled"

    try:
        while True:
            disposition = control_disposition()
            if disposition == "helper_lost":
                return requested_reason[0] or "supervisor_lost"
            if disposition == "terminal_closed":
                return requested_reason[0] or "exited"
            if disposition == "cancelled":
                return requested_reason[0] or "cancelled"

            relay_fd = relay_binding.candidate.fileno()
            if relay_fd < 0:
                terminal_closed[0] = True
                continue
            ready = channel.poll(
                _poll_timeout(launch),
                (
                    SESSION_PORT_REQUEST_FD,
                    pty.master_fd,
                    relay_fd,
                ),
            )
            if pty.master_fd in ready:
                try:
                    forwarded = _forward_pty_to_relay(
                        pty,
                        relay_binding,
                        normalizer,
                        pty_authority,
                    )
                except TerminalChangedError:
                    return "cancelled"
                if forwarded == "closed":
                    terminal_closed[0] = True
            if relay_fd in ready:
                try:
                    message_type, relay_payload = receive_bound_relay_data(
                        relay_binding,
                        timeout=ASR1_HANDSHAKE_TIMEOUT_MS / 1000,
                    )
                    if message_type != RELAY_DATA_INPUT:
                        raise TerminalChangedError(
                            "relay data order changed"
                        )
                    accept_operator_input(relay_payload)
                except TerminalChangedError:
                    return "cancelled"
                except (ConnectionError, OSError, ValueError):
                    terminal_closed[0] = True
            if SESSION_PORT_REQUEST_FD not in ready:
                continue
            try:
                chunk = relay_binding.generation.workload(
                    relay_binding.generation.generation_id,
                    lambda: os.read(
                        SESSION_PORT_REQUEST_FD,
                        65536,
                    ),
                )
            except BlockingIOError:
                continue
            except GenerationRevokedError:
                return requested_reason[0] or "cancelled"
            except OSError:
                return "supervisor_lost"
            if not chunk:
                return "supervisor_lost"
            request_buffer.extend(chunk)
            if len(request_buffer) > ASP1_MAX_REQUEST_BYTES:
                sequence = (
                    int.from_bytes(request_buffer[8:12], "big")
                    if len(request_buffer) >= 12
                    else 0
                )
                if len(request_buffer) >= ASP1_HEADER_BYTES:
                    return settle_rejection(_asp1_runtime_error(
                        sequence,
                        0x0001,
                        0x02,
                        binding_tag,
                    ))
                return "cancelled"
            if len(request_buffer) < ASP1_HEADER_BYTES:
                continue
            payload_length = int.from_bytes(request_buffer[12:16], "big")
            if payload_length > ASP1_MAX_PAYLOAD_BYTES + 1:
                frame_size = ASP1_HEADER_BYTES
            else:
                frame_size = ASP1_HEADER_BYTES + payload_length
            if len(request_buffer) < frame_size:
                continue
            frame = bytes(request_buffer[:frame_size])
            del request_buffer[:frame_size]
            decoded = decode_asp1_request(
                frame,
                binding_tag,
                expected_sequence,
            )
            if decoded["status"] != "dispatch":
                response = decoded.get("response")
                if isinstance(response, bytes):
                    return settle_rejection(response)
                return "cancelled"
            sequence = int(decoded["sequence"])
            if decoded["opcode"] == 0x02:
                relay_binding.defer_revocation()
                try:
                    forwarded = "idle"
                    for _ in range(4):
                        forwarded = _forward_pty_to_relay(
                            pty,
                            relay_binding,
                            normalizer,
                            pty_authority,
                        )
                        if forwarded != "forwarded":
                            break
                    if forwarded == "closed":
                        response = _asp1_runtime_error(
                            sequence,
                            0x000A,
                            0x06,
                            binding_tag,
                        )
                        return settle_rejection(response)
                    snapshot = capture_bound_tmux_snapshot(
                        relay_binding,
                        barrier=relay_barrier,
                        defer_revoke=True,
                    )
                    response = encode_asp1_response(
                        0x83 if snapshot.truncated else 0x82,
                        sequence,
                        snapshot.snapshot,
                        binding_tag,
                    )  # D007C_T2_GUARD:default_snapshot_response
                except TerminalChangedError:
                    response = _asp1_runtime_error(
                        sequence,
                        0x0009,
                        0x03,
                        binding_tag,
                    )
                except (ConnectionError, OSError):
                    response = _asp1_runtime_error(
                        sequence,
                        0x000A,
                        0x06,
                        binding_tag,
                    )
                except (SnapshotValidationError, ValueError):
                    response = _asp1_runtime_error(
                        sequence,
                        0x000C,
                        0x05,
                        binding_tag,
                    )
                except BaseException:
                    relay_binding.flush_deferred_revocation()
                    raise
                if response[5] == 0xFF:
                    return settle_rejection(response)
                relay_binding.flush_deferred_revocation()
                if not respond(response):
                    return "supervisor_lost"
                expected_sequence += 1
                continue

            prompt_frame = decoded["payload"]
            relay_binding.defer_revocation()
            try:
                outcome = verified_pty_write(
                    pty.master_fd,
                    prompt_frame,
                    verify=verify,
                    effect=lambda operation: (
                        relay_binding.generation.workload(
                            relay_binding.generation.generation_id,
                            operation,
                        )
                    ),
                )
                if outcome.status == "helper_lost":
                    return requested_reason[0] or "supervisor_lost"
                if outcome.status == "ok":
                    final_disposition = verify()
                    if final_disposition == "helper_lost":
                        return requested_reason[0] or "supervisor_lost"
                    if final_disposition != "ok":
                        outcome = VerifiedWriteOutcome(
                            "error",
                            outcome.accepted_bytes,
                            0x000B,
                            0x04,
                        )
                if outcome.status == "ok":
                    response = encode_asp1_response(
                        0x81,
                        sequence,
                        (len(prompt_frame) - 1).to_bytes(4, "big"),
                        binding_tag,
                        request_prompt_bytes=len(prompt_frame) - 1,
                    )
                else:
                    response = _asp1_runtime_error(
                        sequence,
                        int(outcome.error_id),
                        int(outcome.phase_id),
                        binding_tag,
                    )
                if outcome.status != "ok":
                    return settle_rejection(response)
            finally:
                relay_binding.flush_deferred_revocation()
            if not respond(response):
                return "supervisor_lost"
            expected_sequence += 1
    finally:
        request_buffer[:] = b"\0" * len(request_buffer)
        if relay_binding is not None:
            relay_binding.revoke()  # D007C_T2_GUARD:default_relay_retire
            relay_binding.cleanup()
            for name in retained_descriptor_targets:
                relay_binding.generation.cleanup_target(
                    relay_binding.generation.generation_id,
                    name,
                )
            relay_binding.generation.cleanup_target(
                relay_binding.generation.generation_id,
                pty_authority._cleanup_name,
            )
            relay_binding.generation.cleanup_target(
                relay_binding.generation.generation_id,
                "utility-group",
            )
            if authority_cleanup_name is not None:
                authority_state = relay_binding.generation.cleanup_target(
                    relay_binding.generation.generation_id,
                    authority_cleanup_name,
                )
                if cleanup_outcome is not None:
                    cleanup_outcome["ptyAuthority"] = authority_state
            for name, state in tuple(
                relay_binding.generation.cleanup_states.items()
            ):
                if state == "PENDING":
                    relay_binding.generation.preserve_target(
                        relay_binding.generation.generation_id,
                        name,
                    )
            relay_binding.generation.finish_cleanup(
                relay_binding.generation.generation_id,
            )
            if cleanup_outcome is not None:
                cleanup_outcome["clean"] = (
                    cleanup_outcome.get("utilityGroup") == "RETIRED"
                    and (
                        (
                            not sys.platform.startswith("linux")
                            and authority_cleanup_name is None
                        )
                        or (
                            authority_cleanup_name is not None
                            and cleanup_outcome.get("ptyAuthority")
                            == "RETIRED"
                        )
                    )
                )
        binding_tag = b"\0" * len(binding_tag)
        relay_key[:] = b"\0" * len(relay_key)


def _run_reaper(supervisor_fd: int, supervisor_pid: int) -> int:
    signal_received = [False]

    def on_signal(_number: int, _frame: object) -> None:
        signal_received[0] = True

    signal.signal(signal.SIGTERM, on_signal)
    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    _set_cloexec(TRANSCRIPT_FD)
    channel = ControlChannel(0, supervisor_fd)
    subreaper = _activate_linux_subreaper()
    if sys.platform.startswith("linux") and not subreaper:
        return 70
    launch = _read_launch(channel, signal_received)
    if launch is None:
        return 71
    session_port_enabled = bool(launch.get("sessionPort"))
    if session_port_enabled:
        try:
            os.fstat(SESSION_PORT_REQUEST_FD)
            os.fstat(SESSION_PORT_RESPONSE_FD)
        except OSError:
            return 71
    supervisor_identity = process_identity(supervisor_pid)
    reaper_identity = process_identity(os.getpid())
    if (
        supervisor_identity is None
        or reaper_identity is None
        or supervisor_identity["pgid"] != supervisor_pid
        or supervisor_identity["sid"] != supervisor_pid
        or reaper_identity["pgid"] != supervisor_pid
        or reaper_identity["sid"] != supervisor_pid
    ):
        return 72
    lease_digest = hashlib.sha256(
        launch["leaseNonce"].encode("ascii")
    ).hexdigest()
    _emit(
        {
            "type": "reaper_ready",
            "protocol": PROTOCOL,
            "leaseDigest": lease_digest,
            "bindingDigest": launch["bindingDigest"],
            "platform": "linux" if sys.platform.startswith("linux") else "darwin",
            "subreaper": subreaper,
            "supervisor": supervisor_identity,
            "reaper": reaper_identity,
        }
    )

    reason = _wait_for_command(
        channel,
        launch,
        signal_received,
        "release",
    )
    if reason is not None:
        _emit(_terminal_event(reason))
        return 0

    pty: _SessionPortPty | None = None
    if session_port_enabled:
        try:
            pty = _allocate_session_port_pty()
        except OSError:
            _emit(_terminal_event("exec_error"))
            return 0
    utility, observer, exec_fd, reason = _spawn_utility(
        channel,
        launch,
        signal_received,
        pty,
    )
    if reason is not None:
        if pty is not None and utility is not None:
            pty.close()
            _bounded_session_port_utility_cleanup(
                utility,
                launch["terminationGraceMs"],
                pty.authority_identity,
            )
        _emit(_terminal_event(reason))
        return 0
    if utility is None or observer is None or exec_fd is None:
        if pty is not None:
            pty.close()
        _emit(_terminal_event("exec_error"))
        return 0

    reason = _wait_for_exec(
        channel,
        launch,
        signal_received,
        exec_fd,
    )
    os.close(exec_fd)
    if reason is not None and pty is not None:
        pty.close()
        cleanup_result, cleanup_status = _bounded_session_port_utility_cleanup(
            utility,
            launch["terminationGraceMs"],
            pty.authority_identity,
        )
        if not cleanup_result:
            return 74
        observer.close()
        _emit(_terminal_event(reason, cleanup_status))
        return 0
    session_port_cleanup: dict[str, Any] | None = (
        {} if pty is not None else None
    )
    if reason is None:
        if pty is not None:
            reason = _run_session_port(
                channel,
                launch,
                signal_received,
                observer,
                utility,
                supervisor_identity,
                reaper_identity,
                pty,
                session_port_cleanup,
            )
        else:
            reason = _wait_for_terminal(
                channel,
                launch,
                signal_received,
                observer,
            )
    if pty is not None:
        clean = bool(session_port_cleanup and session_port_cleanup.get("clean"))
        status = (
            session_port_cleanup.get("status")
            if session_port_cleanup is not None
            else None
        )
    else:
        clean, status = _cleanup_tree(utility, launch["terminationGraceMs"])
    observer.close()
    if pty is not None:
        pty.close()
    if not clean:
        return 74
    _emit(_terminal_event(reason, status))
    return 0


def _supervisor_main() -> int:
    try:
        inherited_session_port = True
        for fd in (SESSION_PORT_REQUEST_FD, SESSION_PORT_RESPONSE_FD):
            try:
                os.fstat(fd)
            except OSError:
                inherited_session_port = False
                break
        supervisor_pid = os.getpid()
        supervisor_read, supervisor_write = _pipe_cloexec()
        reaper_pid = os.fork()
    except OSError:
        return 69
    if reaper_pid == 0:
        os.close(supervisor_write)
        try:
            try:
                return _run_reaper(supervisor_read, supervisor_pid)
            except BaseException:
                # Never serialize a utility-derived exception or traceback.
                return 73
        finally:
            try:
                os.close(supervisor_read)
            except OSError:
                pass

    os.close(supervisor_read)
    if inherited_session_port:
        for fd in (SESSION_PORT_REQUEST_FD, SESSION_PORT_RESPONSE_FD):
            try:
                os.close(fd)
            except OSError:
                pass
    try:
        os.close(0)
    except OSError:
        pass
    while True:
        try:
            _, status = os.waitpid(reaper_pid, 0)
            break
        except InterruptedError:
            continue
        except ChildProcessError:
            status = 1 << 8
            break
    try:
        os.close(supervisor_write)
    except OSError:
        pass
    return os.WEXITSTATUS(status) if os.WIFEXITED(status) else 128 + os.WTERMSIG(status)


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--probe-darwin-ordering":
        print(json.dumps(probe_darwin_kqueue_ordering()))
        raise SystemExit(0)
    if len(sys.argv) == 4 and sys.argv[1] == "--session-port-relay":
        raise SystemExit(_run_session_port_relay(sys.argv[2], sys.argv[3]))
    raise SystemExit(_supervisor_main())
