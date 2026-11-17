import { defineConfig } from "vitest/config";

// Stage four owns its explicit ports. No earlier gate's sweeping global teardown is imported.
export default defineConfig({
  test: { include: ["layer3/**/*.test.ts"], maxWorkers: 1, testTimeout: 300_000, hookTimeout: 300_000 },
});
