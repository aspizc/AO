import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
THREAT_MODEL = ROOT / "docs" / "threat-model.md"
BYPASS = ROOT / "tests" / "e2e" / "bypass_regression.test.js"


def threat_ids():
    text = THREAT_MODEL.read_text(encoding="utf-8")
    return sorted(set(re.findall(r"### (TM-\d+)", text)))


def test_bypass_suite_exists():
    assert BYPASS.is_file()


def test_every_threat_id_has_bypass_test_comment():
    text = BYPASS.read_text(encoding="utf-8")

    for threat_id in threat_ids():
        assert f"// threat: {threat_id}" in text


def test_threat_model_points_to_bypass_suite():
    text = THREAT_MODEL.read_text(encoding="utf-8")

    for threat_id in threat_ids():
        section = text.split(f"### {threat_id}", 1)[1].split("### TM-", 1)[0]
        assert "tests/e2e/bypass_regression.test.js" in section
