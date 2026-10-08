# Project V6 review trail

Review submissions and independent verdicts, indexed as they are produced. A
KO is preserved; corrections use the next trial number. Stop and page the human after
15 KO trials on one task, as required by AGENTS.md Rule 13.

| Scope | Trial | Submission | Verdict |
|---|---:|---|---|
| A/0/06 permission prompts | 1 | [request](A_0_6-1_to_review.md) | [KO: unguarded recheck-then-send lets a changed prompt receive the approved key (reproduced on pinned tmux); use agents-submit-v1; 22/22 RED, 273/273 GREEN](A_0_6-1_reviewed_KO.md) |
| A/0/06 permission prompts | 2 | [request](A_0_6-2_to_review.md) | [KO: guarded CR closes the race (6/6 real pinned tmux, 296/296 focused GREEN), but consume+send precede any durable attempt record; a crash after delivery leaves no attempt audit and a later respond records a false `not_answered`/`prompt_no_longer_bound` (reproduced)](A_0_6-2_reviewed_KO.md) |
| A/0/06 permission prompts | 3 | [request](A_0_6-3_to_review.md) | [KO: write-ahead in-flight CAS, attempting audit and crash `uncertain` recovery hold (RED 3/3+2/2 on frozen Trial 2, 301/301 focused GREEN, 6/6 real pinned tmux), but required `lint.gateway` exits 1 with 12 ESLint errors in candidate adapters/transport (baseline exit 0)](A_0_6-3_reviewed_KO.md) |
| A/0/04 live startup release merge | merge-1 | [request](A_0_4-live-startup-merge-1_to_review.md) | [OK: staged merge tree aba56557 preserves both parents; full gate and integration remain root-owned](A_0_4-live-startup-merge-1_reviewed_OK.md) |
| A/0/04 live Codex second-turn confirmation | live-startup-5 | [request](A_0_4-live-startup-5_to_review.md) | [OK: bounded post-Enter second-turn witness, 315/315 focused GREEN; live acceptance remains operator-run](A_0_4-live-startup-5_reviewed_OK.md) |
| A/0/04 live Codex post-turn Ready | live-startup-4 | [request](A_0_4-live-startup-4_to_review.md) | [OK: bounded second-ask readiness, 307/307 focused GREEN; post-Enter acceptance remains open](A_0_4-live-startup-4_reviewed_OK.md) |
| A/0/04 live Codex startup Working | live-startup-3 | [request](A_0_4-live-startup-3_to_review.md) | [OK: strict first-ask Working witness, 299/299 focused GREEN; later post-turn ask remains open](A_0_4-live-startup-3_reviewed_OK.md) |
| A/0/04 live Codex startup raw padding | live-startup-2 | [request](A_0_4-live-startup-2_to_review.md) | [OK: trial-1 corrections reviewed; 19-test RED, 291/291 focused GREEN, 18/18 guard mutations; live acceptance remains open](A_0_4-live-startup-2_reviewed_OK.md) |
| A/0/04 live Codex startup notice | live-startup-1 | [request](A_0_4-live-startup-1_to_review.md) | [KO: real raw tmux padding rejects the draft before Enter; fixture provenance, README and guard tests also require correction](A_0_4-live-startup-1_reviewed_KO.md); [review identity correction](A_0_4-live-startup-1_review_identity_note.md) |
| A/0/05 release-branch merge | root-merge-1 | [request](A_0_5-root-merge-1_to_review.md) | [OK, merge-candidate only, staged uncommitted on release/1.1.0: parents 3e97d70 + 28fd256 exact, base 69f222f; write-tree fd45d83 matches, no unmerged entries; 28fd256 = reviewed tested tree 2751515 + 17 integration-1 review paths only; sole overlap reviews README, staged blob == target-then-source union (1 + 6 rows verbatim, cmp exact); 11 target-only (docs only) and 368 source-only blobs identical to their parent, no A05 code changed; no policies/; validate-only exit 0, hygiene 0, diff --cached --check clean; ci.sh not run; merge commit, committed-tree full gate, live acceptance, integration and release outstanding](A_0_5-root-merge-1_reviewed_OK.md) |
| A/0/01 post-integration status docs | status-1 | [request](A_0_1-status-1_to_review.md) | [OK, uncommitted on 1a91d94: seven status surfaces agree at 4 integrated + 3 unfinished; merge 69f222f parents 3a154f5 + d45584d exact; gate archive gz/raw SHA-256 match, 3067/0/12/3079, Redis 22/22, hygiene 0, 9 PG + 2 gateway + 1 Temporal skips, real-agents not run; AC1–AC4 boxes backed by trial-1 and integration-1 verdicts plus integrated gate; links resolve; no promotion/release claim, no tag; policies/ unchanged, diff --check clean; notes: archive lacks explicit exit/SHA line, root README skip summary terse](A_0_1-status-1_reviewed_OK.md) |
| A/0/05 integration merge candidate | integration-1 | [request](A_0_5-integration-1_to_review.md) | [OK, merge-candidate only, uncommitted MERGE_HEAD fbc4293 onto 69f222f: base b06f1f6; index minus 15 request files rewrites tested tree 2751515 exactly; manifest 353/353 file+index SHA-256 and 13/13 archive gz/raw bindings match; conflict union exactly suites.json, mcp-tools-v1.json, reviews README (union of both parents' rows, verbatim); 6 auto-merges keep every line either parent added; target-only == HEAD, source-only == MERGE_HEAD except the declared reattach test; A05 trail byte-identical; no policies/; A04 adapters byte-identical to HEAD, A00 writeAccess/read-only sandbox, A01 argv/marker validation, A05 settle/transfer/revalidate preserved; observer change accepts only -e NAME=value pairs (10 malformed shapes rejected in a scratch probe; no committed rejection test, non-blocking); RED 0/1 on auto-merge b383d4b and focused GREEN 633/633 reproduced on host .3; attempt-1 6 failures match witness attribution; validate-only, hygiene 0, diff --check clean; full ci.sh, other lanes, live .3 automatic ask, integration and release outstanding](A_0_5-integration-1_reviewed_OK.md) |
| A/0/01 integration merge candidate | integration-1 | [request](A_0_1-integration-1_to_review.md) | [OK, merge-candidate only: parents 3a154f5 + d45584d exact; staged tree 6cb8585 + review files; sole conflict README resolved by adding A/0/01 trial-1 row above retained A/0/00 status-2/status-1 rows, all verbatim; 13 target-only + 33 source-only paths byte-identical; trial-1 manifest 6178b2f2 27/27; ci/suites.json inventory hash only non-manifest source change; no policies/; validate-only exit 0, hygiene 0, scoped diff --check clean, focused Node 272/272, structure 462/462; feature gate archive hashes match (3067/0/12, Redis 22/22; source tree, not merged tree); merge commit, merged-tree full gate, integration and release outstanding](A_0_1-integration-1_reviewed_OK.md) |
| A/0/01 worker environment marker | 1 | [request](A_0_1-1_to_review.md) | [OK, uncommitted on a8e8430: manifest 6178b2f2 27/27 hashes match before and after runs; policies/Gemini byte-identical; focused host 340/340 and sheet command 132/132 (0 skipped), changed-file lint and diff --check exit 0 reproduced; 15/15 scratch mutations (workerEnv checks, delegate env/merge order, live argv reuse, service command/target/marker/duplicate/execution checks) caught; non-blocking: host-red-complete service 18 failures are MIGRATION_PROFILE_MISMATCH not behavioral (valid service RED is service-red.log), validator ignores attached tmux flag forms; full ci.sh gate, commit and integration outstanding](A_0_1-1_reviewed_OK.md) |
| A/0/00 post-integration status docs | status-2 | [request](A_0_0-status-2_to_review.md) | [OK, uncommitted on a8e8430: trial-1 KO corrected (root README.md now names A/0/00 at a8e8430 and four unfinished); all seven status surfaces agree at 3 integrated + 4 unfinished; gate record re-verified (parents, gz/raw SHA-256, 3006/0/12/3018, Redis 22/22, hygiene 0, 9 PG + 2 gateway + 1 Temporal skips, real-agents not run); links resolve; limits stated; no promotion/release/live-sandbox claim; policies/ unchanged](A_0_0-status-2_reviewed_OK.md) |
| A/0/00 post-integration status docs | status-1 | [request](A_0_0-status-1_to_review.md) | [KO, uncommitted on a8e8430: gate record exact (parents, archive gz/raw SHA-256, 3006/0/12/3018, Redis 22/22, hygiene 0, 9 PG + 2 gateway + 1 Temporal skips, real-agents not run); six edited docs consistent at 3 integrated + 4 unfinished with resolving links, backed acceptance boxes, stated limits and no promotion/release claim; policies/ unchanged; root README.md:24 still says "other five V6 sheets remain unfinished" and omits A/0/00](A_0_0-status-1_reviewed_KO.md) |
| A/0/00 integration merge candidate | integration-1 | [request](A_0_0-integration-1_to_review.md) | [OK, merge-candidate only: parents 6fe7f11 + f56ed56 exact; staged tree 21938e2 + review files; sole conflict README resolved by keeping A/0/03 verifier row and adding A/0/00 trial 3/2/1 rows verbatim; 6 target-only + 51 source-only paths byte-identical; trial-3 manifest 25/25; no policies/; validate-only exit 0, hygiene 0, scoped diff --check clean, focused A00 Node 208/208, structure 462/462; trial-3 gate archive hashes match (3dee8b8, not merged tree); merged-commit full gate, integration and release outstanding](A_0_0-integration-1_reviewed_OK.md) |
| A/0/03 Scope 0 release-verifier prerequisite | verifier-1 | [request](A_0_3-verifier-1_to_review.md) | [OK, Scope 0 only, uncommitted on e42818c: SEMVER_TAG `v`→`v?` plus parametrized real-Git ledger test; hashes 1552f096/87c18f19 bound; RED 1 failed/6 passed on base (unprefixed 1.1.0 only), GREEN 73/73 no skips; legacy v1.0.0 accepted; 1.1, 01.1.0, 1.1.0.0, vv1.1.0, refs/heads/1.1.0 refused; promoted-commit, moved-ref, ancestry and checklist checks unchanged; over-broad regex mutations killed; verify-repository passed, hygiene 0, diff --check clean; full gate, integration and scopes 1–5 outstanding; not A/0/03 completion](A_0_3-verifier-1_reviewed_OK.md) |
| A/0/00 role-derived CLI write access | 3 | [request](A_0_0-3_to_review.md) | [OK, uncommitted test-only correction on 1f29faf: all five root-gate failures attributed against the raw log (four mocks missing writeAccess; guarded_paste pane death from a non-atomic mode-file write racing the Python witness, fixed by rename as in guarded_submit); 25/25 manifest and 18/18 trial1/2 hashes match; production/docs/policies == 8c7eb3a; contract RED 24/20/4, mode RED with traceback on pinned tmux 3.6a-agents.3 and private socket, focused GREEN 283/283 and changed-file lint reproduced; mutations on predicate and antigravity fail-closed bite; feature gate still RED, full-gate rerun and integration owned by root](A_0_0-3_reviewed_OK.md) |
| A/0/00 role-derived CLI write access | 2 | [request](A_0_0-2_to_review.md) | [OK, uncommitted test-only correction: 27/27 manifest hashes, only cli_write_access.test.js changed vs trial1, trial1 trail/policies/Gemini byte-identical; 25 real base+Kya profile cases (5 providers × reviewer/editor/planner/coder, Kya reviewer) assert exact emitted argv/launchCommand, writeAccess, audit and antigravity fail-closed; RED 0/25 on base export, GREEN 251/251 focused host and exact lint reproduced; mutation runs fail on each confinement change; no full gate, policy validate rerun, live enforcement, integration or release claimed](A_0_0-2_reviewed_OK.md) |
| A/0/00 role-derived CLI write access | 1 | [request](A_0_0-1_to_review.md) | [KO: 21/21 manifest hashes, RED 23/1 on base export and GREEN 226/226 focused host reproduced; predicate, per-call Codex sandbox/ceiling, Claude/pi/opencode flags, antigravity fail-closed, service writeAccess validation/audit and Gemini/policies byte-identical verified; AC5 kya-reviewer test missing on a false "kya roles.json removed" claim (file tracked at base, reviewer allows code.write); base-policy emitted-argv per provider untested (synthetic registries only); no full gate, integration or release claimed](A_0_0-1_reviewed_KO.md) |
| A/0/04 regex lint correction | 18 | [request](A_0_4-live-profile-18_to_review.md) | [OK, exact three-space equivalence and focused lint/131 tests; root full gate exit 0 on feature tip](A_0_4-live-profile-18_reviewed_OK.md) |
| A/0/04 integration merge candidate | 1 | [request](A_0_4-integration-1_to_review.md) | [OK, merge-candidate only: parents c4bc008 + 7195cf1 exact; tree ba589f7 + review files; both conflict resolutions correct, 537 one-sided paths byte-identical, V7 and A04 both-side hunks preserved; inventory validates; 0 hygiene findings; structure 456/456; no policies/; unrestricted whitespace check fails only on 16 immutable A04 evidence files; merged-commit full gate, integration and release outstanding](A_0_4-integration-1_reviewed_OK.md) |
| A/0/04 integration status docs | 1 | [request](A_0_4-status-1_to_review.md) | [KO: merge 343222e, gate log hash/counts/skips and docs-only scope verified; V6 README binds A/0/04 to A/0/02's 7df29bd and says six remain; SHEETS inventory and plan/README stale; sheet marked integrated with unchecked criteria and stale live-Claude deferral text; operator-stated lift of the no-Claude restriction not yet recorded in HUMAN_DECISIONS](A_0_4-status-1_reviewed_KO.md) |
| A/0/04 integration status docs | 2 | [request](A_0_4-status-2_to_review.md) | [OK, docs-only and uncommitted: trial-1 findings 1-6 corrected; 343222e parents/tree exact; A/0/02 7df29bd and A/0/04 343222e bound separately, 2 integrated + 5 unfinished everywhere; Claude lift (2026-10-08, Opus 5.5 medium) recorded; six criteria checked with evidence and warning-only/pre-lint-hash caveats; gz archive intact, decompressed SHA b970c5b matches, 2,949/0/12 of 2,961, aggregate infrastructure_unavailable; no code/test/policies diff; hygiene 0, inventory validate-only passed, diff --check clean; notes: Gemini registry-only send-keys residue, unverified restriction rationale, historical BASELINE line](A_0_4-status-2_reviewed_OK.md) |
| A/0/05 feature closure evidence | close-1 | [request](A_0_5-close-1_to_review.md) | [feature-scope OK](A_0_5-close-1_reviewed_OK.md): `.1` feature gate 2,813/0/12 declared skips and live Codex restart/explicit reattach (same task/session, no skips) hash-verified; manual Enter per prompt (pre-A/0/04); uncommitted — not integrated/released, integrated `.3` gate and live run pending |
| A/0/05 local recovery implementation | 4 | [request](A_0_5-4_to_review.md) | [candidate-scope OK](A_0_5-4_reviewed_OK.md): cp27 binding 606/606 + 42/42, shell-startup RED 0/1 → GREEN 1/1, focused 43/43 and wider 385/385 supervisor completed; not full-sheet — full gate, CI inventory and live Codex acceptance pending root/operator |
| A/0/05 local recovery implementation | 3 | [request](A_0_5-3_to_review.md) | [candidate-scope OK](A_0_5-3_reviewed_OK.md): KO1–5 and 7 verified, focused 40/40 and service 144/144 under default isolation; not full-sheet — CI inventory, full gate and live Codex acceptance pending root/operator |
| A/0/05 local recovery implementation | 2 | [checkpoint 18 handoff](A_0_5-18_unreviewed_handoff.md) | [KO](A_0_5-2_reviewed_KO.md): default-isolation test failure, orphaned private delegate server, thread-children gap, denial-envelope override; gate and live check pending |
| A/0/05 local recovery implementation | 1 | [request](A_0_5-1_to_review.md) | [source-only OK](A_0_5-1_reviewed_OK.md); [full gate failed](A_0_5-1-root-gate-failure.md), trial 2 needed |
| A/0/05 append-only recovery migrations | 2 | [request](A_0_5-plan-2_to_review.md) | [OK](A_0_5-plan-2_reviewed_OK.md) |
| A/0/05 local recovery contract | 1 | [request](A_0_5-plan-1_to_review.md) | [KO](A_0_5-plan-1_reviewed_KO.md) |
| Integration status documentation | 1 | [request](INTEGRATION_STATUS-1_to_review.md) | [OK](INTEGRATION_STATUS-1_reviewed_OK.md) |
| A/0/02 implementation | 2 | [request](A_0_2-2_to_review.md) | [OK](A_0_2-2_reviewed_OK.md) |
| A/0/04 stable Codex warnings-only draft | 17 | [request](A_0_4-live-profile-17_to_review.md) | [OK, narrow Codex 0.160.1 warnings-only draft is draft-phase only, needs two byte-identical observations bound to ready process/geometry/prefix/cwd status, blank history and first Enter only; menus win, no initial input, no retry Enter, never acceptance evidence; 5 RED, 12 guard mutations and 261/261 focused host reproduced; hashes verified; root live run (HEAD-bound only) returned Codex and Claude acceptance but did not exercise the warning-only branch, which is fixture-covered only and not live-validated; root full gate, bound live acceptance and integration outstanding](A_0_4-live-profile-17_reviewed_OK.md) |
| A/0/04 Codex 0.160.1 welcome Working profile | 16 | [request](A_0_4-live-profile-16_to_review.md) | [OK, narrow 0.160.1 welcome Working row33 witness binds exact row15 echo, same server/pane/PID/geometry across ready/pending/guard/after and first Enter only; initial welcome Working refused as busy; 2 RED, nine guard mutations and 253/253 focused host reproduced; hashes verified; root live run returned Codex and Claude acceptance (HEAD-bound only); intermittent Codex missing-queue-footer pre-submit unknown_state remains an open limitation; root full gate, bound live acceptance and integration outstanding](A_0_4-live-profile-16_reviewed_OK.md) |
| A/0/04 pre-ask resize and first-ask geometry | 15 | [request](A_0_4-live-profile-15_to_review.md) | [OK, spawn process identity (server/pane/pane PID) still bound on every frame; geometry pinned at first-ask ready so same-process pre-ask resize is accepted and any resize during the ask fails closed with one Enter at most; both Claude profiles; 2 RED, geometry/identity mutations and 246/246 focused host reproduced; hashes verified; root live 2.1.294 run returned acceptance; root full gate, Codex/bound live acceptance and integration outstanding](A_0_4-live-profile-15_reviewed_OK.md) |
| A/0/04 Claude 2.1.294 pre-assistant transient | 14 | [request](A_0_4-live-profile-14_to_review.md) | [OK, bare pre-assistant spinner (empty row 8) admitted only as observation; success still needs exact reply and completion row; same-process, blank-history, stable-word, 8-poll and no-second-Enter guards unchanged; 4 RED, guard mutations and 239/239 focused host reproduced; hashes verified; root full gate, live acceptance and integration outstanding](A_0_4-live-profile-14_reviewed_OK.md) |
| A/0/04 Claude 2.1.294 randomized marker contract | 13 | [request](A_0_4-live-profile-13_to_review.md) | [OK, eight binary completion verbs, six-glyph standard spinner set and per-ask stable strict verb verified against the 2.1.294 binary; trial12 safety boundary unchanged; 8 RED and guard mutations reproduced; 234/234 focused host reproduced; root full gate, live acceptance and integration outstanding](A_0_4-live-profile-13_reviewed_OK.md) |
| A/0/04 Claude 2.1.294 bounded first-ask observation | 12 | [request](A_0_4-live-profile-12_to_review.md) | [KO, safety boundary sound (identity, blank history, no second Enter, bounded poll, cleanup) and 4 RED / 222/222 focused host reproduced; witness pins per-turn random 2.1.294 wording (completion verb 1 of 8, spinner verb 1 of 188, animated glyph), tests pin one sample; root full gate, live acceptance and integration outstanding](A_0_4-live-profile-12_reviewed_KO.md) |
| A/0/04 Claude first-prompt guard coverage | 11 | [request](A_0_4-live-profile-11_to_review.md) | [OK, three tests-only guard tests each fail on their isolated mutation (reproduced); source unchanged since trial 10; 216/216 focused host reproduced; root full gate, live acceptance and integration outstanding](A_0_4-live-profile-11_reviewed_OK.md) |
| A/0/04 Claude first-prompt completed acceptance | 10 | [request](A_0_4-live-profile-10_to_review.md); [operator decision](A_0_4-live-profile-10_operator-decision-memo.md) | [KO, source witness sound; stale-turn, attempt-0 and kill-cleanup guards untested (mutations survive); 213/213 focused host reproduced; root full gate and new live acceptance outstanding](A_0_4-live-profile-10_reviewed_KO.md) |
| A/0/04 lint correction | 1 | [request](A_0_4-lint-1_to_review.md) | [OK, four regex-space substitutions; lint + affected suites; full gate not run](A_0_4-lint-1_reviewed_OK.md) |
| A/0/04 bounded live ready-profile correction | 7 | [request](A_0_4-live-profile-7_to_review.md) | [OK, two witness-guard tests; scoped to trial 6 blockers](A_0_4-live-profile-7_reviewed_OK.md) |
| A/0/04 bounded live ready-profile correction | 6 | [request](A_0_4-live-profile-6_to_review.md) | [KO, frame fix accepted; two untested witness guards](A_0_4-live-profile-6_reviewed_KO.md) |
| A/0/04 bounded live ready-profile correction | 5 | [request](A_0_4-live-profile-5_to_review.md) | [KO, real spinner-frame variant blocker; partial review](A_0_4-live-profile-5_reviewed_KO.md) |
| A/0/04 bounded live ready-profile correction | 4 | [request](A_0_4-live-profile-4_to_review.md) | [OK, source review only; combined trial 3+4](A_0_4-live-profile-4_reviewed_OK.md) |
| A/0/04 bounded live ready-profile correction | 3 | [request](A_0_4-live-profile-3_to_review.md) | [KO, queue footer padding blocker](A_0_4-live-profile-3_reviewed_KO.md) |
| A/0/04 bounded live ready-profile correction | 2 | [request](A_0_4-live-profile-2_to_review.md) | [OK, source review only](A_0_4-live-profile-2_reviewed_OK.md) |
| A/0/04 bounded live ready-profile correction | 1 | [request](A_0_4-live-profile-1_to_review.md) | [OK, source review only](A_0_4-live-profile-1_reviewed_OK.md) |
| A/0/04 prompt submission implementation | 6 | [request](A_0_4-6_to_review.md) | [OK, source review only](A_0_4-6_reviewed_OK.md) |
| A/0/04 prompt submission implementation | 5 | [request](A_0_4-5_to_review.md) | [KO, bounded source review](A_0_4-5_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 4 | [request](A_0_4-4_to_review.md) | [KO, bounded source review](A_0_4-4_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 3 | [request](A_0_4-3_to_review.md) | [KO, partial source review](A_0_4-3_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 2 | [request](A_0_4-2_to_review.md) | [KO, partial source review](A_0_4-2_reviewed_KO.md) |
| A/0/04 guarded final submit design | 6 | [request](A_0_4-final-submit-plan-6_to_review.md) | [OK](A_0_4-final-submit-plan-6_reviewed_OK.md) |
| A/0/04 guarded final submit design | 5 | [transport addendum request](A_0_4-final-submit-plan-5_transport-addendum_to_review.md); [supporting proposal](A_0_4-final-submit-plan-5_to_review.md) | [KO](A_0_4-final-submit-plan-5_reviewed_KO.md) |
| A/0/04 guarded final submit design | 4 | [request](A_0_4-final-submit-plan-4_to_review.md) | [KO](A_0_4-final-submit-plan-4_reviewed_KO.md) |
| A/0/04 prompt submission implementation | 1 | [request](A_0_4-1_to_review.md) | [KO](A_0_4-1_reviewed_KO.md); [context correction](A_0_4-1_review_context_correction.md) |
| A/0/02 history retention decision | 1 | [request](HISTORY_DECISION_2026_10_07-1_to_review.md) | [OK](HISTORY_DECISION_2026_10_07-1_reviewed_OK.md) |
| A/0/04 guarded runtime prerequisite | 3 | [request](A_0_4-plan-3_to_review.md) | [OK](A_0_4-plan-3_reviewed_OK.md) |
| A/0/04 safe submission plan | 2 | [request](A_0_4-plan-2_to_review.md) | [OK](A_0_4-plan-2_reviewed_OK.md) |
| A/0/04 safe submission plan | 1 | [request](A_0_4-plan-1_to_review.md) | [KO](A_0_4-plan-1_reviewed_KO.md) |
| Main documentation publication | 1 | [request](MAIN_DOCS_2026_10_07-1_to_review.md) | [OK](MAIN_DOCS_2026_10_07-1_reviewed_OK.md) |
| README parallel operation | 1 | [request](README_PARALLEL_2026_10_07-1_to_review.md) | [OK](README_PARALLEL_2026_10_07-1_reviewed_OK.md) |
| README lifecycle guide | 1 | [request](README_LIFECYCLE_2026_10_07-1_to_review.md) | [OK](README_LIFECYCLE_2026_10_07-1_reviewed_OK.md) |
| Generic AO workflow direction | 1 | [request](GENERIC_DIRECTION_2026_10_07-1_to_review.md) | [OK](GENERIC_DIRECTION_2026_10_07-1_reviewed_OK.md) |
| AO V6 preparation | 2 | [request](PREPARATION_2026_10_07-2_to_review.md) | [OK](PREPARATION_2026_10_07-2_reviewed_OK.md) |
| AO V6 preparation | 1 | [request](PREPARATION_2026_10_07-1_to_review.md) | [KO](PREPARATION_2026_10_07-1_reviewed_KO.md) |

## Operator decisions and baseline

- [A_0_5: reattachment](A_0_5_human_decision.md)
- [A_0_6: command scopes](A_0_6_human_decision.md)
- [A_0_3: release lineage](A_0_3_human_decision.md)
- [A_0_2: original snapshot questions](A_0_2_to_check_by_human.md)
- [A_0_2: generic workflow direction](A_0_2_human_decision.md)
- [A_0_2: history retention answered](A_0_2_history_decision.md)
- [A_0_2: authorized registry migration](A_0_2_operator_registry_decision.md)
- [AO baseline](../BASELINE.md)

The operator temporarily prohibits Claude execution. This preparation uses
Codex authoring and a distinct Codex reviewer under the already-authorized
session-agent fallback; it is not cross-vendor or Gateway-spawned review.

## Implementation checkpoints

- [A/0/02 integration and gate limits](A_0_2_integration_checkpoint.md)
- [A/0/04 adapter checkpoint, unreviewed](A_0_4-build-1_checkpoint.md)
- [A/0/04 guarded runtime checkpoint, unreviewed](A_0_4-build-2_checkpoint.md)

- [A/0/05 discovery checkpoint, implementation pending](A_0_5-1_implementation_checkpoint.md)

## Current build checkpoint

Trial 18 rewrites only the Claude 2.1.294 cwd header regex's literal space
runs as ` {3}` to clear `no-regex-spaces`; semantics unchanged. See the
[immutable handoff](A_0_4-live-profile-18_to_review.md). Independent
[OK verdict](A_0_4-live-profile-18_reviewed_OK.md); focused ESLint and
131/131 prompt_submission. The [root full gate](A_0_4-live-profile-18-root-gate.md)
exited 0 with 2,822 passed and 12 allowed skips. Integration review remains open.

Trial 17 admits only a stable, exact Codex 0.160.1 warnings-only post-paste
draft through guarded first Enter. See the [immutable handoff](A_0_4-live-profile-17_to_review.md).
Trial 16 artifacts and positive acceptance checks are preserved. Independent
[OK verdict](A_0_4-live-profile-17_reviewed_OK.md); the warning-only branch is
not live-validated. Root owns live verification and integration.

Trial 16 adds the narrowly measured Codex 0.160.1 welcome Working layout.
See the [immutable handoff](A_0_4-live-profile-16_to_review.md) and
[OK verdict](A_0_4-live-profile-16_reviewed_OK.md). The intermittent
pre-submit Codex refusal remains open. Root owns the full gate and integration.
Trial 15 OK remains historical evidence; no integration claimed.

Trial 15 separates fresh-spawn process identity from geometry pinned at the first
ask for both measured Claude profiles. See the [immutable handoff](A_0_4-live-profile-15_to_review.md).
Implemented;
independently reviewed OK ([verdict](A_0_4-live-profile-15_reviewed_OK.md)). No
integration is claimed. Full gate, live acceptance and integration remain root-owned. Trial 14 OK remains historical evidence for its bound candidate.

Trial 14 adds the live-observed pre-assistant bare-spinner transient to the
existing first-ask observation poll. See the [immutable handoff](A_0_4-live-profile-14_to_review.md).
Implemented;
independently reviewed OK ([verdict](A_0_4-live-profile-14_reviewed_OK.md)). No
integration is claimed. Full gate and live acceptance remain root-owned.

Trial 13 addresses only corrections 1–5 from the trial12 KO. See the
[immutable handoff](A_0_4-live-profile-13_to_review.md). Implemented;
independently reviewed OK ([verdict](A_0_4-live-profile-13_reviewed_OK.md)). No integration
is claimed; root retains full-gate and live-acceptance ownership.

Trial 12 refines the observed Claude 2.1.294 first-ask delay. See the
[immutable handoff](A_0_4-live-profile-12_to_review.md). Implemented; independent
Opus 5.5 medium review pending. No trial12 verdict or integration is claimed.

A/0/04 implementation trial 1 is independently KO; no candidate code is integrated.
The operator re-enabled Claude and selected Opus 5.5 medium for new reviews,
and GPT-6.1 medium priority for coders. Historical preparation attribution above
remains historical. See the immutable trial-1 context correction.
