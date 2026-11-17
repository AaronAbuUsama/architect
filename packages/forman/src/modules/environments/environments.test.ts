import { describe, expect, it } from "vitest";
import { Cloud } from "#modules/cloud/service.js";
import { Deploy } from "#modules/deploy/service.js";
import { Identity } from "#modules/identity/service.js";
import { Secrets } from "#modules/secrets/service.js";
import { Environments } from "./service.ts";

describe("environments", () => {
  it("is a declaration with no name, only what the environment is", () => {
    const staging = Environments.environment({
      runs: "always on",
      identity: Identity.betterAuth,
      cloud: Cloud.cloudflare({ database: Cloud.d1() }),
      secrets: { RELAYER_KEY: Secrets.secret.stored() },
      deploy: { server: Deploy.worker({ domain: "api.staging.acme.dev" }) },
      publish: { sdk: Deploy.npm({ tag: "next" }), cli: [Deploy.npm(), Deploy.homebrew({ tap: "acme/tap" })] },
    });
    expect(staging.kind).toBe("environment");
    expect("name" in staging).toBe(false);
    expect(Object.isFrozen(staging)).toBe(true);
  });
});
