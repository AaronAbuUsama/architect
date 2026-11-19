#!/usr/bin/env bash
# Tests for the scripts in tools/ci/, run by CI's check job:  bash tools/ci/ci.test.sh
# Each case builds a throwaway git repository under a temporary folder and removes it at the end.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
failures=0

expect() { # <name> <wanted exit> <command...>
  local name="$1" wanted="$2"; shift 2
  local got=0
  "$@" > "$scratch/out" 2>&1 || got=$?
  if [ "$got" = "$wanted" ]; then echo "ok   $name"; else
    echo "FAIL $name: exit $got, wanted $wanted"; sed 's/^/     /' "$scratch/out"; failures=$((failures + 1)); fi
}

repo() { # a fresh repository with a base commit; prints its path
  local dir; dir="$(mktemp -d "$scratch/repo.XXXX")"
  git -C "$dir" init -q -b base
  git -C "$dir" config user.email ci@example.invalid
  git -C "$dir" config user.name ci
  mkdir -p "$dir/e2e/m1" "$dir/examples/acme/journeys" "$dir/packages/wallets/blueprint/journeys" \
    "$dir/packages/prove/src/modules/evals" "$dir/packages/prove/src/modules/journeys" "$dir/src"
  printf 'm1/a.test.ts > a\nm1/b.test.ts > b\n' > "$dir/e2e/m1/expected-failing.txt"
  echo j > "$dir/examples/acme/journeys/signup.ts"
  echo j > "$dir/packages/wallets/blueprint/journeys/send.ts"
  echo e > "$dir/packages/prove/src/modules/evals/service.ts"
  echo r > "$dir/packages/prove/src/modules/journeys/service.ts"
  echo s > "$dir/src/handler.ts"
  git -C "$dir" add -A && git -C "$dir" commit -qm base
  git -C "$dir" checkout -qb x-build
  echo "$dir"
}

guard() { (cd "$1" && "$here/builder-paths.sh" base x-build); }
commit() { git -C "$1" add -A && git -C "$1" commit -qm change; }

# builder-paths
r=$(repo); echo t >> "$r/src/handler.ts"; commit "$r"
expect "a handler change passes" 0 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/journeys/service.ts"; commit "$r"
expect "the journeys runner module is not a journey" 0 guard "$r"
r=$(repo); echo t >> "$r/examples/acme/journeys/signup.ts"; commit "$r"
expect "an example's journey fails" 1 guard "$r"
r=$(repo); echo t >> "$r/packages/wallets/blueprint/journeys/send.ts"; commit "$r"
expect "a package blueprint's journey fails" 1 guard "$r"
r=$(repo); echo t >> "$r/packages/prove/src/modules/evals/service.ts"; commit "$r"
expect "an eval fails" 1 guard "$r"
r=$(repo); mkdir -p "$r/e2e/m1" && echo t > "$r/e2e/m1/30-new.test.ts"; commit "$r"
expect "a new e2e check fails" 1 guard "$r"
r=$(repo); git -C "$r" mv packages/prove/src/modules/evals/service.ts src/evals.ts; commit "$r"
expect "moving an eval out fails" 1 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\n' > "$r/e2e/m1/expected-failing.txt"; commit "$r"
expect "taking a line off the ratchet list passes" 0 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\nm1/b.test.ts > b\nm1/c.test.ts > c\n' > "$r/e2e/m1/expected-failing.txt"; commit "$r"
expect "adding a line to the ratchet list fails" 1 guard "$r"
r=$(repo); printf 'm1/a.test.ts > a\nm1/c.test.ts > c\n' > "$r/e2e/m1/expected-failing.txt"; commit "$r"
expect "swapping a ratchet line fails" 1 guard "$r"

# supersedes
decisions() { # <repo> <decision body>; writes design/decisions/G9.md and a stale doc
  mkdir -p "$1/design/decisions" "$1/design/process"
  printf '%s\n' "$2" > "$1/design/decisions/G9.md"
  echo 'exits 5 to 119' > "$1/design/milestones.md"
  echo 'once it was "5 to 125"' > "$1/design/process/log.md"
}
super() { (cd "$1" && "$here/supersedes.sh"); }
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n'; commit "$r"
expect "a phrase left only in the records passes" 0 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n'; echo 'exits 5 to 125' >> "$r/src/handler.ts"; commit "$r"
expect "a phrase left in a live file fails" 1 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: 5 to 125 → 5 to 119\n'; commit "$r"
expect "a Supersedes line in the wrong shape fails" 1 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n```md\n## Supersedes\n- K16: "handler" → "x"\n```\n'; commit "$r"
expect "a Supersedes example inside a fence is not read" 0 super "$r"
r=$(repo); decisions "$r" $'# G9\n\n## Supersedes\n- K16: "5 to 125" → "5 to 119"\n\n## Evidence\n- K16: "handler" is fine here\n'; commit "$r"
expect "the section ends at the next heading" 0 super "$r"

# codex-state
codex() { # <json>; wants <state>
  local got; got=$(printf '%s' "$1" | "$here/codex-state.sh" | cut -f1)
  [ "$got" = "$2" ] || { echo "got $got"; return 1; }
}
summary() { # <code status> <security status>
  printf '<!-- codex-pull-request-review-summary -->\\n<!-- codex-review-state:v1 {\\"code_review\\":{\\"commit_sha\\":\\"2596f9d204\\",\\"status\\":%s},\\"security_review\\":{\\"commit_sha\\":null,\\"status\\":%s}} -->' "$1" "$2"
}
bot='"user":{"login":"chatgpt-codex-connector[bot]","type":"Bot"}'
done_body=$(summary '\"completed\"' null)
expect "codex: no comment is pending" 0 codex '[]' pending
expect "codex: completed is success" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$done_body\"}]" success
expect "codex: pages from --slurp are read" 0 codex "[[{$bot,\"updated_at\":\"1\",\"body\":\"$done_body\"}],[]]" success
expect "codex: running is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary '\"in_progress\"' null)\"}]" pending
expect "codex: a security review still running is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary '\"completed\"' '\"in_progress\"')\"}]" pending
expect "codex: no review at all is pending" 0 codex "[{$bot,\"updated_at\":\"1\",\"body\":\"$(summary null null)\"}]" pending
expect "codex: someone else's copy of the line is ignored" 0 codex "[{\"user\":{\"login\":\"someone\",\"type\":\"User\"},\"updated_at\":\"1\",\"body\":\"$done_body\"}]" pending

if [ "$failures" -gt 0 ]; then echo "$failures case(s) failed"; exit 1; fi
echo "all tools/ci cases pass"
