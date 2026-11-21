# staging

`ortho env up staging --plan --run <id> [--root <dir>]`, `ortho env destroy staging --plan --run <id>`, and the real
`ortho env up staging --run <id>` and `ortho env destroy staging --run <id>` (M7.03, M7.04).

**The plan** is one function (`internal/plan.ts`), made from the model (its stores, and where each thing lives), the app's
name (`ortho.config.ts`, loaded), the environment and the run. `--plan`
prints it as one JSON document, and the real `up` and `destroy` run the same function and act on what it says. The prefix,
`ortho-<app, letters and digits>-stg-<run>`, is formed there and nowhere else; every name is the prefix or continues it past a
dash, so run `1` does not own run `12`'s resources. A run id is 1 to 20 of `a-z0-9`; a name that would be over 63 characters is
refused (exit 2, no plan).

**`up`** makes the databases (Cloudflare's REST API), applies each one's migrations and deploys the Worker with wrangler, from a
config derived from the generated one (`workers_dev` on, `preview_urls` off, the revision and the bundle's hash set; the calls
the spike proved). A first deploy is retried once after a pause (spike snag 11). A fresh `AUTH_SECRET` is set on the Worker, and
`up` waits for three good answers from the address before it hands it on (snag 10). The portal's client is not part of the
staging Worker (snag 5). `Staging.url(prefix, subdomain)` is the address of the Worker, from this module.

**`destroy`** lists the account's Workers and D1 databases and deletes those the run owns: nothing it did not list, nothing
without the prefix. It needs nothing from `up`, so it cleans after an `up` that died halfway. A Worker's Durable Object
namespaces go with it.

**Credentials** are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, read by `main.ts` alone and handed in. Without them
`up` and `destroy` exit 2 naming what is missing and open no connection. Nothing prints either value.

The module returns what to say (`Said`); only `main.ts` prints and exits. Test: `staging.test.ts`.
