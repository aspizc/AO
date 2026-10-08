# Trial 11 — additive HEAD checkpoint

The recovery read HEAD `73223e9a1a46b27f97cb59144cb85a348e9d732f` before
work started; this is the historical base recorded in the immutable handoff.
During this turn a separately performed root review-trail commit advanced HEAD
to `4e0441e05d2175d5a5903c2e6d4fa9222dd79d73`:
`review(v6): reject Claude first-prompt trial 10 (PROJECT_V6 A/0/04)`.
The coder did not stage or commit. The final trial 11 files/SHA map records
that current HEAD. Source, docs, manifest and every trial 10 artifact still
match the trial 11 entry hashes; production changes remain the same dirty
candidate. This additive note clarifies HEAD chronology without overwriting
trial 10 or trial 11 handoff evidence. No independent trial 11 verdict exists.
