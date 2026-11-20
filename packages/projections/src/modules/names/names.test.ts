// What the renderers share: a name from a path, and a built-in projection's files made relative to its mount's folder.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { camel, pascal, ruleSentence, within } from "./service.ts";

describe("names", () => {
  it("turns a thing's dashed name into an identifier", () => {
    expect(pascal("api-key")).toBe("ApiKey");
    expect(camel("api-key")).toBe("apiKey");
  });

  it("makes each file relative to the mount's folder, and refuses a mount named otherwise", async () => {
    const files = [{ path: "generated/api/src/index.ts", content: "x", scaffold: false }];
    expect(await Effect.runPromise(within({ mount: "api" }, "api", files))).toEqual([{ path: "src/index.ts", content: "x" }]);
    const refused = await Effect.runPromise(Effect.result(within({ mount: "contract" }, "api", files)));
    expect(refused._tag).toBe("Failure");
  });
});

describe("the sentence for a rule (G5)", () => {
  it("is the rule's own description when it wrote one, else made from the thing, the states it holds in and its key", () => {
    expect(ruleSentence("handle", { fields: ["name"], while: ["claimed"] })).toBe("another claimed handle holds this name");
    expect(ruleSentence("handle", { fields: ["owner"], while: ["claimed"], description: "you already hold a name" })).toBe("you already hold a name");
    expect(ruleSentence("profile", { fields: ["handle"] })).toBe("another profile holds this handle");
    expect(ruleSentence("run", { fields: ["mission", "task"], while: ["claimed", "running"] })).toBe("another claimed or running run holds this mission and task");
    expect(ruleSentence("sign-in", { fields: ["person-id"] })).toBe("another sign in holds this person id");
  });
});
