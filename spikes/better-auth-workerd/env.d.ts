declare namespace Cloudflare {
  interface Env {
    DB: D1Database
    BETTER_AUTH_SECRET: string
    /** "scrypt" (Better Auth default) or "pbkdf2" (cheap WebCrypto hasher for local/test). */
    PASSWORD_HASH?: string
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[]
  }
}
