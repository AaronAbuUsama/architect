import { betterAuth } from "better-auth"
import { baseOptions } from "./auth-options.ts"
import * as pbkdf2 from "./hasher.ts"

export interface AuthEnv {
  readonly DB: D1Database
  readonly BETTER_AUTH_SECRET: string
  readonly PASSWORD_HASH?: string
}

/** Built per request: `env` (the D1 binding) only exists inside a request. */
export const makeAuth = (env: AuthEnv, origin: string) =>
  betterAuth({
    ...baseOptions,
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    rateLimit: { enabled: false },
    emailAndPassword: {
      enabled: true,
      ...(env.PASSWORD_HASH === "pbkdf2" ? { password: { hash: pbkdf2.hash, verify: pbkdf2.verify } } : {})
    }
  })

export type Auth = ReturnType<typeof makeAuth>
