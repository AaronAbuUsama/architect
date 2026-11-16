#!/usr/bin/env bash
# Spike. Tries to break a built binary: other working directory, no node on PATH, commands that need effect and our packages.
# usage: break.sh <binary> <example-root>     (example-root = a blueprint project, e.g. examples/acme)
set -uo pipefail
BIN="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
ROOT="$(cd "$2" && pwd)"
CWD="$(mktemp -d)"
cd "$CWD"
trap 'rm -rf "$CWD" "$CLEAN"' EXIT

# a PATH with no node on it (checked)
CLEAN="$(mktemp -d)"   # an empty directory: nothing at all on PATH, node included
env -i PATH="$CLEAN" /bin/sh -c 'command -v node >/dev/null 2>&1' && { echo "node IS on the clean PATH; cannot test"; exit 3; }
echo "cwd=$CWD, PATH=$CLEAN (no node), HOME=/nonexistent-home"

run() {
  local label="$1"; shift
  local out; out="$(timeout 40 env -i PATH="$CLEAN" HOME=/nonexistent-home "$BIN" "$@" 2>&1)"; local rc=$?
  printf '### %s  (exit %s)\n%s\n' "$label" "$rc" "$(printf '%s\n' "$out" | head -${LINES_SHOWN:-3} | cut -c1-200)"
}

run "--version" --version
run "--help" --help
run "add thing widget --dry-run (effect cli + @architect/generators)" add thing widget --dry-run
run "model (compiler, imports the blueprint from disk)" model --root "$ROOT"
run "model --json" model --json --root "$ROOT"
run "brief system.health" brief --root "$ROOT" system.health
run "impact" impact --root "$ROOT"
LINES_SHOWN=6 run "check (spawns oxlint from node_modules/.bin, resolves @architect/lint)" check --root "$ROOT"
LINES_SHOWN=6 run "generate (nx file tree, nx native stubbed)" generate --root "$ROOT"
LINES_SHOWN=6 run "prove --env local (spawns wrangler via process.execPath)" prove --root "$ROOT"
