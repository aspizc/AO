# Independent Plan Review — Project V5 D/0/07 (Trial 2)

## Verdict

**KO**

## Reviewed identity

- Frozen candidate: `8c620a6144fc089848457597c6236d9a98dc4458`,
  tree `674874d88ba31256ab1d0d5f1469d5845199eca0`.
- Review-branch equivalent candidate: `741dea50e6de2960fcbfd63f9077b691d4c81e33`,
  with the same tree.
- Review request: `20b4e1fed2d5d94ec85c8b0c9797202e415e5a66`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage
  `a7c09b0`.

This is a plan-contract verdict only. It credits no runtime implementation,
technical GREEN, integration, promotion, live execution, or release.

## Trial 1 finding adjudication

1. **Positive RED — CLOSED.**

   The sheet names
   `tests/gateway/process_supervisor_session_port.test.js` and defines one
   positive authorized transaction through a persistent fake, separately
   issued authority, bounded prompt, exact snapshot, and exact observation
   DTO. It records independent expected failures on frozen core `a7c09b0`.
   Forgery, cancellation, no-shell, and no-`send-keys` checks are correctly
   retained as GREEN mutation/regression guards rather than counted as
   independent RED failures.

2. **Frozen port API and capability state machine — STILL-OPEN.**

   The JavaScript issuance surface, immutable method/result shapes, fixed
   public error table, bounds, FIFO, active window, retirement order, test
   seam, and CORE provider-data boundary are now explicit. The helper boundary
   that enforces them is not yet frozen, however:

   - `D/0/07.md:237-240` defines a 48-byte header but assigns no numeric
     request/response opcodes, byte order, success/error response shape, or
     malformed/unknown/duplicate/out-of-order-frame disposition. The fixed
     JavaScript errors therefore do not determine what the helper sends or how
     the parent maps a response without inventing another protocol.
   - The 32-byte binding tag is only said to be “derived” from three values.
     Its exact construction, domain separation, key/input encoding, and
     comparison rule are absent.
   - `D/0/07.md:87-95,223-240` requires an “exact relay instance” over a
     private socket, but does not freeze the relay handshake or the
     Linux/Darwin peer/nonce evidence that authenticates that instance before
     operator bytes can enter the broker queue. File modes alone distinguish
     OS users, not instances owned by the same user.

   These are trust-boundary choices, not ordinary coding details. The next
   plan trial must add one normative request/response codec table (including
   exact constants and every reject/revoke result), one exact binding-tag
   construction, and one cross-platform authenticated relay handshake with
   named tests. No raw prompt or terminal bytes may be moved onto the JSON
   channel while closing this point.

3. **Attach topology — CLOSED.**

   The sheet selects one helper-owned inner PTY plus outer tmux relay topology.
   It preserves the exact
   `sessionId === tmuxTarget` and
   `attachCommand === "tmux attach -t <tmuxTarget>"` contract, leaves literal
   provider argv under direct `execve`, and gives programmatic writes only the
   PTY-master route. It explicitly classifies interactive tmux attach as a
   separate local-operator read/write authority. It authorizes neither a
   public-contract change nor a tmux `send-keys` exception.

4. **Normative terminal/snapshot/write tables — STILL-OPEN.**

   The numeric caps, fixed dimensions/history, UTF-8 and ANSI rules, prompt
   framing, platform identity readers, foreground equation, short-write
   handling, paths, fixtures, and dependency impact are now present. Three
   remaining ambiguities prevent a deterministic implementation:

   - `D/0/07.md:303-321` does not specify how the bytes emitted by
     `tmux capture-pane -p -t <target> -S -400` are canonicalized. In
     particular, treatment of unused visible rows, trailing blank lines,
     per-row trailing spaces, and the final LF is absent. Consequently the
     empty-string oracle and the exact 24-byte positive snapshot at
     `D/0/07.md:422-427` are not derivable without choosing a trimming rule
     that can also discard meaningful terminal content.
   - The cancellation rows overlap. A cancel after the relay barrier but
     before the snapshot result satisfies both
     “barrier commits before cancel” and “cancel ... before ... result” at
     `D/0/07.md:386-387`; the former says a result *may* return and the latter
     permits three errors. The same table does not assign one exact result
     when helper/control loss occurs after a full or partial terminal write
     but before the sideband response.
   - Calling this one S/M branch at `D/0/07.md:474-495` is not supported by
     the file count. The branch combines a capability issuer, binary protocol,
     PTY lifecycle, cross-platform live identity readers, broker/relay,
     authenticated local socket, tmux orchestration/rendering, snapshot
     canonicalizer, and a real-host race suite. That is several independently
     failure-prone mechanisms.

   The next trial must freeze a byte-for-byte capture canonicalization and
   replace the overlapping race rows with mutually exclusive linearization
   intervals and one error/result per cause. It must then either split the
   codec/capability, PTY identity/write, and tmux observation work into
   separately RED/GREEN/reviewed slices with an explicit final composition
   gate, or materially reduce the scope and justify a genuinely S/M branch.

5. **Registry reconciliation — CLOSED.**

   `D/0/07` is registered in `EPICS.md`; the diagram and narrative contain the
   acyclic
   `D_0_1_CORE -> D/0/07 -> D_0_1_SPLICE` order; current C/D/project/coverage
   and handoff surfaces keep the splice blocked; and the security-critical set
   extends through D/0/07. `HANDOFF_YOLO.md:175` is current, not left as an
   actionable “unblocked” instruction. Historical Trial 1 artifacts are
   unchanged.

   The materialized counts also reconcile: active B–I sheets are
   `6 + 8 + 8 + 6 + 5 + 5 + 6 + 10 = 54`; adding the 25 delivered A sheets
   gives 79, and `36 complete + 4 in progress + 39 planned = 79`, with
   `4 + 39 = 43` open. `SHEETS.md`, Project V5 `README.md`, `EPICS.md`, and
   top-level `plan/README.md` publish that same split.

## Additional confirmations

- The relevant dependency subgraph is acyclic: D/0/07 depends only on
  D/0/00/the integrated D core, while the final splice consumes D/0/07,
  C/1/00 CORE, and H/0/00; none points back to the splice.
- The canonical status rule holds in the changed current-state cells.
  D/0/07 remains `planned`; no implementation, integration, promotion, or
  release is credited.
- All 464 local Markdown links found across the eight candidate documents and
  the Trial 2 request/index documents resolve.
- Every cited frozen-source location resolves, including the seven-key
  execution object, closed utility stdin/direct `execve`, exact public attach
  guard, durable attach reconstruction, and current adapter
  `send-keys`/400-line capture paths.
- The 13 focused zero-argument Project V5 documentation assertions pass when
  invoked directly. Candidate/request `git diff --check` passes.
- Candidate tree/path identity matches the submitted eight-file allowlist;
  the request adds only its append-only request plus review-index row.
