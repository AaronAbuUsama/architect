# D3 #194: independent author acceptance of stage-three evaluator contracts

Independent author decision, 17 November 2026. Reviewed source base:
`b2aa54ef7b1e5a0fe31ea403034d5c2fe4098048`, followed by the bounded author corrections in this change.

## The process deviation remains part of the record

The evaluator widening in these commits was written in builder-labelled changes:

- `2be22c0b4c1df49cd8456b79136157b14aa78f28`: list answers decoded from JSON-bearing span attributes.
- `43abd99d09ee1db8a1508678403aba49d9a05c6f`: private/secret leak guards and refusal codes inside the existing evals.
- `49eea9ed068af85e0643e3b8bc78d5be23b4460c`: the five telemetry-only live evaluators.

The author-before-builder rule in AGENTS was not met for those changes. This author wrote none of those evaluators or
handlers before this review. Their Git history is unchanged. This is current independent acceptance after inspection,
new failing guards and bounded correction; it does not retroactively make the original process compliant. Future
journey, evaluator and generic-check changes remain author-owned.

The complete evaluator-subtree diffs, including the guards added in those commits, were read against D3 #61, #83,
#85 and #143–146 and the current declaration, serialization and live-evidence consumers. This acceptance covers those
evaluator contracts; it is not a second approval of every unrelated versioning, publishing or UI change in those commits.

## Accepted contracts and two corrections

**List and schema answers.** A schema-valued field must fit its real declaration. The widening is accepted after
correcting blind JSON parsing: a valid `Schema.String` answer such as `null`, `{}` or `[]` was previously converted
into a different type and rejected. Conversely, an observed string containing serialized JSON could be accepted for
an object/array declaration. The public-interface guards first reproduced both results.

Only a schema-valued field already present in the original answer selection now uses the observed response's type.
Non-schema span checks, hidden-field body selection, all-answer-attributes-absent response fallback and replay behavior
remain as before. A valid body cannot fill a public field missing from partial answer telemetry (D3 #82). A broader
body-first draft was rejected by a new failing guard before the narrow version passed. With no observed response,
the raw span value is decoded first; JSON reconstruction is a fallback for a schema that rejects the raw value. Thus
valid text stays text, encoded object/list spans still decode, and numeric cursor text is preserved.

**Privacy and refusal codes.** Eval 1 still checks private/secret attribute names and known values in the call's spans,
logs and journal, without repeating a secret in diagnostics. Hidden answer shapes still come from the observed body.
The exact-value threshold remains eight characters; shorter values are checked by field name. The Collector's second
privacy guard and the runtime allowlist were not changed.

Eval 2 still rejects undeclared refusal names. The review found that a known refusal could skip code validation if
its observed 4xx body omitted `_tag`; an absent or wrong code then passed. An observed body must now have the declared
tag, agree with the operation's refusal span when that span supplies a tag, and carry exactly the model's code. A
missing model code fails closed. The correct tagged/coded refusal remains accepted. No response body is invented for
live telemetry: there the declared refusal name can be judged, while its actual wire tag/code cannot be certified.

**Live and performance boundaries.** `judgeLive` retains exactly answer shape, declared errors, steps, performance and
explainability, only for operations observed. Role facts, machine state, journal-dependent events and whole-run coverage
remain in prove. Non-public/email answer fields and replay answer shapes retain the existing unavailable-data limits.
Span-only schema strings remain a lossy representation; schemas accepting both text and structured data cannot recover
a unique original type from that string alone. The observed-body check supplies that distinction in prove.

All nine prove evaluators remain. Performance still raises a review above 1.5 times budget and never becomes a hard
failure. Live drift still requires at least twenty calls; a thin sample is not proof that the budget holds. No budget,
call-count rule, refusal count or planted fixture was softened.

## Actual verification

`evidence/Eval-author-acceptance/` contains the captured commands and raw output:

- The original seventeen pure evaluator/watch guards passed before correction. New public `Evals.gather`, `judge`
  and `judgeLive` guards then failed on the actual semantic gaps; the partial-telemetry guard rejected the broad draft.
- The final twenty-one pure guards pass. Independent pure probes report no remaining gap in the reported cases.
- Before and after correction, the original three real-service files pass all sixteen tests: `prove.test.ts` (eleven),
  `reads.test.ts` (two) and `secrets.test.ts` (three). The final run took 93 seconds on real workerd/D1 and the actual
  Docker Collector. It includes the original eight planted negative fixtures, blank scaffolds, every operation's nine
  evals, schema-valued list answers/pagination and the privacy checks. Performance is deliberately review-only, not a
  ninth hard-failing fixture.
- Prove lint and typecheck pass without cache. Original fixtures/journeys are unchanged. The source-scope receipt
  records the corrected source/test/README blob hashes. Cleanup verifies no container mounted from this worktree,
  reserved listening port or worktree runtime process remains.

Captures record the real base HEAD plus the author's working-tree corrections, not a claim that clean base b2aa54e
already had them. An initial probe import-resolution failure is retained under `attempts/` and is not semantic proof.
Some early captures used the shorter temporary directory name `Eval-author`; the same records now live here unchanged.
No service/provider was mocked, no credential or cloud account was used, and no cloud telemetry or final integrated
Linux CI is claimed by this local acceptance. The conductor still owns the full gate, CI and independent final review.

## Verdict

Accepted for the stage-three local contract after the bounded corrections and guards in this author change. The
historical authorship deviation remains explicit. This verdict does not mark Gate 2 or goal 01 complete.
