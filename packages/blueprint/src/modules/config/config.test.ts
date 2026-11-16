import { describe, expect, it } from "vitest";
import { Auth, Configs, Telemetry } from "./service.ts";

describe("config", () => {
  it("is the project's name, its outputs, its sign-in and its telemetry", () => {
    const config = Configs.config({
      name: "acme",
      outputs: { server: true, sdk: "@acme/sdk", cli: "acme", mcp: true, portal: true },
      auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true }),
      telemetry: Telemetry.otlp({ sink: "axiom", dataset: "acme" }),
    });
    expect(config.kind).toBe("config");
    expect(config.auth).toMatchObject({ adapter: "better-auth", organizations: true, oauthProvider: false });
    expect(config.telemetry).toEqual({ kind: "telemetry", protocol: "otlp", sink: "axiom", dataset: "acme" });
  });
});
