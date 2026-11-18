#!/usr/bin/env bash
# The spike, end to end, on this machine only. Needs Docker, and a HeroUI Pro login for the install (`npx heroui-pro login`).
#
#   ./run.sh up      viewer + acme (forman dev) + portal server + vite + traffic, each recorded in .run/
#   ./run.sh down    stops every process it started and removes the viewer; nothing is left running
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
acme="$repo/examples/acme"
run="$here/.run"
mkdir -p "$run"

start() { # name, dir, command...
  local name=$1 dir=$2; shift 2
  (cd "$dir" && nohup "$@" </dev/null >"$run/$name.log" 2>&1 & echo $! >"$run/$name.pid")
}

case "${1:-}" in
  up)
    (cd "$repo" && pnpm install --frozen-lockfile >/dev/null)
    (cd "$here/app" && pnpm install --frozen-lockfile >/dev/null)
    (cd "$acme" && node ../../packages/cli/src/main.ts telemetry view)
    start dev "$acme" node ../../packages/cli/src/main.ts dev --port 8791
    until grep -q "running at" "$run/dev.log" 2>/dev/null; do sleep 1; done
    start server "$here/app" node server/main.ts
    start vite "$here/app" env VITE_REPO_ROOT="$repo" npx vite
    start traffic "$here/app" node traffic.ts http://127.0.0.1:8791 "${TRAFFIC_SECONDS:-1800}"
    echo "portal: http://127.0.0.1:5193/#/operations/allowance.spend   (./run.sh down to stop)"
    ;;
  down)
    for p in traffic vite server dev; do
      if [[ -f "$run/$p.pid" ]]; then
        pid=$(cat "$run/$p.pid")
        pkill -TERM -P "$pid" 2>/dev/null || true
        kill "$pid" 2>/dev/null || true
        rm -f "$run/$p.pid"
      fi
    done
    (cd "$acme" && node ../../packages/cli/src/main.ts telemetry stop) || true
    ;;
  *) echo "usage: ./run.sh up | down" >&2; exit 2 ;;
esac
