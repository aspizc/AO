"""Shared output helpers for the operator CLI."""
from __future__ import annotations

import json as _json

import typer
from rich.console import Console
from rich.table import Table

console = Console()


def emit(data, *, json_mode: bool, table_renderer=None) -> None:
    if json_mode:
        typer.echo(_json.dumps(data))
        return
    if table_renderer is not None:
        table_renderer(data)
        return
    typer.echo(_json.dumps(data, indent=2))


def fail(msg: str, *, exit_code: int = 1) -> None:
    typer.echo(f"error: {msg}", err=True)
    raise typer.Exit(code=exit_code)


def render_validate_result(data) -> None:
    if data.get("ok"):
        counts = data["counts"]
        table = Table(show_header=False)
        table.add_column("field")
        table.add_column("value")
        table.add_row("status", "[green]OK[/green]")
        table.add_row("policiesDir", data["policiesDir"])
        table.add_row("agents", str(counts["agents"]))
        table.add_row("repositories", str(counts["repositories"]))
        table.add_row("roles", str(counts["roles"]))
        console.print(table)
        return

    fail(f"FAIL {data.get('code')}: {data.get('message')}", exit_code=1)


def render_audit_table(events) -> None:
    if not events:
        typer.echo("(no events)")
        return

    table = Table(show_header=True, header_style="bold")
    table.add_column("ts")
    table.add_column("type")
    table.add_column("traceId")
    table.add_column("eventId")
    for event in events:
        if event.get("_corrupt"):
            table.add_row("-", "[red]CORRUPT[/red]", "-", "-")
            continue
        table.add_row(
            event.get("timestamp", "-"),
            event.get("type", "-"),
            event.get("traceId", "-"),
            (event.get("eventId", "") or "")[:8],
        )
    console.print(table)


def render_decision(data) -> None:
    color = {
        "allow": "green",
        "deny": "red",
        "require_approval": "yellow",
        "allow_with_sanitization": "cyan",
    }.get(data["decision"], "white")
    console.print(
        f"[{color}]{data['decision'].upper()}[/{color}] "
        f"ruleId={data['ruleId']}  reason={data['reason']}"
    )
