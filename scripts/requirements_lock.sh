#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCKFILE="$REPO_ROOT/requirements.lock"
EXPECTED_UV_VERSION="0.11.21"
MODE="write"
OFFLINE=0
UPGRADE=0

usage() {
  echo "usage: $0 [--check|--check-inputs] [--offline] [--upgrade]" >&2
}

while (($#)); do
  case "$1" in
    --check)
      MODE="check"
      ;;
    --check-inputs)
      MODE="check-inputs"
      ;;
    --offline)
      OFFLINE=1
      ;;
    --upgrade)
      UPGRADE=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
  shift
done

if [[ "$MODE" != "write" && "$UPGRADE" == "1" ]]; then
  echo "--check/--check-inputs and --upgrade are mutually exclusive" >&2
  exit 2
fi

INPUT_DIGEST="$(
  python3 - "$REPO_ROOT" "$EXPECTED_UV_VERSION" <<'PY'
from hashlib import sha256
from pathlib import Path
import sys

root = Path(sys.argv[1])
contract = (
    f"uv={sys.argv[2]};python=3.11;all-extras;universal;generate-hashes;"
    "exclude-newer=2026-10-06T00:00:00Z"
)
digest = sha256()
for relative in (
    "cli/pyproject.toml",
    "orchestrator-langgraph/pyproject.toml",
    "ci/requirements-build.in",
    "scripts/requirements_lock.sh",
):
    digest.update(relative.encode("utf-8"))
    digest.update(b"\0")
    digest.update((root / relative).read_bytes())
    digest.update(b"\0")
digest.update(contract.encode("utf-8"))
print(digest.hexdigest())
PY
)"

if [[ "$MODE" == "check-inputs" ]]; then
  if [[ ! -f "$LOCKFILE" ]]; then
    echo "requirements.lock is missing" >&2
    exit 1
  fi
  RECORDED_INPUT_DIGEST="$(sed -n 's/^# inputs-sha256: //p' "$LOCKFILE")"
  if [[ "$RECORDED_INPUT_DIGEST" != "$INPUT_DIGEST" ]]; then
    echo "requirements.lock inputs are stale; run ./scripts/requirements_lock.sh" >&2
    exit 1
  fi
  echo "requirements.lock inputs are current"
  exit 0
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required to regenerate requirements.lock" >&2
  exit 2
fi
ACTUAL_UV_VERSION="$(uv --version | awk '{print $2}')"
if [[ "$ACTUAL_UV_VERSION" != "$EXPECTED_UV_VERSION" ]]; then
  echo "uv $EXPECTED_UV_VERSION is required; found $ACTUAL_UV_VERSION" >&2
  exit 2
fi

TARGET="$LOCKFILE"
TEMP_LOCK=""
cleanup() {
  if [[ -n "$TEMP_LOCK" && -f "$TEMP_LOCK" ]]; then
    rm "$TEMP_LOCK"
  fi
}
trap cleanup EXIT

if [[ "$MODE" == "check" ]]; then
  if [[ ! -f "$LOCKFILE" ]]; then
    echo "requirements.lock is missing" >&2
    exit 1
  fi
  TEMP_LOCK="$(mktemp "${TMPDIR:-/tmp}/agents-requirements-lock.XXXXXX")"
  cp "$LOCKFILE" "$TEMP_LOCK"
  TARGET="$TEMP_LOCK"
fi

compile=(
  uv pip compile
  cli/pyproject.toml
  orchestrator-langgraph/pyproject.toml
  ci/requirements-build.in
  --all-extras
  --universal
  --python-version 3.11
  --generate-hashes
  --exclude-newer 2026-10-06T00:00:00Z
  --custom-compile-command "./scripts/requirements_lock.sh"
  --output-file "$TARGET"
  --quiet
)
if [[ "$OFFLINE" == "1" ]]; then
  compile+=(--offline)
fi
if [[ "$UPGRADE" == "1" ]]; then
  compile+=(--upgrade)
fi

(
  cd "$REPO_ROOT"
  "${compile[@]}"
)

python3 - "$TARGET" "$INPUT_DIGEST" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
digest = sys.argv[2]
lines = [
    line
    for line in path.read_text(encoding="utf-8").splitlines()
    if not line.startswith("# inputs-sha256: ")
]
lines.insert(2, f"# inputs-sha256: {digest}")
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

if [[ "$MODE" == "check" ]]; then
  if ! cmp -s "$LOCKFILE" "$TEMP_LOCK"; then
    echo "requirements.lock is stale; run ./scripts/requirements_lock.sh" >&2
    diff -u "$LOCKFILE" "$TEMP_LOCK" >&2 || true
    exit 1
  fi
  echo "requirements.lock is current"
fi
