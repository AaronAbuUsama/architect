import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { authMemory } from "./service.ts";
import { Auth } from "./types.ts";

const run = <A, E>(e: Effect.Effect<A, E, Auth>) => Effect.runPromise(e.pipe(Effect.provide(authMemory())));

describe("the Auth contract", () => {
  it("signs a person up once, and in only with the right password", async () => {
    const said = await run(Effect.gen(function* () {
      const auth = yield* Auth;
      const { person } = yield* auth.signUp({ email: "ada@example.test", password: "pw-1", name: "Ada" });
      const again = yield* Effect.flip(auth.signUp({ email: "ada@example.test", password: "x", name: "Ada" }));
      const wrong = yield* Effect.flip(auth.signIn({ email: "ada@example.test", password: "nope" }));
      const right = yield* auth.signIn({ email: "ada@example.test", password: "pw-1" });
      return { person, again: again.reason, wrong: wrong.reason, session: right.session };
    }));
    const v = said;
    expect([v.person.slice(0, 4), v.again, v.wrong, v.session.slice(0, 4)]).toEqual(["per_", "taken", "credentials", "ses_"]);
  });
});
