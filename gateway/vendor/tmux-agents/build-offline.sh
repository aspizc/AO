#!/bin/sh
set -eu

builder_image='node@sha256:0625f79a0c9f5005e31dba1761260b9f66ea8a3293e5f645eb4550a4c7dcdbb9'
source_sha256='b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759'
patch_sha256='e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d'
extension_sha256='4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2'

if [ "$#" -ne 2 ]; then
    echo "usage: build-offline.sh /absolute/path/tmux-3.6a.tar.gz /absolute/output-directory" >&2
    exit 64
fi

source_archive=$1
output_directory=$2
case "$source_archive:$output_directory" in
    /*:/*) ;;
    *)
        echo "source archive and output directory must be absolute paths" >&2
        exit 64
        ;;
esac
case "$source_archive:$output_directory" in
    *:*) ;;
esac
if [ ! -f "$source_archive" ]; then
    echo "tmux source archive is unavailable" >&2
    exit 66
fi

package_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mkdir -p -- "$output_directory"

docker image inspect "$builder_image" >/dev/null
docker run \
    --rm \
    --pull never \
    --network none \
    --platform linux/amd64 \
    --read-only \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --user "$(id -u):$(id -g)" \
    --tmpfs /build:rw,exec,nosuid,nodev,mode=1777,size=536870912 \
    --tmpfs /tmp:rw,exec,nosuid,nodev,mode=1777,size=67108864 \
    --mount "type=bind,src=$source_archive,dst=/input/tmux-3.6a.tar.gz,readonly" \
    --mount "type=bind,src=$package_directory,dst=/package,readonly" \
    --mount "type=bind,src=$output_directory,dst=/output" \
    --env LC_ALL=C \
    --env TZ=UTC \
    "$builder_image" \
    sh -eu -c "
        printf '%s  %s\\n' '$source_sha256' /input/tmux-3.6a.tar.gz |
            sha256sum -c -
        printf '%s  %s\\n' '$patch_sha256' /package/tmux-3.6a-agents.3.patch |
            sha256sum -c -
        printf '%s  %s\\n' '$extension_sha256' /package/cmd-agents-capture.c |
            sha256sum -c -
        tar -xzf /input/tmux-3.6a.tar.gz -C /build
        cp /package/cmd-agents-capture.c /build/tmux-3.6a/
        patch --fuzz=0 -d /build/tmux-3.6a -p1 \
            < /package/tmux-3.6a-agents.3.patch
        cd /build/tmux-3.6a
        YACC=true ./configure --disable-static
        parser_before=\$(sha256sum cmd-parse.c | cut -d ' ' -f1)
        make -j1
        parser_after=\$(sha256sum cmd-parse.c | cut -d ' ' -f1)
        test "\$parser_before" = "\$parser_after"
        test \"\$(./tmux -V)\" = 'tmux 3.6a-agents.3'
        install -m 0755 ./tmux /output/tmux-3.6a-agents.3-linux-amd64
    "
