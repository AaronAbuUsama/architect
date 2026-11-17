import { Clock, DateTime, Effect, Schema } from "effect";
import { AuthD1 } from "@architect/host-cloudflare";
import { Principals } from "@architect/target-effect";
import { getAddress, verifyMessage } from "viem";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { Refused, type Challenge, type Env, type Identity, type LinksApi } from "./types.ts";
import type { AuthInstance } from "@architect/host-cloudflare";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const Session = Schema.Struct({ user: Schema.Struct({ id: Schema.String, email: Schema.String }), session: Schema.Struct({ id: Schema.String }) });
const Wanted = Schema.Struct({ address: Schema.String, chain: Schema.Number, lifetimeMillis: Schema.optional(Schema.Number) });
const Completion = Schema.Struct({ challenge: Schema.String, message: Schema.String, signature: Schema.String });
const refuse = (reason: string, status = 401) => Effect.fail(new Refused({ reason, status }));
const tables = (db: D1Database) => Effect.promise(() => db.batch([
  db.prepare("CREATE TABLE IF NOT EXISTS spike_challenge (id TEXT PRIMARY KEY, message TEXT NOT NULL, person TEXT NOT NULL, session TEXT NOT NULL, address TEXT NOT NULL, chain INTEGER NOT NULL, expires INTEGER NOT NULL, claim TEXT)"),
  db.prepare("CREATE TABLE IF NOT EXISTS spike_wallet (address TEXT NOT NULL, chain INTEGER NOT NULL, person TEXT NOT NULL, PRIMARY KEY(address,chain))"),
]));

// Uses only public AuthD1 and Principals surfaces. No read of auth's private adapter or held instance.
const identity = (auth: AuthInstance, request: Request): Effect.Effect<Identity, Refused> =>
  Effect.gen(function* () {
    const response = yield* AuthD1.handle(auth, new Request(`${new URL(request.url).origin}/api/auth/get-session`, { headers: request.headers }));
    const body = yield* Effect.promise(() => response.json());
    const parsed = Schema.decodeUnknownOption(Session)(body);
    if (parsed._tag === "None") return yield* refuse("session-required");
    const principal = yield* Effect.flatMap(Principals, (p) => p.of(request.headers.get("authorization") ?? undefined)).pipe(Effect.provide(AuthD1.layer(auth)));
    if (principal.kind !== "person" || principal.person !== parsed.value.user.id) return yield* refuse("principal-mismatch");
    return { person: principal.person, session: parsed.value.session.id, email: parsed.value.user.email };
  });

const challenge = (env: Env, who: Identity, request: Request) =>
  Effect.gen(function* () {
    const wanted = yield* Effect.promise(() => request.json()).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Wanted)));
    if (wanted.chain !== 31337) return yield* refuse("chain-not-allowed", 400);
    const address = yield* Effect.try({ try: () => getAddress(wanted.address), catch: () => new Refused({ reason: "invalid-address", status: 400 }) });
    const now = yield* Clock.currentTimeMillis;
    const lifetime = wanted.lifetimeMillis ?? 60_000;
    if (!Number.isInteger(lifetime) || lifetime < 1 || lifetime > 60_000) return yield* refuse("invalid-lifetime", 400);
    const id = crypto.randomUUID();
    const origin = new URL(request.url);
    const expires = now + lifetime;
    const message = createSiweMessage({
      address, chainId: wanted.chain, domain: origin.host, scheme: origin.protocol.slice(0, -1),
      uri: `${origin.origin}/wallet/link`, version: "1", nonce: generateSiweNonce(), requestId: id,
      statement: "Link this wallet to the person and session that requested this challenge.",
      issuedAt: DateTime.toDateUtc(DateTime.makeUnsafe(now)), expirationTime: DateTime.toDateUtc(DateTime.makeUnsafe(expires)),
    });
    yield* Effect.promise(() => env.DB.prepare("INSERT INTO spike_challenge (id,message,person,session,address,chain,expires) VALUES (?,?,?,?,?,?,?)")
      .bind(id, message, who.person, who.session, address, wanted.chain, expires).run());
    return json({ challenge: id, message });
  });

const complete = (env: Env, who: Identity, request: Request) =>
  Effect.gen(function* () {
    const input = yield* Effect.promise(() => request.json()).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Completion)));
    const stored = yield* Effect.promise(() => env.DB.prepare("SELECT * FROM spike_challenge WHERE id=?").bind(input.challenge).first<Challenge>());
    if (!stored) return yield* refuse("unknown-challenge");
    if (stored.person !== who.person || stored.session !== who.session) return yield* refuse("identity-mismatch");
    if (stored.message !== input.message) return yield* refuse("message-mismatch");
    if (stored.claim !== null) return yield* refuse("replayed");
    const now = yield* Clock.currentTimeMillis;
    if (now >= stored.expires) return yield* refuse("expired");
    const valid = yield* Effect.tryPromise({
      try: () => verifyMessage({ address: getAddress(stored.address), message: input.message, signature: input.signature as `0x${string}` }),
      catch: () => new Refused({ reason: "invalid-signature", status: 401 }),
    });
    if (!valid) return yield* refuse("invalid-signature");
    const claim = crypto.randomUUID();
    const consumedAt = yield* Clock.currentTimeMillis;
    // D1 batch is transactional. A unique per-completion claim makes the insert conditional on winning the consume.
    const [consumed, , linked] = yield* Effect.promise(() => env.DB.batch([
      env.DB.prepare("UPDATE spike_challenge SET claim=? WHERE id=? AND person=? AND session=? AND claim IS NULL AND expires>? RETURNING id")
        .bind(claim, stored.id, who.person, who.session, consumedAt),
      env.DB.prepare("INSERT INTO spike_wallet (address,chain,person) SELECT address,chain,person FROM spike_challenge WHERE id=? AND claim=? ON CONFLICT(address,chain) DO NOTHING")
        .bind(stored.id, claim),
      env.DB.prepare("SELECT person FROM spike_wallet WHERE address=? AND chain=?").bind(stored.address, stored.chain),
    ]));
    if (consumed?.results.length !== 1) return yield* refuse("replayed");
    const owner = Schema.decodeUnknownOption(Schema.Struct({ person: Schema.String }))(linked?.results[0]);
    if (owner._tag === "None" || owner.value.person !== who.person) return yield* refuse("wallet-already-linked", 409);
    return json({ linked: true, person: who.person, session: who.session, address: stored.address, chain: stored.chain });
  });

const handle: LinksApi["handle"] = (env, auth, request) =>
  Effect.gen(function* () {
    yield* tables(env.DB);
    if (new URL(request.url).pathname === "/health") return json({ ok: true });
    const who = yield* identity(auth, request);
    const path = new URL(request.url).pathname;
    if (path === "/wallet/challenge" && request.method === "POST") return yield* challenge(env, who, request);
    if (path === "/wallet/link" && request.method === "POST") return yield* complete(env, who, request);
    if (path === "/me") {
      const wallets = yield* Effect.promise(() => env.DB.prepare("SELECT address,chain FROM spike_wallet WHERE person=? ORDER BY address,chain").bind(who.person).all<{ address: string; chain: number }>());
      return json({ ...who, wallets: wallets.results });
    }
    return json({ error: "not-found" }, 404);
  }).pipe(Effect.catchTag("Refused", (e) => Effect.succeed(json({ error: e.reason }, e.status))),
    Effect.catch(() => Effect.succeed(json({ error: "invalid-request" }, 400))),
    Effect.catchCause(() => Effect.succeed(json({ error: "internal" }, 500))));

export const Links: LinksApi = { handle };
