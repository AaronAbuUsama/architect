# Spike: ci-oidc

**Question.** Can a logbook-style worker under `wrangler dev` 4.156.1 on `ubuntu-latest` verify the job's own GitHub
Actions OIDC token for real (`jose` 6.2.15, GitHub's live JWKS, audience `architect-logbook`, RS256, repository, ref and
workflow checked), refuse the bad cases, and do the same worker and checks pass on this Mac against
`ghcr.io/navikt/mock-oauth2-server:6.1.4` with the issuer set by the environment?

**Answer.** Yes to both, with the same unchanged `src/worker.js` and the same `scripts/checks.mjs`. Only env vars
differ (issuer, JWKS URL, allowed repository, refs and workflow). One surprise that matters for the policy: on a pull
request the `ref` claim is `refs/pull/<n>/merge`, never the branch, so a policy of "ref is `refs/heads/main`" rejects
every pull request's token.

## What was tried

- `src/worker.js`: `POST /verdicts`, bearer token, `jwtVerify` against `createRemoteJWKSet(OIDC_JWKS_URL)` with
  `issuer`, `audience`, `algorithms: ["RS256"]`, `requiredClaims` (exp, iat, repository, ref, workflow), 30 s clock
  tolerance. Then `repository` must equal `ALLOWED_REPOSITORY`, `ref` must match one of `ALLOWED_REFS` (`*` is one path
  segment) and `workflow` one of `ALLOWED_WORKFLOWS`. 200 returns the claims, any failure is 401 with a reason string.
- `scripts/checks.mjs`: real token; wrong audience; forged (the real token's claims and `kid`, re-signed with a fresh
  RSA key); no token. Prints only the worker's reply (status, reason, non-secret claims).
- `scripts/ci.sh` plus `.github/workflows/spike-ci-oidc.yml`: `permissions: id-token: write, contents: read`; mints
  tokens with `curl "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=..."` into variables, `::add-mask::`, starts `wrangler dev`
  with `--var`, runs the checks. Runs on push to `spike/ci-oidc` and on `pull_request` into `layer/3`.
- `scripts/local.sh`: the mock issuer from its digest in Docker, port bound to `127.0.0.1`, claims per client id via
  `JSON_CONFIG`, tokens from `POST /github/token` (client credentials), the same worker with the issuer
  `http://127.0.0.1:18080/github`, plus four extra cases. Container and worker are removed on exit (checked: no
  container, no listener on 18080 or 18787).

## What was found

1. **Push, real token: 200 on workerd, bad cases 401.**
   Run: https://github.com/AaronAbuUsama/architect/actions/runs/43955468713
   ```
   PASS  real token: 200            repository = AaronAbuUsama/architect
                                    ref = refs/heads/spike/ci-oidc
                                    workflow = spike-ci-oidc
                                    event_name = push
                                    sha = f4eace2fac999daf33be9b2f17925d6df12a0729
   PASS  wrong audience: 401 reason=ERR_JWT_CLAIM_VALIDATION_FAILED
   PASS  forged (fresh key, real claims and kid): 401 reason=ERR_JWS_SIGNATURE_VERIFICATION_FAILED
   PASS  no token: 401 reason=missing token
   ```
2. **Pull request (draft PR #4 into `layer/3`, closed unmerged): same four results.**
   Run: https://github.com/AaronAbuUsama/architect/actions/runs/43955633979
   ```
   PASS  real token: 200            repository = AaronAbuUsama/architect
                                    ref = refs/pull/4/merge
                                    workflow = spike-ci-oidc
                                    event_name = pull_request
                                    sha = f54d87910f991c15267ffcede8771fe55fa22b76   (the merge commit, not the branch head)
   ```
   Wrong audience, forged and no token were 401 with the same reasons. `ref` is `refs/pull/<n>/merge` and `sha` is the
   synthetic merge commit, not the head of the branch.
3. **Local, mock issuer: the same four plus four more.** `bash scripts/local.sh`:
   ```
   PASS real token 200 (ref refs/heads/main, workflow ci, event push)
   PASS wrong audience 401 ERR_JWT_CLAIM_VALIDATION_FAILED
   PASS forged 401 ERR_JWS_SIGNATURE_VERIFICATION_FAILED
   PASS no token 401 missing token
   PASS PR ref refs/pull/7/merge 200 (event pull_request)
   PASS other branch 401 reason=ref
   PASS other repository 401 reason=repository
   PASS other workflow 401 reason=workflow
   ```
   The issuer is only env: `OIDC_ISSUER=http://127.0.0.1:18080/github`, `OIDC_JWKS_URL=.../jwks`. Plain `http` and
   `127.0.0.1` need no special handling in `jose` or workerd (`createRemoteJWKSet` fetches it).
4. **No token appeared in either CI log** (`grep -c eyJ` on both run logs: 0). The tokens were also `::add-mask::`ed.
5. Both CI jobs passed with no cloud account and no secret; the job's own `id-token: write` is the only grant.
6. The forged-token case used the real `kid`, so the key was found and the signature failed
   (`ERR_JWS_SIGNATURE_VERIFICATION_FAILED`); that is the stronger test than an unknown `kid`
   (`ERR_JWKS_NO_MATCHING_KEY`, measured by R2).
7. Not exercised: fork pull requests (GitHub gives them no `id-token`; the job would fail at the mint step, so the
   logbook never sees a token), and the `sub` and `job_workflow_ref` claim values on a pull request (the worker returns
   them but the script prints only the five asked for).

## Measurements

| What | Time |
|---|---|
| Mock issuer image, cold pull on `ubuntu-latest` (push run) | 10.2 s |
| Same, pull request run | 8.9 s |
| Mock issuer start to ready on `ubuntu-latest` | 1.79 s and 1.73 s |
| Mock issuer start to ready on this Mac (image cached) | 1.9 s |
| `wrangler dev` start to first response, this Mac | 4.4 s |
| Whole CI job (install, mint, start worker, four checks), from log timestamps | about 20 s |

The cold pull on this Mac was not timed; the image was already present and is not mine to remove.

## The decision it supports

D3 #8 stands as written: `jose` 6.2.15, one issuer from env, RS256 only, audience `architect-logbook`, repository, ref
and workflow checked, a forged token, a wrong audience and no token each 401. The mock issuer is a drop-in for GitHub:
the worker has no per-issuer code.

**Verdict-acceptance policy (proposed for D3 #8 and L2.03).** The ref allow-list has to name two shapes, because a
pull request's token carries the merge ref:

```
ALLOWED_REPOSITORY = <owner>/<repo>
ALLOWED_WORKFLOWS  = <the proving workflow's name, e.g. ci>
ALLOWED_REFS       = refs/heads/main , refs/pull/*/merge      # and refs/heads/layer/* if layer pushes post verdicts
```

- A token whose `ref` is `refs/heads/main` (event `push`) writes the verdict that counts for `main`.
- A token whose `ref` is `refs/pull/<n>/merge` (event `pull_request`) is accepted too, but its verdict is
  recorded against that pull request, not against `main`: store `ref` and `event_name` with it, and let only `main`
  verdicts feed release gates. Do not match `ref` by prefix `refs/pull/`; use the one-segment pattern so
  `refs/pull/1/merge/../x` and similar cannot match.
- Pin the workflow by name for the check, and in production also compare `job_workflow_ref`
  (`<repo>/.github/workflows/<file>@<ref>`) since two workflows can share a `name`.
- `sha` on a pull request is the merge commit, so record it as what was proven but resolve "the PR head" via the
  API or a payload field the job sends, not the claim.

## Open risks

- The workflow `name` claim is whatever the file says, so any workflow in the repo with that name, on an allowed ref,
  mints an acceptable token. That is a repo-level trust boundary (anyone who can push to an allowed ref or open a
  same-repo pull request can run workflow code). Same-repo pull request authors can therefore post a verdict; the
  `refs/pull/*/merge` entry widens trust to everyone with push access, and `job_workflow_ref` plus a `main`-only
  gate for release decisions narrows what that is worth.
- GitHub's JWKS is fetched live per isolate with `createRemoteJWKSet` (cached, cooldown). A deployed logbook needs
  the outbound fetch to work, and key rotation is handled by `jose` refetching on an unknown `kid`.
- The CI proof uses `wrangler dev` on the runner, not a deployed worker; a deployed one is the same code.
- Fork pull requests are unverified here (see finding 7); GitHub's documented behaviour is no token.
