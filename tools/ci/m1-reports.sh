#!/usr/bin/env bash
# Join the e2e-m1 shards' reports into the one report and hook-error file the ratchet reads (design/decisions/CI-speed.md).
# Each shard runs a quarter of e2e/m1 and uploads `m1-report.json` (vitest's JSON report) and `m1-errors.json`
# (e2e/ratchet/reporter.ts's hook errors); download-artifact puts each shard's pair in its own folder under <dir>.
#   tools/ci/m1-reports.sh <dir> <shards> <out>
# Writes <out>/m1-report.json (every shard's test files) and <out>/m1-errors.json (every shard's hook and unhandled
# errors), for `node e2e/ratchet/check.ts <out>/m1-report.json e2e/m1/expected-failing.txt <out>/m1-errors.json`.
# Fails, writing nothing, unless there are exactly <shards> of each file, every report has its test files, every errors
# file is the reporter's, and no test file was run by two shards. A missing shard can never read as a smaller green run.
set -euo pipefail

dir="${1:?usage: m1-reports.sh <dir> <shards> <out>}"
shards="${2:?usage: m1-reports.sh <dir> <shards> <out>}"
out="${3:?usage: m1-reports.sh <dir> <shards> <out>}"

fail() { echo "::error::m1-reports: $1"; exit 1; }

reports=()
errors=()
while IFS= read -r file; do reports+=("$file"); done < <(find "$dir" -name m1-report.json -type f | LC_ALL=C sort)
while IFS= read -r file; do errors+=("$file"); done < <(find "$dir" -name m1-errors.json -type f | LC_ALL=C sort)
[ "${#reports[@]}" -eq "$shards" ] || fail "${#reports[@]} shard report(s) under $dir, wanted $shards"
[ "${#errors[@]}" -eq "$shards" ] || fail "${#errors[@]} shard hook-error file(s) under $dir, wanted $shards"

for file in "${reports[@]}"; do
  jq -e '.testResults | type == "array" and length > 0' "$file" > /dev/null 2>&1 || fail "$file is not a vitest report with test files"
done
for file in "${errors[@]}"; do
  jq -e '(.suiteErrors // [] | type == "array") and (.unhandled // [] | type == "array")' "$file" > /dev/null 2>&1 ||
    fail "$file is not the reporter's hook-error file"
done
twice=$(jq -rs '[.[].testResults[].name] | group_by(.) | map(select(length > 1) | .[0]) | .[]' "${reports[@]}")
[ -z "$twice" ] || fail "run by two shards: $twice"

mkdir -p "$out"
jq -s '{testResults: (map(.testResults) | add)}' "${reports[@]}" > "$out/m1-report.json"
jq -s '{suiteErrors: (map(.suiteErrors // []) | add), unhandled: (map(.unhandled // []) | add)}' "${errors[@]}" > "$out/m1-errors.json"
echo "m1-reports: $shards shards, $(jq '.testResults | length' "$out/m1-report.json") test files, $(jq '.suiteErrors | length' "$out/m1-errors.json") hook error(s)"
