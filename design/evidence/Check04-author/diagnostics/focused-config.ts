import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { include: ["layer2/04-promotion.test.ts"], setupFiles: [fileURLToPath(new URL("./check04-get-diagnostics.ts", import.meta.url))],
    maxWorkers: 1, testTimeout: 1_500_000, hookTimeout: 1_200_000 },
});
