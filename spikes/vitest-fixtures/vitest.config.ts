import { defineConfig } from "vitest/config";

// The same limits as e2e/vitest.climb.config.ts: real worlds, one file at a time, room to finish.
export default defineConfig({
  test: { include: ["climb.spike.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 },
});
