# Ideation agent combinations

These are reusable panels for `ao-ideation-orchestration`. They are
independent briefs, not new Gateway roles. The human-facing facilitator is the
current `orchestrator` session in every panel.

## Role-to-viewpoint map

| Viewpoint | Brief persona | Gateway role | Expected output |
|---|---|---|---|
| Human facilitator | Curious, precise product-discovery partner | `orchestrator` (current session) | Questions, snapshot, synthesis, decisions |
| Concept scribe | Neutral editor preserving facts, assumptions, and decisions | `documenter` | Concept brief or decision log via `artifact.put.doc` |
| Opportunity expander | Generates genuinely different frames and solution directions | `reviewer` | Alternatives, analogies, new value paths, questions |
| Simplicity challenger | Seeks a smaller, manual, non-product, or do-nothing solution | `reviewer` | Scope cuts, simpler options, falsification conditions |
| Evidence researcher | Collects authorized current evidence and cites sources | `reviewer` | Dated findings, citations, evidence gaps, inferences |
| Product/value advocate | Constructs the strongest credible value case | `reviewer` | User/customer value, functional promise, market upside |
| Product/value challenger | Falsifies demand, differentiation, and usefulness | `reviewer` | Counterexamples, alternatives, adoption and market risks |
| Functional journey advocate | Checks a coherent user journey and outcome | `reviewer` | Required behavior, happy path, missing outcomes |
| Functional failure critic | Finds edge cases, misuse, unnecessary scope, broken promises | `reviewer` | Failure modes, scope cuts, acceptance questions |
| User persona | Speaks from one explicit segment, job, context, workaround | `reviewer` | Motivation, objections, value, switching threshold |
| Technical feasibility architect | Maps solution shape, dependencies, unknowns, viable slices | `reviewer` | Feasibility, options, technical spikes |
| Delivery complexity skeptic | Challenges complexity, operations, coupling, sequencing | `reviewer` | Complexity drivers, risks, simplifications |
| Legal/compliance issue spotter | Identifies questions for qualified human review; never rules | `reviewer` | Issue list, jurisdiction/data assumptions, counsel questions |
| Security/privacy reviewer | Challenges abuse, data exposure, auth, privacy | `security_reviewer` | Security/privacy findings |

The role is a Gateway capability; the persona is the controlled brief. Do not
use `coder` merely because a reviewer discusses implementation: `coder`
implies write capability and is unnecessary for concept analysis.

## Standard combinations

| Combination | Agents beyond facilitator | Use when | Minimum deliverable |
|---|---|---|---|
| `INTAKE` | None; optional `documenter` | The idea is vague or the human wants to think aloud | Problem/user/value snapshot with knowns and unknowns |
| `OPTION_EXPLORATION` | Opportunity expander + simplicity challenger | The problem is understood but the solution space is narrow or feature-led | Three to five distinct directions, including a simpler alternative, with trade-offs |
| `PRODUCT_TRIAGE` | Product/value advocate + challenger | A fast challenge is needed across functionality, product value, usefulness, and market | Two independent findings, synthesis, one validation experiment |
| `FUNCTIONAL_REVIEW` | Journey advocate + failure critic | Value sounds plausible but behavior or scope is unclear | User journey, gaps, edge cases, smallest coherent slice |
| `USER_COUNCIL` | One to three distinct persona agents | Segments, contexts, or jobs are explicit | One attributed view per persona; no generic average user |
| `TECHNICAL_FEASIBILITY` | Feasibility architect + complexity skeptic | Technical risk affects whether to proceed | Options, dependencies, complexity, spikes, thin slice |
| `LEGAL_CHECK` | Legal issue spotter; add security/privacy reviewer if triggered | Data, regulated activity, licensing, safety, jurisdiction, contract exposure | Human-gate questions; no legal verdict |
| `RESEARCH_BACKED_REVIEW` | Evidence researcher plus only unresolved lens specialists | A decision depends on current market, competitors, pricing, regulation, or repository facts | Dated cited evidence, explicit inferences, gaps, and changed assumptions |
| `FULL_CONCEPT_REVIEW` | Product + functional pairs, optional personas, technical pair, conditional legal | A go/no-go concept package is explicitly requested | Detailed brief, findings, risks, experiments, open human decisions |

Choose the smallest row that answers the current decision. The full panel is
not the default: it is costly and can create false confidence before the
problem or evidence is clear.

## Divergent exploration pair

Run this pair before product critique when the human is attached to one
solution or asks for new ideas.

**Opportunity expander:**

> Generate materially different ways to achieve the desired outcome. Reframe
> the problem, use analogies from other domains, vary the user or buyer,
> timing, channel, and value mechanism, and include at least one direction that
> changes the original product premise. Do not generate cosmetic feature
> variants.

**Simplicity challenger:**

> Find the smallest credible intervention. Consider manual service, process
> change, integration, reuse of an existing product, narrower audience,
> reduced promise, staged experiment, and doing nothing. Explain what evidence
> would justify building more.

The facilitator clusters overlapping ideas, presents three to five distinct
directions with trade-offs, recommends a frame, and asks the human which path
to develop. No direction enters the living draft as selected until the human
confirms it.

## Adversarial pair briefs

Run each pair independently against the same immutable concept snapshot. The
opposition is in the briefs, not an unstructured debate.

### Product/value pair

**Advocate:**

> Construct the strongest credible case. Test whether the user/customer
> problem is important, the behavior creates a meaningful outcome, the current
> workaround is inadequate, and a plausible market wedge exists. Separate
> evidence from assumptions and state what must be true for a next experiment.

**Challenger:**

> Try to falsify the concept. Look for a weak or infrequent problem, a better
> alternative, low willingness to switch or pay, unclear buyer/user
> distinction, commoditization, distribution difficulty, and unsupported
> market claims. Name the smallest test that could disprove it.

### Functional pair

**Journey advocate:**

> Reconstruct the user's journey from trigger to outcome. Identify the minimum
> behavior required to complete it, the promise made by the concept, and the
> acceptance questions that would show the promise is met.

**Failure critic:**

> Break the journey with edge cases, misuse, conflicting goals, missing states,
> operational constraints, and scope creep. Identify unnecessary and missing
> behavior, then propose one simpler boundary preserving the core outcome.

Preserve both sides in the synthesis. Agreement is not proof; disagreement is
not automatically a blocker. Ask the human which assumption or tradeoff to
test next.

## User persona slots

Use zero to three personas. Create a slot only when the segment has a distinct
job, context, workaround, or decision criterion:

```text
Segment: [specific user/customer group]
Situation: [when the problem occurs]
Job: [what they are trying to accomplish]
Current workaround: [what they do today]
Success threshold: [what would make the idea valuable]
Likely objection: [why they might reject it]
```

Every persona output starts with `SIMULATED PERSPECTIVE — NOT USER EVIDENCE`.
Persona agents must not invent survey data, quotes, or demand. Ask the human to
resolve segment conflicts instead of averaging personas into a fictional user.
Turn useful objections into interview or usability-test questions.

For concurrent personas, choose up to three distinct enabled
`(agent, reviewer)` pairs from the live registry, using provider diversity as
a tie-breaker rather than hardcoding provider names. If fewer distinct pairs
are available, run fewer personas; never pretend one agent produced three
independent views.
Reusing the same `(agent, role)` under one trace conflicts with deterministic
session identity; use a new trace only for a genuinely new run, not to hide a
failed result.

## Technical and legal lenses

Technical reviewers return options and unknowns, not unsupported certainty.
Require feasible shapes and dependencies, complexity drivers, the riskiest
unknown, a prototype/spike that avoids building everything, a smallest
end-to-end slice with an observable signal, and promises the concept must not
make yet.

For an existing repository, the technical pair reads the relevant architecture,
contracts, immediate callers, and implementation surfaces before reporting.
For greenfield work or missing repository access, prefix the output with
`CONCEPTUAL FEASIBILITY — NOT REPOSITORY-VERIFIED`.

Legal/compliance issue spotting is human-gated. Ask for the jurisdiction,
relationship, data category, activity assumptions, specific issue to confirm,
evidence a qualified reviewer needs, owner/counsel, and the decision deadline.
If the concept includes personal data, safety-sensitive behavior, security
controls, or regulated decisions, add the narrow security/privacy review and
record the legal/commercial/regulatory question separately. Do not call the
concept compliant, legal, safe, or approved.

Any legal recommendation is limited to the next verification action,
qualified owner, and timing. It must not recommend a legal conclusion.

## Research-backed review

Use research only when current facts materially affect the decision and the
host has authorized access to suitable sources. The researcher must:

- state the exact question and research date;
- prefer primary or authoritative sources;
- cite every time-sensitive or externally verifiable claim;
- separate observed fact, source-reported claim, inference, and unknown;
- report search and access gaps;
- avoid converting competitor presence into proof of demand or market size.

Update the living draft only with findings relevant to an explicit assumption.
Unrelated research does not expand scope.

## Staged panel budget

Run specialists in waves and synthesize with the human between them:

1. **Frame wave:** facilitator; add `OPTION_EXPLORATION` if the solution space
   is narrow.
2. **Value wave:** `PRODUCT_TRIAGE` and, when behavior is unclear,
   `FUNCTIONAL_REVIEW`.
3. **Perspective wave:** `USER_COUNCIL` only after segments are explicit.
4. **Feasibility wave:** technical pair only if the concept remains plausible.
5. **Risk wave:** legal/security/privacy only on a concrete trigger.

Default to no more than one pair or three personas in a wave. The human can
stop, redirect, or request deeper work. `FULL_CONCEPT_REVIEW` means running the
applicable waves; it does not mean launching every agent simultaneously.

## Dispatch and artifact contract

Use one trace per concept review:

```text
orchestration.create
  -> task.assign for each specialist
  -> agent.delegate for independent briefs
     or agent.spawn + agent.ask for supervised multi-turn work
  -> collect sanitized findings through artifact.share / artifact.get
  -> optional documenter task for the durable brief
  -> orchestration.complete
```

Use the least-privilege target action:

- `artifact.put.review_notes` for product, functionality, persona, technical,
  and legal issue-spotting reviewers;
- `artifact.put.security_finding` for the security/privacy reviewer;
- `artifact.put.doc` for the concept scribe.

If a legal, commercial, security, regulatory, or deletion-policy decision
needs human approval, persist `<concept-id>_to_check_by_human.md` with the
question, context, options, next verification action, and evidence boundary,
then stop
that branch until the human resolves it. A message or artifact reference never
grants approval authority.

## Synthesis of disagreements

Do not count votes. Deduplicate findings and group each disagreement by:

- the underlying assumption or decision;
- impact if the concern is correct;
- current uncertainty and evidence quality;
- cost and speed of a falsifying test;
- reversibility of acting now.

Present the strongest credible case on each side, recommend whether to decide,
test, defer, or descope, and leave the final choice with the human.

## Synthesis template

The final response or durable brief contains:

1. **Draft control:** version, status, prior version, date, and current mode
   (`snapshot` or `research-backed`).
2. **Concept statement:** user/customer, problem, situation, outcome, why now.
3. **Functional boundary:** core journey, minimum behavior, non-goals,
   acceptance signals.
4. **Value and market:** alternatives, differentiated promise, evidence,
   assumptions, market unknowns.
5. **Persona views:** up to three simulated perspectives, separate and
   attributed to segments.
6. **Technical shape:** options, complexity, dependencies, risks, smallest
   technical experiment.
7. **Human-gated questions:** legal, commercial, security, privacy,
   regulatory, or other unauthorized decisions.
8. **Decision:** `draft`, `needs-human-decision`, `concept-ready`, `parked`, or
   `rejected`, with the evidence supporting that status.
9. **Draft delta:** added, changed, rejected, unchanged, and still open.
10. **Next step:** one small experiment or clarification, owner, and observable
   result that would change the decision.

Panel consensus never substitutes for customer evidence, technical
verification, or qualified legal advice.
