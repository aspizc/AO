import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ROOT_README = ROOT / "README.md"
ARCHITECTURE = ROOT / "docs" / "architecture.md"
THREAT_MODEL = ROOT / "docs" / "threat-model.md"
GATEWAY_README = ROOT / "gateway" / "README.md"
CLIENT_README = ROOT / "client-config" / "README.md"
CHANGELOG = ROOT / "CHANGELOG.md"

COORDINATION_TOOLS = {
    "coordination.status",
    "coordination.register",
    "coordination.heartbeat",
    "coordination.discover",
    "coordination.unregister",
    "coordination.send",
    "coordination.receive",
    "coordination.ack",
}

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


def _text(path):
    return path.read_text(encoding="utf-8")


def test_v5_architecture_converges_mcp_and_direct_coordination():
    text = _text(ARCHITECTURE)

    assert "V5 implementation view" in text
    assert "createCoordination" in text
    assert "gateway/src/coordination.js" in text
    assert "coordination service" in text
    assert "Redis 7 standalone" in text
    assert "JSONL-only" in text
    assert "`agents:events`" in text
    assert "message.*" in text
    assert "not a standalone" in text.lower()
    assert "Direct child-to-child channels." not in text


def test_v5_threat_model_covers_coordination_abuse_with_real_tests():
    text = _text(THREAT_MODEL)
    v5_start = text.index("### TM-13")
    v5_threats = text[v5_start:]

    for threat_id in range(13, 20):
        assert f"TM-{threat_id:02d}" in v5_threats
    for concern in (
        "Stale lease",
        "body injection",
        "token, digest",
        "Cross-scope",
        "Raw Redis",
        "legacy audit Stream",
        "dedupe window",
    ):
        assert concern.lower() in v5_threats.lower()
    assert "metadata is public" in v5_threats
    assert "not secret-scanned" in v5_threats
    assert "`agents:events`" in v5_threats

    referenced_tests = set(re.findall(r"`(tests/[^`]+\.test\.js)`", v5_threats))
    assert referenced_tests
    for test_path in referenced_tests:
        assert (ROOT / test_path).is_file(), f"missing V5 threat test: {test_path}"


def test_gateway_runtime_docs_cover_the_exact_v5_surface_and_rollout():
    text = _text(GATEWAY_README)

    for tool_name in COORDINATION_TOOLS:
        assert tool_name in text
    for env_name in COORDINATION_ENV:
        assert env_name in text
    for required in (
        "COORDINATION_UNAVAILABLE",
        "Redis 7 standalone",
        "at least once",
        "JSONL",
        "`agents:events`",
        "No-restart rollout",
        "shared MCP",
        "65,536",
    ):
        assert required in text
    for message_tool in ("message.send", "message.list", "message.reply"):
        assert message_tool in text
    assert re.search(r"never use\s+`FLUSHDB`", text)


def test_product_readmes_expose_v5_without_redefining_legacy_surfaces():
    root_text = _text(ROOT_README)
    client_text = _text(CLIENT_README)

    for tool_name in COORDINATION_TOOLS:
        assert tool_name in root_text
    for text in (root_text, client_text):
        assert "AGENTS_COORDINATION_REDIS_URL" in text
        assert "AGENTS_COORDINATION_PREFIX" in text
        assert "COORDINATION_UNAVAILABLE" in text
        assert "docs/coordination-bus.md" in text

    assert "three message-tool" in root_text
    assert "contracts" in root_text
    assert "`agents:events`" in root_text
    assert "Postgres, Redis Streams, event bus" not in root_text


def test_changelog_records_additive_v5_and_current_claude_alias():
    text = _text(CHANGELOG)
    unreleased = text.split("## Unreleased", 1)[1]

    assert "Project V5" in unreleased
    assert "eight additive" in unreleased
    assert "`coordination.*`" in unreleased
    assert "`message.*`" in unreleased
    assert "`agents:events` remain unchanged" in unreleased
    assert "resolves" in unreleased
    assert "`opus` alias to Opus 5" in unreleased
