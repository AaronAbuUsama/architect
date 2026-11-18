import { Blueprint, Cloud, Deploy, Identity } from "@architect/blueprint";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  promotesFrom: "staging", // only a revision with a green verdict there
  deploy: { server: Deploy.worker() }, // add a domain: Deploy.worker({ domain: "api.example.com" })
  publish: { sdk: Deploy.npm(), cli: Deploy.npm() },
});
