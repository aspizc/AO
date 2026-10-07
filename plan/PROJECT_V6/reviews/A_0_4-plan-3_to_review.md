# A/0/04 guarded runtime prerequisite — plan review, trial 3

Base: `186ce1d03e824fe526a61927812aa2593a81b28e`.
Trace: `tr-r3-a04-plan-b47869dd-e0b7-486c-967d-0329451be647`.

| Candidate | Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/04.md` | `bd71514b075eb6e47d59ec8edb9850d791de503b` |
| `plan/PROJECT_V6/A/0/04-transport.md` | `3a3ea0d785f49d361ad439838dc247dd2d2fb320` |
| `plan/PROJECT_V6/SHEETS.md` | `177d004119ef54200d24dd155689fb77792144bc` |
| `plan/PROJECT_V6/A/README.md` | `7b8e0f46c399209ee6eeaad552ae813a0fd3d4b5` |

Trial 2 was reviewed OK, but implementation found that the pinned tmux
runtime exposes no current pane bracketed-paste mode observation. Its `-p`
falls back to raw bytes when the mode is disabled. This addendum supplies the
missing primitive: guarded `paste-buffer -G -p -r`, checked atomically in
the existing pinned runtime, versioned as `3.6a-agents.2`.

The guard must refuse with zero input when framing cannot be established;
the capture extension stays byte-identical. Exact-byte terminal fixtures and
existing retained-capture tests distinguish behavior. Vendor/runtime pin
changes are necessary scope, not policy or process-authority changes.
CP1 runtime and CP2 adapter are checkpoints in the existing A/0/04 leaf;
V6 stays seven sheets. Provider acceptance and the final combined gate remain
required, and prohibited Claude live verification stays deferred.

Review the four blobs only, including upstream applicability, feature refusal,
atomicity and scope. A/0/04 implementation is in a separate worktree; no vendor
change has been authorized before this review. `git diff --check` passes.
Use a fresh independent Codex reviewer, no Claude, no implementation or full
gate. Write one immutable verdict. Other V7 changes are outside scope.
