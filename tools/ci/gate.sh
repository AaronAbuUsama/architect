#!/usr/bin/env bash
# Did every job behind one required check pass? A required check keeps its name while its work runs as several jobs side
# by side (design/decisions/CI-speed.md): `check` is check-static plus prove-tests' shards, and this script is the step of
# the small `check` job that needs them all. A required check that is skipped counts as passed, so the gate job never
# skips: it runs whatever its needs did (`if: !cancelled()`) and fails here unless each one passed.
#   DOCS_ONLY=<true|false> tools/ci/gate.sh <job>=<result>... [docs:<job>=<result>...]
# <result> is `needs.<job>.result` (success, failure, cancelled or skipped; a matrix job's result is its worst shard's).
# A `docs:` job may also be skipped, but only when DOCS_ONLY is true: the docs fast path skipped it
# (design/decisions/CI-docs-fast-path.md). Any other result fails the gate. Exits 0 when all passed, 1 otherwise.
set -euo pipefail

[ "$#" -gt 0 ] || { echo "usage: DOCS_ONLY=<true|false> gate.sh <job>=<result>... [docs:<job>=<result>...]" >&2; exit 2; }
docs_only="${DOCS_ONLY:?DOCS_ONLY must be true or false}"
case "$docs_only" in true | false) ;; *) echo "DOCS_ONLY must be true or false, not '$docs_only'" >&2; exit 2 ;; esac

failed=0
for arg in "$@"; do
  job="${arg%%=*}"
  result="${arg#*=}"
  [ "$job" != "$arg" ] || { echo "not <job>=<result>: $arg" >&2; exit 2; }
  skippable=false
  if [[ "$job" == docs:* ]]; then skippable=true; job="${job#docs:}"; fi
  if [ "$result" = success ]; then
    echo "$job: passed"
  elif [ "$result" = skipped ] && [ "$skippable" = true ] && [ "$docs_only" = true ]; then
    echo "$job: skipped, a docs-only pull request"
  else
    echo "::error::$job: $result"
    failed=1
  fi
done
exit "$failed"
