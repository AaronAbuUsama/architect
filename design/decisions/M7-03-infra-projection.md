# M7.03 and M7.04: the infra projection on wrangler and the REST API, not Alchemy

Decided 21 November 2026 by the building agent of M7.03 and M7.04, under "Who decides" in `AGENTS.md`.

## The call

`ortho env up staging --run <id>` and `ortho env destroy staging --run <id>` are built on **wrangler and Cloudflare's REST API**,
the calls `spikes/staging-pass` proved, and not on an Alchemy stack.

- `M7-cloud.md` and its addenda never name Alchemy. Only older design text does (`milestones.md` M7.03, `frame/deployment.md`,
  `frame/projections.md`), written before the spike, and D3 #5 had already deferred it.
- Everything the spike proved is these calls: `d1 create`, `d1 migrations apply --remote`, `wrangler deploy`, `secret put`,
  `delete --force`, and the REST listings. The one thing a stack adds, state of what it made, is what `destroy` must not need
  (spike snag 12: destroy by name works after an `up` that died halfway, and the account is shared, so deleting by a prefix is
  the safe rule, `M7-cloud.md` addendum 2).
- Alchemy would add a dependency, a state store and an untested path to an account that holds other apps' resources.

## What it is

- **One plan.** `packages/cli/src/modules/staging/internal/plan.ts` makes the plan from the compiled model, the project's name
  (`ortho.config.ts`), the environment and the run. `--plan` prints it; `up` and `destroy` run the same function.
- **destroy** lists the account's Workers and D1 databases and deletes those whose name is the run's prefix or continues it past a
  dash. A Worker's Durable Object namespaces go with it.
- **up** makes the databases, applies migrations, deploys a config derived from the generated one (`workers_dev` on, `preview_urls`
  off, the revision and hash set), retries a first deploy once on code 10007 (snag 11), sets a fresh `AUTH_SECRET`, and waits for
  three good answers (snag 10). Telemetry is off in staging (snag 8).
- **The address** is `stagingUrl(prefix, subdomain)`, from the same module.
- **Credentials** are `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, read by `main.ts` alone; without them both verbs exit 2 and open no connection.

## Not done here

The real deploy has not been run: it waits for the hand-run staging workflow and the lead's go. `ortho prove --env staging` is another slice.
The portal's client is not part of the staging Worker (snag 5).

## Supersedes

- design/milestones.md: "The infra projection: an Alchemy stack per environment from the model and mounts" → "The infra projection: the plan of an environment's cloud resources from the model and mounts, made by wrangler and Cloudflare's REST API"
- design/frame/deployment.md: "an Alchemy stack per environment, generated from the model and the mounts; applied by `promote` in the cloud pass" → "a plan per environment, made from the model and the mounts and carried out with wrangler and Cloudflare's REST API"
- design/frame/deployment.md: "`ortho env destroy <name>` removes its Alchemy stack." → "`ortho env destroy <name> --run <id>` deletes what the run's prefix owns."
- design/frame/deployment.md: "an Alchemy stack generated from the model and mounts" → "a plan generated from the model and mounts, carried out with wrangler and the REST API"
- design/frame/projections.md: "Infrastructure is the Alchemy stack per environment: Workers" → "Infrastructure is the plan per environment, carried out with wrangler and Cloudflare's REST API: Workers"
- .agents/skills/kanban/data/tasks.json: "an Alchemy stack per environment from the model and mounts" → "the plan of an environment's cloud resources from the model and mounts, made by wrangler and Cloudflare's REST API"
- design/frame/generators.md: "an Alchemy stack |" → "a plan, made by wrangler and the REST API |"
- design/frame/projections.md: "D3 #5 deferred Alchemy to the cloud pass." → "M7-03 builds staging on wrangler and Cloudflare's REST API, not Alchemy."
