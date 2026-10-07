"""Bounded immutable project inputs; no execution or selection authority."""

from __future__ import annotations

import hashlib
import json
import os
import stat
from dataclasses import dataclass
from pathlib import Path

SCHEMA = Path(__file__).resolve().parents[3] / "schemas/project-profile-v1.schema.json"
MAX_BYTES = 1024 * 1024
PRIOR_MAX_BYTES = 256 * 1024


class ProfileError(Exception):
    """Safe code and schema field only, never rejected input or OS errors."""

    def __init__(self, code: str, field: str = "profile"):
        super().__init__(code)
        self.code = code
        self.field = field
        self.exit_code = 5 if code == "WAVE_PRIOR_FACTS_MISSING" else (
            3 if code in ("PROFILE_RUNTIME_UNAVAILABLE", "PROFILE_RUNTIME_UNSUPPORTED") else 2
        )

    def to_dict(self) -> dict:
        return {"code": self.code, "field": self.field}


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate JSON key")
        result[key] = value
    return result


def canonical_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)


def _digest(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def _read(path: Path, limit: int, field: str, code="PROFILE_INVALID"):
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW)
        with os.fdopen(fd, "rb") as handle:
            if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                raise ValueError("regular file required")
            raw = handle.read(limit + 1)
        if len(raw) > limit:
            raise ValueError("oversized input")
        return json.loads(raw.decode("utf-8"), object_pairs_hook=_pairs)
    except (OSError, ValueError, UnicodeError, RecursionError):
        raise ProfileError(code, field) from None


def _schema_validate(value, *, prior=False):
    from jsonschema import Draft202012Validator, FormatChecker, validators

    schema = json.loads(SCHEMA.read_text())
    if prior:
        schema = {"$ref": "#/$defs/priorWaveFacts", "$defs": schema["$defs"]}
    strict_integer = Draft202012Validator.TYPE_CHECKER.redefine("integer", lambda _checker, v: type(v) is int)
    validator = validators.extend(Draft202012Validator, type_checker=strict_integer)
    error = next(validator(schema, format_checker=FormatChecker()).iter_errors(value), None)
    if error:
        # Only known schema property names may leave the process.
        known = {key for definition in schema["$defs"].values() for key in definition.get("properties", {})}
        known.update(schema.get("properties", {}))
        field = next((p for p in error.absolute_path if type(p) is str and p in known), "priorWaveFacts" if prior else "profile")
        raise ProfileError("WAVE_INPUT_INVALID" if prior else "PROFILE_INVALID", field)


def _absolute_directory(value, field):
    try:
        path = Path(value)
        if not path.is_absolute() or any(ord(c) < 32 or ord(c) == 127 for c in str(value)):
            raise ValueError("absolute path required")
        resolved = path.resolve(strict=True)
        if str(resolved) != str(value) or not resolved.is_dir():
            raise ValueError("canonical directory required")
        return resolved
    except (OSError, RuntimeError, ValueError, TypeError):
        raise ProfileError("PROFILE_PATH_DENIED", field) from None


def _relative(root, spelling, roots, field, *, kind="directory", cwd=None):
    try:
        relative = Path(spelling)
        if (relative.is_absolute() or ".." in relative.parts or "\\" in spelling
                or any(ord(c) < 32 or ord(c) == 127 for c in spelling)):
            raise ValueError("unsafe spelling")
        candidate = root / relative
        if kind == "write" and not candidate.exists() and not candidate.is_symlink():
            # Only the final leaf may be absent; never invent parent directories.
            resolved = candidate.parent.resolve(strict=True) / candidate.name
        else:
            resolved = candidate.resolve(strict=True)
        if not resolved.is_relative_to(root) or not any(resolved.is_relative_to(r) for r in roots):
            raise ValueError("outside roots")
        if cwd is not None and not resolved.is_relative_to(cwd):
            raise ValueError("outside task cwd")
        if kind == "directory" and not resolved.is_dir():
            raise ValueError("directory required")
        if kind == "prompt" and (not resolved.is_file() or resolved.stat().st_size > PRIOR_MAX_BYTES):
            raise ValueError("bounded prompt required")
        return resolved, resolved.relative_to(root).as_posix()
    except (OSError, RuntimeError, ValueError):
        raise ProfileError("PROFILE_PATH_DENIED", field) from None


@dataclass(frozen=True, slots=True)
class ProjectCheck:
    id: str
    argv: tuple[str, ...]
    cwd: Path
    timeout_ms: int
    memory_mib: int


@dataclass(frozen=True, slots=True)
class ProjectTask:
    id: str
    story_id: str
    cwd: Path
    write_paths: tuple[Path, ...]
    conflict_keys: tuple[str, ...]
    depends_on: tuple[str, ...]
    check_ids: tuple[str, ...]
    coder_prompt: Path
    reviewer_prompt: Path


@dataclass(frozen=True, slots=True)
class ProjectWave:
    id: str
    task_ids: tuple[str, ...]
    max_concurrent_tasks: int
    exit_check_ids: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ProjectProfile:
    project_id: str
    repository_id: str
    project_root: Path
    allowed_roots: tuple[Path, ...]
    runtime_root: Path
    tasks: tuple[ProjectTask, ...]
    checks: tuple[ProjectCheck, ...]
    waves: tuple[ProjectWave, ...]
    max_trials: int
    normalized_json: str
    digest: str

    def to_dict(self) -> dict:
        return json.loads(self.normalized_json)


def load_project_profile(path, *, allowed_roots, runtime_root) -> ProjectProfile:
    """Validate all profile/path/DAG inputs without executing a subprocess."""
    value = _read(Path(path), MAX_BYTES, "profile")
    _schema_validate(value)
    roots = tuple(_absolute_directory(r, "allowedRoots") for r in allowed_roots)
    if not roots:
        raise ProfileError("PROFILE_PATH_DENIED", "allowedRoots")
    runtime = _absolute_directory(runtime_root, "runtimeRoot")
    root = _absolute_directory(value["projectRoot"], "projectRoot")
    if not any(root.is_relative_to(r) for r in roots):
        raise ProfileError("PROFILE_PATH_DENIED", "projectRoot")
    for field in ("planDirectory", "reviewDirectory"):
        _, value[field] = _relative(root, value[field], roots, field)
    def indexed(entries, field):
        result = {e["id"]: e for e in entries}
        if len(result) != len(entries):
            raise ProfileError("PROFILE_INVALID", field)
        return result
    stories = indexed(value["stories"], "stories")
    tasks = indexed(value["tasks"], "tasks")
    checks = indexed(value["checks"], "checks")
    indexed(value["waves"], "waves")
    if any(s["epicId"] not in value["epics"] for s in stories.values()):
        raise ProfileError("PROFILE_INVALID", "epicId")
    task_dtos, check_dtos, wave_dtos = [], [], []
    for check in checks.values():
        if any(len(arg.encode("utf-8")) > 8192 for arg in check["argv"]):
            raise ProfileError("PROFILE_INVALID", "argv")
        cwd, check["cwd"] = _relative(root, check["cwd"], roots, "cwd")
        check_dtos.append(ProjectCheck(check["id"], tuple(check["argv"]), cwd, check["timeoutMs"], check["memoryMiB"]))
    for task in tasks.values():
        if task["storyId"] not in stories or any(d not in tasks for d in task["dependsOn"]):
            raise ProfileError("PROFILE_INVALID", "tasks")
        if any(c not in checks for c in task["checkIds"]):
            raise ProfileError("PROFILE_INVALID", "checkIds")
        cwd, task["cwd"] = _relative(root, task["cwd"], roots, "cwd")
        paths = []
        for i, spelling in enumerate(task["writePaths"]):
            resolved, normalized = _relative(root, spelling, roots, "writePaths", kind="write", cwd=cwd)
            if resolved.is_relative_to(runtime) or runtime.is_relative_to(resolved):
                raise ProfileError("PROFILE_PATH_DENIED", "runtimeRoot")
            paths.append(resolved)
            task["writePaths"][i] = normalized
        prompts = []
        for field in ("coderPrompt", "reviewerPrompt"):
            resolved, task[field] = _relative(root, task[field], roots, field, kind="prompt")
            prompts.append(resolved)
        task_dtos.append(ProjectTask(task["id"], task["storyId"], cwd, tuple(paths), tuple(task["conflictKeys"]), tuple(task["dependsOn"]), tuple(task["checkIds"]), *prompts))
    membership = {}
    for index, wave in enumerate(value["waves"]):
        for task_id in wave["taskIds"]:
            if task_id not in tasks or task_id in membership:
                raise ProfileError("PROFILE_INVALID", "taskIds")
            membership[task_id] = index
        if any(c not in checks for c in wave["exitCheckIds"]):
            raise ProfileError("PROFILE_INVALID", "exitCheckIds")
        wave_dtos.append(ProjectWave(wave["id"], tuple(wave["taskIds"]), wave["maxConcurrentTasks"], tuple(wave["exitCheckIds"])))
    if set(membership) != set(tasks):
        raise ProfileError("PROFILE_INVALID", "waves")
    visited, active = set(), set()
    def visit(task_id):
        if task_id in active:
            raise ProfileError("PROFILE_INVALID", "dependsOn")
        if task_id in visited:
            return
        active.add(task_id)
        for dependency in tasks[task_id]["dependsOn"]:
            if membership[dependency] > membership[task_id]:
                raise ProfileError("PROFILE_INVALID", "dependsOn")
            visit(dependency)
        active.remove(task_id)
        visited.add(task_id)
    for task_id in tasks:
        visit(task_id)
    value["storyTasks"] = {s: [t["id"] for t in tasks.values() if t["storyId"] == s] for s in stories}
    value["epicStories"] = {e: [s["id"] for s in stories.values() if s["epicId"] == e] for e in value["epics"]}
    normalized = canonical_json(value)
    return ProjectProfile(value["projectId"], value["repositoryId"], root, roots, runtime, tuple(task_dtos), tuple(check_dtos), tuple(wave_dtos), value["maxTrials"], normalized, _digest(normalized))


@dataclass(frozen=True, slots=True)
class PriorWaveFacts:
    normalized_json: str
    digest: str
    accepted_task_ids: tuple[str, ...]
    blocked_task_ids: tuple[str, ...]

    def to_dict(self):
        return json.loads(self.normalized_json)


def validate_prior_wave_facts(profile: ProjectProfile, wave_id: str, input) -> PriorWaveFacts:
    """History references are local facts, never review or dispatch authority."""
    waves = {w.id: i for i, w in enumerate(profile.waves)}
    if wave_id not in waves:
        raise ProfileError("WAVE_INPUT_INVALID", "waves")
    membership = {task: w.id for w in profile.waves for task in w.task_ids}
    required = []
    for task in profile.tasks:
        if membership[task.id] == wave_id:
            for dependency in task.depends_on:
                if waves[membership[dependency]] < waves[wave_id] and dependency not in required:
                    required.append(dependency)
    if input is None:
        if required:
            raise ProfileError("WAVE_PRIOR_FACTS_MISSING", "priorWaveFacts")
        input = {"schemaVersion": "wave-prior-facts/v1", "projectId": profile.project_id, "profileDigest": profile.digest, "facts": []}
    elif isinstance(input, (str, Path)):
        try:
            path = Path(input)
            resolved = path.resolve(strict=True)
            if str(path) != str(resolved) or not any(resolved.is_relative_to(r) for r in profile.allowed_roots):
                raise ValueError("unsafe facts file")
        except (OSError, RuntimeError, ValueError):
            raise ProfileError("WAVE_INPUT_INVALID", "priorWaveFacts") from None
        input = _read(path, PRIOR_MAX_BYTES, "priorWaveFacts", "WAVE_INPUT_INVALID")
    try:
        normalized = canonical_json(input)
        if len(normalized.encode("utf-8")) > PRIOR_MAX_BYTES:
            raise ValueError("oversized facts")
        value = json.loads(normalized)
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise ProfileError("WAVE_INPUT_INVALID", "priorWaveFacts") from None
    _schema_validate(value, prior=True)
    if value["projectId"] != profile.project_id or value["profileDigest"] != profile.digest:
        raise ProfileError("WAVE_PRIOR_FACTS_CONFLICT", "priorWaveFacts")
    by_task, by_wave = {}, {}
    accepted, blocked = [], []
    for fact in value["facts"]:
        task_id, source = fact["taskId"], fact["sourceWaveId"]
        if task_id not in required or task_id in by_task or membership[task_id] != source:
            raise ProfileError("WAVE_PRIOR_FACTS_CONFLICT", "facts")
        if fact["attempt"] > profile.max_trials:
            raise ProfileError("WAVE_INPUT_INVALID", "attempt")
        signature = (fact["sourceRunId"], fact["resultDigest"], fact["sourceWaveStatus"])
        if source in by_wave and by_wave[source] != signature:
            raise ProfileError("WAVE_PRIOR_FACTS_CONFLICT", "facts")
        by_wave[source], by_task[task_id] = signature, fact
        success = fact["sourceWaveStatus"] == fact["taskStatus"] == "externally_accepted"
        if fact["taskStatus"] == "externally_accepted" and (not fact["reviewEventId"] or not fact["candidateDigest"] or not fact["ownedCleanupConfirmed"]):
            raise ProfileError("WAVE_PRIOR_FACTS_CONFLICT", "facts")
        if fact["sourceWaveStatus"] == "externally_accepted" and not success:
            raise ProfileError("WAVE_PRIOR_FACTS_CONFLICT", "facts")
        (accepted if success else blocked).append(task_id)
    if any(task not in by_task for task in required):
        raise ProfileError("WAVE_PRIOR_FACTS_MISSING", "facts")
    return PriorWaveFacts(normalized, _digest(normalized), tuple(accepted), tuple(blocked))
