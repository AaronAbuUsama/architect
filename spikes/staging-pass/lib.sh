# Spike code, sourced by the other scripts. Never prints an env var; never runs under `set -x`.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EV="$ROOT/spikes/staging-pass/evidence"
PREFIX="ortho-staging-pass-${GITHUB_RUN_ID:?}-"
WR="$ROOT/packages/host-cloudflare/node_modules/.bin/wrangler"
export WRANGLER_SEND_METRICS=false CI=true NO_COLOR=1 FORCE_COLOR=0
mkdir -p "$EV"
# step <name> <command...>: run, time and log one command; its exit code goes to evidence/steps.tsv.
step() {
  local name="$1"; shift
  local t0=$SECONDS
  { echo "=== $name"; "$@"; } >>"$EV/$name.log" 2>&1
  local rc=$?
  printf '%s\t%s\t%ss\n' "$name" "$rc" "$((SECONDS - t0))" >>"$EV/steps.tsv"
  return $rc
}
