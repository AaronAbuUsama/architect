#!/bin/sh
# Spike check: a command started in the sandbox keeps running while workerd is down; the restarted DO reads its result.
set -u
up() { ./node_modules/.bin/wrangler dev --port 8987 >/tmp/claude-e2b-dev.log 2>&1 & PID=$!; i=0; until curl -sf localhost:8987/ >/dev/null || [ $i -gt 60 ]; do sleep 1; i=$((i+1)); done; }
q() { curl -s "localhost:8987$1"; echo; }
up; q "/start?run=r2"; q "/spawn?run=r2&cmd=sleep%2015%3B%20echo%20finished%20%3E%20/home/user/out"; q "/step?run=r2&cmd=cat%20/home/user/out%202%3E%261"
kill $PID; wait $PID 2>/dev/null; echo "--- workerd down for 20 s"; sleep 20
up; q "/step?run=r2&cmd=cat%20/home/user/out"; q "/stop?run=r2"
kill $PID; wait $PID 2>/dev/null
node --env-file=$HOME/.config/architect/e2b.env -e "import('e2b').then(async({Sandbox})=>console.log('left running',(await Sandbox.list({query:{metadata:{spike:'e2b-sandbox'}}}).nextItems()).length))"
