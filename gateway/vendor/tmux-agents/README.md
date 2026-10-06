# tmux agents extension

This directory is the reproducible source boundary for the custom tmux
runtime required by the D/0/07c retained-control contract. It contains no
built binary and performs no download.

The input is the upstream `tmux-3.6a.tar.gz` archive whose SHA-256 is fixed in
`manifest.json`. `cmd-agents-capture.c` and
`tmux-3.6a-agents.1.patch` are the complete maintained delta. The patch also
keeps the shared default server alive when its last session is retired;
cleanup still never issues `kill-server` and never removes the default
socket.

For the pinned offline Linux build, first make the exact source archive and
the pinned container image available locally, then run:

```sh
gateway/vendor/tmux-agents/build-offline.sh \
  /absolute/path/tmux-3.6a.tar.gz \
  /absolute/output-directory
```

The build verifies the source, patch, and extension digests, applies the patch
with zero fuzz, uses `--network none`, does not invoke a package manager, and
emits `tmux-3.6a-agents.1-linux-amd64`.

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
applying the nine-hunk patch with zero fuzz, preserves the generated parser,
and checks the exact custom version. It emits
`darwin/amd64/tmux-3.6a-agents.1` or
`darwin/arm64/tmux-3.6a-agents.1`. A Linux build does not verify either native
Darwin artifact.

The resulting compatible binary must be configured as the user's default
`tmux`. The public observation remains exactly
`tmux attach -t <tmuxTarget>`.
