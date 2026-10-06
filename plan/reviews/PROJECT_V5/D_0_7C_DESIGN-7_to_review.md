# Project V5 D/0/07c Design Trial 7 — review request

## Candidate

- Design commit:
  `8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d`
  (`design(v5): disclose the combined five-amendment contract for D/0/07c`)
- Adjudicated Trial 6 verdict/base:
  `6188f6d6ac48ac72dc588ac08af741f1b07f58db`
- Trial 6 reviewer A:
  `9e633bf9465959d707062222cb232ceb66f91067` (`reviewed_OK`,
  zero findings)
- Trial 6 reviewer B:
  `6188f6d6ac48ac72dc588ac08af741f1b07f58db` (`reviewed_KO`,
  one P1 and zero P0)
- Design:
  `plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md`

The orchestrator adjudicated reviewer B's single P1 as KO. This candidate
closes only the missing aggregate disclosure. It changes no operative rule
and no per-decision commitment or capability-loss cell.

## Finding and closure

| Finding | Design Trial 7 closure |
|---|---|
| Reviewer B P1-1 — five individually accurate cells did not tell the operator what approving all five amendments permits in combination. | A stand-alone **Combined effect of ratifying all five** subsection now appears immediately below the unchanged table (`design:521-561`). It connects Decision 1 delegated-endpoint traffic, Decision 5 retained-PTY provenance losses, Decision 2 field-exact atomic capture, and the simultaneous terminal cleanup residue from Decisions 2–4. |

The aggregate disclosure states all three required compositions:

1. A delegated, inherited, forked, or replacement holder of the original
   Decision 1 peer endpoint may receive provider output, inject operator
   input, and acknowledge snapshot barriers during unobserved relay or
   tmux-binding drift. It can participate in the same forwarding, drain,
   input, and barrier path as Decision 5 effects (`design:527-535`).
2. Decision 2 remains atomic and field-exact for the current capture act and
   current server/session/pane/process/geometry/history/metadata/`G`, but does
   not establish the producer, production time, foreground job, or binding
   state of content Decision 5 already admitted and rendered. An
   otherwise-valid capture may therefore contain bytes from a different
   producer or time, changed foreground job, or earlier binding state
   (`design:536-543`).
3. One cleanup ledger may contain, at the same time, a port-owned pane/session
   preserved after retained-server-connection loss, residual or replacement
   namespace entries, and the applicable surviving process set. The anchored
   branch may preserve outside-group descendants and the relay; the
   anchor-lost branch may preserve those plus the direct root/original group.
   `PRESERVED` is terminal, so `G` may become `REVOKED` and ordinary
   exactly-once completion may settle while those residuals remain
   (`design:544-558`).

This is the combined active-workload and settled-cleanup picture missing from
Trial 6. It does not reinterpret or revise any individual row.

## Proof that rules and per-decision cells are unchanged

The complete candidate diff against the adjudicated Trial 6 base is one
insertion:

```text
$ git diff --numstat 6188f6d6ac48ac72dc588ac08af741f1b07f58db..8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
42	0	plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md

$ git diff --unified=0 6188f6d6ac48ac72dc588ac08af741f1b07f58db..8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md
@@ -520,0 +521,42 @@ and authorizes no implementation.
```

There are zero deleted or replaced lines. The sole hunk begins after the
five-row table and before the existing all-five gate paragraph. Therefore
every pre-existing operative rule, inventory row, proof obligation, closure,
scope stop, and per-decision cell is byte-for-byte preserved.

As a direct table check, hashing design lines `513-519` at both revisions
produced the same value:

```text
6188f6d...  6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768
8411bd5...  6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768
```

The added subsection itself closes with the explicit boundary: it adds no
authority and changes none of the five commitment or capability-loss cells
(`design:560-561`).

## Validation and scope

- `git diff --check
  6188f6d6ac48ac72dc588ac08af741f1b07f58db..8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d
  -- plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` exited zero.
- The design commit changes exactly one tracked file with `42` insertions and
  `0` deletions.
- No implementation, source, test, fixture, capability, codec, public
  surface, adapter, service, catalog, provider launch, tmux runtime, socket,
  or process state was changed or exercised.
- No runtime gate was run; this is a design-only candidate.
- No D/0/07d, splice, integration, promotion, release, or operator-ratification
  claim is made.
- The pre-existing untracked `gateway/node_modules` directory was not touched.

## Review request

Please review only whether the aggregate subsection:

1. plainly discloses the Decision 5-to-Decision 2 capture-provenance
   composition;
2. makes Decision 1 delegated-holder receive/inject/barrier authority part of
   that same composed path;
3. states the simultaneous process, owned-tmux, and namespace residue plus
   terminal `PRESERVED` settlement; and
4. leaves every independently accepted rule and per-decision cell unchanged,
   as the insertion-only diff demonstrates.
