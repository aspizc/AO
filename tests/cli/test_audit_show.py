import json
import shutil

import pytest
from typer.testing import CliRunner

from agents_cli.main import app

runner = CliRunner()


def _write_audit(tmp_path, events):
    audit = tmp_path / "audit" / "events.jsonl"
    audit.parent.mkdir(parents=True, exist_ok=True)
    audit.write_text("".join(f"{json.dumps(event)}\n" for event in events), encoding="utf-8")
    return audit


def test_audit_show_empty(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))

    result = runner.invoke(app, ["audit", "show"])

    assert result.exit_code == 0
    assert "(no events)" in result.stdout


def test_audit_show_trace_id(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    _write_audit(
        tmp_path,
        [
            {
                "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "timestamp": "2026-01-01T00:00:00.000Z",
                "type": "A",
                "traceId": "t1",
            },
            {
                "eventId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "timestamp": "2026-01-01T00:00:01.000Z",
                "type": "A",
                "traceId": "t2",
            },
        ],
    )

    result = runner.invoke(app, ["audit", "show", "--trace-id", "t2"])

    assert result.exit_code == 0
    assert "t2" in result.stdout
    assert "t1" not in result.stdout


def test_audit_show_type_filter(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    _write_audit(
        tmp_path,
        [
            {
                "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "timestamp": "2026-01-01T00:00:00.000Z",
                "type": "TYPE_A",
                "traceId": "t1",
            },
            {
                "eventId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
                "timestamp": "2026-01-01T00:00:01.000Z",
                "type": "TYPE_B",
                "traceId": "t1",
            },
        ],
    )

    result = runner.invoke(app, ["audit", "show", "--type", "TYPE_B"])

    assert result.exit_code == 0
    assert "TYPE_B" in result.stdout
    assert "TYPE_A" not in result.stdout


def test_audit_show_json_mode_emits_valid_json(tmp_path, monkeypatch):
    if shutil.which("node") is None:
        pytest.skip("node not available")
    monkeypatch.setenv("AGENTS_WORKSPACE", str(tmp_path))
    _write_audit(
        tmp_path,
        [
            {
                "eventId": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                "timestamp": "2026-01-01T00:00:00.000Z",
                "type": "TYPE_A",
                "traceId": "t1",
            }
        ],
    )

    result = runner.invoke(app, ["audit", "show", "--json"])

    assert result.exit_code == 0
    parsed = json.loads(result.stdout)
    assert parsed[0]["type"] == "TYPE_A"
