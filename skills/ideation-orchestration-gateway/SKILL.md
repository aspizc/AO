---
name: ideation-orchestration-gateway
description: Facilitate iterative human-led product ideation and concept review, turning discussion into versioned drafts with constructive positive and negative feedback, options, new ideas, optional adversarial panels, up to three simulated user personas, technical feasibility review, and human-gated legal issue spotting. Use before implementation planning; do not use it as a substitute for research evidence, build, code, or formal audits.
---

# Ideation Orchestration through agents-gateway

Use this skill when a person has an idea, rough product concept, feature
proposal, or early design that needs to become a detailed, testable concept or
be challenged before implementation planning.

The outcome is a shared concept brief with explicit users, problem, proposed
value, functional shape, assumptions, evidence gaps, risks, and the smallest
useful next experiment. It is not an agreement machine.

Load `agents-gateway-orchestration` and read the target repository's
`.claude/orchestration-profile.md` before dispatching work. If it has no profile,
establish its allowed roles, providers, models, repository classification, and
approval rules with the operator before launching specialists; never assume
this repository's development defaults apply to a consumer project. Read
[references/agent-combinations.md](references/agent-combinations.md) when
selecting a review mode or constructing a multi-agent panel.

## Architecture mapping

The mandatory human-facing facilitator is the current LLM session acting in
the `orchestrator` role. It asks the human questions, maintains the shared
working model, chooses which lenses are justified, and presents the synthesis.
This is an agent role, not a new Gateway component: ADR-002 forbids a
privileged, repository-owned orchestrator process.

Specialists are child tasks. Their persona is supplied by the task brief; do
not add a new policy role for every viewpoint. Use `reviewer` for independent
product, functionality, market, persona, technical, and legal issue-spotting;
`documenter` for durable concept briefs and decision logs; and
`security_reviewer` only for concrete security, privacy, or abuse-resistance
questions. Specialists return bounded findings to the facilitator and do not
negotiate directly with the human.

## Human interaction contract

The conversation is the primary product. After each meaningful human
contribution, respond proportionately with:

1. **Reflection:** restate what was understood and flag uncertain
   interpretations.
2. **Positive feedback:** name the specific strength, opportunity, or newly
   clarified element and why it matters.
3. **Critical feedback:** name the concrete weakness, contradiction, risk, or
   missing evidence and what would change the assessment.
4. **Options:** offer two to four materially different paths when choice would
   help, including a simpler, non-product, or do-nothing path when credible.
5. **Recommendation:** state a reasoned preference while leaving the decision
   with the human.
6. **Draft delta:** show what is added, changed, rejected, and still open.
7. **Next question:** ask one prioritized question, or a very small group of
   tightly coupled questions, that most improves the draft.

Compress this pattern for short turns, but do not silently omit feedback or
draft updates after a substantive decision. Praise and criticism must be
specific; do not manufacture balance or hide a blocking concern inside a
compliment. The human may correct the reflection, reject recommendations,
reopen a decision, or request a different review depth at any time.

## Conversation lifecycle

Use this as a loop, not a rigid waterfall:

`DISCOVER → DIVERGE → FRAME → CHALLENGE → CONVERGE → DRAFT → CONFIRM`

- **DISCOVER:** understand the problem, users, context, outcome, constraints,
  evidence, and current alternatives.
- **DIVERGE:** generate meaningfully different solution directions, analogies,
  reframings, and non-software alternatives before locking onto features.
- **FRAME:** compare options and agree which concept boundary to develop.
- **CHALLENGE:** use independent specialists only for unresolved lenses that
  matter to the current decision.
- **CONVERGE:** reconcile findings by assumption and trade-off, not by majority
  vote.
- **DRAFT:** update the living concept and record the delta and decisions.
- **CONFIRM:** ask the human to accept, revise, park, reject, or reopen the
  current candidate.

Loop backward whenever new evidence invalidates an earlier frame.

## Operating rules

1. Frame the request as open ideation, clarification, concept review, or a
   proceed/park decision. Ask only the minimum questions needed to identify the
   problem, intended user, context, desired outcome, and constraints.
2. Build a snapshot with separate `known`, `assumed`, `unknown`, and `decision`
   buckets. Capture current alternatives and workarounds, not only the
   proposed solution.
3. Do not fan out until the snapshot states the problem, target user/customer,
   trigger, desired outcome, proposed capability, non-goals, and available
   evidence. Continue the human conversation if it cannot.
4. Select the smallest useful combination. Add an adversarial pair only when a
   decision, uncertainty, or contradiction justifies its cost. Add personas
   only for concrete segments. Add technical or legal lenses only when their
   risk is present. Tell the human why a panel is useful and what it will cost
   in time and complexity before a large fan-out. Use the reference matrix.
5. Create one trace for the concept review. Call `task.assign` before
   `agent.delegate` or `agent.spawn`. Give every specialist the same versioned,
   sanitized snapshot and a distinct question. Independent critics must not see
   one another's answers before submitting findings.
6. Synthesize with the human. Classify findings as evidence, inference,
   assumption, risk, experiment, or human decision. Group disagreement by the
   assumption it challenges, impact if false, uncertainty, cost to test, and
   reversibility. Never silently vote a legal, commercial, regulatory,
   security, or privacy question.
7. Close each round by updating the living draft. Assign a `documenter` when a
   durable record is requested or the discussion is too large to preserve
   safely in the conversation.

## Living draft contract

Maintain one current draft with a visible version such as `Draft 0`, `Draft 1`,
and `Candidate 1`; do not overwrite history silently. Each update records:

- confirmed facts and their evidence;
- assumptions and unknowns;
- selected and rejected options with reasons;
- decisions owned by the human;
- the current concept text;
- the delta from the prior version;
- open questions, risks, and next experiment.

`Candidate` means the human confirmed the concept boundary, not that users,
market, technology, legality, implementation, or release are validated. A
substantive human correction creates a new draft version. Before handoff to
planning, show the candidate and ask the human to confirm or reopen it.

## Analysis and research modes

Label every review as one of:

- **Snapshot review:** reasoning only from the supplied concept and clearly
  identified assumptions. It may suggest market hypotheses but provides no
  market evidence.
- **Research-backed review:** uses authorized, current external or repository
  evidence. Cite sources near supported claims, distinguish direct evidence
  from inference, and record the research date and material gaps.

Do not let a specialist imply that snapshot reasoning is current market,
competitor, legal, or technical evidence. For an existing system, technical
feasibility reviewers must inspect the relevant architecture, contracts, and
immediate implementation surfaces before grounded claims; otherwise label
their output conceptual.

## Evidence contract

Every specialist must return its assigned question and lens, observations
grounded in the snapshot, assumptions, the strongest argument and
counterargument, relevant user/product/market/delivery impact, confidence and
why, one falsifiable test, and blockers or questions for the human. Do not ask
agents to manufacture market size, customer demand, legal approval, or
implementation certainty. Label estimates as estimates.

## Handoffs and safety

- Prefer `agent.delegate` for independent one-shot reviews. Use persistent
  `agent.spawn` only for multi-turn or supervised work; close spawned sessions
  and complete the trace.
- Pass concept material through Gateway artifacts and `artifact.share`, not
  untracked side channels. A `documenter` may write `artifact.put.doc`; a
  reviewer may write `artifact.put.review_notes`; a security reviewer may
  write `artifact.put.security_finding`. The facilitator must not bypass its
  role to write artifacts directly.
- Default non-public business information to `internal`. Remove secrets,
  credentials, and unnecessary personal data before fan-out. Never put
  restricted content in coordination messages or give raw restricted
  artifacts to an unauthorized reviewer.
- Legal or regulatory findings become a human-gate item containing the
  question, affected assumption, evidence needed, and owner/counsel. Never say
  that the idea is legal, compliant, safe to launch, or commercially cleared.
- Agent consensus is not validation. Distinguish agent judgment from evidence
  obtained from users, customers, market data, or a verified technical test.
- Persona agents are simulated perspectives, not user research. Label their
  output accordingly and convert useful objections into interview or usability
  questions.

## Transition

After the human accepts the concept boundary, use `plan-orchestration-gateway` for
executable implementation sheets and `build-orchestration-gateway` only after the
plan exists. Use product, architecture, security, data-privacy, testing, or UX
audit skills when the request is an audit of an existing implementation. Keep
the ideation trace as provenance; it does not prove implementation, review,
integration, promotion, or release.

The full panel matrix, prompt contracts, and provider/role selection guidance
are in [references/agent-combinations.md](references/agent-combinations.md).
When modifying or evaluating this skill, use
[references/forward-tests.md](references/forward-tests.md); it is not required
for ordinary ideation sessions.
