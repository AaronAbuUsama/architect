// Better Auth as Architect uses it: identity only (people, sessions, accounts, API keys), on D1, with Architect ids
// and every table under `auth_`, so no thing's table can collide with it. Organizations stay the project's own things.
import type { BetterAuthOptions } from "better-auth";
import { bearer } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";

const PREFIXES: Readonly<Record<string, string>> = { user: "per", session: "ses", account: "acc", verification: "ver", apikey: "key" };
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** 16 lowercase base36 characters, rejection-sampled so none is likelier than another. */
const suffix = (): string => {
  let out = "";
  while (out.length < 16) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < 252 && out.length < 16) out += ALPHABET[b % 36];
  return out;
};

/** API keys start `ak_`, so a bearer credential says which kind it is. */
export const KEY_PREFIX = "ak_";

export const options = {
  emailAndPassword: { enabled: true },
  user: { modelName: "auth_user" },
  session: { modelName: "auth_session" },
  account: { modelName: "auth_account" },
  verification: { modelName: "auth_verification" },
  advanced: { database: { generateId: ({ model }: { model: string }) => `${PREFIXES[model] ?? model.slice(0, 3)}_${suffix()}` } },
  rateLimit: { enabled: false },
  plugins: [bearer(), apiKey({ enableSessionForAPIKeys: true, defaultPrefix: KEY_PREFIX, schema: { apikey: { modelName: "auth_apikey" } } })],
} satisfies Omit<BetterAuthOptions, "database" | "secret">;
