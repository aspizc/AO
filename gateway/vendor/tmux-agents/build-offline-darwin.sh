#!/bin/sh
set -eu

source_sha256='b6d8d9c76585db8ef5fa00d4931902fa4b8cbe8166f528f44fc403961a3f3759'
patch_sha256='e8139a40bc2badcc95475d003158906444d2b33a7ad8553dcae1e9371b97955d'
extension_sha256='4d80a8610651a1dd304b9b0e9b45d6832e115d9827d5166f26b4f9dbcdec27e2'

if [ "$#" -ne 3 ]; then
    echo "usage: build-offline-darwin.sh /absolute/path/tmux-3.6a.tar.gz /absolute/output-directory darwin/amd64|darwin/arm64" >&2
    exit 64
fi
source_archive=$1
output_directory=$2
platform=$3
case "$source_archive:$output_directory" in
    /*:/*) ;;
    *) echo "archive and output directory must be absolute paths" >&2; exit 64 ;;
esac
case "$platform" in
    darwin/amd64) expected_arch=x86_64; output_name=darwin/amd64/tmux-3.6a-agents.3 ;;
    darwin/arm64) expected_arch=arm64; output_name=darwin/arm64/tmux-3.6a-agents.3 ;;
    *) echo "unsupported Darwin platform" >&2; exit 64 ;;
esac
test "$(uname -s)" = Darwin
test "$(uname -m)" = "$expected_arch"
test "${TMUX_AGENTS_NO_NETWORK:-1}" = 1
test "${TMUX_AGENTS_PACKAGE_MANAGER:-none}" = none
test -f "$source_archive"

package_directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
build_directory=$(mktemp -d "${TMPDIR:-/tmp}/tmux-agents-darwin.XXXXXX")
cleanup() { rm -rf "$build_directory"; }
trap cleanup EXIT INT TERM
printf '%s  %s\n' "$source_sha256" "$source_archive" | shasum -a 256 -c -
printf '%s  %s\n' "$patch_sha256" "$package_directory/tmux-3.6a-agents.3.patch" | shasum -a 256 -c -
printf '%s  %s\n' "$extension_sha256" "$package_directory/cmd-agents-capture.c" | shasum -a 256 -c -
tar -xzf "$source_archive" -C "$build_directory"
cp "$package_directory/cmd-agents-capture.c" "$build_directory/tmux-3.6a/cmd-agents-capture.c"
patch --fuzz=0 -d "$build_directory/tmux-3.6a" -p1 < "$package_directory/tmux-3.6a-agents.3.patch"
cd "$build_directory/tmux-3.6a"
YACC=true ./configure --disable-static
parser_before=$(shasum -a 256 cmd-parse.c | cut -d ' ' -f1)
make -j1
parser_after=$(shasum -a 256 cmd-parse.c | cut -d ' ' -f1)
test "$parser_before" = "$parser_after"
test "$(./tmux -V)" = 'tmux 3.6a-agents.3'
mkdir -p "$output_directory/$(dirname "$output_name")"
install -m 0755 ./tmux "$output_directory/$output_name"
