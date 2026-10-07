# A/0/04 implementation trial 4 — independent review handoff

Status: **uncommitted narrow correction; independent review pending**.
Task: `ts-14a554be-4f07-4c24-aada-77a6cbdd924e`.
HEAD: `03d7f45d37cc30eda6faa0cb85056f57e98434b1`.

Read committed [trial-3 KO](A_0_4-3_reviewed_KO.md) at this HEAD and the
[trial-4 correction checkpoint](A_0_4-trial4_correction_checkpoint.md).
Only trial-3 F1 is corrected. The inherited candidate remains subject to
independent review. No policies/provider inference/commit/push/self-review.

Fresh [candidate path/hash manifest](evidence/A_0_4-trial4-candidate-files.json)
SHA-256: `c841c54e9675b4a3881bddc3fbe00f844f89fc28edb5d08178544db78670f7c0`. It binds 73 paths, including an explicit
null for the inherited `.1` runtime patch deletion. Verify every file hash and
absence. This handoff and its manifest are excluded to avoid cyclic binding;
the manifest includes the trial-3 KO/handoff/manifest, checkpoint and new evidence.

Nondiagnostic first guarded-submit errors now preserve possible delivery
through cleanup failure. Six appended tests cover status-2 and thrown outcomes
with successful/failing cleanup, plus fixed-refusal controls. All inherited
source/test paths except this two-line helper change and test append are
unchanged: **58 of 60 entry paths preserved**, existing test bytes exact prefix.
The four nondiagnostic cases assert **exactly one CR and one guarded submit**;
the fixed-refusal controls assert zero CR and pre-delivery error reasons.

Final-byte host RED: **4 passed / 2 failed**, the two reviewed cleanup failures.
Prompt GREEN: **54/54**. Six-file scoped host GREEN: **83 passed, 0 failed,
cancelled, skipped or todo**. Lint and diff check pass. Commands, failures and
immutable evidence are in the checkpoint. Failed cleanup explicitly leaves
fixture buffers; it is reported as uncertainty, never successful cleanup.

A fresh independent reviewer must cover the complete trial-3 Not examined
list as well as this correction. Root owns reviewer session/trace creation,
review indexing/commit, inventory and full gates. No full gate, live provider
acceptance/version/timing, native Darwin, positive Antigravity profile or full
sheet acceptance is claimed. No verdict, integration, promotion or release.
Stop here for review.
