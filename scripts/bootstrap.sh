#!/usr/bin/env bash
set -euo pipefail

readonly EXPECTED_UV_VERSION="0.11.21"

fail() {
  printf 'bootstrap: %s\n' "$1" >&2
  exit 1
}

script_path="${BASH_SOURCE[0]}"
if [[ "$script_path" != /* ]]; then
  script_path="$PWD/$script_path"
fi
readonly SCRIPT_PATH="$script_path"
readonly SCRIPT_DIRECTORY="${SCRIPT_PATH%/*}"
if [[ -L "$SCRIPT_PATH" || -L "$SCRIPT_DIRECTORY" ]]; then
  fail "bootstrap script and scripts directory must not be symbolic links"
fi
if ! cd -- "$SCRIPT_DIRECTORY/.."; then
  fail "checkout root could not be resolved"
fi
readonly REPO_ROOT="$(pwd -P)"
cd "$REPO_ROOT"

check_control_path() {
  local relative="$1"
  local expected_type="$2"
  local required="$3"
  local current="$REPO_ROOT"
  local component
  local -a components
  IFS="/" read -r -a components <<<"$relative"

  for component in "${components[@]}"; do
    current="$current/$component"
    if [[ -L "$current" ]]; then
      fail "symbolic links are forbidden in bootstrap control paths: $relative"
    fi
    if [[ ! -e "$current" ]]; then
      if [[ "$required" == "required" ]]; then
        fail "required checkout path is missing: $relative"
      fi
      return
    fi
  done
  if [[ "$expected_type" == "file" && ! -f "$current" ]]; then
    fail "bootstrap control path must be a regular file: $relative"
  fi
  if [[ "$expected_type" == "directory" && ! -d "$current" ]]; then
    fail "bootstrap control path must be a directory: $relative"
  fi
}

validate_control_boundary() {
  local phase="${1:-preinstall}"
  local relative
  local -a required_files=(
    requirements.lock
    scripts/bootstrap.sh
    scripts/bootstrap_preflight.mjs
    scripts/requirements_lock.sh
    cli/pyproject.toml
    orchestrator-langgraph/pyproject.toml
    ci/requirements-build.in
    ci/production-sbom.json
    ci/production-advisories.json
    gateway/package.json
    gateway/package-lock.json
    gateway/.npmrc
    examples/hero/profile.json
    examples/hero/repository.json
    examples/hero/plan.json
    examples/hero/app/index.html
  )
  for relative in "${required_files[@]}"; do
    check_control_path "$relative" file required
  done
  check_control_path .venv directory optional
  check_control_path .venv/bin directory optional
  if [[ "$phase" == "post-venv" ]]; then
    check_control_path .venv/bin/activate file required
  else
    check_control_path .venv/bin/activate file optional
  fi
  check_control_path gateway/node_modules directory optional
}

validate_control_boundary
if [[ ! -x scripts/requirements_lock.sh ]]; then
  fail "scripts/requirements_lock.sh is not executable"
fi
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is required for the lock-only bootstrap"
fi
if ! node_version="$(node --version 2>/dev/null)"; then
  fail "Node.js version could not be verified"
fi
node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"

for installer in uv npm; do
  if ! command -v "$installer" >/dev/null 2>&1; then
    fail "$installer is required for the lock-only bootstrap"
  fi
done

if ! uv_version="$(uv --version 2>/dev/null)"; then
  fail "uv version could not be verified"
fi
if [[ "$uv_version" != "uv $EXPECTED_UV_VERSION" ]]; then
  fail "uv $EXPECTED_UV_VERSION is required"
fi

uv venv --python 3.11 .venv
validate_control_boundary post-venv
# shellcheck disable=SC1091
source .venv/bin/activate
uv pip sync --require-hashes requirements.lock
uv pip install --no-deps --no-build-isolation -e cli -e orchestrator-langgraph --offline
validate_control_boundary post-venv
node scripts/bootstrap_preflight.mjs "$REPO_ROOT" "$node_version"
npm --prefix gateway ci --ignore-scripts
