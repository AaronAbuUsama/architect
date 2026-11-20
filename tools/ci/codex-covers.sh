#!/usr/bin/env bash
# Does Codex's review of one commit still cover the pull request's head? (design/decisions/CI-branch-protection.md)
#   tools/ci/codex-covers.sh <reviewed> <head> <base>
# Exit 0 when the head is the reviewed commit, or when every commit on the head's first-parent line back to the reviewed
# commit is a merge from <base> that changes nothing beyond the merge itself: its first parent is the line before it,
# its second parent is in <base>'s history, and its tree is the tree git makes for that merge with no conflict.
# That is what updating a branch from its base produces (strict mode asks for it), so Codex need not review it again.
# Exit 1, with the reason on stdout, for anything else: a new commit, a merge from another branch, a merge with extra
# edits or a resolved conflict, or a rewritten history in which the reviewed commit is gone.
set -euo pipefail

reviewed="${1:?usage: codex-covers.sh <reviewed> <head> <base>}"
head="${2:?usage: codex-covers.sh <reviewed> <head> <base>}"
base="${3:?usage: codex-covers.sh <reviewed> <head> <base>}"

no() { echo "$1"; exit 1; }

git cat-file -e "$reviewed^{commit}" 2>/dev/null || no "the reviewed commit ${reviewed:0:7} is not in the repository"
reviewed=$(git rev-parse "$reviewed^{commit}")
head=$(git rev-parse "$head^{commit}")
[ "$reviewed" = "$head" ] && { echo "Codex reviewed the head"; exit 0; }
git merge-base --is-ancestor "$reviewed" "$head" || no "the reviewed commit ${reviewed:0:7} is not in the head's history"

at="$head"
while [ "$at" != "$reviewed" ]; do
  read -r -a parents <<< "$(git rev-list --parents -n 1 "$at" | cut -d' ' -f2-)"
  [ "${#parents[@]}" -eq 2 ] || no "${at:0:7} is not a merge from $base"
  git merge-base --is-ancestor "${parents[1]}" "$base" || no "${at:0:7} merges a commit that is not in $base"
  merged=$(git merge-tree --write-tree "${parents[0]}" "${parents[1]}" 2>/dev/null | head -n 1) \
    || no "${at:0:7} resolves a conflict"
  [ "$merged" = "$(git rev-parse "$at^{tree}")" ] || no "${at:0:7} changes more than the merge from $base"
  git merge-base --is-ancestor "$reviewed" "${parents[0]}" || no "${at:0:7} does not follow the reviewed commit"
  at="${parents[0]}"
done
echo "every commit since ${reviewed:0:7} is a clean merge from $base"
