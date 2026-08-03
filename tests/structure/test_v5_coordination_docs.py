import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ADR = ROOT / "docs" / "adr" / "ADR-V5-01-redis-coordination-plane.md"
RUNBOOK = ROOT / "docs" / "coordination-bus.md"
TOOL_CATALOG = ROOT / "gateway" / "src" / "tools" / "catalog.js"
MESSAGE_SCHEMA = ROOT / "schemas" / "coordination-message.schema.json"

COORDINATION_ENV = {
    "AGENTS_COORDINATION_REDIS_URL",
    "AGENTS_COORDINATION_PREFIX",
    "AGENTS_COORDINATION_SCOPE_ID",
    "AGENTS_COORDINATION_LEASE_DEFAULT_MS",
    "AGENTS_COORDINATION_LEASE_MAX_MS",
    "AGENTS_COORDINATION_INBOX_MAX_LEN",
    "AGENTS_COORDINATION_MAX_BLOCK_MS",
    "AGENTS_COORDINATION_MESSAGE_MAX_BYTES",
    "AGENTS_COORDINATION_DEDUPE_TTL_MS",
    "AGENTS_COORDINATION_ACK_TOMBSTONE_TTL_MS",
    "AGENTS_COORDINATION_ORPHAN_INBOX_TTL_MS",
}

PUBLIC_ERRORS = {
    "INVALID_INPUT",
    "COORDINATION_INVALID_INPUT",
    "COORDINATION_UNAVAILABLE",
    "COORDINATION_INTERNAL_ERROR",
    "COORDINATION_ID_COLLISION",
    "COORDINATION_AUTH_FAILED",
    "COORDINATION_LEASE_EXPIRED",
    "COORDINATION_LEASE_CHANGED",
    "COORDINATION_TARGET_NOT_FOUND",
    "COORDINATION_SCOPE_MISMATCH",
    "COORDINATION_CLASSIFICATION_DENIED",
    "COORDINATION_SECRET_REJECTED",
    "COORDINATION_MESSAGE_TOO_LARGE",
    "COORDINATION_MESSAGE_CONFLICT",
    "COORDINATION_INBOX_FULL",
    "COORDINATION_DELIVERY_NOT_FOUND",
}

WIRE_EVENTS = {
    "participant.joined",
    "participant.heartbeat",
    "participant.left",
    "message.sent",
    "message.acked",
}

ACL_COMMANDS = {
    "EVAL",
    "PING",
    "GET",
    "SET",
    "DEL",
    "EXISTS",
    "TYPE",
    "PERSIST",
    "PEXPIRE",
    "SADD",
    "SISMEMBER",
    "SSCAN",
    "SREM",
    "XADD",
    "XGROUP",
    "XREADGROUP",
    "XPENDING",
    "XAUTOCLAIM",
    "XACK",
    "XDEL",
    "XLEN",
    "XRANGE",
}


def _text(path):
    return path.read_text(encoding="utf-8")


def _heading_section(text, heading):
    start = text.index(heading)
    level = len(heading) - len(heading.lstrip("#"))
    next_heading = re.search(
        rf"^#{{1,{level}}}\s",
        text[start + len(heading):],
        flags=re.MULTILINE,
    )
    end = (
        start + len(heading) + next_heading.start()
        if next_heading
        else len(text)
    )
    return text[start:end]


def test_v5_decision_and_runbook_use_the_shipped_direct_api_and_shapes():
    adr = _text(ADR)
    runbook = _text(RUNBOOK)
    register = _heading_section(runbook, "### `coordination.register`")
    discover = _heading_section(runbook, "### `coordination.discover`")
    unregister = _heading_section(runbook, "### `coordination.unregister`")
    receive = _heading_section(runbook, "### `coordination.receive`")

    assert "Status: accepted" in adr
    assert "createCoordination" in runbook
    assert "gateway/src/coordination.js" in runbook
    assert "strict structural Zod layer" in adr
    assert "Zod-valid MCP calls" in adr
    assert "`INVALID_INPUT`" in adr
    assert "`COORDINATION_*`" in adr
    for stale in (
        "redis_coordination_queue.js",
        "coordinationLeaseTtlMs",
        "coordinationReclaimIdleMs",
        "registered.participant.participantId",
        "peerList.participants",
    ):
        assert stale not in runbook

    assert '"queue"' in register
    assert '"participant": {' not in register
    assert "generated" in register.lower()
    assert "array" in discover.lower()
    assert "caller" in discover.lower()
    assert '"unregistered"' in unregister
    assert "array" in receive.lower()
    assert '"blockMs"' in receive


def test_v5_docs_describe_hybrid_lease_time_and_deferred_orphan_cleanup():
    combined = f"{_text(ADR)}\n{_text(RUNBOOK)}"
    lowered = combined.lower()

    assert "gateway clock" in lowered
    assert "redis ttl" in lowered
    assert "clock synchronization" in lowered
    assert "the lease uses server time" not in lowered
    assert "the server clock, not the client clock" not in lowered
    assert "orphan" in lowered
    assert "unregister" in lowered
    assert "discover" in lowered
    assert "deferred" in lowered


def test_v5_docs_freeze_wire_events_and_three_separate_audit_channels():
    combined = f"{_text(ADR)}\n{_text(RUNBOOK)}"

    for event_type in WIRE_EVENTS:
        assert event_type in combined
    for unsupported in ("participant.expired", "message.received", "message.reclaimed"):
        assert unsupported in combined

    assert "JSONL-only" in combined
    assert "MCP_TOOL_CALL" in combined
    assert "agents:coord:v1:events" in combined
    assert "agents:events" in combined
    assert "does not publish" in combined


def test_v5_runbook_covers_exact_configuration_and_public_errors():
    runbook = _text(RUNBOOK)
    tool_catalog = _text(TOOL_CATALOG)
    message_schema = json.loads(_text(MESSAGE_SCHEMA))

    for env_name in COORDINATION_ENV:
        assert env_name in runbook
    for error_code in PUBLIC_ERRORS:
        assert error_code in runbook

    assert "positive safe integer" in runbook
    assert "rejected" in runbook
    assert re.search(
        r"accepts\s+`AGENTS_COORDINATION_MESSAGE_MAX_BYTES=65536`",
        runbook,
    )
    assert "rejects any larger override" in runbook
    assert "does not\nadvertise a `maxLength`" in runbook
    assert "shared service independently rejects a larger direct configuration" in runbook
    coordination_send = tool_catalog.split(
        'name: "coordination.send"', 1
    )[1].split(
        'name: "coordination.receive"', 1
    )[0]
    assert re.search(
        r"^\s*body:\s*codePointString\(\{\s*minLength:\s*1\s*\}\),\s*$",
        coordination_send,
        re.MULTILINE,
    )
    assert not re.search(r"body:.*maxLength", coordination_send)
    assert message_schema["properties"]["body"]["maxLength"] == 65_536
    assert "does not impose another upper bound" not in runbook


def test_v5_runbook_matches_raw_redis_acl_tls_and_topology_limits():
    runbook = _text(RUNBOOK)
    acl = _heading_section(runbook, "## ACL, TLS, and network isolation")

    for command in ACL_COMMANDS:
        assert f"`{command}`" in acl
    assert "`rediss://`" in acl
    assert "system trust" in acl.lower()
    assert "not covered by the automated acceptance suite" in acl.lower()
    assert "Redis 7 standalone" in runbook
    assert "Redis Cluster" in runbook
    assert "Sentinel" in runbook
    assert "mutates" in runbook
    assert "lease-token digest" in runbook


def test_v5_runbook_has_isolated_no_restart_rollout_and_evidence_map():
    runbook = _text(RUNBOOK)
    lowered = runbook.lower()

    assert "no-restart" in lowered
    assert "shared mcp" in lowered
    assert "AGENTS_TEST_REDIS_URL" in runbook
    assert "UUID" in runbook
    assert "FLUSHDB" in runbook
    for evidence in (
        "tests/gateway/config_paths.test.js",
        "tests/gateway/coordination_contract.test.js",
        "tests/gateway/coordination_factory.test.js",
        "tests/gateway/coordination_audit.test.js",
        "tests/gateway/coordination_two_instance_live.test.js",
    ):
        assert evidence in runbook


def test_v5_docs_have_no_stale_redis_representation_language():
    combined = f"{_text(ADR)}\n{_text(RUNBOOK)}".lower()

    for stale in (
        "scope sorted-set",
        "scope sorted set",
        "participant hash",
    ):
        assert stale not in combined


def test_local_links_in_v5_decision_and_runbook_resolve():
    for document in (ADR, RUNBOOK):
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", _text(document)):
            if re.match(r"^[a-z]+://", target) or target.startswith("#"):
                continue
            path_part = target.split("#", 1)[0]
            assert (document.parent / path_part).resolve().exists(), (
                f"{document.relative_to(ROOT)} has a broken link: {target}"
            )
