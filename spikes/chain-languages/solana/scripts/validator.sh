#!/usr/bin/env bash
# validator.sh start [ticks-per-slot] | stop | with [ticks-per-slot] -- <cmd...>   (with = start, run, always stop)
# RPC 18899 (ws 18900), faucet 19900, gossip + dynamic ports 18000-18099, ledger under ./test-ledger (git-ignored).
set -uo pipefail
SOL="$(cd "$(dirname "$0")/.." && pwd)"; source "$SOL/scripts/env.sh"
RT="$SOL/runtime"; mkdir -p "$RT" "$SOL/evidence"
start() {
  local ticks="${1:-64}"
  [ -f "$RT/validator.pid" ] && kill -0 "$(cat "$RT/validator.pid")" 2>/dev/null && { echo "already running"; return 0; }
  local t0; t0=$(python3 -c 'import time;print(time.time())')
  ( cd "$SOL" && exec solana-test-validator --reset --ledger test-ledger --bind-address 127.0.0.1 --rpc-port 18899 \
      --faucet-port 19900 --gossip-port 18010 --dynamic-port-range 18011-18099 --ticks-per-slot "$ticks" \
      --log > "$RT/validator.log" 2>&1 ) &
  echo $! > "$RT/validator.pid"
  until curl -s -m 1 -X POST -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
        http://127.0.0.1:18899 | grep -q '"ok"'; do
    kill -0 "$(cat "$RT/validator.pid")" 2>/dev/null || { echo "validator died"; tail -20 "$RT/validator.log"; return 1; }
    sleep 0.2
  done
  python3 - "$t0" "$ticks" <<'PY' | tee "$SOL/evidence/q7-start-time-ticks${ticks}.txt"
import sys,time;print(f"solana-test-validator --ticks-per-slot {sys.argv[2]}: RPC healthy {time.time()-float(sys.argv[1]):.2f}s after launch")
PY
}
stop() {
  [ -f "$RT/validator.pid" ] || return 0
  local pid; pid=$(cat "$RT/validator.pid")
  kill "$pid" 2>/dev/null; for _ in $(seq 50); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
  kill -9 "$pid" 2>/dev/null; pkill -f "solana-test-validator --reset --ledger test-ledger" 2>/dev/null; rm -f "$RT/validator.pid"
}
case "${1:-}" in
  start) start "${2:-64}" ;;
  stop) stop ;;
  with) shift; ticks=64; [ "${1:-}" != "--" ] && { ticks="$1"; shift; }; shift
        trap stop EXIT INT TERM; start "$ticks" && "$@"; rc=$?; stop; trap - EXIT; exit $rc ;;
esac
