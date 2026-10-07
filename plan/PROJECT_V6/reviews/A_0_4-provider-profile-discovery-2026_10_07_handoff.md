# V6 A/0/04 provider profile discovery — 2026-10-07

Discovery handoff only; no independent verdict or completion claim. Read the
sheet, transport addendum, stage/plan READMEs, checkpoints 1–2, and current
classifier/adapters. No provider invocation occurred, including Claude version
commands. No code, policies, commits, tests or full gate were changed/run.
This new handoff is the sole authorized write; root owns indexing and integration.

## Claude Code static evidence

`/home/carase/.local/bin/claude` resolves to
`/home/carase/.local/share/claude/versions/2.1.292` (251,456,696 bytes).
SHA-256: `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`.
The native ELF embeds readable Bun JavaScript; it was read as data, never loaded.
The version comment is at byte 232299702 in the composer module. Embedded
metadata also names build time `2026-10-06T05:25:12Z` and source revision
`37832d0b7cad7b40bac7c82dff58629313913edf`.

Offsets below are zero-based in that exact binary. Virtual source paths are
embedded Bun filenames/imports, not files available on the local filesystem.
Source lines count from each NUL-delimited embedded module's first comment.

| Embedded source | Line | Binary byte | Finding |
|---|---:|---:|---|
| `/$bunfs/root/chunk-2ctmhw7t.js` | 94 | 233087613 | `nE` creates the default round composer borders with no left/right border and a bottom border. Alternate/embedded modes have separate render branches. |
| Same module | 94 | 233088395 | `RC` uses the pointer for default prompt mode, `!` for shell mode, or an agent label; its separator is `Hms`. |
| `/$bunfs/root/chunk-gjgee2e6.js` | 12 | 204157671 | `Hms` is U+00A0, a nonbreaking space, rather than ASCII space. |
| `/$bunfs/root/chunk-xpkb3d7v.js` | 12 | 227410880 | `Xe` displays the placeholder only for an empty value; terminal/alternate-screen settings can hide its visible text. The renderer also supports a leading pill, ghost text, highlighting and a viewport. |
| `/$bunfs/root/chunk-2ctmhw7t.js` | 90 | 233035353 | `qWe` receives `isLoading`, obtains the cancel chord with default `esc`, and chooses current footer hints. |
| Same module | 90 | 233044973 | `OWt` emits the interrupt hint when its loading argument is true. An adjacent current footer can therefore provide source-backed busy evidence; scrollback text cannot. |
| Same module | 96 | 233111147 | Paste handling normalizes CR and tabs, changes mode for special prefixes, and replaces large/multiline/link pastes with summary tokens. The line-count threshold is `max(0, min(height - 10, 2))`. |
| `/$bunfs/root/chunk-rq06yye2.js` | 11 | 217644562 | The paste character threshold `A3` is 800. Exact draft text remains unobservable after summarization. |
| `/$bunfs/root/chunk-2ctmhw7t.js` | 86 | 232900148 | The model menu has a fixed `Select model` title. |
| Same module | 106 | 233130329 | Confirmation dialogs use `Switch model?` or `Change effort level?`; these are additional negative fixture candidates. |

The trust dialog's confirmation label is at binary byte 238806982, embedded
module line 11 (module begins at byte 238785531). It identifies the folder
trust decision explicitly. The current global trust/permission/model regex is
evaluated before provider branches in `base_adapter.js:53`.

Minimal fixture proposal: use only the default Linux pointer/composer layout,
its actual U+00A0 separator, two plain horizontal borders, cursor at the empty
input start, and a current default shortcut footer. Exercise a small visible
single-line draft such as a literal key name; then require a fresh adjacent
loading/interrupt footer with an empty composer for acceptance. Distinguish an
empty placeholder from a typed identical string by cursor position. Add
negative cases for shell/agent prefixes, modal cursor drift, model/effort/trust
dialogs, paste summaries, truncated/wrapped drafts and a stale busy footer in
history. Keep multiline, custom layouts, ghost text and hidden placeholders
closed until their exact rendering is established.

These source branches justify a narrowly scoped implementation investigation.
They are not measured pane captures, a complete positive profile, live timing,
or prompt acceptance evidence. No Claude live criterion was satisfied.

## Antigravity local evidence and absence

Contrary to checkpoint 2 and `gateway/README.md:69`, `agy` exists on PATH at
`/home/carase/.local/bin/agy`. It is a native Google-built Go ELF (210,280,656
bytes), not a shell shim or fake test executable.
SHA-256: `19be6af38f7beeaa0db415df9297e314ab3d33fdd6f853434d49f88819bc68e4`.

Static binary evidence includes a shortcut string at byte 84447955, generation
interrupt help at byte 85480542, and compiled source filename references
`third_party/jetski/cli/model/input.go` (39741713) and
`third_party/jetski/cli/model/prompt.go` (39740134). These are names/string-table
entries, not readable renderer source. A bundled changelog contains a 1.1.20
heading at byte 92037424; that heading does not prove the installed CLI version.
The Go build metadata identifies a compiler build, not the product version.

No readable local Antigravity CLI renderer source or provider pane capture was
found in the searched repository, `/tmp`, local library/share/cache directories,
or installed extension artifacts. The discovered temporary fake-agy files are
test fixtures and provide no provider UI evidence. No exact public source
reference was established. The existence of the binary corrects availability;
its isolated strings do not establish ready/pending/busy/decision transitions.
No positive Antigravity fixture is proposed. Keep its unrecognized composer
closed until source or an explicitly scoped capture establishes the profile.

## Remaining boundary

`base_adapter.js:97` currently has no positive Claude/Antigravity branch; shared
decision matches may still return `decision_required`. Root must preserve the
Claude prohibition/deferred live check and the sheet's incomplete status.
This discovery seat did not author implementation or issue a review verdict.
