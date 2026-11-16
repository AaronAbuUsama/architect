import { readFileSync } from "node:fs"
import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

const secret = /^BETTER_AUTH_SECRET=(.+)$/m.exec(readFileSync(path.join(import.meta.dirname, ".dev.vars"), "utf8"))![1]!

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"))
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, BETTER_AUTH_SECRET: secret, PASSWORD_HASH: "pbkdf2" } }
      })
    ],
    test: { include: ["test/**/*.test.ts"], setupFiles: ["./test/apply-migrations.ts"], testTimeout: 60000 }
  }
})
