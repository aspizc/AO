# A/0/02 historical retention decision — review request, trial 1

Base: `fb937565e7ebf74dbc85032de6162152f33b05a2`.
Trace: `tr-ao-improve-7076a474-d970-4b5b-8400-6c162c0d0c2b`.

The operator explicitly chose to preserve historical plan/audit/review
records intact with an explicit scanner exception, and clean active code and
examples. The exact four-file candidate records that decision, changes the
human-gate state to answered, and preserves policy-edit and runtime gates.
The original question and earlier decisions/reviews remain immutable.

| Candidate | Git blob |
|---|---|
| `plan/PROJECT_V6/A/0/02.md` | `514377d14919885b59d97403e4311bda7c34539b` |
| `plan/PROJECT_V6/HUMAN_DECISIONS.md` | `9d131ff06fe7a93de6e15af0ca17cba14be161ef` |
| `plan/PROJECT_V6/README.md` | `40ccc7ebfe9f7bc2d46bbe5c61db6c1a154ce27d` |
| `plan/PROJECT_V6/reviews/A_0_2_history_decision.md` | `f9c83330304f227287c6ec46f1de755688058db4` |

Review exact scope and faithful recording, Markdown links and whitespace.
No implementation, runtime verification or independent policy authorization
is claimed. Other in-flight V6 prompt/V7 plan changes are outside scope.
Write one immutable independent Codex verdict; no Claude, staging or commit.
