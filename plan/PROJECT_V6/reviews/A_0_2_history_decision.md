# A_0_2 — Historical document retention: operator decision

Recorded on 2026-10-07 from the operator's explicit response in this session.
This records human intent, not an agent-issued approval.

The operator selected: preserve historical plan, audit and review documents
intact and exempt those historical paths from the public hygiene scanner;
clean personal paths in current code and examples.

The history allowlist is restricted to the I-4 inventory in A/0/02:
`plan/**`, `audit/**`, `plan_proyecto_v4.md`, and
`tareas_implementacion_v4.md`. Current executable code, runtime defaults,
configuration and public examples are not historical exemptions. Synthetic
home-path test canaries retain a separate exact path/literal allowlist.

This decision resolves historical-publication handling only. It does not
authorize agents to edit `policies/`, change permissions, rewrite Git
history, claim runtime verification or release an unfinished candidate.
