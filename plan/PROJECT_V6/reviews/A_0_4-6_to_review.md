# A/0/04 implementation trial 6 — final open source-review surfaces

Status: **independent review pending; full sheet remains open**.
Base HEAD: `f4c70f7` on `feat/V6-A-0-04-safe-submit`.

Trial 5's [bounded verdict](A_0_4-5_reviewed_KO.md) covered the `.2`/`.3`
patch identity, supported adapters, public error projection, scoped GREEN,
and a public-content scan. Trial 4 covered the cleanup-uncertainty fix. The
production candidate is unchanged since then. Root removed the one local
absolute path from the public Claude composer fixture, retaining its binary
hash and anchors; `node --test tests/gateway/prompt_submission.test.js`
passed 54/54 afterward. This request binds that fixture change and the
remaining source-review work to a fresh trace.

Fresh [candidate manifest](evidence/A_0_4-trial6-candidate-files.json),
SHA-256 `5073269f602959b4f2800108d2bdb1884c19fa11b4393f9e20bb679792efbcc5`,
binds 73 path states and explicit `.1` deletion. It differs from the trial-4
manifest only at
`tests/gateway/fixtures/claude_2_1_292_composer.json`, now SHA-256
`7a6389248f8585f495f58e09097b04b3036c17e2894cb3956f4f124bb56a0e18`.
Verify every entry and this one-path difference before reviewing. The
trial-5 review records committed after the original manifest are historical
evidence, not production changes.

Review **only** what trial 5 left unexamined, plus the fixture hygiene:

1. F2 framing/PID isolation, first/retry controls and actual mutation proof
   in `A_0_4-trial3-mutation-proof.json`; atomic mode-file publication.
2. F3 wording in `gateway/README.md`, `docs/tmux-runtime.md` and the vendor
   README against the actual candidate; workflow YAML/inventory and the
   complete retained supervisor handshake/error-code comparison.
3. Content of the RED logs and provenance of the isolated `.3` binary,
   including pinned archive, patch SHA, zero-fuzz builder and binary hash.
4. Confirm the public fixture has no absolute local path, and the 54/54 test
   remains meaningful.

The three pending-output scenarios remain SOURCE-REVIEWED / NOT EXECUTED;
there is no provider-decision atomicity claim. Positive Antigravity evidence,
live provider markers/versions/timing, native Darwin, CI inventory and root
solo full gate stay open even after a source OK. Do not invoke providers or
use a corporate account.

Write one immutable `A_0_4-6_reviewed_OK.md` or KO verdict with exact
coverage and limits. A source OK may combine with trials 4–5 to close the
source-review portion only. Do not edit candidate code, tests, policies,
prior review files or manifests; do not stage, commit, push or self-review.
