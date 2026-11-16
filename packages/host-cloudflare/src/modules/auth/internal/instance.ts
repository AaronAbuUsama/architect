import { betterAuth } from "better-auth";
import type { AuthInstance, AuthOptions } from "../types.ts";
import { optionsFor } from "./options.ts";
import { SCHEMA } from "./schema.ts";

const make = (o: AuthOptions) => betterAuth({ ...optionsFor(o.cli ?? "cli"), database: o.db, secret: o.secret, baseURL: "http://architect.local" });
export type BetterAuth = ReturnType<typeof make>;

interface Held extends AuthInstance {
  /** Better Auth checks its tables the moment it is made, so it is made only once they exist. */
  readonly auth: () => Promise<BetterAuth>;
}

export const instance = (o: AuthOptions): AuthInstance => {
  let auth: Promise<BetterAuth> | undefined;
  const held: Held = {
    kind: "auth-d1",
    auth: () => (auth ??= o.db.batch(SCHEMA.map((s) => o.db.prepare(s))).then(() => make(o))),
  };
  return held;
};

export const held = (a: AuthInstance) => a as Held;

/** Better Auth's refusals carry the HTTP status they would answer with. */
export const statusOf = (e: unknown): number | undefined =>
  typeof e === "object" && e !== null && "statusCode" in e && typeof e.statusCode === "number" ? e.statusCode : undefined;
