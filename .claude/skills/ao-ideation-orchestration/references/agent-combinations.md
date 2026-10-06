# Ideation agent combinations

This reference defines the reusable panels for
`ao-ideation-orchestration`. A panel is a set of independent briefs, not a new
set of Gateway roles. The human-facing facilitator remains the current
`orchestrator` session for every panel.

## Role-to-viewpoint map

| Viewpoint | Brief persona | Gateway role | Expected output |
|---|---|---|---|
| Human facilitator | Curious, precise product-discovery partner | `orchestrator` (current session) | Questions, shared snapshot, synthesis, decisions |
| Concept scribe | Neutral editor preserving facts, assumptions, and decisions | `documenter` | Concept brief or decision log via `artifact.put.doc` |
| Opportunity expander | Opens alternative problem frames and solution directions | `reviewer` | Distinct options, analogies, reframings, opportunity questions |
| Simplicity challenger | Searches for the smallest intervention that achieves the outcome | `reviewer` | Manual/non-product alternatives, scope cuts, build thresholds |
| Evidence researcher | Gathers authorized current or repository evidence | `reviewer` | Dated cited evidence, inferences, contradictions, access gaps |
| Product/value advocate | Constructs the strongest credible value case | `reviewer` | User/customer value, functional promise, market upside |
| Product/value challenger | Tries to falsify demand, differentiation, and usefulness | `reviewer` | Counterexamples, alternatives, adoption and market risks |
| Functional journey advocate | Checks that the proposed capability completes a coherent user journey | `reviewer` | Required behavior, happy path, missing outcomes |
| Functional failure critic | Looks for edge cases, misuse, unnecessary scope, and broken promises | `reviewer` | Failure modes, scope cuts, acceptance questions |
| User persona | Speaks from one explicit segment, job, context, and workaround | `reviewer` | Motivation, objections, perceived value, switching threshold |
| Technical feasibility architect | Maps solution shape, dependencies, unknowns, and viable slices | `reviewer` | Feasibility, architecture options, technical spikes |
| Delivery complexity skeptic | Challenges estimates, operational burden, coupling, and sequencing | `reviewer` | Complexity drivers, risks, simplifications, delivery hazards |
| Legal/compliance issue spotter | Identifies questions for qualified human review; never rules | `reviewer` | Issue list, jurisdiction/data assumptions, counsel questions |
| Security/privacy reviewer | Challenges abuse, data exposure, auth, or privacy risks when present | `security_reviewer` | Security/privacy findings via `artifact.put.security_finding` |

The role is a Gateway capability; the persona is the controlled task brief.
Do not use `coder` merely because a reviewer is discussing implementation.
The `coder` role implies write capability and is unnecessary for concept
analysis.

## Standard combinations

| Combination | Agents beyond facilitator | Use when | Minimum deliverable |
|---|---|---|---|
| `INTAKE` | None; optional `documenter` | The idea is still vague or the human wants to think aloud | Problem/user/value snapshot with knowns and unknowns |
| `OPTION_EXPLORATION` | Opportunity expander + simplicity challenger | The problem is becoming clear but the proposal is fixed on one solution | Three to five materially different directions, trade-offs, and one smaller alternative |
| `PRODUCT_TRIAGE` | Product/value advocate + product/value challenger | The human needs a fast challenge across functionality, product value, usefulness, and market | Two independent findings plus a synthesis and one validation experiment |
| `FUNCTIONAL_REVIEW` | Functional journey advocate + functional failure critic | The concept sounds valuable but the behavior or scope is unclear | User journey, functional gaps, edge cases, and smallest coherent slice |
| `USER_COUNCIL` | One to three distinct persona agents | Target segments, contexts, or jobs-to-be-done are explicit | One view per persona; no generic “average user” persona |
| `TECHNICAL_FEASIBILITY` | Technical feasibility architect + delivery complexity skeptic | The concept may be worth pursuing and technical risk affects the decision | Options, dependencies, complexity drivers, spikes, and a thin slice |
| `LEGAL_CHECK` | Legal/compliance issue spotter; add security/privacy reviewer if triggered | Data, regulated activity, licensing, employment, safety, jurisdiction, or contractual exposure appears | Human-gate questions; never a legal/compliance verdict |
| `RESEARCH_BACKED_REVIEW` | Evidence researcher plus the minimum unresolved lens specialists | Current market, competitor, pricing, regulation, or repository facts can change the decision | Dated citations, facts versus inference, evidence gaps, and draft assumptions affected |
| `FULL_CONCEPT_REVIEW` | `PRODUCT_TRIAGE` + `FUNCTIONAL_REVIEW` + optional `USER_COUNCIL` + `TECHNICAL_FEASIBILITY` + conditional `LEGAL_CHECK` | The human explicitly wants a go/no-go concept package | Detailed concept brief, independent findings, risks, experiments, and open human decisions |

The facilitator should choose the smallest row that answers the current
decision. `FULL_CONCEPT_REVIEW` is not the default: it is expensive and can
create false confidence when the user, problem, or evidence is not yet clear.

## Option exploration pair

Use this pair in `DIVERGE`, before adversarial product review, when the human
requests new ideas or the conversation is prematurely centered on features.

**Opportunity-expander brief:**

> Produce materially different ways to create the desired outcome. Reframe the
> problem, vary user and buyer, timing, channel, business/value mechanism, and
> delivery model, and borrow useful analogies from other domains. Include one
> direction that challenges the original product premise. Exclude cosmetic
> feature variants.

**Simplicity-challenger brief:**

> Seek the smallest credible intervention. Explore a manual service, process
> change, integration, existing product, narrower segment, reduced promise,
> staged experiment, or doing nothing. State what evidence must exist before a
> larger product is justified.

The facilitator deduplicates and clusters the output into three to five real
choices, explains the trade-offs, recommends a frame, and asks the human to
select or combine directions. Ideas remain alternatives until human
confirmation moves them into the living draft.

## Adversarial pair design

Run the two members of a pair independently against the same immutable concept
snapshot. Their opposition is in the briefs, not in an unstructured debate:

### Product/value pair

**Advocate brief:**

> Construct the strongest credible case for this concept. Test whether the
> stated user/customer problem is important, whether the proposed behavior
> creates a meaningful outcome, whether a current workaround is inadequate,
> and whether there is a plausible market wedge. Separate evidence from
> assumptions. State what would have to be true for this to deserve a next
> experiment.

**Challenger brief:**

> Try to falsify this concept. Look for a weak or infrequent problem, a better
> existing alternative, low willingness to switch or pay, unclear buyer/user
> distinction, commoditization, distribution difficulty, and unsupported
> market claims. Identify the smallest test that could disprove the concept.

### Functional pair

**Journey advocate brief:**

> Reconstruct the user's desired journey from trigger to outcome. Identify the
> minimum functional behavior needed to complete it, the promise made by the
> concept, and the acceptance questions that would show the promise is met.

**Failure critic brief:**

> Break the proposed journey with edge cases, misuse, conflicting goals,
> missing states, operational constraints, and scope creep. Identify behavior
> that is unnecessary, behavior that is missing, and one simpler boundary that
> preserves the core outcome.

The synthesis must preserve both sides. Agreement is not proof; disagreement
is not automatically a blocker. The facilitator asks the human which
assumption or tradeoff should be tested next.

## User persona slots

Use zero to three personas. Create a slot only when the segment has a distinct
job, context, current workaround, or decision criterion. Good persona input is:

```text
Segment: [specific user/customer group]
Situation: [when the problem occurs]
Job: [what they are trying to accomplish]
Current workaround: [what they do today]
Success threshold: [what would make the idea valuable]
Likely objection: [why they might reject it]
```

Each persona response begins `SIMULATED PERSPECTIVE — NOT USER EVIDENCE`.
It must answer from the supplied slot and must not invent survey data, quotes,
or demand. Convert useful objections into candidate interview or usability-test
questions. The facilitator asks the human to resolve segment conflicts rather
than averaging the personas into a fictional user.

For concurrent personas, choose up to three distinct enabled
`(agent, reviewer)` pairs from the live registry. Prefer provider diversity
when several valid selections exist; do not freeze provider names in this
manual. If fewer pairs are available, run fewer personas and say so; never
pretend one agent produced three independent views. Reusing the same
`(agent, role)` under one trace conflicts
with the Gateway's deterministic session identity; use a new trace only for a
genuinely new run, not to hide a failed result.

## Technical and legal combinations

Technical reviewers should return options and unknowns, not implementation
claims unsupported by the concept. Require:

- feasible solution shapes and the main dependency behind each;
- complexity drivers and the riskiest unknown;
- what can be prototyped or spiked without building the whole product;
- the smallest end-to-end slice and its observable success signal;
- what the concept must explicitly not promise yet.

For an existing repository, the technical pair reads the relevant architecture,
contracts, immediate callers, and implementation surfaces before concluding.
Without repository access, or for a greenfield idea, prefix the result with
`CONCEPTUAL FEASIBILITY — NOT REPOSITORY-VERIFIED`.

Legal/compliance issue spotting is a human-gated lens. Ask for:

- the jurisdiction, user/customer relationship, data category, and activity
  assumptions that affect the question;
- the specific issue to confirm, not a conclusion;
- evidence or documents a qualified reviewer would need;
- a recommended owner and the point before which the decision is required.

If the concept includes personal data, safety-sensitive behavior, security
controls, or regulated decisions, add the narrow security/privacy review and
record the legal/commercial/regulatory question separately for the human. Do
not call a concept “compliant”, “legal”, “safe”, or “approved” based on these
agents.

The legal agent may recommend only the next verification action, qualified
owner/counsel, and timing. It never recommends a legal conclusion.

## Research-backed review contract

Activate research only when a current fact could change an explicit decision
and suitable access is authorized. The evidence researcher:

- states the exact research question and date;
- prefers primary and authoritative sources;
- cites time-sensitive and externally verifiable claims next to the claim;
- marks observed fact, source-reported claim, inference, and unknown
  separately;
- reports unavailable sources and search limitations;
- never treats competitor existence as proof of demand or market size.

The facilitator maps each finding to a named draft assumption before changing
the draft. Interesting but unrelated research remains out of scope.

## Panel waves and human checkpoints

Run the full review as staged waves, with a facilitator synthesis and human
checkpoint after each applicable wave:

1. **Framing:** facilitator, optionally `OPTION_EXPLORATION`.
2. **Value/function:** `PRODUCT_TRIAGE`, then `FUNCTIONAL_REVIEW` only if
   behavior remains unclear.
3. **Users:** `USER_COUNCIL` only after segments are explicit.
4. **Feasibility:** technical pair only while the concept remains plausible.
5. **Risk:** legal/security/privacy only when a concrete trigger exists.

The default wave contains one adversarial pair or up to three persona agents.
The human may stop, redirect, or deepen the next wave. A
`FULL_CONCEPT_REVIEW` selects every applicable wave; it does not launch every
possible specialist simultaneously.

## Dispatch and artifact contract

Use one trace for one concept review. The facilitator follows this sequence:

```text
orchestration.create
  -> task.assign for each specialist
  -> agent.delegate for independent one-shot briefs
     or agent.spawn + agent.ask for a supervised multi-turn specialist
  -> collect sanitized findings through artifact.share / artifact.get
  -> optional documenter task for the durable concept brief
  -> orchestration.complete
```

For each child task, set the target action to the least privilege that matches
the output:

- `artifact.put.review_notes` for product, functionality, persona, technical,
  and legal issue-spotting reviewers;
- `artifact.put.security_finding` for the security/privacy reviewer;
- `artifact.put.doc` for the concept scribe.

The facilitator passes a versioned concept snapshot and asks for a structured
finding. It should not pass raw restricted material to a reviewer. If a human
needs to approve a legal, commercial, security, regulatory, or deletion-policy
decision, persist a human-gate document with the question and stop that branch
until the human resolves it.

The human-gate document records the question, context, options, evidence
boundary, owner, deadline, and next verification action. It does not recommend
a legal, commercial, security, or regulatory outcome.

## Reconcile findings without voting

Deduplicate findings and organize each disagreement around:

- the assumption or decision being challenged;
- impact if the concern is correct;
- uncertainty and quality of available evidence;
- cost and speed of a falsifying test;
- reversibility of deciding now.

Present the strongest credible case on each side. Recommend `decide`, `test`,
`defer`, or `descope`, with reasons, and ask the human to choose. Agent counts
and confidence scores never decide the outcome.

## Synthesis template

The facilitator's final response or durable brief should contain:

1. **Draft control:** version, prior version, date, status, and mode
   (`snapshot` or `research-backed`).
2. **Concept statement:** user/customer, problem, situation, proposed outcome,
   and why now.
3. **Functional boundary:** core journey, minimum behavior, non-goals, and
   acceptance signals.
4. **Value and market:** current alternatives, differentiated promise,
   evidence, assumptions, and market unknowns.
5. **Persona views:** up to three simulated perspectives, each separate and
   attributed to its segment rather than averaged.
6. **Technical shape:** feasible options, complexity, dependencies, risks, and
   smallest technical experiment.
7. **Human-gated questions:** legal, commercial, security, privacy, regulatory,
   or other decisions that agents are not authorized to settle.
8. **Decision:** `draft`, `needs-human-decision`, `concept-ready`, `parked`, or
   `rejected`, with the evidence supporting that status.
9. **Draft delta:** added, changed, rejected, unchanged, and still open.
10. **Next step:** one small experiment or clarification, its owner, and the
   observable result that would change the decision.

Never use the panel's consensus as a substitute for customer evidence,
technical verification, or qualified legal advice.
