import { betterAuth } from "better-auth";
import { bearer, organization } from "better-auth/plugins";

export const makeAuth = (db: D1Database, secret: string, origin: string) =>
  betterAuth({
    database: db,
    secret,
    baseURL: origin,
    rateLimit: { enabled: false },
    emailAndPassword: { enabled: true },
    plugins: [bearer(), organization({ requireEmailVerificationOnInvitation: false })],
  });
