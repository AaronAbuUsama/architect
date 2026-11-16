# verdicts

How a prove gets its verdicts into the logbook (D3 #8, #31, #54). `Verdicts.mint(source)` gets an OIDC token for
audience `architect-logbook`: from an issuer (client credentials for a scenario such as `ci-main`, the local
`mock-oauth2-server`) or, in GitHub Actions, from the job's own token endpoint (`ACTIONS_ID_TOKEN_REQUEST_URL` with the
audience added, `id-token: write`). The token comes back `Redacted`, so printing or logging it shows `<redacted>`, and no
error message here carries it. `Verdicts.post` sends one `POST /verdicts` per operation, in order, and stops at the first
one the logbook refuses. Only `main.ts` of the CLI reads the environment variables that say which source to use. Test:
`verdicts.test.ts` (a local HTTP server standing in for the two token endpoints and the logbook; the real issuer and
logbook are in `test-worlds`'s check).
