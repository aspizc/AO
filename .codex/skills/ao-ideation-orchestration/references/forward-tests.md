# Ideation skill forward tests

Use these scenarios only when creating, changing, or evaluating the skill.
Run them with an independent agent when available. Evaluate observable
behavior, not exact wording.

## 1. Vague idea

Request: `I want to build an AI app for small businesses.`

Expected:

- stays in `DISCOVER` instead of launching a panel;
- reflects ambiguity and gives specific positive and critical feedback;
- offers a small set of problem-framing directions without selecting one;
- asks one prioritized question;
- creates or updates `Draft 0` with unknown user, problem, and outcome.

## 2. Solution fixation

Request: `The answer is a mobile app with a chatbot and a marketplace.`

Expected:

- separates the desired outcome from proposed features;
- invokes or emulates `OPTION_EXPLORATION` only after enough problem context;
- includes a simpler or non-product alternative;
- records selected and rejected options only after human confirmation.

## 3. Product challenge

Request: a concrete B2B concept with a named user, buyer, workflow, and
unverified willingness to pay.

Expected:

- runs advocate and challenger independently;
- preserves both strong arguments;
- does not claim market validation;
- converts the key disagreement into a falsifiable experiment;
- updates the draft delta and asks the human to decide or test.

## 4. Persona council

Request: a concept with two clear user segments and one vague segment.

Expected:

- creates only the two grounded personas;
- labels both outputs as simulated perspectives;
- does not invent quotes, demand, or survey results;
- turns objections into interview or usability questions.

## 5. Existing-system feasibility

Request: add a major feature to an existing repository.

Expected:

- inspects relevant architecture, contracts, callers, and implementation
  surfaces before grounded technical claims;
- otherwise labels the output conceptual;
- proposes a thin slice and technical spike without implementing them.

## 6. Current market evidence

Request: `Review competitors and current pricing before recommending a path.`

Expected:

- selects `RESEARCH_BACKED_REVIEW`;
- uses authorized current sources with nearby citations and a research date;
- distinguishes fact, source claim, inference, and gap;
- does not treat competitors as proof of demand.

## 7. Legal or regulated concept

Request: a health, finance, employment, licensing, or personal-data concept.

Expected:

- identifies the concrete trigger and relevant assumptions;
- produces human-gate questions and a next verification action;
- does not make a legal or compliance conclusion;
- stops only the affected branch while continuing safe unrelated ideation.

## 8. Human changes their mind

Request: the human rejects an earlier selected direction and reopens the
problem framing.

Expected:

- accepts the correction without defending the old recommendation;
- loops back to `FRAME` or `DIVERGE`;
- creates a new draft version preserving prior decision history;
- clearly lists the delta and asks the next highest-value question.

## Failure conditions

Any scenario fails if the facilitator silently fixes a human decision,
launches the full panel by default, presents simulated personas as evidence,
uses consensus as validation, overwrites draft history, hides a blocking
concern, or asserts current market, technical, or legal facts without
grounding.
