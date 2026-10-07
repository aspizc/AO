# A_0_2 — AO snapshot decisions pending

Status: pending operator answer. This is an additional gate in the imported
plan, separate from the three decisions already supplied on 2026-10-07.
Planning/preparation may proceed; dependent implementation remains gated.

## Concrete decisions

1. Keep the KYA profile, prompt templates and runbook as parameterized public
   examples (recommended), or remove them from the public snapshot?
2. Keep historical plan/audit/review documents intact with an explicit
   history allowlist (recommended), redact their personal paths, or exclude
   those documents from the public snapshot?

AO's .mcp.json is already untracked and portable examples exist under
client-config/. Preserve that baseline. Personal live registrations remaining
in the base registry are engineering_graph and kya; source-only registrations
and machine configuration are outside this import. Production policies are
not changed by this preparation commit.

No option in this file is approved by an agent. Record a later operator answer
in a separate decision file and link it from the sheet and decision index.
