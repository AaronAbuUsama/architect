import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Auth, Principals } from "@architect/target-effect";
import { AuthD1 } from "./service.ts";
import { SCHEMA } from "./internal/schema.ts";
import { compile } from "../../../scripts/auth-schema.ts";

// Real Better Auth on workerd and a real local D1.
const auth = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET });
const run = <A, E>(e: Effect.Effect<A, E, Auth | Principals>) => Effect.runPromise(e.pipe(Effect.provide(AuthD1.layer(auth))));
const email = `ada.${crypto.randomUUID().slice(0, 8)}@example.test`;

describe("Better Auth on D1", () => {
  it("signs up once, signs in with the right password, and a session or API key becomes the person", { timeout: 30_000 }, async () => {
    const said = await run(Effect.gen(function* () {
      const a = yield* Auth;
      const principals = yield* Principals;
      const { person } = yield* a.signUp({ email, password: "correct horse battery", name: "Ada" });
      const taken = yield* Effect.flip(a.signUp({ email, password: "another password", name: "Ada" }));
      const wrong = yield* Effect.flip(a.signIn({ email, password: "wrong password" }));
      const { session, token } = yield* a.signIn({ email, password: "correct horse battery" });
      const { apiKey, key } = yield* a.createApiKey({ person, name: "ci" });
      return {
        person, taken: taken.reason, wrong: wrong.reason, session, apiKey, key,
        bySession: yield* principals.of(`Bearer ${token}`),
        byKey: yield* principals.of(`Bearer ${key}`),
        byNothing: yield* principals.of(undefined),
        byGarbage: yield* principals.of("Bearer not-a-token"),
      };
    }));
    expect(said.person).toMatch(/^per_[0-9a-z]{16}$/);
    expect(said.session).toMatch(/^ses_[0-9a-z]{16}$/);
    expect(said.apiKey).toMatch(/^key_[0-9a-z]{16}$/);
    expect(said.key.startsWith("ak_")).toBe(true);
    expect([said.taken, said.wrong]).toEqual(["taken", "credentials"]);
    expect(said.bySession).toEqual({ kind: "person", person: said.person, email });
    expect(said.byKey).toEqual({ kind: "person", person: said.person, email });
    expect([said.byNothing, said.byGarbage]).toEqual([{ kind: "anonymous" }, { kind: "anonymous" }]);
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'auth_%' ORDER BY name").all<{ name: string }>();
    expect(tables.results.map((t) => t.name)).toEqual(["auth_account", "auth_apikey", "auth_session", "auth_user", "auth_verification"]);
  });
});

describe("the auth schema", () => {
  it("is what Better Auth compiles from the options today: rerun scripts/auth-schema.ts if not", async () => {
    expect(await compile()).toEqual(SCHEMA);
  });
});
