// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
import { Blueprint, Cloud, Deploy } from "@architect/blueprint";
import auth from "../kits/auth.ts";

export default Blueprint.environment({
  runs: "always on",
  // What this environment issues. Delete "agent" (and the mcp deploy below; `check` insists) to keep agents out.
  identity: auth.identity({ via: ["session", "key", "device", "agent"] }),
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging",
  // Each kit's secrets, inserted by `architect add kit` and named like any other; values live only in the environment
  // (D3). `check` fails if a deployed environment leaves out a secret a mounted kit needs.
  secrets: {
    AUTH_SECRET: Blueprint.secret.generated(),
    STRIPE_KEY: Blueprint.secret.stored(),
    STRIPE_WEBHOOK_SECRET: Blueprint.secret.stored(),
    RESEND_KEY: Blueprint.secret.stored(),
  },
  deploy: {
    server: Deploy.worker({ domain: "api.acme.dev" }), // acme's routes and every kit's server part: one Worker
    mcp: Deploy.worker({ domain: "mcp.acme.dev" }),
    portal: Deploy.site({ domain: "acme.dev" }),
  },
  publish: { sdk: Deploy.npm(), cli: [Deploy.npm(), Deploy.homebrew({ tap: "acme/tap" })] },
});
