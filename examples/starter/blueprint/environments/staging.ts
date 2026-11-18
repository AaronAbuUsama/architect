import { Blueprint, Cloud, Deploy, Identity } from "@formants/forman";

export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker() }, // add a domain: Deploy.worker({ domain: "api.staging.example.com" })
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) },
});
