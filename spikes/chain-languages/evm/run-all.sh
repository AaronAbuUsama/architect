#!/usr/bin/env bash
# Reproduces every piece of evidence. Needs: foundry 1.8.6 on PATH (or ~/.foundry/bin), node 26, `npm ci` done.
set -u
cd "$(dirname "$0")"
export PATH="$HOME/.foundry/bin:$PATH"
cleanup() { pkill -f "anvil --silent --port 18545" 2>/dev/null; true; }   # Anvil on 18545 only, success or failure
trap cleanup EXIT INT TERM
mkdir -p evidence
forge build --force 2>&1 | grep -E "^(Error|Compiler run)" ; npx tsx script/gen-abi.ts
npx tsc --noEmit -p . && echo TSC-OK > evidence/q2-typecheck.txt || echo TSC-FAILED > evidence/q2-typecheck.txt
npx tsx script/classify.ts MiniDao > evidence/q1-classify.txt 2>&1; echo "classifier exit code $? (3 = an undeclared state-changing entry was found)" >> evidence/q1-classify.txt
{ echo "# forge inspect MiniDao abi --json (head)"; forge inspect MiniDao abi --json | head -40; echo "# methodIdentifiers"; forge inspect MiniDao methodIdentifiers; echo "# errors"; forge inspect MiniDao errors; echo "# storageLayout (Q4)"; forge inspect MiniDao storageLayout; } > evidence/q1-forge-inspect.txt 2>&1
npx tsx script/q2.ts > evidence/q2-someone-elses-token.txt 2>&1
npx tsx script/q3.ts > evidence/q3-signer-vs-submitter.txt 2>&1
npx tsx script/q5.ts > evidence/q5-refusals.txt 2>&1
npx tsx script/q6.ts > evidence/q6-follower.txt 2>&1
npx tsx script/q7.ts > evidence/q7-local-world.txt 2>&1
npx tsx script/q8.ts 300 > evidence/q8-cross-check.txt 2>&1; echo "exit $?" >> evidence/q8-cross-check.txt
npx tsx script/q8.ts 300 MutantDao > evidence/q8-cross-check-mutant.txt 2>&1; echo "exit $? (1 expected: the mutant must diverge)" >> evidence/q8-cross-check-mutant.txt
echo done
