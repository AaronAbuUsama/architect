import { describe, expect, it } from "vitest";
import { Auth, Configs } from "./service.ts";

describe("config", () => {
  it("is the project's name and its sign-in", () => {
    const config = Configs.config({
      name: "acme",
      auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true }),
    });
    expect(config.kind).toBe("config");
    expect(config.auth).toMatchObject({ adapter: "better-auth", organizations: true, oauthProvider: false });
  });
});
