# releases

The working model against the logbook (D3 #1, #31, #14). Everything goes through the logbook's HTTP routes; nothing here
runs the logbook.

- `Releases.locate({ root, env })`: where the logbook is. `ARCHITECT_LOGBOOK_URL` wins; otherwise the running `logbook`
  environment's URL (the pidfile and port `architect env up logbook` keeps under `.architect/environments/logbook/`, read
  through `Environments.status`). Undefined when there is neither (D3 #64).
- `Releases.shipping(logbook, model)`: the last production release (`GET /releases/latest`) and its model (`GET /models/<rev>`),
  compared with the working model (`Compare.release`): `from`, the next `version`, the `changes` and their `bump`. With no
  release the version is `1.0.0`. And staleness: the latest passing verdict of each operation in staging and in production
  among those posted from `refs/heads/main` (`GET /verdicts/latest?...&ref=`), each judged against the model of the revision
  it proved. An operation is **stale** in an environment when anything its proof rested on (`Compare.dependsOn`) has changed
  since; a pull request's verdict never counts (D3 #8); `test` is never listed.
- `Releases.next`: the version alone, for `architect version --next`.
- `Releases.record({ logbook, env, model, revision, version })`: `PUT /models/<revision>`, then `POST /releases`. This is
  what `promote --to production` (L2.05) calls. Both are writes and carry an OIDC token: `ARCHITECT_LOGBOOK_TOKEN`, else one
  minted from `ARCHITECT_OIDC_ISSUER` and `ARCHITECT_OIDC_CLIENT` (client credentials, the local issuer), else GitHub Actions'
  own (`ACTIONS_ID_TOKEN_REQUEST_URL`). The token is never printed or kept.
- `Releases.changesJson` and `writeChanges`: `generated/model/changes.json` as the docs show it. The generators never write or
  delete it (`Sync` leaves it alone): it depends on the logbook, not on the blueprint.

Test: `releases.test.ts`, against the real logbook and a real issuer (ports 9010 and 9011).
