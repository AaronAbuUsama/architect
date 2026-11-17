#!/usr/bin/env bash
# Replays staging traffic: real calls to a running staging world through the project's generated CLI, as people who signed
# up for real (the way a person would on a real environment), so that `architect watch --env staging` has something to read.
#
#   tools/watch/replay.sh <project-root> <staging-url> [spends=30] [refused=3]
#
# ada signs up, makes an organisation and grants olga an allowance; olga spends one unit `spends` times, then asks for more
# than is left `refused` times (refused: AllowanceExceeded, exit 41). Run it more than once and the people are new each time.
# The slow handler is the author's fixture, installed by the caller: examples/acme/test/fixtures/layer2/slow-spend/spend.ts
# over src/allowance/spend.ts, then `architect build`, `architect promote --to staging`, and this again.
# No token, password or key is printed: they live in shell variables for as long as this runs.
set -euo pipefail

root=${1:?usage: replay.sh <project-root> <staging-url> [spends] [refused]}
url=${2:?usage: replay.sh <project-root> <staging-url> [spends] [refused]}
spends=${3:-30}
refused=${4:-3}
prefix=${ARCHITECT_REPLAY_PREFIX:-ACME} # the generated CLI reads <PREFIX>_URL and <PREFIX>_TOKEN
cli="$root/generated/cli/src/main.ts"
run=$(od -An -N4 -tx1 /dev/urandom | tr -d ' \n')

as() { # as <token|-> <args...>: one call to staging as someone
  local token=$1; shift
  if [ "$token" = "-" ]; then env "${prefix}_URL=$url" node "$cli" "$@"; else env "${prefix}_URL=$url" "${prefix}_TOKEN=$token" node "$cli" "$@"; fi
}

signup() { # signup <name>: prints "<person id> <token>"
  local name=$1 email password person token
  email="$name-$run@acme.test"
  password="pw-$(od -An -N12 -tx1 /dev/urandom | tr -d ' \n')"
  person=$(as - person sign-up --email "$email" --password "$password" --name "$name")
  token=$(as - session sign-in --email "$email" --password "$password" --json | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).token')
  echo "$person $token"
}

read -r ada_person ada_token < <(signup ada)
read -r olga_person olga_token < <(signup olga)
organization=$(as "$ada_token" organization create --name "Replay $run" --cap 1000)
allowance=$(as "$ada_token" allowance grant --organization "$organization" --member "$olga_person" --limit 500)

for i in $(seq 1 "$spends"); do
  as "$olga_token" allowance spend --allowance "$allowance" --amount 1 --memo "replay $i" > /dev/null
done
for i in $(seq 1 "$refused"); do
  status=0
  as "$olga_token" allowance spend --allowance "$allowance" --amount 100000 --memo "too much" > /dev/null 2>&1 || status=$?
  [ "$status" -eq 41 ] || { echo "replay: an over-spend was expected to be refused (exit 41), and exited $status" >&2; exit 1; }
done
echo "replayed $spends spends and $refused refusals against $url"
