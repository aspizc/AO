# V7 A/0/01 — Evidence storage note

Append-only correction to the Trial 1 request. Production is frozen.

The initial git diff --check checked tracked changes only. A subsequent
no-index check of all new paths verified production, tests, schema and Markdown
are whitespace-clean, but three raw pytest text outputs contain pytest-generated
trailing spaces. Those exact raw bytes must not be rewritten to manufacture a
whitespace pass. The raw .log and byte-identical .txt copies remain locally.

Root should commit the lossless .txt.gz wrappers listed below, excluding the
raw .txt copies from the candidate pathspec. Decompress each wrapper to obtain
the exact output referenced by the immutable request. These archives are the
durable evidence; the SHA-256 is for the uncompressed raw bytes.

| Archive | Raw SHA-256 |
|---|---|
| `A_0_1-1-green-attempt-1.txt.gz` | `450e7b803782a222c5a282477ea42dce5b57e62e577ec64f3946a6c531c72de8` |
| `A_0_1-1-green-attempt-2.txt.gz` | `4e4d9aa8a23739703f6f2224a1a5c5d9a49679e4d8a4bf5ec542f38f87638153` |
| `A_0_1-1-green-attempt-3.txt.gz` | `6ad518d33c264f91120ccdd64d8b85a817ba027da5ccd84039c95a1e921a176e` |
| `A_0_1-1-green-attempt-4.txt.gz` | `2cdd593a04c4b6de4b45b4560640ef5a3e9f6e07b0ffab1705906ec9d99d658e` |
| `A_0_1-1-green-final.txt.gz` | `568b8978307cbb0e3ff0d58e1f15271a31f90a55fc69ffaecaeaf414aded9ebc` |
| `A_0_1-1-tdd-red-tests.txt.gz` | `e75732bdef140f9696efdaa914adf12f1ce441c1b37e2406e1fa9d70a8182dd9` |
| `A_0_1-1-tdd-red-umask.txt.gz` | `6370c5ed119804fb4d04e029b1be018d43386ad12ec935d01af5d4274f4eb9f1` |
| `A_0_1-1-tdd-red.txt.gz` | `123e9dca4879290523d6e6d9eee9bead0e119dc8f291ba9dfb2f41f6b68c839c` |

The affected raw outputs are green-attempt-1, tdd-red-tests and tdd-red-umask.
Final GREEN still reports 78 passed; no test, production code, schema, request
or original output was changed by this storage correction. Full gate and
independent review remain pending. Root owns final candidate binding.
