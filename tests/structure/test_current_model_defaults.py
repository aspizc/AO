import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
POLICY_FILES = (
    ROOT / "policies" / "agent-capabilities.json",
    ROOT / "policies" / "profiles" / "kya" / "agent-capabilities.json",
    ROOT / "policies" / "profiles" / "mvp2" / "agent-capabilities.json",
)


def test_active_policy_profiles_share_current_codex_and_claude_defaults():
    for policy_file in POLICY_FILES:
        agents = json.loads(policy_file.read_text(encoding="utf-8"))["agents"]
        codex = agents["codex"]
        claude = agents["claude-code"]

        assert codex["defaultModel"] == "gpt-5.6-sol"
        assert codex["defaultReasoningEffort"] == "max"
        assert codex["defaultServiceTier"] == "priority"
        assert codex["modelAliases"]["gpt-5.6"] == "gpt-5.6-sol"
        assert {"gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"} <= set(codex["models"])

        assert claude["models"] == ["claude-sonnet-5", "claude-fable-5-1", "claude-fable-5", "claude-opus-5", "claude-opus-4-8"]
        assert claude["defaultModel"] == "claude-fable-5"
        assert claude["defaultReasoningEffort"] == "max"
        assert claude["modelAliases"] == {
            "fable": "claude-fable-5",
            "opus": "claude-opus-5",
            "sonnet": "claude-sonnet-5",
        }


def test_active_policy_profiles_share_current_antigravity_defaults():
    for policy_file in POLICY_FILES:
        agents = json.loads(policy_file.read_text(encoding="utf-8"))["agents"]
        antigravity = agents["antigravity"]

        assert antigravity["defaultModel"] == "gemini-3.8-flash-high"
        assert antigravity["defaultReasoningEffort"] == "high"
        assert antigravity["reasoningEfforts"] == ["low", "medium", "high"]
        assert antigravity["modelAliases"] == {
            "gemini-3.8-flash": "gemini-3.8-flash-high",
            "gemini-3.7-flash": "gemini-3.7-flash-high",
            "gemini-3.6-flash": "gemini-3.6-flash-high",
            "gemini-3.5-flash": "gemini-3.5-flash-high",
            "gemini-3.1-pro": "gemini-3.1-pro-high",
        }
        assert set(antigravity["models"]) == {
            "gemini-3.8-flash-high",
            "gemini-3.8-flash-medium",
            "gemini-3.8-flash-low",
            "gemini-3.7-flash-high",
            "gemini-3.7-flash-medium",
            "gemini-3.7-flash-low",
            "gemini-3.6-flash-high",
            "gemini-3.6-flash-medium",
            "gemini-3.6-flash-low",
            "gemini-3.5-flash-high",
            "gemini-3.5-flash-medium",
            "gemini-3.5-flash-low",
            "gemini-3.1-pro-high",
            "gemini-3.1-pro-low",
        }


def test_kya_runner_uses_current_codex_defaults():
    runner = (ROOT / "scripts" / "kya_mcp_task_runner.mjs").read_text(encoding="utf-8")
    wrapper = (ROOT / "scripts" / "kya_run_task_mcp.sh").read_text(encoding="utf-8")

    for text in (runner, wrapper):
        assert "gpt-5.6-sol" in text
        assert "max" in text
        assert "priority" in text
