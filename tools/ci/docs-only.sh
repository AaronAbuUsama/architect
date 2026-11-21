#!/usr/bin/env bash
# Does a pull request change only docs? CI's `changes` job runs this and, when it does, the layer gates (e2e-layer1,
# e2e-layer2) pass without running their steps, since a required job never skips (CI-drafts-race.md), prove-tests skips
# through a job-level `if:`, and the `check` gate accepts the skipped shards only on this flag
# (design/decisions/CI-docs-fast-path.md, CI-speed.md).
# check-static and `e2e-m0` always run: they lint the docs, total the e2e READMEs, run canon:check over the design docs
# and the supersedes guard.
#   tools/ci/docs-only.sh <base> <head>
# Prints `docs_only=true` or `docs_only=false` (append it to $GITHUB_OUTPUT) and exits 0; any git failure exits non-zero,
# so a broken diff never skips a gate.
# Docs-only: every changed path is under design/, or is a *.md file outside packages/, e2e/ and examples/ (a module's
# README.md is one of its six slots, and the e2e READMEs carry generated totals). An empty diff is not docs-only.
set -euo pipefail

base="${1:?usage: docs-only.sh <base> <head>}"
head="${2:?usage: docs-only.sh <base> <head>}"

# --no-renames, so a file moved out of design/ counts as the deletion and addition it is.
changed=$(git diff --no-renames --name-only "$base...$head")

docs_only=false
if [ -n "$changed" ]; then
  docs_only=true
  while IFS= read -r file; do
    case "$file" in
      design/*) ;;
      packages/* | e2e/* | examples/*) docs_only=false ;;
      *.md) ;;
      *) docs_only=false ;;
    esac
    [ "$docs_only" = false ] && { echo "docs-only: no, $file is not a doc." >&2; break; }
  done <<< "$changed"
fi

echo "docs_only=$docs_only"
