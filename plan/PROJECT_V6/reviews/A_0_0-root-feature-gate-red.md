# A/0/00 reviewed feature gate — RED

Date: 2026-10-08. Candidate branch
`feat/V6-A-0-00-cli-write-access`, commit
`8c7eb3a97d94fcf351b58b1ee4cfa4d3b23b0cc3`. Trial 2 had an independent
source-review OK, but that verdict did not include the full gate. This root
gate ran on the committed candidate with pinned `tmux 3.6a-agents.3`, an
isolated tmux server, the repository Python virtualenv and a disposable
`redis:7.2-alpine` container. The shell trap stopped those owned resources.

`bash scripts/ci.sh` exited **1**: **2,993 passed, 5 failed, 12 skipped** of
3,010. Redis passed 22/22. The 12 skips are nine declared PostgreSQL and three
declared Gateway/Temporal integrations. Public hygiene found zero findings.
All five failures were in the required Gateway lane:

1. `guarded_paste_rechecks_mode_at_write`: tmux returned `no current target`.
   This is a separate terminal fixture/runtime failure; it is not labelled
   flaky or counted as a pass.
2. `delegate resolves once and preserves one selection identity across every
   runtime consumer`: `POLICY_DENIED` at the new adapter-result validation.
3. The matching `spawn resolves once ...` case: the same denial.
4. `delegate without model uses canonical defaults and audits them`: the
   expected `exitCode` was undefined.
5. `every executable provider can spawn through the gateway`: the existing
   Antigravity non-writer case was rejected by the new fail-closed rule.

The coder has been directed to attribute and fix the coupled fixture/result
expectations and to diagnose the guarded-paste failure separately, then seek
a fresh independent trial-3 review. There is no integration claim.

Raw log SHA-256:
`4868fbe4200067202737d2ad6af305f824b1023e51fcf50f6cf2c2d02d55c02d`.
Archived log: [evidence/A_0_0-reviewed-feature-gate-red.txt.gz](evidence/A_0_0-reviewed-feature-gate-red.txt.gz),
compressed SHA-256
`d00b0752f12d6cda1993cbcd6f3abe6f3c6c330f7335fea8c18929e3bcb3d50b`.
