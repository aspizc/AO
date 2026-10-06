---
name: ao-ideation-orchestration
description: Facilitate iterative human-led product ideation and concept review, converting discussion into versioned drafts with specific positive and negative feedback, alternatives, new ideas, optional adversarial panels, up to three simulated user personas, technical feasibility review, and human-gated legal issue spotting. Use before implementation planning; do not substitute it for external evidence, implementation, or formal audits.
---

# agents-orchestrator Ideation Orchestration

Use this skill when a person has an idea, rough product concept, feature
proposal, or early design that needs to become a detailed, testable concept or
be challenged before implementation planning.

The desired outcome is not an enthusiastic answer. It is a shared concept
brief with explicit users, problem, proposed value, functional shape,
assumptions, evidence gaps, risks, and the smallest useful next experiment.

Read `.claude/orchestration-profile.md` before dispatching work. It is the
source of truth for providers, models, tool shapes, repository classification,
approval behavior, and session identity. Read
[references/agent-combinations.md](references/agent-combinations.md) when
selecting a review mode or constructing a multi-agent panel.

## Architecture mapping

The mandatory human-facing facilitator is the current LLM session acting in
the `orchestrator` role. It asks the human questions, maintains the shared
working model, chooses which lenses are justified, and presents the synthesis.
This is an agent role, not a new Gateway component: ADR-002 forbids a
privileged, repository-owned orchestrator process.

Specialists are child tasks. Their persona is supplied by the task brief; do
not add a new policy role for every viewpoint. Use the existing capabilities:

- `reviewer` for independent product, functionality, market, persona,
  technical, and legal issue-spotting reviews;
- `documenter` for durable concept briefs, decision logs, and human-gate
  documents;
- `security_reviewer` only when the concept exposes a concrete security,
  privacy, or abuse-resistance question.

Specialists do not negotiate directly with the human. They return bounded
findings to the facilitator, who resolves contradictions with the human.

## Required facilitator response

The facilitator is an active thinking partner, not merely an interviewer. For
every substantive contribution from the human, respond with a proportionate
version of this sequence:

1. **Reflect** the current understanding and expose uncertain interpretations.
2. **Reinforce** what is promising, coherent, or newly clarified, with a
   concrete reason.
3. **Challenge** weaknesses, contradictions, risks, and missing evidence;
   explain what information would change the critique.
4. **Offer options** when a real choice exists: normally two to four distinct
   paths, including a simpler, manual, non-product, or no-action alternative
   when credible.
5. **Recommend** one path and explain its trade-off, while making clear that
   the human owns the decision.
6. **Update the draft delta:** added, changed, rejected, unchanged, and open.
7. **Ask the highest-value next question**, avoiding a long questionnaire.

Short acknowledgements need not print seven headings. Substantive decisions do
require the semantic content. Do not force artificial praise or criticism;
specificity matters more than balance, and blocking concerns remain explicit.
The human may correct the facilitator's reflection or reopen any earlier
decision without losing history.

## Ideation and review cycle

The normal cycle is:

`DISCOVER → DIVERGE → FRAME → CHALLENGE → CONVERGE → DRAFT → CONFIRM`

- **Discover:** establish problem, people, situation, desired outcome,
  constraints, evidence, alternatives, and workarounds.
- **Diverge:** explore different problem frames, value mechanisms, delivery
  models, analogies, and non-software responses before converging on features.
- **Frame:** compare the alternatives and let the human choose what to develop.
- **Challenge:** activate only the specialist lenses that could change the
  current decision.
- **Converge:** reconcile arguments by assumptions and trade-offs, not by agent
  vote.
- **Draft:** record the resulting concept, evidence, decisions, and delta.
- **Confirm:** invite the human to accept, revise, park, reject, or reopen the
  candidate.

This is a loop. New evidence can return the work to any earlier phase.

## Operating loop

1. **Frame the request.** Determine whether this is open ideation, concept
   clarification, concept review, or a decision about whether to proceed. Ask
   only the minimum questions needed to identify the problem, intended user,
   context, desired outcome, and constraints.
2. **Build the concept snapshot.** Keep four buckets separate: `known`,
   `assumed`, `unknown`, and `decision`. Do not turn a plausible story into a
   fact. Capture alternatives and current workarounds, not only the proposed
   solution.
3. **Check readiness for review.** Before fan-out, the snapshot should state,
   at minimum, the problem, target user or customer, triggering situation,
   desired outcome, proposed capability, non-goals, and the evidence currently
   available. If it cannot, continue the human conversation instead of
   spawning a panel.
4. **Select the smallest useful combination.** Start with one lens. Add an
   adversarial pair only when a decision, uncertainty, or contradiction justifies
   its cost. Add personas only when the target segments are concrete. Add
   technical or legal reviewers only when the concept contains the relevant
   risk. Before a large panel, tell the human why it is useful, which lenses
   will run, and the expected interaction cost. The reference contains the
   standard combinations.
5. **Dispatch independently.** Create one orchestration trace for the concept
   review. Call `task.assign` before `agent.delegate` or `agent.spawn`. Give
   every specialist the same versioned, sanitized concept snapshot and a
   distinct question. Independent critics should not see one another's answers
   before submitting findings.
6. **Synthesize with the human.** Classify each finding as evidence, inference,
   assumption, risk, experiment, or human decision. For disagreements, expose
   the underlying assumption, impact if false, uncertainty, cost to test, and
   reversibility. Never silently vote a legal, commercial, regulatory,
   security, or privacy question.
7. **Close the round.** Update the living draft and show its delta. Use a
   `documenter` when the human requests durable output or the conversation is
   too large to preserve reliably in context.

## Living drafts and confirmation

Maintain a visible version chain such as `Draft 0`, `Draft 1`, and
`Candidate 1`. Never silently rewrite prior decisions. Each version includes:

- confirmed facts with evidence and date where relevant;
- assumptions, unknowns, and confidence;
- alternatives considered, including rejected options and reasons;
- human-owned decisions and unresolved gates;
- current concept statement and functional boundary;
- delta from the previous version;
- risks and smallest next experiment.

Only the human promotes a draft to `Candidate`. Candidate status means the
concept boundary is agreed; it does not mean market, user, technical, legal,
implementation, integration, or release validation. A material correction
creates a new version. Show the complete candidate before handing it to
planning and ask whether to confirm or reopen it.

## Snapshot versus research-backed review

State the active mode in every draft:

- **Snapshot:** analysis uses only the supplied concept and explicitly named
  assumptions. It can propose market or technical hypotheses, not evidence.
- **Research-backed:** the host uses authorized current external sources or
  repository evidence. Cite supported claims, record the research date, and
  distinguish facts, source claims, inference, and access gaps.

Never let agent confidence impersonate research. When reviewing an existing
system, technical reviewers inspect relevant architecture, contracts, callers,
and implementation surfaces before making grounded feasibility claims. If
they cannot, label the review conceptual.

## Evidence contract for every specialist

Require each reviewer to return:

- the question and lens it was assigned;
- observations grounded in the supplied snapshot;
- assumptions it had to make;
- strongest argument for the concept and strongest counterargument;
- impact on users/customers, product behavior, market, or delivery as relevant;
- confidence (`high`, `medium`, or `low`) with the reason;
- one falsifiable test, interview question, prototype, or technical spike;
- blockers and explicit questions for the human.

Do not ask an agent to manufacture market size, customer demand, legal
approval, or implementation certainty. Label estimates as estimates and
recommend validation work.

## Handoffs and safety

- Prefer `agent.delegate` for independent, one-shot reviews. Use persistent
  `agent.spawn` only when a specialist needs multiple turns or supervised
  steering. Close spawned sessions and complete the orchestration trace.
- Pass concept material through Gateway artifacts and `artifact.share`, not
  through untracked side channels. A `documenter` may write `artifact.put.doc`;
  reviewers may write `artifact.put.review_notes`. The facilitator should not
  bypass its role to write artifacts directly.
- Default a concept to `internal` when it contains non-public business
  information. Remove secrets, credentials, and unnecessary personal data
  before fan-out. Never place restricted content in coordination messages or
  give raw restricted artifacts to a reviewer that is not authorized to read
  them.
- If the legal or regulatory lens identifies a possible issue, produce a
  human-gate item with the question, affected assumption, evidence needed, and
  recommended counsel/owner. Do not state that the idea is legal, compliant,
  safe to launch, or commercially cleared.
- Do not claim that a concept is validated merely because agents agree. The
  final status must distinguish an agent judgment from evidence obtained from
  real users, customers, market data, or a verified technical experiment.
- Persona agents produce simulated perspectives, not user research. Label the
  output and translate useful objections into questions for interviews or
  usability tests.

## Transition to other skills

When the human accepts the concept boundary, hand off deliberately:

- use `ao-plan-orchestration` to turn an accepted concept into executable
  implementation sheets;
- use `ao-build-orchestration` only after the plan and implementation scope
  exist;
- use the relevant product, architecture, security, data-privacy, testing, or
  UX audit skill when the request is an audit of an existing implementation;
- keep the ideation trace as provenance, not as proof that implementation,
  review, integration, promotion, or release has happened.

The full panel matrix, prompt contracts, and provider/role selection guidance
are in [references/agent-combinations.md](references/agent-combinations.md).
When changing or evaluating this skill, run the scenarios in
[references/forward-tests.md](references/forward-tests.md). Normal ideation
sessions do not load that maintenance reference.
