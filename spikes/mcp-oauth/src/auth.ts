import { betterAuth } from "better-auth"
import { baseOptions } from "./auth-options.ts"

export interface Env {
  readonly DB: D1Database
  readonly BETTER_AUTH_SECRET: string
}

/** Built per request: `env` (the D1 binding) only exists inside a request. */
export const makeAuth = (env: Env, origin: string) =>
  betterAuth({
    ...baseOptions,
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: origin,
    rateLimit: { enabled: false }
  })

export type Auth = ReturnType<typeof makeAuth>
