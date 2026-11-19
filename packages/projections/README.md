# @orthograph/projections

The projections Orthograph ships, each a plugin of kind `projection` that an app mounts in `blueprint/projections/<name>.ts`
([`design/decisions/M1-plugins.md`](../../design/decisions/M1-plugins.md) sections 2, 3 and 15;
[`design/frame/projections.md`](../../design/frame/projections.md) sections 1 and 2):

```ts
// blueprint/projections/server.ts
import { Blueprint } from "orthograph";
import { server } from "@orthograph/projections";

export default Blueprint.use(server);
```

Parts one and two (M1.11, M1.12) have `model`, `api`, `server`, `sdk`, `cli` and `mcp`. The docs and the portal (M1.13)
still render from the fixed list in `@orthograph/generators` and arrive here when that slice lands.

A mount is what makes the output: `ortho generate` writes `generated/<mount>/` for each projection mounted and nothing for
one that isn't. A project that mounts no projection at all gets the six as if it had mounted them (see
`packages/generators/src/modules/render/internal/mounted.ts`).

The package is `env:build`: it runs where `ortho generate` runs and never in production. What it generates imports only
the language's runtime, `orthograph`, the host and the project's own code, never this package. The project may import it
(`scope:project` may depend on `scope:projections`, because a blueprint mounts it as it mounts any plugin).

`./shared` is for `@orthograph/generators` while the docs and the portal wait on its fixed list: the names every renderer
shares, the handler scaffold and the empty server `prove` uses. It goes when M1.13 is done.
