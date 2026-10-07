# A/0/02 operator registry migration — 2026-10-07

## Explicit authorization

The operator answered the concrete proposed-patch question:

> Sí, autorizo ese parche y conservar las entradas en configuración local

This authorizes only removal of `engineering_graph` and `kya` from the public
base and KYA repository registries, and `engineering_graph` from MVP2, with
those registrations preserved locally. It overrides AGENTS Rule 15 only for
this reviewed patch; it grants no general policy-edit authority.

## Applied scope and preservation

Root applied `workspace/a02-evidence/operator-registry-removal.PROPOSED.patch`
after `git apply --check`. Each resulting JSON object was compared with its
original minus only the approved IDs. No roles, permissions, model selections,
classifications, allowedAgents or tags were changed.

The original entry union was saved outside the checkout at
`/home/carase/.config/agents-gateway/AO/repositories-v6-2026-10-07.json`, mode
0600. Its exact values were compared with the original registrations before
application. The corresponding AO-local environment file is
`/home/carase/.config/agents-gateway/AO/repositories.env`, also mode 0600.
Neither local file is part of the publication candidate.

The active Codex launcher points to the sibling agents-orchestrator checkout,
whose registry still contains these IDs. Adding this overlay there would cause
collisions. That launcher was preserved. A fresh isolated Gateway process from
the A/0/02 candidate successfully initialized with the local overlay, listed
its tools, and was closed; no provider was invoked. Use the saved environment
when switching the local launcher to the integrated AO candidate. No live
Gateway restart or launcher switch is claimed here.

## Verification

- Effective registry validator with the actual preserved local file: valid,
  6 agents, 7 repositories, 10 roles.
- Public hygiene scanner on staged publication inputs: zero findings.
- Root focal checks after migration and gate wiring: 32 passed, 0 failed,
  0 skipped. The required-lane test first failed because public.hygiene was
  absent, then passed after manifest and contract integration.
- The implementation full gate and independent review are separate evidence;
  this authorization does not mark the sheet implemented or released.

The policy commit precedes final candidate review. The earlier coder's
prepared handoff is immutable and describes the state before this operator
answer and root integration, not the final review candidate.
