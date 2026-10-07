# A/0/04 final-submit guard — trial-6 CP3 review request

Status: **plan correction only; pending fresh independent review**.
Assigned bounded task: `ts-ee74812f-e389-48d2-81a5-a6e478fa1492`.
Base/HEAD: `b25eb31b478076b562a060a91761d89f729e1960`.
Branch: `feat/V6-A-0-04-safe-submit`.

Review [CP3 in the transport addendum](../A/0/04-transport.md#cp3--final-enter-evidence-binding-plan-design-trial-5),
full-file SHA-256 `4fc93db0fdb96662ae5d5e6f380e07539818099bd1e4d35038593d070859e4e1`,
against the committed [trial-5 KO](A_0_4-final-submit-plan-5_reviewed_KO.md),
the [trial-4 KO](A_0_4-final-submit-plan-4_reviewed_KO.md),
the owning [sheet](../A/0/04.md), pinned source and AGENTS.md.
The CP3 heading retains its trial-5 provenance deliberately: this task permits
edits only within numbered §§4, 6, 8 and 9. This request binds the trial-6
candidate by the full-file hash above; prior requests and verdicts remain
immutable historical evidence.

## Trial-5 correction coverage

| Trial-5 item | Candidate contract |
|---|---|
| 1 — unparsed output | §4 calls `window_pane_get_new_data(wp, &wp->offset, &unparsed)` and requires `unparsed == 0` together with successful `FIONREAD == 0`. Already-parsed bytes retained for pipe/control delivery do not refuse. §9 adds `guarded_submit_ignores_parsed_bytes_pending_control_client_delivery` (one target CR, no refusal) and `guarded_submit_refuses_unparsed_pane_input` (zero CR), with deterministic injection or explicit SOURCE-REVIEWED / NOT EXECUTED. |
| 2 — capability probe | §6 binds the adapter's tmux client to probe the same target server before the first buffer of every operation. `display-message -p '#{version}'` requires status 0, empty stderr and exact `.3` after strict ASCII decoding/whitespace stripping. `list-commands` requires status 0, empty stderr, exact `agents-submit-v1` and guarded `paste-buffer` usage carrying `-G`. No cross-operation/generation cache; failures return `paste_unavailable` before buffers/input. §8 includes the retained supervisor handshake `.2` → `.3` pin. §9 adds `capability_probe_rejects_missing_submit_command_before_buffer`. |
| 3 — history location | §8 names `plan/PROJECT_V6/reviews/evidence/A_0_4-trial1-tmux-3.6a-agents.2.patch` and its adjacent `.patch.sha256` record, outside active vendor inputs. Preservation is a future post-approval step; no archive is created by this task. The `/tmp` binary is explicitly volatile; durable historical evidence is its recorded hash plus reproducible rebuilding from the pinned archive and exact preserved `.2` patch. |

§9 also labels `ordinary_send_keys_preserves_upstream_sibling_fanout` as a
preservation test expected to pass on `.2`, exempt from new-regression RED.
The unchanged acceptance checklist must be read with that explicit §9
qualification. No runtime test was added or executed. CI inventory
reconciliation remains integrator-owned as already recorded in the addendum.

## Preservation and author verification

Entry preservation manifest: `/tmp/ao-a04-plan6-qm62ysl0/before-files.json`.
Original full-file SHA-256:
`7f0f505310ef4173272355b1eb59db9145f8fc6380c20df42e9c676b95fb56b1`.
The manifest and before-file are temporary author-check material, not durable
runtime evidence or an independent verdict.

- Byte comparison confirms that only CP3 numbered §§4, 6, 8 and 9 changed.
  CP3 introduction, §§1–3, 5, 7, GREEN/acceptance/verification tail and all
  preceding transport text are byte-identical to entry.
- All other 1,973 entry paths, including dirty implementation/test/vendor
  files, prior requests/verdicts and the reviews index, are byte-preserved;
  deleted paths remain deleted. The staging diff is unchanged.
- Scoped `git diff --check` passes. Local relative links in this request
  resolve, and CP3 retains all nine numbered sections.

Only the transport addendum and this new immutable request are in scope.
No runtime code, tests, provider inference, policies, archive movement,
Gateway/tmux execution, staging, commits or push occurred. Runtime tests and
the full gate are NOT RUN for this plan-only task; author document checks
are not runtime or live acceptance evidence.

## Independent-review boundary

Root must assign a fresh independent reviewer session to this exact hash.
Write a new immutable `A_0_4-final-submit-plan-6_reviewed_OK.md` or
`A_0_4-final-submit-plan-6_reviewed_KO.md` with actionable corrections.
The plan author issues no verdict and invokes no reviewer in this task.
Root owns indexing, committing and any later implementation authorization.

Trial-1 KO and F1 remain OPEN; A/0/04 and this refinement remain PLANNED.
F2/F3/F5 evidence stays as recorded in the existing checkpoint. F4, live
provider acceptance/versions/markers/settle timing, native Darwin and the
root-owned solo full gate remain open. No integration, promotion or release
is claimed. Stop here for independent review; do not execute CP3's future
implementation or verification commands.
