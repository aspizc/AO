# Project V5 D/0/07c Design Trial 7 — reviewer A result

reviewed_OK

## Review boundary and outcome

I reviewed candidate design commit
`8411bd5b607d2a98cfe09bc2be0d4d405f2adf5d` against the adjudicated
Trial 6 base
`6188f6d6ac48ac72dc588ac08af741f1b07f58db` and the binding
specification in
`plan/reviews/PROJECT_V5/D_0_7C_DESIGN-6_result_b.md`. I also verified
that request commit
`41a4ed8fc62507847fab9db93535b1961aca48fe` does not alter the
candidate design.

The new **Combined effect of ratifying all five** subsection is true,
complete against the adjudicated P1, and placed where it cannot be separated
from the five-line ratification gate. Every claim is supported by an
operative rule, inventory row, or unchanged decision cell. I found no
overstatement, understatement, remaining undisclosed cross-decision
composition, or silent operative change.

This OK authorizes implementation only. It is not operator ratification,
decides none of the five operator questions, and authorizes no integration,
promotion, release, D/0/07d gate, or adapter/service/catalog splice.

## Severity

| Severity | Count | Ruling |
|---|---:|---|
| P0 | 0 | No unsafe authority, targeting, ordering, or revival change. |
| P1 | 0 | The combined active-workload provenance loss and simultaneous terminal cleanup residue are now disclosed as one contract. |
| P2 | 0 | No advisory defect. |

## Claim-by-claim truth check

Below, `design:` references mean
`plan/PROJECT_V5/D/0/07c-DESIGN-post-accept-binding.md` at the review
request.

| New claim | Ruling and operative support |
|---|---|
| All five losses can compose in one generation; the individual rows are not an end-to-end provenance guarantee (`design:523-525`). | **True.** Decisions 1, 2, and 5 bind their effects to the same live `G`, and all five approvals are one gate (`design:244-250,264-272,294-306,509-511,563-571`). Nothing in an individual exact effect restores a live facet another approved amendment removed. |
| A delegated, inherited, forked, or replacement holder of the original Decision 1 peer endpoint may receive provider output, inject operator input, and acknowledge barriers during unobserved relay or tmux-binding drift (`design:527-530`). | **True and correctly bounded to the original endpoint.** Current-holder continuity and live relay facets cease to be authority; delegation of the original connected object is accepted, while reconnect and re-resolution remain forbidden (`design:244-262,515`). The input, provider-output, and barrier inventory rows all use that retained socket without an effect-time holder check (`design:466,470-473`). |
| Decision 5 may admit output from another producer/time, changed foreground, or earlier binding state and may write to a changed foreground job or geometry (`design:530-533`). | **True.** One retained-master read assigns its whole returned range to `G` without production-time provenance, including pre-acceptance buffering and mixed holders/times; the removed live facets include foreground, winsize, producer, utility, helper/reaper/supervisor, and terminal bindings. Retained-master writes have the same admitted live-facet race (`design:264-292,467,469,474,519`). |
| The delegated endpoint holder can take part in the forwarding, input, drain, and barrier path for those same Decision 5 effects; the losses are not independent (`design:533-535`). | **True.** Accepted Decision 5 output is sent through the Decision 1 socket, snapshot drain has no transfer exception, and barrier request/acknowledgement uses that socket before capture (`design:470-475`). Conversely, input admitted from that socket is written through the Decision 5 retained-master authority (`design:466-469`). |
| Decision 2 remains atomic and field-exact for the current capture act (`design:536-538`). | **True.** The complete retained-connection record contains the current server/session/pane/process, geometry, history, metadata, capture bytes, and generation; the custom operation compares/captures in one server-event-loop operation and binds the result to `G` at `E_capture` (`design:294-322,475,516`). |
| Atomic capture does not establish the production provenance of already admitted and rendered Decision 5 content, so an otherwise-valid capture can contain bytes from another producer/time, changed foreground, or earlier binding (`design:538-543`). | **True.** Producer/time/foreground/binding provenance is deliberately absent from Decision 5 authority (`design:274-292,519`). The inventory forwards that accepted range, applies the same rules to snapshot drain, and then captures rendered pane state (`design:469-476`). Decision 2 proves the current capture fields and instant; it supplies no missing production-time field and cannot retroactively repair it. |
| One cleanup ledger may finish with the owned pane/session, namespace entries or replacements, and the applicable process-survivor set all present at once (`design:544-553`). | **True.** All exact owned targets are sealed into the finite ledger for `G`, and each independently becomes `RETIRED` or `PRESERVED` (`design:134-167`). Retained-server loss preserves the owned pane/session; pathname cleanup preserves owned or replacement key/socket/directory entries; and the process rules preserve unresolved unanchored targets (`design:378-426,483-489,516-518`). No rule makes those outcomes mutually exclusive. |
| With the anchor held, outside-group descendants and a non-cooperative relay may remain; with the anchor lost through the named ordinary paths, unresolved direct-root/original-group members may remain too (`design:547-554`). | **True.** The anchor-held branch mandates exact original-group retirement but preserves unresolved outside-group descendants and relay. Helper/reaper death and adoption after that death, premature leader reap, or restarted cleanup remove the retained lifetime anchor, prohibit a numeric signal, and add unresolved root/original-group members to `PRESERVED` (`design:334-388,483-484,517`). Within this residual-target comparison, the anchor-held branch differs by retaining exact root/original-group retirement. |
| Terminal `PRESERVED` entries allow `G` to reach `REVOKED` and ordinary exactly-once completion to settle while those residual effects and resources remain (`design:554-558`). | **True.** `PRESERVED` is a one-way terminal ledger state; when every entry is `RETIRED` or `PRESERVED`, `G` becomes `REVOKED`, and only then may ordinary completion settle exactly once (`design:160-167,437-452,490`). The process and namespace rules expressly allow continuing side effects/resource consumption and surviving names, inodes, children, secret material, and disk use (`design:378-426,517-518`). |
| The disclosure adds no authority and changes no commitment or loss cell (`design:560-561`). | **True as both text and diff fact.** The candidate is one 42-line insertion after the unchanged table. Removing that insertion yields the exact base design byte-for-byte, including every operative rule and all five cells. |

No new-subsection claim lacked operative support.

## Ruling on the three required combined elements

1. **Capture-provenance composition — satisfied.** The subsection preserves
   Decision 2's strong capture-time guarantee and expressly denies the
   stronger, unauthorized inference that captured rendered bytes thereby gain
   Decision 5 production provenance. It connects the ordinary PTY read,
   retained-socket forwarding, no-exception snapshot drain, and later atomic
   pane capture.

2. **Simultaneous cleanup residue — satisfied.** It states one ledger and
   names the owned pane/session after retained-connection loss, residual or
   replacement namespace entries, the anchor-held survivor set, the larger
   anchor-lost survivor set, their possible coexistence, terminal
   `PRESERVED`, `REVOKED`, and ordinary exactly-once settlement. It neither
   weakens anchored group retirement nor introduces a numeric fallback.

3. **Decision 1 delegated-endpoint holder as part of the composition —
   satisfied.** The first bullet does not leave holder delegation as an
   isolated Decision 1 loss. It makes that holder participate in the same
   input, forwarding, drain, and barrier traffic carrying Decision 5 effects
   into the Decision 2 snapshot sequence. The subsection remains bounded to
   the original connected endpoint and does not authorize reconnect,
   re-resolution, post-`V` workload, or generation revival.

## Sweep for further undisclosed composition

I walked every row in the complete post-`ACCEPT` inventory
(`design:463-490`) against the five decisions:

- readiness already states the joint Decision 1/2/5 prerequisite, and the
  paragraph immediately after the new subsection states the all-five HARD
  FAIL gate (`design:465,563-571`);
- relay input to PTY write and PTY output to relay send are covered by the
  first combined bullet;
- barrier, drain, rendered capture, canonicalization, private response, and
  public settlement add no further provenance guarantee beyond the
  composition the first two bullets disclose;
- direct retained-descriptor closure remains mandatory and exact; it does not
  remove the Decision 2/3/4 residuals assembled by the third bullet;
- the shared tmux server/default socket and unrelated sessions remain
  deliberately preserved, but that fact is already explicit in the
  immediately preceding Decision 2 cell and inventory (`design:516,486`);
- programmatic prompt framing, FIFO/count accounting, error ranking,
  sticky settlement, and non-revival remain single-rule obligations rather
  than an additional cross-decision loss.

I found no interaction between decisions that is absent from both an
individual cell and the new aggregate subsection.

## Additive-only verification

- `8411bd5` has `6188f6d` as its direct parent.
- The candidate diff changes exactly the design file with `42` insertions,
  `0` deletions, and one hunk at old line 520/new line 521.
- Removing current design lines `521-562` produces SHA-256
  `2b3d3bf6a95c63cf2c9adb97fb0310421835cfd53997b7016bed48d6aedf84d9`,
  identical to the complete base design.
- The five decision rows hash to
  `6a89c65b413b0457f4beb6a2d5f0f51f54981808a26f7d6126d21aae3927c768`
  at both revisions.
- Request commit `41a4ed8` adds only the review request; its design blob is
  identical to `8411bd5`.
- `git diff --check 6188f6d..8411bd5 -- <design>` exited zero.

Therefore no existing sentence or cell was reworded, deleted, replaced, or
reordered. No operative rule, condition, `E`/`V`/cleanup ordering, REJECT
mapping, preservation fallback, or scope stop changed. Existing content moved
only by the line-number offset created by the insertion.

## Placement

**Pass.** The subsection is immediately below the five decision rows and
immediately above the existing paragraph explaining the joint
Decision 1/2/5 readiness dependency and all-five HARD FAIL gate
(`design:513-571`). A reader cannot complete the ratification table and reach
the approval consequence without passing the combined disclosure.

## Preserved behaviour

The insertion-only diff leaves the frozen canonicalization algorithm/vector
and DTO unchanged. It also leaves unchanged:

- real tmux 3.6 figures `40 -> 0`, `61 -> 24`, and `50 -> 12`;
- terminal-changed rejection for stable `121x40` and
  `history-limit=401`;
- rejected-binding/generation non-revival;
- fail-closed malformed or absent history evidence; and
- the exact canonical byte obligations carried forward to a future custom
  capture implementation.

Those preservation statements remain byte-for-byte present at
`design:694-725`, and the candidate changes no source, test, fixture, or
runtime behavior. This review confirms preservation by design/diff
accounting; it does not re-execute the frozen runtime evidence.

## Scope

The candidate remains design-only. It introduces no implementation, method,
opcode, header, wire frame, port surface, public error, provider launch
change, adapter/service/catalog splice, D/0/07d gate, integration, promotion,
or release claim.

## What I did and did not verify

Verified:

- the full binding Trial 6 reviewer-B result;
- the complete 750-line candidate design and every claim in the new
  subsection against its operative rules, complete-site inventory, and five
  decision cells;
- all three elements required by the adjudicated P1 and a cold sweep for
  further cross-decision interactions;
- commit ancestry, changed paths, exact insertion/deletion counts, the sole
  hunk, complete-old-file equivalence after removing the insertion, table
  equivalence, request-to-candidate design identity, and `git diff --check`;
- placement, preserved-behaviour text, and design-only scope; and
- that the pre-existing untracked `gateway/node_modules` directory was not
  touched.

Not verified:

- no implementation, source, test, fixture, provider behavior, tmux runtime,
  socket/process state, or cleanup behavior was exercised;
- no full `bash scripts/ci.sh`, standalone kernel/socket/lock probe, isolated
  tmux server, live provider call, or Darwin-host run was performed;
- no future custom-tmux binary, protocol, packaging, migration, or runtime
  behavior exists here to certify;
- no operator decision, integration, promotion, release, D/0/07d gate, or
  adapter/service/catalog splice was assessed; and
- the concurrent reviewer-B Trial 7 verdict was neither sought, opened, nor
  used.

No check was interrupted by the provider content filter.
