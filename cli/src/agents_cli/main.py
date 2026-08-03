"""agent-run operator CLI for the agents-orchestrator project."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

import typer

from .output import (
    emit,
    fail,
    render_audit_table,
    render_decision,
    render_validate_result,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
VALIDATOR = REPO_ROOT / "gateway" / "scripts" / "validate-registries.mjs"
AUDIT_QUERY = REPO_ROOT / "gateway" / "scripts" / "query-audit.mjs"
POLICY_CHECK = REPO_ROOT / "gateway" / "scripts" / "policy-check.mjs"
APPROVAL_RESPOND = REPO_ROOT / "gateway" / "scripts" / "approval-respond.mjs"

app = typer.Typer(
    name="agent-run",
    help="Operator CLI for agents-orchestrator (V4).",
    no_args_is_help=True,
    add_completion=False,
)

policy_app = typer.Typer(help="Policy validation and ad-hoc checks.")
audit_app = typer.Typer(help="Inspect the local audit log.")

app.add_typer(policy_app, name="policy")
app.add_typer(audit_app, name="audit")


def _version() -> str:
    try:
        return version("agents-cli")
    except PackageNotFoundError:
        return "0.0.0+local"


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(_version())
        raise typer.Exit()


@app.callback()
def _root(
    _v: bool = typer.Option(
        False,
        "--version",
        callback=_version_callback,
        is_eager=True,
        help="Show CLI version and exit.",
    ),
) -> None:
    """Root callback used to wire global options."""


@policy_app.command("validate")
def policy_validate(
    policies_dir: Path | None = typer.Option(
        None,
        "--policies-dir",
        help="Defaults to AGENTS_POLICIES_DIR or repo policies/.",
    ),
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Validate registries (agent-capabilities, repositories, roles)."""
    if shutil.which("node") is None:
        fail("'node' is not on PATH", exit_code=2)
    if not VALIDATOR.is_file():
        fail(f"validator not found at {VALIDATOR}", exit_code=2)

    env = os.environ.copy()
    if policies_dir:
        env["AGENTS_POLICIES_DIR"] = str(policies_dir)

    proc = subprocess.run(
        ["node", str(VALIDATOR)],
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    out = proc.stdout.strip()
    try:
        data = json.loads(out)
    except json.JSONDecodeError:
        fail(out, exit_code=proc.returncode or 1)

    if output_json:
        emit(data, json_mode=True)
        raise typer.Exit(code=0 if data.get("ok") else 1)

    emit(data, json_mode=False, table_renderer=render_validate_result)
    raise typer.Exit(code=0)


@policy_app.command("check")
def policy_check(
    agent: str = typer.Option(..., "--agent", help="Agent id to evaluate."),
    role: str = typer.Option(..., "--role", help="Role assumed by the agent."),
    action: str = typer.Option(..., "--action", help="Action to evaluate."),
    repo: str | None = typer.Option(None, "--repo", help="Repository id, when relevant."),
    artifact_kind: str | None = typer.Option(None, "--artifact-kind", help="Artifact kind."),
    artifact_classification: str | None = typer.Option(
        None,
        "--artifact-classification",
        help="Artifact classification.",
    ),
    target_agent: str | None = typer.Option(None, "--target-agent", help="Target agent for delegation."),
    target_role: str | None = typer.Option(None, "--target-role", help="Target role for delegation."),
    target_branch: str | None = typer.Option(None, "--target-branch", help="Target branch for git actions."),
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Run an ad-hoc policy check."""
    if shutil.which("node") is None:
        fail("'node' is not on PATH", exit_code=2)
    if not POLICY_CHECK.is_file():
        fail(f"policy check script not found at {POLICY_CHECK}", exit_code=2)

    cmd = [
        "node",
        str(POLICY_CHECK),
        "--agent",
        agent,
        "--role",
        role,
        "--action",
        action,
    ]
    for flag, value in [
        ("--repo", repo),
        ("--artifact-kind", artifact_kind),
        ("--artifact-classification", artifact_classification),
        ("--target-agent", target_agent),
        ("--target-role", target_role),
        ("--target-branch", target_branch),
    ]:
        if value:
            cmd.extend([flag, value])

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        fail(proc.stderr.strip(), exit_code=proc.returncode)

    try:
        data = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        fail(proc.stdout, exit_code=1)

    if output_json:
        emit(data, json_mode=True)
    else:
        emit(data, json_mode=False, table_renderer=render_decision)

    raise typer.Exit(code=0 if data["decision"] == "allow" else 1)


@audit_app.command("show")
def audit_show(
    trace_id: str | None = typer.Option(None, "--trace-id", help="Filter by traceId."),
    event_type: str | None = typer.Option(None, "--type", help="Filter by audit event type."),
    limit: int = typer.Option(50, "--limit", help="Maximum number of most recent events."),
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Show audit events."""
    if shutil.which("node") is None:
        fail("'node' is not on PATH", exit_code=2)
    if not AUDIT_QUERY.is_file():
        fail(f"audit query script not found at {AUDIT_QUERY}", exit_code=2)

    cmd = ["node", str(AUDIT_QUERY), "--limit", str(limit)]
    if trace_id:
        cmd.extend(["--trace-id", trace_id])
    if event_type:
        cmd.extend(["--type", event_type])

    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        fail(proc.stderr.strip(), exit_code=proc.returncode)

    try:
        events = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError:
        fail(proc.stdout, exit_code=1)

    if output_json:
        emit(events, json_mode=True)
        return

    emit(events, json_mode=False, table_renderer=render_audit_table)


@app.command("approve")
def approve(
    approval_id: str = typer.Argument(..., help="Approval id to decide."),
    decision: str = typer.Option(..., "--decision", "-d", help="granted|denied"),
    note: str = typer.Option("", "--note", help="Optional operator note."),
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Resolve a pending approval."""
    if shutil.which("node") is None:
        fail("'node' is not on PATH", exit_code=2)
    if decision not in ("granted", "denied"):
        fail("--decision must be granted|denied", exit_code=2)
    if not APPROVAL_RESPOND.is_file():
        fail(f"approval respond script not found at {APPROVAL_RESPOND}", exit_code=2)

    proc = subprocess.run(
        [
            "node",
            str(APPROVAL_RESPOND),
            "--approval-id",
            approval_id,
            "--decision",
            decision,
            "--decided-by",
            "operator",
            "--note",
            note,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    try:
        data = json.loads(proc.stdout or "{}")
    except json.JSONDecodeError:
        fail(proc.stdout, exit_code=1)

    if output_json:
        emit(data, json_mode=True)
    elif "error" in data:
        fail(data["error"], exit_code=1)
    else:
        typer.echo(f"{approval_id}: {data.get('status', 'unknown')}")

    raise typer.Exit(code=0 if proc.returncode == 0 and "error" not in data else 1)


if __name__ == "__main__":
    app()
