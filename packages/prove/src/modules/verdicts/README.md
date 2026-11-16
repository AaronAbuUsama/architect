# verdicts

How a prove gets its verdicts into the logbook (D3 #8, #31, #54). `Verdicts.mint(source)` gets an OIDC token for
audience `architect-logbook`: from an issuer (client credentials for a scenario such as `ci-main`, the local
`mock-oauth2-server`) or, in GitHub Actions, from the job's own token endpoint (`ACTIONS_ID_TOKEN_REQUEST_URL` with the
audience added, `id-token: write`). The token comes back `Redacted`, so printing or logging it shows `<redacted>`, and no
error message here carries it. `Verdicts.post` sends one `POST /verdicts` per operation, in order, and stops at the first
one the logbook refuses. `Verdicts.sourceOf(env)` is the one place that decides the source from the environment variables
only `main.ts` reads (`ARCHITECT_LOGBOOK_TOKEN`, else the issuer, else GitHub's own), used by verdicts and by `Releases.record`
alike (D3 #90). `Verdicts.latest` reads the newest verdict of each operation for a revision, environment and ref: what
`promote`'s gates read. Test:
`verdicts.test.ts` (a local HTTP server standing in for the two token endpoints and the logbook; the real issuer and
logbook are in `test-worlds`'s check).
