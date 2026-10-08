# A/0/04 — trial 13 version-bound randomized marker correction

Status: implemented; fresh independent **Opus 5.5 medium** review pending.
Candidate remains dirty and uncommitted on HEAD
`b42b94cff1c904242903f113c0cd8c8a4bc8a6ea`, branch
`feat/V6-A-0-04-safe-submit`. No independent verdict, integration, promotion
or release is claimed.

Exact correction contract: [trial12 KO](A_0_4-live-profile-12_reviewed_KO.md),
required corrections **1–5 only**. The reviewer accepted trial12's safety
boundary but rejected its random-word/glyph assumptions. Trial12 files and
its historical evidence are not overwritten. [Entry map](evidence/A_0_4-live-profile-13-entry.json)
binds the entry source, tests, docs, manifest, fixture and all trial12 evidence.

The previously read AGENTS.md, sheet, stage README, plan README and resolved
profile continue to govern. Immediate callers remain ClaudeAdapter ask and
agent service ask; transport/capture/cleanup remain tmux_client shared utilities.
No caller or transport changes were required. No subagents, self-review,
policies, push/tag, full gate or live provider run. Root owns review-trail
commit and integration after review; the resolved profile's reviewed-OK
commit restriction takes precedence over the generic TDD skill instruction.

## Corrections 1–2: marker contract

In `freshClaude294Response`, completion accepts exactly:

```text
^✻ (?:Baked|Brewed|Churned|Cogitated|Cooked|Crunched|Sautéed|Worked) for \d+s · done \d{1,2}:\d{2} [AP]M$
```

The existing exact `Claude Code v2.1.294` header gate still applies. The working
row permits exactly `·`, `✢`, `*`, `✶`, `✻`, `✽` and a strict spinner word
`[A-Z][A-Za-z]*(?:-[a-z]+)*`. This uses the review-authorized strict-word
alternative rather than copying the built-in list. Words outside that strict
format remain uncertain, including builtin names containing apostrophes.
Ghostty's `✳` is not supported or admitted. The existing parenthetical
`(\d+s · ↓ \d+ tokens)` remains mandatory.

A valid working witness now returns its verb. The initial working verb is
bound locally within that ask; every subsequent working witness must return
that exact verb. Glyph, seconds and token count may change. A changed verb
fails immediately and cannot borrow a later completed frame. Completion is
still established by the complete response witness, not the spinner alone.

Identity, blank prior transcript, unique echo, unchanged header/cwd, composer,
effort hint, footer, attempt-0 eligibility, kill revocation, eight-observation
bound and buffer cleanup are unchanged. The observation branch still cannot
fall through to the composer retry: one paste and one Enter only. Legacy
witnesses and other provider paths are unchanged.

## Corrections 4–5: private header and binary source

Checked the **raw** private `workspace/root-a04-live-acceptance-result.json`,
not just the sanitized fixture. The Claude preAsk, error and later captures
all show an absolute cwd beginning `/`, not `~` or `~/`. Header rows 0–3,
including mascot and cwd, are identical in all three captures. Accordingly,
the absolute-path regex is retained; no new tilde fixture or path support is
needed for this observation. No mascot animation was observed here; variants
remain unverified and fail closed. [Non-identifying header check](evidence/A_0_4-live-profile-13-private-header-check.json)
records these results without copying the raw cwd or any personal data.

Read the installed `~/.local/share/claude/versions/2.1.294` binary directly.
SHA-256: `27122ca7b624f537546fbef35b80c66370d974ff258f3d9b10ac50bb8771f262`.
[Binary byte-search evidence](evidence/A_0_4-live-profile-13-binary-evidence.json)
records exact needles, zero-based byte offsets and 500-byte excerpts:

| Needle | Byte offset | Evidence |
|---|---:|---|
| `var kg=[` | 232211480 | Exactly eight completion verbs; `Saut\xE9ed` decodes to Sautéed |
| `function xg(m)` | 232211586 | Hash modulo `kg.length` chooses completion wording |
| `function nDt()` | 222876832 | Built-in verbs can be replaced/extended by `spinnerVerbs` |
| `dF(nDt())` | 222882987 | Spinner verb sampling |
| `var l=["\xB7","\u2722"` | 222934022 | Separate Ghostty and standard glyph arrays; standard `p` contains the six admitted glyphs |
| `zi(m?null:120)` | 229360213 | Animated tick source |

These are binary-backed marker contracts, not new live tests. The private
observation demonstrates only its sampled Twisting/✽ working row and Sautéed
completion. The other words/glyphs are covered with synthetic fixture variants.
No success claim for refined-candidate live acceptance is made.

## Correction 3: TDD RED and guard mutations

Added twelve tests before production changes; all 17 inherited first-prompt
tests remain unchanged. Positive cases clone the existing sanitized fixture
at runtime, with independent working-frame objects; the fixture file itself
is byte-identical to entry. The animated test uses Pondering and Razzle-dazzling
with `✶ → ✻ → ✽ → · → ✢ → *`, advancing elapsed seconds/token counts.
Eight parametrized immediate tests cover every completion verb. Every positive
asserts the returned snapshot, exact one-paste/one-CR input and no buffer leaks.
Negatives cover changing spinner verb, unknown completion verb, unsupported
spinner formats and a different version header; all assert refusal and no
extra Enter. Existing identity, stale-history, duplicate-echo, retry-credit,
finite-poll and cleanup negatives are preserved.

Initial genuine tests-first host RED:

```bash
node --test tests/gateway/claude_first_prompt.test.js
```

[Initial RED](evidence/A_0_4-live-profile-13-red-host.log.gz): exit 1,
29 tests, 21 pass, **8 intended failures**, no skips: animated non-Twisting
success and seven additional completion verbs. Sautéed still passes. Negative
cases also pass on trial12's overly narrow witness and are not claimed as
baseline distinguishing RED.

To distinguish the new negative guards, isolated scratch mutations remove
only verb stability or widen only the completion-verb regex. Both targeted
tests fail with `Missing expected rejection`: 1 test / 1 failure each.
The mutations never write repository source. The reproducible runner also
rechecks the final test file against the archived trial12 base adapter:
29 tests, 21 pass, the same 8 intended failures.

```bash
python3 /tmp/a04-trial13-mutations.py /home/carase/git/personal/AO/workspace/clones/wt-v6-a04
```

[Archived runner](evidence/A_0_4-live-profile-13-red-runner.py),
[results with argv and source/mutant SHA hashes](evidence/A_0_4-live-profile-13-red-results.json),
[baseline reproduction](evidence/A_0_4-live-profile-13-red-reproduced.log.gz),
[stable-verb RED](evidence/A_0_4-live-profile-13-red-stable-verb.log.gz),
[completion-set RED](evidence/A_0_4-live-profile-13-red-completion-set.log.gz).
Copy the archived runner to `/tmp` and use fresh output filenames when
reproducing so immutable evidence is not overwritten. These are coder tests,
not an independent review verdict.

## Focused GREEN

Final host command, Node v22.22.1 with patched tmux `3.6a-agents.3`:

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
python3 scripts/ci_gate.py --validate-only
git diff --check
```

[GREEN](evidence/A_0_4-live-profile-13-green-host.log.gz): exit 0,
**234/234 passed**, 0 failed/cancelled/skipped/todo, including 29 first-prompt
tests and disposable tmux input fixtures. [Manifest validation](evidence/A_0_4-live-profile-13-manifest-validation.log.gz):
exit 0, no errors, 0 suite tests executed. Whitespace check exit 0.
No new test file path was added; manifest and fixture are byte-identical to
entry. No full gate or live provider session was launched.

## Immutable handoff and next step

Only base adapter, first-prompt tests, corresponding Gateway README explanation
and review index changed from trial13 entry. The dirty inherited Claude adapter
and manifest did not change. All trial12 files retain entry hashes. The
[source/test delta](evidence/A_0_4-live-profile-13-delta.patch), entry snapshots,
[final candidate map](evidence/A_0_4-live-profile-13-files.json) and separate
handoff seal bind the candidate and exclusively created trial13 artifacts.
No raw private header, prompt token or live PID/session identity is archived.
No candidate staging or commits were performed; existing staging belongs to root.

Stop for a fresh separately assigned **Opus 5.5 medium** independent reviewer
trace/session. Trial13 has no verdict. Root retains full-gate execution solo
after live sessions are inactive, successful Claude/Codex live acceptance,
review-trail commit and integration. Focused GREEN does not close those sheet
acceptance criteria. No release/support claim is made.
