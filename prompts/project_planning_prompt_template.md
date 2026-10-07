# Project planning prompt template

Plan `<project-outcome>` for `<project-name>` from `<source-documents>`.
Profile: `<profile-path>`; repository: `<repository-id>` at `<project-path>`.

Derive epics from user outcomes and observable acceptance. Decompose each epic
into stories, then bounded executable tasks. Retain epic → story → task
references and their reverse links. Use `<plan-layout>` and
`<review-layout>`; allow a small story to map to one task.

Each task specifies dependencies, owner, exact write scope, RED/GREEN tests,
acceptance, profile-specific verification commands and independent review.
Map shared contracts and files before selecting concurrency. Make unresolved
human decisions visible; do not invent legal or security policy.

Group dependency-ready tasks into waves. A wave lists task admission rules,
shared-file conflicts, concurrency limits, integration owner, checks and exit
criteria. State Gateway ownership at wave setup: one persistent host or an
explicit set of hosts, retained connections through the wave, per-task trace
and session identities, and cleanup of owned resources at completion.

AO currently supplies persistent supervised sessions, task authority and
manual serial integration. Automated dependency scheduling and Gateway
lifetime management per wave are PLANNED runtime work owned by PROJECT_V7.
Do not describe the legacy runner as wave automation. Record the manual
execution steps and required runtime gaps separately.
