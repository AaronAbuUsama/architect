#!/usr/bin/env bash
# Has Codex finished reviewing this pull request? (proposal 2 in design/process/proposals.md)
#   gh api --paginate --slurp repos/<owner>/<repo>/issues/<n>/comments | tools/ci/codex-state.sh
# Reads the pull request's issue comments (a JSON array, or an array of pages from --slurp) and prints one line,
# "<state>\t<reviewed commit>\t<description>", for the commit status `codex-finished`:
#   success  Codex's summary comment says every review it started has completed, of <reviewed commit>
#   pending  Codex is still reviewing, or has not reviewed this pull request (then: comment "@codex review")
# The workflow then asks tools/ci/codex-covers.sh whether that review still covers the head.
# Only the Codex app's own summary comment counts: its body carries a machine-readable line,
#   <!-- codex-review-state:v1 {"code_review":{"commit_sha":…,"status":"completed",…},"security_review":{…}} -->
# and Codex edits that one comment in place as reviews start and finish. Findings are review threads, which branch
# protection's required conversation resolution holds, so they are not counted here.
set -euo pipefail

jq -r '
  def finished(r): (r == null) or (r.status == null) or (r.status == "completed");
  [ (if (.[0] | type) == "array" then add else . end)[]
    | select(.user.login == "chatgpt-codex-connector[bot]" and .user.type == "Bot")
    | select(.body | contains("<!-- codex-review-state:v1 "))
    | { at: .updated_at, state: (.body | capture("<!-- codex-review-state:v1 (?<j>.*?) -->").j | fromjson) } ]
  | sort_by(.at) | last
  | if . == null then
      "pending\t-\tCodex has not reviewed this pull request; comment @codex review"
    elif finished(.state.code_review) and finished(.state.security_review)
      and (.state.code_review.status == "completed" or .state.security_review.status == "completed") then
      (if .state.code_review.status == "completed" then .state.code_review.commit_sha else .state.security_review.commit_sha end) as $sha
      | "success\t\($sha // "-")\tCodex finished its review of \(($sha // "?")[0:7])"
    else
      "pending\t-\tCodex is reviewing (code review: \(.state.code_review.status // "none"), security review: \(.state.security_review.status // "none"))"
    end
'
