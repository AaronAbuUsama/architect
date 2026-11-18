# @formants/portal

The read-only portal every project gets (layer 2, L2.10; F1, D3 #130 to #138). It is not an app of its own: the generated Worker of an
environment routes `/portal` and `/_portal/v1/*` to `Portal.serve`, with `generated/portal/blueprint.json` (this package's wire, made by
`@formants/generators`) and the logbook's address from the Worker's variables. The browser never imports project source, the
compiler or a credential.

- `wire`: the versioned JSON the app reads, its digest, the decoder that rejects an unknown schema or a digest mismatch, and the
  JSON-only adapter for what a proof rests on (kept equal to `Compare.dependsOn` by the generators' tests).
- `reader`: the logbook's open reads, injected (`Reader.http`); a logbook that does not answer is never "no verdicts".
- `snapshot`: per operation and environment, `recorded-pass`, `failed`, `stale` (with the changed declarations), `unproven` or
  `unavailable`; the latest failure wins, and nothing that could not be read is ever green.
- `site`: the plain HTML face and the JSON routes. A licensed HeroUI face (F1.1) replaces the face on the same wire, with no new contract.

Tests: `nx test portal`. `snapshot/logbook.test.ts` runs the real logbook and a real OIDC server in Docker (ports 9090, 9091).
