# tmux agents extension

This directory is the reproducible source boundary for the custom tmux
runtime required by the D/0/07c retained-control and V6 A/0/04 prompt transport contracts. It contains no
built binary and performs no download.

The input is the upstream `tmux-3.6a.tar.gz` archive whose SHA-256 is fixed in
`manifest.json`. `cmd-agents-capture.c` and
`tmux-3.6a-agents.4.patch` are the complete maintained delta. The patch also
keeps the shared default server alive when its last session is retired;
cleanup still never issues `kill-server` and never removes the default
socket.

`paste-buffer -G -p -r` requires the exact pane's application to have
bracketed paste enabled at the write. The server refuses exited/input-off
panes, copy/mode states, synchronization, missing framing/raw flags, and
explicit separators with `agents: bracketed paste unavailable` before any
input. The guard and complete framed enqueue run in one server command;
unguarded upstream paste semantics are unchanged. This proves framing, not
provider prompt acceptance or permission approval. The capture extension
source is unchanged from `3.6a-agents.1`.

`agents-submit-v1` consumes a uniquely named UUIDv4 screen buffer captured by
`capture-pane -b ... -N -T`. It compares the visible grid, server/pane PIDs,
size and cursor, refuses unsafe pane state and unparsed or unread output,
and directly enqueues one CR to the target without ordinary key fanout.
Refusal is `agents: guarded submit refused`; evidence is single use. This
terminal guard cannot prove a provider's internal state has not changed
without output. Ordinary send-keys and the guarded paste source are unchanged.
The submit source is included in the active patch; retained capture stays a
separate digest-pinned source file.

For the pinned offline Linux build, first make the exact source archive and
the pinned container image available locally, then run:

```sh
gateway/vendor/tmux-agents/build-offline.sh \
  /absolute/path/tmux-3.6a.tar.gz \
  /absolute/output-directory
```

The build verifies the source, patch, and extension digests, applies the patch
with zero fuzz, uses `--network none`, does not invoke a package manager, and
emits `tmux-3.6a-agents.4-linux-amd64`.

Darwin artifacts must be produced on the matching native architecture with an
already provisioned compiler, tmux build dependencies, and no package-manager
or network use:

```sh
TMUX_AGENTS_NO_NETWORK=1 TMUX_AGENTS_PACKAGE_MANAGER=none \
  gateway/vendor/tmux-agents/build-offline-darwin.sh \
  /absolute/path/tmux-3.6a.tar.gz \
  /absolute/output-directory \
  darwin/amd64

TMUX_AGENTS_NO_NETWORK=1 TMUX_AGENTS_PACKAGE_MANAGER=none \
  gateway/vendor/tmux-agents/build-offline-darwin.sh \
  /absolute/path/tmux-3.6a.tar.gz \
  /absolute/output-directory \
  darwin/arm64
```

Each native build verifies the same three digests, copies the extension before
applying the active patch with zero fuzz, preserves the generated parser,
and checks the exact custom version. It emits
`darwin/amd64/tmux-3.6a-agents.4` or
`darwin/arm64/tmux-3.6a-agents.4`. A Linux build does not verify either native
Darwin artifact.

The resulting compatible binary must be configured as the user's default
`tmux`. The public observation remains exactly
`tmux attach -t <tmuxTarget>`.
