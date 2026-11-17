/* ===== Starter files the layers change, written once with their layers ===== */
Object.assign(LAYERED, {
"acme/architect.config.ts": { k: "scaffold", n: "The project's one loose file. Names the outputs and where telemetry goes. Everything else comes from the layout.", c:
`import { Blueprint, Auth, Telemetry } from "@architect/blueprint"

export default Blueprint.config({
  name: "acme",
  // The standard outputs. Rename any here; the folders follow.
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: false, portal: false }, «-2»
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true }, «2»
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true }), «-2»
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true, oauthProvider: true }),   // agents sign in to the MCP server «2»
  telemetry: Telemetry.otlp({ sink: "axiom", dataset: "acme" }),
})` },
"acme/blueprint/environments/local.ts": { k: "scaffold", n: "One file per environment. Local runs on your machine.", c:
`import { Blueprint, Cloud, Identity } from "@architect/blueprint"
import { Chain } from "@architect/std" «4»

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,           // fixed test people, each with a wallet from layer four
  database: Cloud.d1.local(),                  // the local runtime emulates D1: no database process
  clock: "stepped",                            // time stands still until a journey moves it «5»
  chain: Chain.anvil({ blockTime: "2 seconds" }),   // the chain's time moves with the world's clock «4»
  secrets: { RELAYER_KEY: Blueprint.secret.generated() },   // a throwaway gas wallet, made for each world «4-5»
  secrets: { RELAYER_KEY: Blueprint.secret.generated(), KEEPER_KEY: Blueprint.secret.generated() }, «5»
})` },
"acme/blueprint/environments/test.ts": { k: "scaffold", n: "", c:
`import { Blueprint, Cloud, Identity } from "@architect/blueprint"
import { Chain } from "@architect/std" «4»

export default Blueprint.environment({
  runs: "a fresh world for each pull request",
  lifetime: "2 hours",                         // created and destroyed as one unit, with an owner and an expiry
  identity: Identity.testPrincipals,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  clock: "stepped", «5»
  chain: Chain.anvil({ blockTime: "2 seconds" }), «4»
  secrets: { RELAYER_KEY: Blueprint.secret.generated() }, «4»
})` },
"acme/blueprint/environments/staging.ts": { k: "scaffold", n: "", c:
`import { Blueprint, Cloud, Identity, Deploy } from "@architect/blueprint"
import { Chain } from "@architect/std" «4»

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  clock: "real", «5»
  chain: Chain.network("base-sepolia"), «4»
  secrets: { RELAYER_KEY: Blueprint.secret.stored() },     // named here; the value lives in the environment «4»
  deploy: { «2»
    server: Deploy.worker({ domain: "api.staging.acme.dev" }), «2»
    mcp: Deploy.worker({ domain: "mcp.staging.acme.dev" }), «2»
    portal: Deploy.site({ domain: "staging.acme.dev" }), «2»
    contracts: Deploy.contracts({ verify: true }), «4»
    keeper: Deploy.timers(),                      // the keeper's alarms, one per thing «5»
  }, «2»
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) }, «2»
})` },
"acme/blueprint/environments/production.ts": { k: "scaffold", n: "Production deploys what runs and publishes what's installed, from the same revision that passed staging.", c:
`import { Blueprint, Cloud, Identity, Deploy } from "@architect/blueprint"
import { Chain } from "@architect/std" «4»

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  clock: "real", «5»
  chain: Chain.network("base"), «4»
  secrets: { RELAYER_KEY: Blueprint.secret.stored() }, «4-5»
  secrets: { RELAYER_KEY: Blueprint.secret.stored(), KEEPER_KEY: Blueprint.secret.stored() }, «5»
  promotesFrom: "staging",                     // only a revision with a green verdict there «2»
  deploy: { «2»
    server: Deploy.worker({ domain: "api.acme.dev" }), «2»
    mcp: Deploy.worker({ domain: "mcp.acme.dev" }),       // a remote MCP server agents connect to «2»
    portal: Deploy.site({ domain: "acme.dev" }), «2»
    contracts: Deploy.contracts({ verify: true, once: true }),   // redeployed only when the bytecode changes «4»
    keeper: Deploy.timers(),                      // the keeper's alarms, one per thing «5»
  }, «2»
  publish: { «2»
    sdk: Deploy.npm(), «2»
    cli: [Deploy.npm(), Deploy.homebrew({ tap: "acme/tap" }), Deploy.binaries({ on: "github-releases" })], «2»
  }, «2»
})` },
});
