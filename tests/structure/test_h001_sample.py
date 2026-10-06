from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path, PurePosixPath

from jsonschema import Draft202012Validator

REPO = Path(__file__).resolve().parents[2]
HERO = REPO / "examples" / "hero"
SCHEMA_PATH = REPO / "schemas" / "doctor-profile-v1.schema.json"
PROFILE_PATH = HERO / "profile.json"
REPOSITORY_PATH = HERO / "repository.json"
PLAN_PATH = HERO / "plan.json"
APP_PATH = HERO / "app" / "index.html"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def assert_safe_relative_path(value: str) -> None:
    path = PurePosixPath(value)
    assert value == path.as_posix()
    assert not path.is_absolute()
    assert value not in {"", "."}
    assert ".." not in path.parts
    assert "\\" not in value


def test_doctor_profile_schema_is_versioned_closed_and_validates_the_sample():
    schema = load_json(SCHEMA_PATH)
    profile = load_json(PROFILE_PATH)

    Draft202012Validator.check_schema(schema)
    validator = Draft202012Validator(schema)
    assert list(validator.iter_errors(profile)) == []
    assert schema["$id"].endswith("/doctor-profile-v1.schema.json")
    assert schema["additionalProperties"] is False
    assert profile["schemaVersion"] == "doctor-profile/v1"

    extra_root = deepcopy(profile)
    extra_root["owner"] = "synthetic-owner"
    assert not validator.is_valid(extra_root)

    extra_selection = deepcopy(profile)
    extra_selection["selections"][0]["rawCommandOutput"] = "not admitted"
    assert not validator.is_valid(extra_selection)

    for unsafe_path in (
        "../repository.json",
        "nested/../repository.json",
        "/absolute/repository.json",
        "C:/repository.json",
    ):
        unsafe_profile = deepcopy(profile)
        unsafe_profile["repository"] = unsafe_path
        assert not validator.is_valid(unsafe_profile)


def test_hero_sample_has_one_closed_portable_repository_plan_profile_and_app():
    assert sorted(
        path.relative_to(HERO).as_posix()
        for path in HERO.rglob("*")
        if path.is_file()
    ) == [
        "app/index.html",
        "plan.json",
        "profile.json",
        "repository.json",
    ]

    profile = load_json(PROFILE_PATH)
    repository = load_json(REPOSITORY_PATH)
    plan = load_json(PLAN_PATH)

    assert set(profile) == {
        "$schema",
        "schemaVersion",
        "profileId",
        "repository",
        "plan",
        "selections",
    }
    assert set(repository) == {
        "schemaVersion",
        "repositoryId",
        "classification",
        "root",
        "entrypoint",
    }
    assert set(plan) == {
        "schemaVersion",
        "planId",
        "repositoryId",
        "goal",
        "steps",
    }

    for relative in (
        profile["repository"],
        profile["plan"],
        repository["root"],
        repository["entrypoint"],
    ):
        assert_safe_relative_path(relative)

    assert (HERO / profile["repository"]).resolve() == REPOSITORY_PATH.resolve()
    assert (HERO / profile["plan"]).resolve() == PLAN_PATH.resolve()
    assert (HERO / repository["root"] / repository["entrypoint"]).resolve() == APP_PATH.resolve()
    assert repository["repositoryId"] == plan["repositoryId"]
    assert repository["classification"] == "unrestricted"

    selection_ids = {selection["id"] for selection in profile["selections"]}
    assert len(selection_ids) == len(profile["selections"])
    assert [step["id"] for step in plan["steps"]] == [
        "draft-change",
        "apply-change",
        "verify-change",
    ]
    for step in plan["steps"]:
        assert set(step) == {
            "id",
            "selectionId",
            "target",
            "instruction",
            "expectedArtifact",
        }
        assert step["selectionId"] in selection_ids
        assert_safe_relative_path(step["target"])
        assert (HERO / step["target"]).resolve() == APP_PATH.resolve()


def test_hero_profile_resolves_only_canonical_roles_models_tools_and_artifacts():
    profile = load_json(PROFILE_PATH)
    repository = load_json(REPOSITORY_PATH)
    plan = load_json(PLAN_PATH)
    canonical = load_json(REPO / "gateway" / "contracts" / "orchestrator-profile-v1.json")
    roles = load_json(REPO / "policies" / "roles.json")["roles"]
    repositories = load_json(REPO / "policies" / "repositories.json")["repositories"]
    capabilities = load_json(REPO / "policies" / "agent-capabilities.json")["agents"]
    tool_catalog = load_json(REPO / "gateway" / "contracts" / "mcp-tools-v1.json")["names"]
    artifact_kinds = load_json(REPO / "schemas" / "artifact.schema.json")["properties"]["kind"]["enum"]

    assert profile["profileId"] == canonical["profileId"] == "canonical-orchestrator"
    registered_repository = repositories[repository["repositoryId"]]
    assert registered_repository["classification"] == repository["classification"]

    selections = {selection["id"]: selection for selection in profile["selections"]}
    for selection in selections.values():
        assert set(selection) == {
            "id",
            "phase",
            "agent",
            "role",
            "model",
            "reasoningEffort",
            "serviceTier",
            "tools",
        }
        assert selection["role"] in canonical["roles"]
        assert selection["role"] in roles

        provider = canonical["providers"][selection["agent"]]
        assert provider["execution"] == "available"
        assert selection["model"] in provider["models"]
        assert selection["reasoningEffort"] in provider["models"][selection["model"]]["reasoningEfforts"]
        if selection["serviceTier"] is None:
            assert provider["serviceTiers"] is None
        else:
            assert selection["serviceTier"] in provider["serviceTiers"]

        agent = capabilities[selection["agent"]]
        assert selection["role"] in agent["allowedRoles"]
        assert repository["classification"] in agent["allowedClassifications"]
        assert selection["agent"] in registered_repository["allowedAgents"]

        workflow = canonical["workflows"][selection["phase"]]
        assert workflow["prerequisites"] == []
        assert set(selection["tools"]) <= set(workflow["tools"])
        assert set(selection["tools"]) <= set(tool_catalog)
        assert set(selection["tools"]) <= set(canonical["toolGuidance"])

    assert {step["expectedArtifact"] for step in plan["steps"]} <= set(artifact_kinds)
    assert {selection["phase"] for selection in selections.values()} == {"plan", "execute"}
    assert not ({"review", "completion"} & {selection["phase"] for selection in selections.values()})


def test_shipped_h001_surfaces_contain_no_owner_paths_credentials_or_secret_canaries():
    paths = [
        SCHEMA_PATH,
        REPO / "scripts" / "bootstrap.sh",
        REPO / "docs" / "doctor.md",
        *sorted(path for path in HERO.rglob("*") if path.is_file()),
    ]
    text = "\n".join(path.read_text(encoding="utf-8") for path in paths)
    lower = text.lower()

    forbidden_fragments = (
        "/home/",
        "/users/",
        "carase",
        "signicat",
        "project_kya",
        "api_key=",
        "password=",
        "token=",
    )
    for fragment in forbidden_fragments:
        assert fragment not in lower

    credential_url = re.compile(r"https?://[^\s/:@]+:[^\s/@]+@")
    secret_assignment = re.compile(
        r"(?i)\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*[a-z0-9._-]{12,}"
    )
    assert credential_url.search(text) is None
    assert secret_assignment.search(text) is None


def test_documented_bootstrap_command_has_an_explicit_checkout_root():
    text = (REPO / "docs" / "doctor.md").read_text(encoding="utf-8")

    assert "From the checkout root, run:" in text
    assert "cd /path/to/agents-orchestrator" in text
    assert "python3" not in text
