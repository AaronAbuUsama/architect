#!/usr/bin/env bash
# A builder never edits journeys, the evals or the runner's generic checks (AGENTS.md, "Journeys and checks come first";
# proposal 6 in design/process/proposals.md). CI runs this on a pull request whose head branch ends in `-build`:
#   tools/ci/builder-paths.sh <base> <head>
# It prints each protected file the branch changes and exits 1, or exits 0 when there is none.
# The one exception: e2e/m1/expected-failing.txt may lose lines (a builder's slice lands and its checks pass; the ratchet
# list only shrinks, e2e/ratchet/README.md), but a line added there is a hit. The grid's list, e2e/grid/expected-red.json, is
# the same kind of list (G7): it may lose pairs, judged by cell and subject with jq, but a pair added there is a hit.
# A suite README's totals block (e2e/<suite>/README.md) (between `<!-- totals:start -->` and `<!-- totals:end -->`) is written by `nx run e2e:totals` from the
# list a builder may shrink, and `check` fails when it is stale (e2e/totals). A change confined to that block is not a hit; the
# block's content is held to the tool's output by `totals.mjs --check`, not here.
# Protected: the e2e checks and their fixtures; every blueprint's journeys; the evals (prove's evals module) and the
# runner's generic step checks (prove's journeys/internal/checks.ts); and the break fixtures the checks are proved on.
# The rest of prove's journeys runner is builder code.
set -euo pipefail

base="${1:?usage: builder-paths.sh <base> <head>}"
head="${2:?usage: builder-paths.sh <base> <head>}"
shrink_only="e2e/m1/expected-failing.txt"
shrink_only_pairs="e2e/grid/expected-red.json"

protected=(
  ':(glob)e2e/**'
  ':(glob)examples/*/journeys/**'
  ':(glob)**/blueprint/journeys/**'
  ':(glob)packages/prove/src/modules/evals/**'
  ':(glob)packages/prove/src/modules/journeys/internal/checks.ts'
  ':(glob)examples/*/test/fixtures/evals/**'
  ':(glob)examples/*/test/fixtures/journeys/**'
  ':(glob)examples/*/test/fixtures/check/**'
)

# --no-renames, so a file moved out of a protected folder counts as the deletion it is.
changed=$(git diff --no-renames --name-only "$base...$head" -- "${protected[@]}")

hits=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if [ "$file" = "$shrink_only" ]; then
    added=$(git diff --no-renames --numstat "$base...$head" -- "$file" | awk '{ print $1 }')
    [ "$added" = "0" ] && continue
  fi
  if [[ "$file" =~ ^e2e/[^/]+/README\.md$ ]]; then
    # Only the READMEs `totals.mjs --check` holds (e2e/<suite>/README.md), and only markers on a line of their own, as it reads them.
    # Everything outside the totals block is unchanged, and the block is still there.
    outside() { git show "$1:$file" 2>/dev/null | awk '/^<!-- totals:start -->$/ { inside = 1; print; next } /^<!-- totals:end -->$/ { inside = 0 } !inside'; }
    mb=$(git merge-base "$base" "$head")
    if git show "$head:$file" 2>/dev/null | grep -q '^<!-- totals:start -->$' && [ "$(outside "$mb")" = "$(outside "$head")" ]; then
      continue
    fi
  fi
  if [ "$file" = "$shrink_only_pairs" ]; then
    # Every (cell, subject) left on the branch was already on the list at the merge base.
    pairs() { git show "$1:$shrink_only_pairs" 2>/dev/null | jq -c '[.pairs[] | {cell, subject}]' 2>/dev/null || echo null; }
    before=$(pairs "$(git merge-base "$base" "$head")")
    after=$(pairs "$head")
    if [ "$before" != "null" ] && [ "$after" != "null" ] &&
      [ "$(jq -n --argjson b "$before" --argjson a "$after" '($a - $b) | length')" = "0" ]; then
      continue
    fi
  fi
  hits+=("$file")
done <<< "$changed"

if [ "${#hits[@]}" -eq 0 ]; then
  echo "builder-paths: no journey, eval or check file changed."
  exit 0
fi

echo "builder-paths: a -build branch changed files that only a journey or check author may change:"
for file in "${hits[@]}"; do
  echo "::error file=$file::A builder never edits journeys, evals or the runner's checks (AGENTS.md). Ask the author."
  echo "  $file"
done
exit 1
