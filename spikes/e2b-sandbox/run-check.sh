#!/bin/sh
# Spike check: start the Run DO's sandbox, kill workerd (a full eviction), restart, and step again from the stored id.
set -u
up() { ./node_modules/.bin/wrangler dev --port 8987 >/tmp/claude-e2b-dev.log 2>&1 & PID=$!; i=0; until curl -sf localhost:8987/ >/dev/null || [ $i -gt 60 ]; do sleep 1; i=$((i+1)); done; }
q() { curl -s "localhost:8987$1"; echo; }
up; echo "--- first workerd"; q /start; q "/step?cmd=node%20-e%20%22console.log(require('fs').readFileSync('/home/user/handler.ts','utf8'))%22"
kill $PID; wait $PID 2>/dev/null; echo "--- workerd killed, restarting"
up; q /step; q "/step?cmd=echo%20changed%20%3E%3E%20/home/user/handler.ts%3B%20cat%20/home/user/handler.ts"; q /stop; q /step
kill $PID; wait $PID 2>/dev/null
node --env-file=$HOME/.config/architect/e2b.env -e "import('e2b').then(async({Sandbox})=>console.log('left running',(await Sandbox.list({query:{metadata:{spike:'e2b-sandbox'}}}).nextItems()).length))"
grep -iE "error|warn" /tmp/claude-e2b-dev.log | head -5
