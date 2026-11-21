import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Auth, Principals } from "@orthograph/language-effect";
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
    expect(said.bySession).toEqual({ kind: "person", person: said.person, email, via: "session" });
    expect(said.byKey).toEqual({ kind: "person", person: said.person, email, via: "key" });
    expect([said.byNothing, said.byGarbage]).toEqual([{ kind: "anonymous" }, { kind: "anonymous" }]);
    const tables = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'auth_%' ORDER BY name").all<{ name: string }>();
    expect(tables.results.map((t) => t.name)).toEqual(["auth_account", "auth_apikey", "auth_device_code", "auth_jwks", "auth_oauth_access_token", "auth_oauth_client", "auth_oauth_client_assertion", "auth_oauth_client_resource", "auth_oauth_consent", "auth_oauth_refresh_token", "auth_oauth_resource", "auth_session", "auth_user", "auth_verification"]);
  });
});

describe("who a credential is (M2-auth, fork 2 and 3)", () => {
  const hosting = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: true });
  const elsewhere = AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET });
  const as = (instance: ReturnType<typeof AuthD1.make>, authorization: string | undefined, door?: "api" | "mcp") =>
    Effect.runPromise(Effect.flatMap(Principals, (p) => p.of(authorization, door)).pipe(Effect.provide(AuthD1.layer(instance))));
  const mail = `agent.${crypto.randomUUID().slice(0, 8)}@example.test`;

  it("a key made for an agent is an agent for its person; the MCP door makes every credential one; a world's token is the system or a service only where worlds are hosted", { timeout: 30_000 }, async () => {
    const person = (await Effect.runPromise(Effect.flatMap(Auth, (a) => a.signUp({ email: mail, password: "correct horse battery", name: "Agent" })).pipe(Effect.provide(AuthD1.layer(hosting))))).person;
    const plain = await Effect.runPromise(AuthD1.credential(hosting, { kind: "key", person }));
    const marked = await Effect.runPromise(AuthD1.credential(hosting, { kind: "agent", person }));
    const system = await Effect.runPromise(AuthD1.credential(hosting, { kind: "system" }));
    const service = await Effect.runPromise(AuthD1.credential(hosting, { kind: "service", mount: "pricing" }));
    expect(await as(hosting, `Bearer ${plain.token}`)).toEqual({ kind: "person", person, email: mail, via: "key" });
    expect(await as(hosting, `Bearer ${marked.token}`)).toEqual({ kind: "agent", person, email: mail, via: "agent" });
    expect(await as(hosting, `Bearer ${plain.token}`, "mcp")).toEqual({ kind: "agent", person, email: mail, via: "agent" });
    expect(await as(hosting, `Bearer ${system.token}`)).toEqual({ kind: "system" });
    expect(await as(hosting, `Bearer ${service.token}`, "mcp")).toEqual({ kind: "service", mount: "pricing" });
    // Staging and production host no world: the same tokens are no one there. So is one signed by another secret, or cut about.
    expect(await as(elsewhere, `Bearer ${system.token}`)).toEqual({ kind: "anonymous" });
    expect(await as(elsewhere, `Bearer ${service.token}`)).toEqual({ kind: "anonymous" });
    const other = AuthD1.make({ db: env.DB, secret: `${env.AUTH_SECRET}-another`, worlds: true });
    expect(await as(other, `Bearer ${system.token}`)).toEqual({ kind: "anonymous" });
    expect(await as(hosting, `Bearer ${service.token.replace("wld_7", "wld_6")}`)).toEqual({ kind: "anonymous" });
    expect(await as(hosting, "Bearer wld_zz.00")).toEqual({ kind: "anonymous" });
  });
});

describe("dynamic client registration (D3 #123)", () => {
  const register = (origin: string) =>
    Effect.runPromise(AuthD1.handle(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "cli" }), new Request(`${origin}/api/auth/oauth2/register`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_name: "c", redirect_uris: ["http://127.0.0.1:1/callback"], token_endpoint_auth_method: "none" }),
    })));
  const clients = async () => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM "auth_oauth_client"`).first<{ n: number }>())!.n;
  const fill = (n: number, createdAt: string) =>
    env.DB.batch(Array.from({ length: n }, (_, i) =>
      env.DB.prepare(`INSERT INTO "auth_oauth_client" ("id", "clientId", "redirectUris", "createdAt") VALUES (?, ?, '[]', ?)`).bind(`fill_${createdAt}_${i}`, `fill_${createdAt}_${i}`, createdAt)));

  it("registers a client, and says 429 once the cap is held by clients that are in use or new; a stale unused one makes room", { timeout: 60_000 }, async () => {
    await env.DB.prepare(`DELETE FROM "auth_oauth_client"`).run().catch(() => undefined);
    const made = await register("http://127.0.0.1:1");
    expect(made.status, await made.clone().text()).toBe(201);
    // A full house of clients made just now: nobody is cleared, and a new one is refused.
    await env.DB.prepare(`DELETE FROM "auth_oauth_client"`).run();
    await fill(500, new Date().toISOString());
    const full = await register("http://127.0.0.1:1");
    expect([full.status, ((await full.json()) as { error: string }).error]).toEqual([429, "temporarily_unavailable"]);
    expect(await clients()).toBe(500);
    // The same number, a week old and never authorized: they are cleared and the registration is accepted.
    await env.DB.prepare(`DELETE FROM "auth_oauth_client"`).run();
    await fill(500, new Date(Date.now() - 7 * 86_400_000).toISOString());
    expect((await register("http://127.0.0.1:1")).status).toBe(201);
    expect(await clients()).toBe(1);
  });
});

describe("the auth schema", () => {
  it("is what Better Auth compiles from the options today: rerun scripts/auth-schema.ts if not", async () => {
    expect(await compile()).toEqual(SCHEMA);
  });
});
