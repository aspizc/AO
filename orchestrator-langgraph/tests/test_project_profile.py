"""Profiles must establish bounded inputs before any execution authority."""

import json
from dataclasses import FrozenInstanceError
from uuid import uuid4

import pytest

from orchestrator_langgraph.project_profile import (
    ProfileError,
    load_project_profile,
    validate_prior_wave_facts,
)


@pytest.fixture
def project(tmp_path):
    root = tmp_path / "sample-apps"
    root.mkdir()
    for folder in ("plan/stories", "reviews", "src", "prompts"):
        (root / folder).mkdir(parents=True, exist_ok=True)
    (root / "prompts/coder.txt").write_text("private-prompt-canary")
    (root / "prompts/reviewer.txt").write_text("review")
    runtime = tmp_path / "runtime"
    runtime.mkdir()
    value = {
        "schemaVersion": "project-profile/v1", "projectId": "demo", "repositoryId": "sample-apps",
        "projectRoot": str(root), "planDirectory": "plan/stories", "reviewDirectory": "reviews",
        "roles": {"orchestrator": {"agent": "codex", "role": "orchestrator"},
                  "coder": {"agent": "codex", "role": "coder", "model": "gpt-6.1"},
                  "reviewer": {"agent": "codex", "role": "reviewer"}},
        "epics": ["foundation"], "stories": [{"id": "story", "epicId": "foundation"}],
        "checks": [{"id": "unit", "argv": ["python3", "-c", "print('key=value\\nnext')"],
                    "cwd": ".", "timeoutMs": 1000, "memoryMiB": 32}],
        "tasks": [{"id": name, "storyId": "story", "cwd": ".", "writePaths": ["src/output.txt"],
                   "conflictKeys": ["shared"], "dependsOn": [] if name == "first" else ["first"],
                   "checkIds": ["unit"], "coderPrompt": "prompts/coder.txt", "reviewerPrompt": "prompts/reviewer.txt"}
                  for name in ("first", "second")],
        "waves": [{"id": "early", "taskIds": ["first"], "maxConcurrentTasks": 1, "exitCheckIds": ["unit"]},
                  {"id": "later", "taskIds": ["second"], "maxConcurrentTasks": 1, "exitCheckIds": ["unit"]}],
        "maxTrials": 3, "pollIntervalMs": 100,
        "memoryReservations": {"gatewayMiB": 64, "coderMiB": 256, "reviewerMiB": 128},
    }
    path = tmp_path / "profile.json"
    def load():
        path.write_text(json.dumps(value))
        return load_project_profile(path, allowed_roots=[tmp_path], runtime_root=runtime)
    return value, load, root, runtime


def test_profile_rejects_cycle_before_any_subprocess(project, monkeypatch):
    import subprocess
    monkeypatch.setattr(subprocess, "Popen", lambda *a, **k: pytest.fail("invalid profile launched work"))
    value, load, _, _ = project
    value["tasks"][0]["dependsOn"] = ["second"]
    with pytest.raises(ProfileError, match="PROFILE_INVALID"):
        load()


def test_profile_rejects_symlink_escape_and_absent_parent(project, tmp_path):
    value, load, root, _ = project
    (root / "escape").symlink_to(tmp_path)
    (root / "dangling").symlink_to(tmp_path / "absent-target")
    for name in ("escape/new.txt", "missing/parent/new.txt", "../secret-path-canary", "dangling"):
        value["tasks"][0]["writePaths"] = [name]
        with pytest.raises(ProfileError, match="PROFILE_PATH_DENIED"):
            load()


def test_profile_cannot_enlarge_operator_allowed_roots(project, tmp_path):
    value, load, _, runtime = project
    value["allowedRoots"] = [str(tmp_path)]
    with pytest.raises(ProfileError):
        load()
    del value["allowedRoots"]
    load()
    path = tmp_path / "profile.json"
    with pytest.raises(ProfileError, match="PROFILE_PATH_DENIED"):
        load_project_profile(path, allowed_roots=[runtime], runtime_root=runtime)


@pytest.mark.parametrize("change", ["missing", 0, True, 1.0, 1.5, 1048577])
def test_missing_or_invalid_memory_declarations_fail_before_launch(project, change):
    value, load, _, _ = project
    if change == "missing":
        del value["memoryReservations"]["coderMiB"]
    else:
        value["memoryReservations"]["coderMiB"] = change
    with pytest.raises(ProfileError):
        load()


@pytest.mark.parametrize("damage", ["unknown", "id", "edge", "membership", "timeout", "boolean", "argv", "control", "story"])
def test_closed_schema_and_dag_reject_ambiguous_inputs(project, damage):
    value, load, _, _ = project
    if damage == "unknown":
        value["tasks"][0]["token-canary"] = "secret"
    elif damage == "id":
        value["tasks"][1]["id"] = "first"
    elif damage == "edge":
        value["tasks"][1]["dependsOn"] = ["first", "first"]
    elif damage == "membership":
        value["waves"][1]["taskIds"].append("first")
    elif damage == "timeout":
        value["checks"][0]["timeoutMs"] = 99
    elif damage == "boolean":
        value["maxTrials"] = True
    elif damage == "argv":
        value["checks"][0]["argv"] = ["a" * 8193]
    elif damage == "control":
        value["tasks"][0]["cwd"] = "src\nsecret"
    else:
        value["tasks"][0]["storyId"] = "unknown"
    with pytest.raises(ProfileError) as error:
        load()
    assert "canary" not in str(error.value) + json.dumps(error.value.to_dict())


def test_normalization_digest_and_dtos_are_immutable(project):
    value, load, _, _ = project
    profile = load()
    assert profile.to_dict()["storyTasks"] == {"story": ["first", "second"]}
    assert profile.to_dict()["checks"][0]["argv"] == value["checks"][0]["argv"]
    with pytest.raises(FrozenInstanceError):
        profile.project_id = "changed"
    value["tasks"][0]["id"] = "changed"
    assert profile.tasks[0].id == "first"


def test_bounded_profile_and_prompt_and_runtime_write_conflicts(project, tmp_path):
    value, load, root, runtime = project
    (root / "prompts/coder.txt").write_bytes(b"x" * (256 * 1024 + 1))
    with pytest.raises(ProfileError, match="PROFILE_PATH_DENIED"):
        load()
    (root / "prompts/coder.txt").write_text("prompt-canary")
    value["checks"][0]["argv"] = ["é" * 4097]
    with pytest.raises(ProfileError, match="PROFILE_INVALID"):
        load()
    value["checks"][0]["argv"] = ["node", "key=value\nnext"]
    value["tasks"][0]["writePaths"] = ["src"]
    load()
    from orchestrator_langgraph.project_profile import load_project_profile
    with pytest.raises(ProfileError, match="PROFILE_PATH_DENIED"):
        load_project_profile(tmp_path / "profile.json", allowed_roots=[tmp_path], runtime_root=root / "src")
    (tmp_path / "profile.json").write_bytes(b" " * (1024 * 1024 + 1))
    with pytest.raises(ProfileError, match="PROFILE_INVALID"):
        load_project_profile(tmp_path / "profile.json", allowed_roots=[tmp_path], runtime_root=runtime)


def facts(profile):
    return {"schemaVersion": "wave-prior-facts/v1", "projectId": profile.project_id,
            "profileDigest": profile.digest, "facts": [{"sourceRunId": str(uuid4()), "sourceWaveId": "early",
            "taskId": "first", "attempt": 1, "sourceWaveStatus": "externally_accepted",
            "taskStatus": "externally_accepted", "resultDigest": "sha256:" + "a" * 64,
            "reviewEventId": str(uuid4()), "candidateDigest": "sha256:" + "b" * 64,
            "ownedCleanupConfirmed": True}]}


def test_prior_wave_facts_match_project_profile_task_and_wave_before_launch(project):
    profile = project[1]()
    history = facts(profile)
    result = validate_prior_wave_facts(profile, "later", history)
    assert result.accepted_task_ids == ("first",) and result.blocked_task_ids == ()
    assert result.to_dict() == history
    history["facts"][0]["taskStatus"] = "failed"
    history["facts"][0]["sourceWaveStatus"] = "failed"
    history["facts"][0]["reviewEventId"] = None
    history["facts"][0]["candidateDigest"] = None
    assert validate_prior_wave_facts(profile, "later", history).blocked_task_ids == ("first",)


def test_missing_or_contradictory_prior_facts_cannot_manufacture_readiness(project):
    profile = project[1]()
    with pytest.raises(ProfileError, match="WAVE_PRIOR_FACTS_MISSING") as error:
        validate_prior_wave_facts(profile, "later", None)
    assert error.value.exit_code == 5
    for field, bad in (("projectId", "foreign"), ("profileDigest", "sha256:" + "f" * 64)):
        history = facts(profile)
        history[field] = bad
        with pytest.raises(ProfileError, match="WAVE_PRIOR_FACTS_CONFLICT"):
            validate_prior_wave_facts(profile, "later", history)
    for field, bad in (("sourceWaveId", "later"), ("ownedCleanupConfirmed", False), ("reviewEventId", None)):
        history = facts(profile)
        history["facts"][0][field] = bad
        with pytest.raises(ProfileError, match="WAVE_PRIOR_FACTS_CONFLICT"):
            validate_prior_wave_facts(profile, "later", history)
