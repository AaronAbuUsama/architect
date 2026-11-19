#!/usr/bin/env bash
# One way to supersede (AGENTS.md, "Who decides"; proposal 8 in design/process/proposals.md): a decision that changes an
# older doc lists each replaced phrase under `## Supersedes`, one line each:
#   - <old doc>: "<old words>" → "<new words>"
# and the old words may then stay only in design/decisions/ and design/process/ (the dated records). This check reads
# every decision's list and fails when `git grep` still finds an old phrase anywhere else in the tracked tree.
#   tools/ci/supersedes.sh            run from the repository root
# A line in a Supersedes section that is not in that shape fails too, so a typo cannot turn the check off.
set -euo pipefail

line_shape='^- ([^:]+): "(.+)" → "(.*)"$'
status=0
checked=0

for decision in design/decisions/*.md; do
  [ -e "$decision" ] || continue
  in_fence=0
  in_section=0
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ "$line" == '```'* ]]; then in_fence=$((1 - in_fence)); continue; fi
    [ "$in_fence" -eq 1 ] && continue
    if [[ "$line" == '## '* ]]; then
      if [[ "$line" == '## Supersedes' ]]; then in_section=1; else in_section=0; fi
      continue
    fi
    [ "$in_section" -eq 1 ] || continue
    [[ "$line" == '- '* ]] || continue
    if [[ ! "$line" =~ $line_shape ]]; then
      echo "::error file=$decision::Supersedes line not in the shape - <old doc>: \"<old words>\" → \"<new words>\": $line"
      status=1
      continue
    fi
    old="${BASH_REMATCH[2]}"
    checked=$((checked + 1))
    stale=$(git grep -l -F -e "$old" -- . ':(exclude)design/decisions/' ':(exclude)design/process/' || true)
    if [ -n "$stale" ]; then
      while IFS= read -r file; do
        echo "::error file=$file::\"$old\" was superseded by $decision; amend it in place (AGENTS.md, one way to supersede)."
      done <<< "$stale"
      status=1
    fi
  done < "$decision"
done

if [ "$status" -eq 0 ]; then
  echo "supersedes: $checked superseded phrase(s), none left outside design/decisions/ and design/process/."
fi
exit "$status"
