# Independent Plan Review — Project V5 D/0/07 (Trial 3)

## Verdict

**KO**

## Reviewed identity

- Frozen candidate: `f12a454e9bc3c2aad44b7f4f706f81bebbdbe750`,
  parent `e814606a14a8e655f140955fa03be34af891ca23`, tree
  `51719e9ac1d9ea7462ab613671f5a0321c44780f`.
- Review-branch equivalent candidate:
  `ebfe2b54a19f2f97deafbda4acb95669a738339c`, with the same parent and tree.
- Append-only request/index commit:
  `c496a96560fe4674ac2f26b4b2bb6c7b74ed5236`.
- Frozen implementation baseline: integrated `D_0_1_CORE` lineage `a7c09b0`.

This is a plan-contract verdict only. It credits no runtime implementation,
technical GREEN, integration, promotion, live execution, or release.

## Trial 2 finding adjudication

1. **Positive RED — CLOSED.**

   The separately issued authorized transaction remains a positive RED against
   `a7c09b0`. The parent preserves the exact factory, prompt, 24-byte snapshot,
   observation, literal-argv, and no-`send-keys` assertions, while `D/0/07d`
   owns the final real-host composition RED. Negative guards are still not
   miscounted as independent RED failures.

2. **Helper trust-boundary wire — CLOSED.**

   `D/0/07.md:267-335` now freezes one 48-byte big-endian `ASP1` codec with
   numeric request/response opcodes, exact success and four-byte error
   payloads, fixed phase/error ids, validation precedence, and named
   malformed/unknown/duplicate/out-of-order dispositions. The exact
   HMAC-SHA-256 binding tag, byte encodings, domain separator including its
   NUL, and constant-time comparisons are frozen at `:336-361`.
   `D/0/07.md:362-460` adds an exact `ASR1` challenge/proof handshake with
   Linux `SO_PEERCRED`, Darwin `getpeereid` plus `LOCAL_PEERPID`, fresh pane
   identity, single-use proof material, timeout, reject ids, and zero
   pre-authentication broker input. Raw prompt and terminal bytes remain off
   the lifecycle JSON/transcript path.

3. **Attach topology — CLOSED.**

   The helper-owned inner PTY, outer direct-argv tmux relay, literal provider
   `execve`, no shell/no `send-keys`, exact
   `sessionId === tmuxTarget`, literal attach command, and separate local
   operator read/write authority remain intact.

4. **Normative terminal/snapshot/write tables and decomposition —
   STILL-OPEN.**

   The empty and positive examples do follow the submitted row algorithm when
   its asserted capture bytes are supplied: 40 empty row delimiters retain
   zero rows, and `ready\nstatus\nack:status\n` is exactly 24 bytes. Blank
   history, completed blank rows, unused visible rows, final LF, and emitted
   row bytes are otherwise specified. The four-leaf decomposition is also
   structurally closed: `07a–d` have planned headers, bounded ownership,
   positive REDs on their declared baselines, acceptance criteria, local
   gates, review ids, and the acyclic
   `07a -> 07b -> 07c -> 07d -> D_0_1_SPLICE` chain.

   Two determinism defects remain:

   1. `D/0/07.md:522,558-560` fixes `capture-pane` without `-N` and then
      promises to preserve only trailing spaces that tmux already emitted.
      Tmux 3.6 documents `-N` as the option that preserves trailing spaces at
      line ends. The fixed producer therefore removes rendered trailing spaces
      before the canonicalizer can see them. The named synthetic-byte test at
      `:583-589` cannot prove the real capture path preserves those cells.
      Freeze capture flags or another exact cell extraction that preserves
      meaningful row-end spaces while distinguishing unused padding, then
      rederive the untouched and 24-byte oracles and require a real tmux
      row-end-space case.

   2. The claimed sole-cause table is not total or mutually exclusive.
      `D/0/07.md:646-649` gives an explicit cancel a winning ordinal, but
      `:672` returns `SESSION_PORT_CANCELLED` only after an authenticated
      zero-byte helper acknowledgement, while `:674` maps subsequent
      helper/control/response loss in the same `[D,R)` interval to
      `SESSION_PORT_WRITE_ABORTED`. If cancel receives the lower ordinal and
      the channel is then lost before that acknowledgement, the first-cause
      rule forbids the loss from replacing cancel, yet the cancel row's proof
      is absent. The table supplies no result. In addition, unreadable helper
      identity is `SESSION_PORT_IDENTITY_CHANGED` at `:616-618,668`, while
      helper loss over the same `[D,F)` state is
      `SESSION_PORT_WRITE_ABORTED` at `:674`; analogous relay disappearance
      during snapshot can satisfy the identity, known-close, and
      barrier/sideband-failure rows at `:677-680`. A cause ordinal orders
      detector callbacks but does not give one classification to the same
      physical loss.

      Freeze the cancel linearization point relative to authenticated
      zero-byte acknowledgement, define the result when proof is lost, and
      add disjoint classification precedence for identity mismatch versus
      helper/relay/control close/failure. Named tests must cover cancel-first
      then response loss, helper death before `F`, and relay disappearance
      during a snapshot, with one exact public result in each ordering.

5. **Registry reconciliation — CLOSED.**

   The parent is consistently non-executable and excluded from inventory.
   Physical B–I leaf counts are
   `6 + 8 + 11 + 6 + 5 + 5 + 6 + 10 = 57`; with 25 delivered A sheets this is
   82. Header states independently reconcile to
   `36 complete + 4 in progress + 42 planned = 82`, with 46 open.
   `SHEETS.md`, Project V5 `README.md`, `EPICS.md`, and top-level
   `plan/README.md` publish the same split. `D/0/01` consumes independently
   reviewed `D/0/07d`, not the parent bundle, and no touched status claims
   implementation beyond evidence.

## Additional confirmations

- The candidate commit changes exactly the eleven submitted plan paths; the
  request commit adds only its request and review-index row.
- All 380 local Markdown file targets checked across the eleven candidate
  documents, request, and review index resolve.
- Candidate/request and cached `git diff --check` checks pass.
- The relevant dependency graph is acyclic and only `D_0_7D` can unblock
  `D_0_1_SPLICE`.
- Trial 2's three previously closed findings did not regress.

`D_0_1_SPLICE` must not consume this plan as a reviewed composition
prerequisite. Trial 4 can remain a documentation-only correction: preserve the
closed wire, relay, topology, split, registry, status, link, and positive-RED
work while fixing the two deterministic contracts above.
