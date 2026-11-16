#!/usr/bin/env bash
# Captures one command's real output as evidence: tools/evidence/capture.sh <step> <name> <expected-exit> -- <command...>
# Writes design/evidence/<step>/<name>.txt with the command, commit, time taken, exit code and full output.
set -u
step="$1"; name="$2"; expect="$3"; shift 4
dir="design/evidence/$step"; mkdir -p "$dir"
out="$dir/$name.txt"
start=$(perl -MTime::HiRes=time -e 'printf "%.3f", time')
body=$("$@" 2>&1); code=$?
end=$(perl -MTime::HiRes=time -e 'printf "%.3f", time')
# Local paths never leave the machine: the repo becomes ".", home "~", any scratch folder "<scratch>".
clean() { sed -E -e 's/\x1b\[[0-9;]*[A-Za-z]//g' -e "s#$PWD#.#g" -e "s#$HOME#~#g" -e 's#(/private)?/tmp/claude-[0-9]+/[^/ "]+/[0-9a-f-]+/scratchpad#<scratch>#g' -e 's#(/private)?/tmp/claude-[0-9]+/[^/ "]+#<scratch>#g'; }
{
  echo "\$ $*" | clean
  echo "# commit $(git rev-parse --short HEAD) · $(date -u +%Y-%m-%dT%H:%M:%SZ) · exit $code (expected $expect) · $(perl -e "printf '%.1fs', $end-$start")"
  echo
  printf '%s\n' "$body" | clean
} > "$out"
[ "$code" = "$expect" ] && echo "ok   $out" || { echo "FAIL $out (exit $code, expected $expect)"; exit 1; }
