# A/0/04 — startup raw padding, trial 2

Independent Opus review requested. Uncommitted candidate on
`71425f1667316c1dc1da60960dcfa7e424d18992`, same session and branch as trial 1.
The trial-1 KO is the correction contract; no other review verdict was used
as a new correction contract. Trial-1 handoff, evidence and original fixture
are preserved byte-for-byte, verified against the entry hash map. No verdict,
commit, staging, push, integration, A05 completion or release claim.

## Corrections to numbered KO findings 1–4

1. **Raw padding.** `codexUpdateWelcomeDraft` accepts only trailing U+0020
   spaces on rows 11, 12 and 38, each no longer than pane width. Row 11 must
   consist entirely of spaces. Row 12's unpadded value must belong to the
   pinned greeting set and its suffix must contain only spaces. Row 38's
   unpadded value must equal the exact model/effort/header-cwd status, and its
   suffix must contain only spaces. Leading bytes, notice, header, cwd regex,
   geometry, footer and all inherited submission bindings remain exact.
   All 88 upstream greetings remain unchanged. Any previous **93** claim is
   corrected to **88** in this trial only; no old artifact is rewritten.
2. **Provenance.** Added a separate
   `codex_0_160_1_update_welcome_raw_padding.json` fixture, without changing
   the original transcript-derived trial-1 fixture. Its `sourceKind` and
   `rawRows` explicitly distinguish raw diagnostic fields, diagnostic-verified
   exact pins, transcript-derived rows and reconstructed stable-prefix bytes.
   It is a partial diagnostic reconstruction, not a complete raw capture.
3. **Gateway boundary.** Added the startup-notice paragraph to
   `gateway/README.md`: pinned source links, OnceLock greeting, padding,
   original cursor/LF reconstruction, partial diagnostic evidence, uncertain
   acceptance and unsupported version/command/YOLO/cwd/wrapped variants.
   The pinned session renderer URL encodes its dot as `%2E`, preserving the
   URL target while satisfying the existing canonical-tool docs checker.
4. **Intent tests and simplicity.** Added matching non-path cwd/status tests,
   including `›`, a non-path token, a space-containing path and truncation.
   The cwd regex mutant now fails. Removed the equivalent ready cursor check
   and mixed update-profile flag check. Generic ready composer classification
   already requires the measured placeholder cursor; pending/guard snapshot
   equality and identical classification already prohibit mixed flags.
   Their enclosing ready-footer check remains. No alternative authority or
   classifier fallback was introduced.

## Evidence and raw/reconstructed rows

The private diagnostic file hashes to
`59ccb93f4611897c04c4fff4b55a165bf2432d9d55a51667a96185b5fa4527ba`.
Its raw diagnostics confirm ready `composer`, then draft `unknown_state`:
notice/path/footer true; blank/greeting/status false. This establishes the
first post-paste classification as the actual refusal phase before Enter.
Raw draft row 11 contains 61 spaces; row 12 contains the observed greeting
“Welcome to our little rectangle of possibility.” padded to 70 characters;
row 38 contains one trailing space. Sanitized rows 10 and 38 preserve original
lengths 92 and 116, replacing the private cwd with an equal-length synthetic
ASCII path. The synthetic challenge preserves the 84-character payload length.

Fixture provenance by row:

| Rows/fields | Provenance |
|---|---|
| 0–9 | Exact candidate notice/header pins confirmed by raw `notice=true`; reused pinned bytes |
| Draft 10, 11, 12, 38 | Raw A04PROFILE values; cwd replaced with equal-length synthetic spelling |
| Ready/draft 39 | Raw A04DIAG footer strings |
| Cursor X/Y, 41 rows, empty final LF slot | Recorded A04DIAG metadata; original trial-1 fields were reconstructed |
| 36 | Trimmed transcript composer, with equal-length synthetic nonce |
| 13–35, 37 | Transcript-derived blank rows; actual raw padding unavailable |
| Ready 10–12 and 38 | Repeated draft bytes as explicit stable-prefix hypothesis; not raw ready fields |
| Server/pane IDs | Synthetic; preserve equality relationships, not live process attestation |
| Guard and post-Enter fixtures | No real guard/post-Enter capture invented; tests repeat draft hypothetically and observe uncertainty |

The recorded private mirror added stderr diagnostics only, as independently
verified in the KO. The operator additionally reports that the first clean
mirror with exact candidate identity failed before Enter. These refusal runs
are not successful acceptance evidence. No private raw pathname, nonce or
credentials are copied to tracked/public material.

## TDD RED and GREEN

Five `startup2` tests were added before editing production source. Initial
host RED: **5 tests, 3 pass, 2 fail**, no skips. The two distinguishing names:

- `startup2 raw padded rows permit only the guarded first Enter with acceptance uncertain`
- `startup2 each raw padding predicate accepts spaces through the pane width`

The other tests verify non-space/tab/NBSP/over-width refusal, matching non-path
cwd refusal and raw-byte drift across ready/pending/guard. They pass on the
rejecting baseline and are not claimed as distinguishing RED.

[Archived final RED](evidence/A_0_4-live-startup-2-red-final.log.gz) runs final
tests against the exact trial-1 entry adapter in scratch: **19 selected tests,
17 pass, 2 fail**, no skips. The entry adapter is archived as gzip and bound
by SHA256; it is not `git show HEAD`, because trial-1 functional code was dirty.

[Focused final GREEN](evidence/A_0_4-live-startup-2-green-final.log.gz):
**291 pass, 0 fail, 0 skipped/cancelled/todo**, exit 0. Node v22.22.1 and
pinned tmux 3.6a-agents.3. Includes disposable real guarded paste/submit,
adapter callers, all submission/Claude regressions and public error/docs checks.
The earlier focused run was **290 pass, 1 fail** on the docs checker treating
`session.rs` in a source URL as a fictional tool alias. Its log is retained;
the URL encoding fix preceded the final successful run. No source change.

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
npm --prefix gateway run lint
python3 scripts/ci_gate.py --refresh-inventory
python3 scripts/ci_gate.py --validate-only
python3 scripts/check_public_hygiene.py
git diff --check
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-startup-2-checks-runner.py
```

Lint, refresh, validate, hygiene and diff check exit 0. Inventory unchanged;
refresh/validate execute **0 suite tests**. Hygiene reports 0 findings; an
additional exact private-literal scan covers all new untracked artifacts.
Full `bash scripts/ci.sh` is not run and remains root-owned.

[Mutation results](evidence/A_0_4-live-startup-2-mutations.json): all **18**
single-guard removals fail relevant tests. New distinguishing removals cover
cwd regex, width limit, blank-row spaces, greeting padding and status padding;
retained mutations cover notice, greeting set, cwd/status equality, draft and
ready footer pins, phase, cursor, history, ASCII, first-Enter limit, snapshot
stability, process binding and ready prefix. Scratch only; coder verification
is not an independent review verdict.

## New operator post-Enter evidence and remaining limit

The operator reports a live mirror using byte-identical trial-2 base adapter
SHA256 `a470283858303e7e4fdd3b21515d4c7ea495662ba3b3399915de34993a05da62`:
raw-padding correction caused **exactly one guarded Enter**, then `agent.ask`
returned `acceptance_uncertain`. The private harness held the session for
3 seconds after failure and captured a newly inserted challenge history at
row 15, `• Working` at row 33, empty composer at row 36 and spinner status at
row 38. Cleanup remained exact/unchanged. This is operator-reported evidence,
not a coder-run capture; its [sanitized record](evidence/A_0_4-live-startup-2-operator-post-enter.json)
contains no private path or challenge text.

The existing welcome Working recognizer pins header row 1; this layout has
header row 9. Acceptance remains unsupported and unchanged. The delayed
capture does not establish what was visible at the bounded acceptance check.
No acceptance profile, polling extension, retry or warmup was added. Root
will commission a separate bounded acceptance-profile follow-up after trial-2
review. This candidate proves conditional safe first submission and the
reported live Enter, not successful A05 acceptance or reliable response.

## Exact candidate files and binding

Shared functional candidate relative to HEAD:

- `gateway/src/adapters/base_adapter.js` (trial-2 changes limited to padding/width and equivalent-guard removal)
- `gateway/README.md` (new boundary paragraph)
- `tests/gateway/prompt_submission.test.js` (five new trial-2 tests; trial-1 tests retained)
- `tests/gateway/fixtures/codex_0_160_1_update_welcome_draft.json` (inherited trial-1 file, unchanged)
- `tests/gateway/fixtures/codex_0_160_1_update_welcome_raw_padding.json` (new trial-2 partial reconstruction)

New review files: this handoff and `evidence/A_0_4-live-startup-2-*`, enumerated
and hashed by the file map and seal. Entry map pins all preserved trial-1 files.
Binding JSON pins entry and final source SHA, private diagnostic evidence hash,
88 greetings and byte-identical `guardedSubmit`/`freshCodexWork` helpers.
No policies, A05 recovery, statuses, release docs or review index changes.
