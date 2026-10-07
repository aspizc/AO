"""Operator initialization of the shared local wave capacity ledger."""

from __future__ import annotations

import json
from pathlib import Path

import typer

from .output import emit

wave_app = typer.Typer(help="Generic local wave execution.", no_args_is_help=True)


@wave_app.command("budget-init")
def budget_init(
    budget: Path = typer.Option(..., "--budget", help="Absolute budget path in a private local runtime directory."),
    limits: Path = typer.Option(..., "--limits", help="Operator-owned host limits JSON file."),
    output_json: bool = typer.Option(False, "--json", help="Machine-readable output."),
) -> None:
    """Create immutable host limits on a local POSIX filesystem with fsync/flock."""
    from orchestrator_langgraph.wave_budget import (
        MAX_BYTES,
        _json_pairs,
        initialize_budget,
    )
    from orchestrator_langgraph.wave_errors import WaveError

    try:
        try:
            with limits.open("rb") as handle:
                raw = handle.read(MAX_BYTES + 1)
        except OSError:
            raise WaveError("CAPACITY_STATE_UNAVAILABLE", field="limits") from None
        try:
            if len(raw) > MAX_BYTES:
                raise ValueError("oversized limits")
            configured = json.loads(raw, object_pairs_hook=_json_pairs)
        except (ValueError, UnicodeError, RecursionError):
            raise WaveError("CAPACITY_CONFIG_INVALID", field="limits") from None
        result = initialize_budget(budget, configured)
    except WaveError as exc:
        emit(exc.to_dict(), json_mode=output_json)
        raise typer.Exit(code=exc.exit_code) from None
    emit(result, json_mode=output_json)
