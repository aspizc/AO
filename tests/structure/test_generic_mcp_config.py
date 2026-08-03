import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CFG = ROOT / "client-config" / "mcp.json.example"
README = ROOT / "client-config" / "README.md"


def test_generic_config_is_valid_json():
    json.loads(CFG.read_text(encoding="utf-8"))


def test_generic_config_uses_gateway_entrypoint():
    data = json.loads(CFG.read_text(encoding="utf-8"))
    args = data["mcpServers"]["agents-gateway"]["args"]
    assert any("gateway/src/mcp_server.js" in arg for arg in args)


def test_generic_config_uses_stdio_transport():
    data = json.loads(CFG.read_text(encoding="utf-8"))
    assert data["mcpServers"]["agents-gateway"]["transport"] == "stdio"


def test_generic_config_has_no_secrets():
    text = CFG.read_text(encoding="utf-8") + "\n" + README.read_text(encoding="utf-8")
    for pattern in ("sk-", "AKIA", "ghp_"):
        assert pattern not in text


def test_generic_config_has_no_ide_specific_keys():
    text = CFG.read_text(encoding="utf-8")
    for forbidden in ("cursor", "Cursor", "antigravity", "Antigravity", ".mdc", ".cursor"):
        assert forbidden not in text


def test_readme_documents_shape_env_and_scope():
    text = README.read_text(encoding="utf-8")
    assert "Server entry shape" in text
    assert "Required env vars" in text
    assert "Out of scope: IDE/host specifics" in text
    assert "AGENTS_WORKSPACE" in text
    assert "AGENTS_REPO_ROOTS" in text
