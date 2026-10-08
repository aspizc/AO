# A/0/04 — trial 17 stable warnings-only draft

Status: implemented; independent review pending. Uncommitted dirty candidate on
HEAD `5197f6683fcfa312c246b6bda6c9cc094c5e7f03`, branch `feat/V6-A-0-04-safe-submit`.
No review verdict, integration, promotion or release is claimed. No commit,
push, policy edit, live provider execution or subagent was performed.

## Contract, evidence and boundary

Read the trial16 independent OK verdict and A/0/04 sheet, then the classifiers,
active-decision detector, Codex ask caller, shared submission caller, observation,
composer checks and guarded paste/submit builders before writing. Previously
read AGENTS.md, plan/README.md, Stage A README and resolved profile continue
to govern this assigned coder session. Used the build skill's existing TDD and
immutable-evidence workflow; root owns fresh independent review and live rerun.

Root reports one real 0.160.1 120×40 post-paste draft that returned
`unknown_state` before Enter: row36 contained the exact prompt, cursorX was
prompt length+2, row38 contained the idle model/effort/cwd status and row39
contained spaces plus `⚠ 2 warnings · f2 to view`, without shortcuts or queue
text. No prompt history or Working appeared. Server/pane/PID/geometry matched.
There was no capture 1.5s later. Eleven later disposable runs were positive,
including a 1ms submit delay. These are supplied observations, not reproduced
runs by this coder; they neither prove stability of the rare frame nor a delay fix.

[Draft-only reconstruction](../../../tests/gateway/fixtures/codex_0_160_1_warning_only_draft.json)
contains synthetic prompt, `/fixture/a04`, server/pane IDs and leading footer
padding (92 spaces, not claimed observed). It uses sanitized historical
0.160.1 welcome context from the unchanged trial16 fixture plus only the newly
reported draft/footer layout. It is a reconstruction, not a captured live pane.
No later frame or successful guard observation is invented as live evidence.
Tests repeat it as a hypothetical stable pending/guard pair, then reuse the
historical sanitized Working frame solely to check unchanged acceptance.

Safe proof is limited to the existing guarded transport and two actual
observations in the runtime. If the rare draft does not survive re-observation,
it remains refused. The correction does not promise to accept the one observed
incident or eliminate intermittent refusal. This is the design boundary.

## Surgical implementation

[Entry SHA map](evidence/A_0_4-live-profile-17-entry.json) binds the inherited
trial16 candidate and every immutable trial16 review/evidence artifact.
[Source/test delta](evidence/A_0_4-live-profile-17-delta.patch) is relative to
entry, not HEAD's inherited dirty changes. New trial17 work touches only base
adapter, prompt-submission tests, the new fixture, Gateway README and review
index. Trial16 artifacts, fixtures, Claude adapter/tests and manifest are
unchanged from entry. No fixture or artifact from trial16 was rewritten.

An isolated classifier branch recognizes only the exact warnings-only form
with literal leading spaces and exactly 2 warnings. It requires draft phase,
0.160.1 header, 120×40, row36 composer, exact ASCII single-line visible text
and end cursor, idle model/cwd status at row38, blank row37, blank history
rows13–35, no prior Working, and a 41-line capture with final empty row. It
returns a draft marker only; it cannot authorize initial input or acceptance.
The existing queue/warnings regexes, gap logic and acceptance classifier paths
are not broadened. Other counts, tabs, footer text and unverified versions refuse.

Before guarded first Enter, if either pending or guard uses this variant:

- Both must be the warnings-only draft and their captures must be byte-identical.
- Ready, pending and guard must share server PID, pane target/PID and geometry.
- Ready's prefix through row35 and its cwd status must match pending.
- Attempt must be zero; this variant never authorizes a retry Enter.

The existing exact prompt comparison, guard re-observation, capability check,
atomic guarded bracketed paste, guarded Enter and owned-buffer cleanup remain
in force. Footer transitions to/from normal queue/warnings and draft/process
changes fail before Enter. No raw keystroke, unguarded paste or recovery fallback.
The positive acceptance helpers and the entire post-Enter path are
byte-identical to entry, verified programmatically. No timing/budget/config change.

## TDD RED

Seven tests were added before any successful source edit. Host command:

```bash
node --test tests/gateway/prompt_submission.test.js
```

[Initial RED](evidence/A_0_4-live-profile-17-red-initial.log.gz): exit1,
130 tests, 126 pass, **4 intended failures**, no skips/cancellations/todo:

1. `trial17 stable measured warning-only draft reaches guarded first Enter and unchanged acceptance`
2. `trial17 warning-only draft is phase-bound and cannot authorize initial input`
3. `trial17 menus and decisions cannot receive Enter through warning-only draft`
4. `trial17 warning-only draft never proves positive acceptance or licenses unguarded paste`

The last two cannot reach the distinguishing guard/post-Enter assertion on
baseline because the pending draft is refused first. They verify those paths
on GREEN. Negative shape/stability and normal-profile tests initially pass on
the rejecting baseline; no distinguishing RED claim is made for them.

A source-edit script's ambiguous replacement precondition failed before writing
any source. Its subsequent run was still RED, not a source GREEN. The edit was
scoped explicitly to classifyProviderPane before proceeding. No import, setup
or script-precondition error counts as behavioral RED.

After GREEN, added direct classifier assertions for shape refusals, a prior
Working marker in the welcome area, and an eighth test forbidding retry Enter.
[Final archived-source RED](evidence/A_0_4-live-profile-17-red-final.log.gz):
exit1, **131 tests, 126 pass, 5 fail**, no skips; the four names above plus
`trial17 warning-only draft does not authorize a retry Enter when submission remains pending`.

```bash
python3 plan/PROJECT_V6/reviews/evidence/A_0_4-live-profile-17-red-runner.py
```

The runner uses cwd as root, builds a disposable scratch tree with final tests
and fixtures, and replaces scratch base_adapter with the archived trial16
source. It writes only /tmp results. [RED source/test/fixture hashes](evidence/A_0_4-live-profile-17-red-result.json).
Baseline SHA256: `81e924092fe3beb3ea8d8cfe55630fdf36a5c1df0c59604239e25feca3e420b2`.

## Focused GREEN and independent guard mutations

Final host command (Node v22.22.1; tmux 3.6a-agents.3):

```bash
A04_TEST_TMUX=/tmp/ao-a04-f1-impl/build2/bin/tmux node --test tests/gateway/tmux_client.test.js tests/gateway/codex_supervised.test.js tests/gateway/*_adapter.test.js tests/gateway/pi_opencode_adapters.test.js tests/gateway/prompt_submission.test.js tests/gateway/prompt_submission_capture.test.js tests/gateway/claude_first_prompt.test.js tests/gateway/tool_error_serialization.test.js tests/gateway/tool_projection_contract.test.js
python3 scripts/ci_gate.py --validate-only
git diff --check
```

[Final GREEN](evidence/A_0_4-live-profile-17-green-final.log.gz): exit0,
**261/261 pass**, 0 failed/cancelled/skipped/todo. Includes 131 submission tests,
all unchanged Claude regressions, prior Codex acceptance guards and disposable
real tmux transport fixtures. Initial candidate GREEN is archived separately.
Manifest validation exit0, no errors, **0 suite tests executed**; no new
discovered test path, manifest unchanged. Whitespace check exit0.

Tests assert literal bracketed paste, exactly one guarded CR on stable success,
no CR on guard/menu/change refusals, no leaked buffers and no send-keys fallback.
Atomic paste refusal receives no input or Enter. A normal queue and normal
warnings draft each retain their inherited positive behavior. Warning-only
composer disappearance stays uncertain after one Enter; a pending warning-only
frame after Enter cannot authorize a second CR.

[Scratch mutation runner](evidence/A_0_4-live-profile-17-mutation-runner.py) and
[results/mutant hashes](evidence/A_0_4-live-profile-17-mutations.json) show all
12 independent removals fail relevant trial17 tests: draft phase, version pin,
exact cursor, idle status, blank history, prior Working exclusion, blank gap,
first-Enter limit, capture equality, process binding, ready prefix and ready
cwd status. Individual mutation logs are archived. No working-tree mutation
and no independent review claim. Geometry/capture validation and both draft
markers also remain required; redundant conjuncts are not claimed separately
mutation-tested when another invariant entails them.

## Candidate hashes and limits

Final base adapter SHA256: `9c9a96b15e11f293c2e32d1ca73f8d7a07d43c227b40a9f5e536dc777b39b247`.
Final submission test SHA256: `fa39402b1f64f867694d08a50b9e99b295cc42b49a31363185088c17993fe1da`.
New fixture SHA256: `fe1aef6bdd039d395667d0822314f9a5904012d253745fc1e3b289be43a9570f`.
[Final candidate/evidence map](evidence/A_0_4-live-profile-17-files.json) binds
source, tests, fixtures, docs, review index, handoff and all new evidence; a
separate seal binds the map and handoff. Historical trial16 hashes remain intact.

Root still owns full gate `bash scripts/ci.sh`, fresh independent Opus review,
live verification bound to the dirty candidate with input counts, and integration.
The rare footer was observed once; its second observation remains unknown.
Synthetic stability is tested, not observed live. Strict snapshot equality may
refuse harmless rendering changes; that tradeoff is intentional. Process IDs
are tmux server/pane-shell provenance, not executable attestation. A change and
reversal between captures is not proven detectable. Only the specified footer
count/layout is supported by this new draft branch. No complete reliability,
full-sheet completion, integration, promotion or release claim.
