#!/usr/bin/env bash
set -euo pipefail
spike_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$spike_dir"
source ./env.sh
mkdir -p runtime/tmp
# Keep the normal short OS temp path: native prover IPC uses Unix-domain sockets.
# The checkout path is longer than macOS's socket-name limit.
(cd client && node --import tsx src/bin/network.ts --preflight)
bash scripts/codegen.sh > evidence/compile.log 2>&1
if [ "${1:-all}" != clock ]; then
  (cd contracts && aztec test --package private_core_test) > evidence/conformance.log 2>&1
  (cd contracts && aztec test --package private_core_contract) > evidence/calendar-tests.log 2>&1
fi
cd client
npm run check > ../evidence/client-check.log 2>&1
node --import tsx src/bin/network.ts > ../evidence/network.log 2>&1 &
network_pid=$!
cleanup() { kill -TERM "$network_pid" 2>/dev/null || true; wait "$network_pid" 2>/dev/null || true; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
ready=false
for attempt in $(seq 1 180); do
  if curl -fsS -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"node_isReady","params":[]}' http://127.0.0.1:8080 2>/dev/null | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("result") is True else 1)' 2>/dev/null; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Local network did not become ready'; exit 1; fi
if [ "${1:-all}" = clock ]; then
  node --import tsx src/bin/clock-only.ts > ../evidence/clock-rehearsal.log 2>&1
else
  node --import tsx src/main.ts > ../evidence/run.log 2>&1
  node --import tsx src/bin/inspect.ts > ../evidence/inspection.log 2>&1
  python3 ../scripts/measurements.py
fi
echo 'Local network checks passed; stopping owned processes.'
