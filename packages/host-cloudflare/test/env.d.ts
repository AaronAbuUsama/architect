declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    WORLD: DurableObjectNamespace;
    WORLD_SECRET: string;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
