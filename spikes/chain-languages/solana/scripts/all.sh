#!/usr/bin/env bash
# Reproduce everything: build, classify, then each question against a fresh local validator. Evidence lands in evidence/.
# Prereqs (see README): tools/ populated (agave 4.1.2 + anchor 1.2.2), ~/.cache/solana/v1.57/platform-tools, `npm install` done.
set -uo pipefail
SOL="$(cd "$(dirname "$0")/.." && pwd)"; source "$SOL/scripts/env.sh"; cd "$SOL"
E=evidence
./scripts/errdemo.sh > $E/errdemo-run.log 2>&1                      # Q5: positional vs explicit error numbers (host only)
( time anchor build --ignore-keys ) > $E/anchor-build.log 2>&1       # program + IDL
cp target/idl/governance.json $E/governance.idl.json
npx tsx src/classify.ts > /dev/null                                  # Q1
npx tsx src/q1-raw.ts > /dev/null                                    # Q1 without the IDL
./scripts/run.sh 16 src/q2-spl.ts       > $E/run-q2.log 2>&1         # Q2
./scripts/run.sh 16 src/q3-signers.ts   > $E/run-q3.log 2>&1         # Q3 (blockhash expiry needs ~25 s at 16 ticks)
./scripts/run.sh 16 src/q4-accounts.ts  > $E/run-q4.log 2>&1         # Q4
./scripts/run.sh 16 src/q5-refusals.ts  > $E/run-q5.log 2>&1         # Q5
./scripts/run.sh 64 src/q6-follower.ts  > $E/run-q6-64.log 2>&1      # Q6 at mainnet-like 400 ms slots
./scripts/run.sh 16 src/q6-follower.ts  > $E/run-q6-16.log 2>&1      # Q6 at 100 ms slots
NODEPLOY=1 ./scripts/run.sh 64 src/q7-world.ts > $E/run-q7-64.log 2>&1   # Q7 (deploys itself, timed)
NODEPLOY=1 ./scripts/run.sh 16 src/q7-world.ts > $E/run-q7-16.log 2>&1
./scripts/run.sh 16 src/q8-crosscheck.ts > $E/run-q8.log 2>&1        # Q8: reference machine vs program
VARIANT=init ./scripts/run.sh 16 src/q8-crosscheck.ts > $E/run-q8-variant-a.log 2>&1   # Q8 with the `init` one-vote record: must diverge
pgrep -fl solana-test-validator && echo "LEFTOVER VALIDATOR" || echo "no validator left running"
