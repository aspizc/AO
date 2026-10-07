# A/0/04 prompt submission refinement — plan review, trial 1

Base: `b3aed7c9365e54587dc4f847f82edff272955bfb`.
Candidate: `plan/PROJECT_V6/A/0/04.md`, Git blob
`8bd9dbd7fa38dec9795a6ebf31f94bb6b05ae908`.
Trace: `tr-ao-improve-7076a474-d970-4b5b-8400-6c162c0d0c2b`.

The operator accepted the proposed reliability improvements on 2026-10-07.
This refinement makes prompt submission distinguish a ready composer from
permission/model menus, busy and unknown states. It requires positive
acceptance evidence, bounded retries only for the same pending prompt, no
interleaving asks, literal text and no private content in audit metadata.

Review build readiness, contradictions, testability and provider boundaries
against the existing adapters. This is plan-only, not implementation or live
verification. Claude remains prohibited; its required live check remains
explicitly deferred. Do not widen approval scopes or mutate policies.

The Gateway task assignment returned `REQUEST_CONTEXT_DENIED`; use the
previously authorized independently assigned Codex session fallback.
The reviewer may write only its immutable verdict. Root owns integration and
the review index; other in-flight plan/docs lanes are outside this candidate.
