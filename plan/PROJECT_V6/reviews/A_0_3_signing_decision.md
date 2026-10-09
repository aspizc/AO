# A_0_3 — Release review signing: operator decision

Recorded on 2026-10-09 from the operator's direct answers in this session.
This file records those answers; it is not an agent-issued approval.

**Context.** [`A_0_3-candidate-1_reviewed_KO.md`](A_0_3-candidate-1_reviewed_KO.md) (KO-1) found:

- `ci/reviewer-trust-roots.json` was empty at 1.0.0.
- `collect`/`verify` and the `reviewed` and `released` ledger transitions need an Ed25519-signed
  release review that verifies against a trust root.
- A/0/03 listed signing keys as non-scope.

Answers:

1. **Scope (a).** Exactly one reviewer trust root enters AO 1.1.0:
   - keyId `ao-release-reviewer-2026`, algorithm `ed25519`;
   - public key `OtPpJRB8YJLxDZ/Sp4JBkcWHI9f7kkdbs4GRD9PfeXI=`;
   - subject `mailto:release-reviewer@ao.invalid`, role `independent-reviewer`.

   A/0/03 Non-scope is amended accordingly. No other key, provenance format or signing feature enters
   the release.
2. **Key generation and custody (b).** The operator generated the key pair on 2026-10-09 by running
   `workspace/release-tools/keygen.py` (gitignored, written by the orchestrator) from the operator's
   own shell prompt. The private key is at `~/.config/ao-release/reviewer-ed25519.pem` with mode 600,
   unencrypted, and was never printed or committed.

   The operator **accepts same-OS-account custody**, consistent with
   [`A_0_6_operator_response_decision.md`](A_0_6_operator_response_decision.md). Any process running
   as the operator's account, agent sessions included, can technically read the key and sign. This is
   a documented residual, not authenticated human presence.
3. **What the signature attests (c).** It is an **operator countersignature**. The independent
   review is the committed `A_0_3-candidate-N_reviewed_OK.md` verdict written by a separate reviewer
   session. The signature attests that the operator checked that verdict is bound to the exact
   candidate commit and tree.

   The identity `mailto:release-reviewer@ao.invalid` is a role pseudonym for that countersignature;
   it is not a separate person. The independence check in `collect` compares identity strings only,
   so it cannot detect that the signer is also the candidate's author of record. This model is stated
   in `docs/release-candidate.md`.
4. **Validity (d).** From `2026-10-09T21:09:14Z` until `2027-10-09T00:00:00Z`.
