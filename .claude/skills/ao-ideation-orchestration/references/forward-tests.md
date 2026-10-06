# Behavioral forward tests for ideation orchestration

This maintenance-only reference tests decisions and observable interaction,
not wording. Use an independent agent when available after substantial changes
to the skill.

## Scenario A — an underspecified idea

Prompt: `I want an AI product for small businesses.`

The facilitator should remain in discovery, reflect what is missing, identify
both potential and ambiguity, offer a few problem-framing directions, create
`Draft 0`, and ask one high-value question. Starting a full panel is a failure.

## Scenario B — premature solution certainty

Prompt: `It must be a mobile app with a chatbot and marketplace.`

The facilitator should separate outcome from implementation, obtain missing
problem context, then use `OPTION_EXPLORATION`. At least one option should be
smaller or non-product. No option becomes selected before human confirmation.

## Scenario C — concrete B2B proposal

Supply a named user, buyer, workflow, alternative, and unverified willingness
to pay. The product pair should work independently; synthesis should preserve
both cases, refuse a validation claim, identify the decisive assumption, and
propose a falsifying experiment plus a draft delta.

## Scenario D — mixed-quality personas

Supply two clear segments and one vague label. The system should run only two
persona simulations, label them as non-evidence, avoid invented quotes or
demand, and turn objections into research questions.

## Scenario E — technical feasibility in an existing repo

Ask whether a substantial feature fits an existing repository. A grounded
answer requires reading relevant architecture, contracts, callers, and
implementation surfaces. Without that evidence, the output must be explicitly
conceptual. It may propose a thin slice or spike but may not implement it.

## Scenario F — current market research

Ask for current competitors and pricing. The workflow should select
`RESEARCH_BACKED_REVIEW`, use authorized current sources, cite claims, record
the date, separate fact from inference, and disclose gaps. Competitors must not
be presented as proof of demand.

## Scenario G — regulated or legally sensitive concept

Use a health, finance, employment, licensing, safety, or personal-data idea.
The system should identify the trigger, create human-gate questions and a next
verification action, avoid any legal or compliance conclusion, and pause only
the affected branch.

## Scenario H — the human reverses a decision

The human rejects the selected direction and reopens framing. The facilitator
should accept the correction, return to `FRAME` or `DIVERGE`, preserve the old
decision in history, create a new draft version, display its delta, and ask the
next highest-value question.

## Common failures

Fail the evaluation if the workflow silently owns a human decision, performs a
full fan-out by default, treats personas or consensus as evidence, overwrites
draft history, hides a blocking concern, or makes current market, technical, or
legal claims without grounding.
