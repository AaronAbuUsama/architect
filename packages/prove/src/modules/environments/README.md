# environments

`Environments.up|down|status({ root, name })`: a long-lived local environment (`test`, `staging`, `production`) as D3 #4
decided. Each runs the revision's built `main.js` unchanged (`no_bundle: true`, from `Build`) on its own `wrangler dev`
through `Worlds.launch`, so it has its own D1 and Durable Object state, its own inspector port and its own secrets.
Everything it keeps is under `.architect/environments/<name>/`: `wrangler.jsonc` (the generated server's config with its
source swapped for the bundle, its worker and database named for the environment, and the bundle's revision and hash as
vars, which is what `GET /_architect/bundle` answers), `secrets.env` (mode 0600, passed to wrangler as `--env-file`,
never as `--var`), `state/` (`--persist-to`, kept across restarts), `pid`, `port`, `bundle.json` and `wrangler.log`.
Which environments exist, and that `local` is not one of them, comes from the model's `environments`.

`up` leaves a running environment alone, builds the revision when it has no artefact, and with a `revision` restarts a
running environment onto that bundle with its state kept (what `promote` does, L2.05). `down` stops the whole process
group and is not an error on an environment that isn't running. The logbook (L2.03) is another worker: `OWN_WORKER` in
`service.ts` is the seam. Test: `environments.test.ts` (ports 8950 to 8999).
