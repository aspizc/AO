# A/0/03 release candidate: trial 2 review request

**Candidate:** `release/1.1.0` at `b2c1ff91f2a379e16c9a453892eb783143e985c8`, tree
`3ca60fe345a5d73513a9cef75352af64013cd0ea`. It descends from `1.0.0`
(`41f9ce28aa59673283a7c5494200e0ec7b56e2f6`). It is the trial-1 candidate `2d9d7ca` plus two commits:

- `c7573c4`: the trial-1 KO verdict, the operator signing decision and index rows;
- `b2c1ff9`: the release-text and scope corrections.

**Contract.** [`A_0_3-candidate-1_reviewed_KO.md`](A_0_3-candidate-1_reviewed_KO.md) KO-1 to KO-3 and
its two "Required in the next request" items. Also `plan/PROJECT_V6/A/0/03.md`.

## Corrections

1. **KO-1.** The operator decision is recorded in
   [`A_0_3_signing_decision.md`](A_0_3_signing_decision.md):
   - (a) one trust root in scope;
   - (b) the operator generated the key; custody is same-OS-account, accepted as a residual;
   - (c) the signature is an operator countersignature of the committed independent verdict, under the
     role pseudonym;
   - (d) the validity window.

   A/0/03 Non-scope and the `SHEETS.md` write scope are amended, and `docs/release-candidate.md`
   states the model. The trust-root bytes are unchanged since `2d9d7ca`; re-review them.
2. **KO-2.** `README.md`, `docs/project-status.md`, `plan/README.md`, `plan/PROJECT_V6/README.md`,
   `plan/PROJECT_V6/A/README.md` and `plan/PROJECT_V6/SHEETS.md` now record the passed A/0/06
   live acceptance. The "not AO 1.1.0 yet" text is replaced with tag-neutral wording.
   `docs/tmux-runtime.md` now covers cutover from any older server, including 1.0.0's
   `3.6a-agents.1`.
3. **KO-3.** The `CHANGELOG.md` A/0/00 bullet uses the suggested wording: Antigravity non-writers
   are refused with `POLICY_DENIED` before launch.

## Gate (host, pristine detached worktree at the candidate)

`bash scripts/ci.sh` ran once in a detached worktree checked out at `b2c1ff9`. No commit was made in
that tree during the run. The setup:

- pinned `tmux 3.6a-agents.4` (SHA-256 `837d0103…7aac`);
- isolated `TMUX_TMPDIR`;
- disposable `redis:7.2-alpine`;
- inherited `AGENTS_*`/`TMUX*` variables removed.

| Result | Value |
|---|---|
| Exit | **0** |
| Passed | 3,407 |
| Failed | 0 |
| Skipped | 12 (9 PostgreSQL, 2 Gateway integration, 1 Temporal) |
| Total | 3,419 |
| Aggregate | `infrastructure_unavailable`, `errors: []` |

All required lanes passed: public hygiene, structure, gateway, CLI, e2e, Redis 22/22, lint, lock,
release candidate, MCP smoke and policy registry. The local log is `workspace/tmux-pinned/gate-b2c1ff9-wt.log`,
SHA-256 `ec0647609ec7c677eb393c2d5fff6e1afcf3e9888a6f690523d753c2e1fdc9ff`.

## TDD RED release evidence (A/0/03 TDD RED)

**Hygiene.** The scanner is `python3 scripts/check_public_hygiene.py --repo-root <tree>`.

| Tree | Result |
|---|---|
| `1.0.0` as-is | exit 2: `ci/public-hygiene-fixtures.json` is absent, so the scan errors |
| `1.0.0` plus the candidate's allowlist | exit 1, **10 findings** |
| Candidate | exit 0, 0 findings |

**Ledger.** `validate_state_ledger_shape` rejects a ledger whose fifth transition is
`integrated -> released`, with `stateLedger.transitions[4]: impossible transition: 'integrated' ->
'released'`.

## Post-freeze layout

After this candidate, only canonical review artifacts are committed: this request and the verdict.
Index rows and any other record are committed after the evidence head used for `collect`.

Write `A_0_3-candidate-2_reviewed_OK.md` or `_reviewed_KO.md` bound to the full commit and tree above.
Do not decide promotion, tag or publication.
