#!/usr/bin/env bash
# run.sh <ticks-per-slot> <src/script.ts> [more scripts...]: fresh validator, deploy, run each script, ALWAYS stop the validator.
set -uo pipefail
SOL="$(cd "$(dirname "$0")/.." && pwd)"; source "$SOL/scripts/env.sh"; cd "$SOL"
ticks="$1"; shift
trap './scripts/validator.sh stop' EXIT INT TERM
./scripts/validator.sh start "$ticks" || exit 1
if [ "${NODEPLOY:-}" != 1 ]; then
  solana program deploy --url http://127.0.0.1:18899 --keypair test-ledger/faucet-keypair.json \
    --program-id target/deploy/governance-keypair.json target/deploy/governance.so > evidence/deploy.log 2>&1 || { cat evidence/deploy.log; exit 1; }
fi
rc=0
for s in "$@"; do echo "--- $s (ticks-per-slot $ticks)"; TICKS="$ticks" npx tsx "$s" || { echo "FAILED: $s"; rc=1; }; done
exit $rc
