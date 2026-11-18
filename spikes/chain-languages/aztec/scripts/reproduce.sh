#!/usr/bin/env bash
# Runs every experiment in order. ~45 minutes on a quiet 10-core Mac; real proofs make it long. Stops the network on exit.
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ./env.sh
export LOG_LEVEL=error
trap 'scripts/net.sh stop || true' EXIT
bash scripts/install.sh && bash scripts/codegen.sh
cd client && npx tsc -p . && node --import tsx src/bin/classify.ts | tee ../evidence/q1-classification.txt && cd ..
scripts/net.sh start | tee evidence/q7-start-cli-network.txt        # plain `aztec start --local-network`: mock verification
cd client
for s in q2-token q4-state q5-refusals q3-q6 q6b-rollback; do node --import tsx src/bin/$s.ts > ../evidence/$s-run.log 2>&1; done
cd ..; scripts/net.sh stop; scripts/net.sh start > /dev/null          # rollback leaves the node unusable: fresh network
cd client
node --import tsx src/bin/q7-inprocess.ts > ../evidence/q7-inprocess-run.log 2>&1   # in-process network, verification ON then OFF
node --import tsx src/bin/q8-crosscheck.ts real 40 > ../evidence/q8-real-run.log 2>&1
node --import tsx src/bin/q8-crosscheck.ts mock 300 1,42,1234 > ../evidence/q8-mock-run.log 2>&1
