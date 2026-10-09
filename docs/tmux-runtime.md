# Pinned tmux runtime

The retained-control session tests require `tmux 3.6a-agents.4`, including
the unchanged `agents-capture-v1` extension and the atomic
`paste-buffer -G -p -r` guard and consuming `agents-submit-v1` final-CR command. A distribution's unmodified tmux cannot
provide that contract. The source archive, patch, extension, and Linux builder
image are pinned in
[`gateway/vendor/tmux-agents/manifest.json`](../gateway/vendor/tmux-agents/manifest.json).

## Linux build

From the AO checkout, use Docker, Python 3, and curl to prepare the public
inputs. The builder targets `linux/amd64` and writes only to the supplied
output directory; it does not install tmux system-wide.

```bash
tmux_build_dir=$(mktemp -d)
tmux_builder_image=$(python3 -c "import json; print(json.load(open('gateway/vendor/tmux-agents/manifest.json'))['offlineLinuxBuilder']['image'])")
docker pull "$tmux_builder_image"
curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
  https://github.com/tmux/tmux/releases/download/3.6a/tmux-3.6a.tar.gz \
  --output "$tmux_build_dir/tmux-3.6a.tar.gz"
gateway/vendor/tmux-agents/build-offline.sh \
  "$tmux_build_dir/tmux-3.6a.tar.gz" "$tmux_build_dir"
mkdir -p "$tmux_build_dir/bin"
ln -s ../tmux-3.6a-agents.4-linux-amd64 "$tmux_build_dir/bin/tmux"
export PATH="$tmux_build_dir/bin:$PATH"
export D007C_TEST_TMUX_PATH="$tmux_build_dir/bin"
export D007C_RUN_REAL_TMUX_PROBE=1
tmux -V
```

The online preparation downloads a public image by digest and the official
source archive. The existing builder then runs with networking disabled,
verifies the archive, patch, and extension SHA-256 hashes, applies the patch
with zero fuzz, preserves the generated parser, and checks the exact runtime
version. A source or patch checksum failure stops the build.

The test path variable is required because the relay tests deliberately use
a bounded executable search path. The probe variable selects the real
retained-control test; omitting it is not verification of that behavior.

Use a separate `TMUX_TMPDIR` for tests so they do not reach existing user
sessions. The GitHub Actions workflow sets an isolated directory, creates a
bootstrap session, runs the required gate with the custom binary, and stops
only that isolated server afterward. It preserves the required disposable
Redis service and the normal gate error summary.

For a runtime deployment, configure the compatible binary as `tmux` on the
Gateway's executable search path. AO 1.1.0 claims `3.6a-agents.4` support only
on linux/amd64, where it is built and tested. Darwin `.4` support is excluded
from that release claim until a native build exists; retaining native builder
instructions in the [vendor README](../gateway/vendor/tmux-agents/README.md)
does not establish Darwin support.

### Manual cutover from a running older server

Installing `.4` or changing PATH does not upgrade a running older tmux server,
including 1.0.0's `3.6a-agents.1` and the unreleased `.3`.
Its `exit-empty=0` default keeps it alive even without sessions. The operator
must wait until no sessions are live on the designated server, then manually
restart that server with the configured `.4` binary. Confirm the server's
`#{version}` is exactly `3.6a-agents.4` before resuming Gateway use. Restarting
ends sessions on that server: never restart a server with live sessions or
stop unrelated servers. The Gateway performs no automatic restart.

Until the manual restart, a `.4` Gateway fails closed against any older server:
no prompt answers, composer submits or retained relay handshake are sent.
This is the operator decision recorded at release/1.1.0 commit `6212f72`,
`plan/PROJECT_V6/reviews/A_0_6_pending_wrap_cutover_decision.md`.

Approved session-prompt submission accepts an observed cursor at x=width
(the pending-wrap column) while retaining exact cursor/grid/identity binding.
It still refuses x>width and y>=height. Composer submission retains x<width;
geometry does not establish a recognized or approved prompt.

The V6 A/0/04 real-input tests use an owned socket per fixture and require the
same custom binary on `PATH` (or an explicit `A04_TEST_TMUX` binary path):

```bash
node --test tests/gateway/guarded_paste.test.js tests/gateway/guarded_submit.test.js
```

These tests observe raw terminal bytes and zero-byte refusals for disabled
or changed bracketed-paste mode, input-off, copy mode and synchronization.
They verify UTF-8 and LF preservation with separate final Enter. This
terminal proof does not establish that a provider accepted a prompt.
