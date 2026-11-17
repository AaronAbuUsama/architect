# tokens

`Tokens.fromVars(env)` reads the worker's policy (`OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`, `ALLOWED_REPOSITORY`,
`ALLOWED_REFS`, `ALLOWED_WORKFLOWS`); `Tokens.remote(policy, jwksUrl)` then verifies a bearer token with `jose`:
RS256 only, issuer, audience, expiry, then repository, ref (patterns, `*` is one path segment) and workflow. A
workflow entry with a `/` is a file path matched on `job_workflow_ref`; when the token carries `job_workflow_ref`, its
repository and ref must be allowed too. A refusal is a `TokenRefused` with jose's error code or the failed check as its
reason, never the token. `Tokens.make(policy, keys)` takes any jose key lookup, so the test signs tokens with its own keys.

Invariants: one issuer; nothing is accepted that the signature and the policy don't both allow; a token is never logged.
Test: `tokens.test.ts`; the whole path through the worker is `local/local.test.ts`.
