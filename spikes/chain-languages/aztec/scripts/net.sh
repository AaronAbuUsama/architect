#!/usr/bin/env bash
# net.sh start [--verify] | stop : owns the local network (anvil + aztec local network); pid in runtime/net.pid
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ./env.sh
ms() { perl -MTime::HiRes=time -e 'printf "%d", time*1000'; }
case "$1" in
  start) shift; mkdir -p runtime; : > runtime/net.log; ms > runtime/net.start
    cd client; nohup node --import tsx src/bin/network.ts "$@" >> ../runtime/net.log 2>&1 < /dev/null &
    echo $! > ../runtime/net.pid; cd ..
    for i in $(seq 1 300); do grep -q "READY local Aztec network" runtime/net.log && break; sleep 1; done
    grep -q "READY local Aztec network" runtime/net.log || { echo "network did not start"; exit 1; }
    echo "ready after $(( $(ms) - $(cat runtime/net.start) )) ms (args: $*)" ;;
  stop) if [ -f runtime/net.pid ]; then kill -TERM "$(cat runtime/net.pid)" 2>/dev/null || true; fi
    for i in $(seq 1 30); do lsof -iTCP:8080 -iTCP:8545 -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 1; done
    rm -f runtime/net.pid; echo stopped ;;
esac
