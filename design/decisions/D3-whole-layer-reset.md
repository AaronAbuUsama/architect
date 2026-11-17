# D3: whole-layer review reset, round three

Conductor decision, 17 November 2026. Exact reviewed head: `3a06e8514c1e580eb9bae7ceceda0b75ad468d5b`.
Base: main at `ca2fbf2`. Current integration `7ccdda0` adds only CI fixture corrections, receipts and that side-spike
refresh. The private review ledger records three actionable product heads. New edits were held until this reset.

## History and cause comparison

Round one found artifact/proof identity and lease-isolation failures. Round two removed the remaining mutable
proof/publication inputs. Those fixes pass their regressions and the full local Gate2. Linux also passed every
functional gate test, including Homebrew; subsequent fixture cleanup and a five-second unit-default timeout are
ordinary CI-test feedback, with bounded corrections already integrated.

The complete third source review found four further failures. These were not additional tests requested for unchanged
behavior: each traces a real input to a wrong public result or unsafe effect. The original plan audited the release
boundary deeply, but did not audit every independent layer-two mutation/entry owner before declaring the candidate
ready for final review. The reset now names those owners and their predicted siblings.

## Architecture and independent adversarial passes

1. Persisted process identity is not ownership. `status` checks a wrangler name, while `reap` signals any live group
   named by the pidfile. Both must use a config-specific identity check derived from the environment directory and
   wide process inspection. Stale/foreign markers are forgotten; an unrelated process must never be signaled.
   Fresh child-handle stop paths keep their existing ownership. Test with a harmless detached sentinel and with a
   real wrangler lifecycle; do not create a process-management framework.
2. Immutable model admission belongs at R2's conditional write. A route read followed by unconditional put races.
   `putModel` must conditionally create, then compare the stored winner on condition failure. Identical retries remain
   200, different JSON remains 409, and absent/unreadable winner fails closed. The release ledger already has SQL
   uniqueness; no new lock/table is needed. Use concurrent real local-R2 requests.
3. Telemetry configuration must not require a previous ordinary API call. Pass environment sinks/name explicitly
   into generated MCP telemetry and regenerate. The first actual MCP operation on a fresh worker, following only
   real auth/OAuth endpoints, must reach an actual OpenTelemetry Collector and carry its environment. Preserve the
   ordinary API behavior and the existing privacy/role guards; use no vendor service mock.
4. The compiler owns public code uniqueness. Derive reserved prefixes from runtime codes, reject explicit or automatic
   AR collisions with an actionable custom-prefix message, and reject duplicate emitted codes (including the machine's
   reserved number). Never silently renumber an error that may have shipped. Verify through Compiler.model and
   existing compiler guards; keep the change in the existing validation locus.

The same independent reviewer tried to falsify this plan against the owning source and found no unresolved owner
choice or missing in-scope sibling. These four bounded work packages may resume; their source stays separate.
Focused guards precede required static/runtime checks, the clean full gate, Linux CI and one fresh final review.
No additional proof matrix, state machine, coordinator or receipt system is introduced.

## Explicit advisory dispositions

OAuth registration's count-before-insert is a local admission throttle, not a strict concurrent500-row ceiling.
Document that boundary and retain cloud hardening before any public deployment; it does not bypass the role or JWT
checks in this local goal. Do not claim a strict ceiling from the current implementation.

The earlier stage-three evaluator changes were authored in builder-labelled commits. The historical first-author
rule was not met; Git history will not be rewritten or described otherwise. A separate author will independently
review/accept those widened evaluator contracts and verify their existing planted guards before landing. Record the
acceptance and any defect found; future evaluator/journey changes remain author-owned. This is an explicit process
deviation and independent acceptance, not a claim that the original checks preceded their builders.
