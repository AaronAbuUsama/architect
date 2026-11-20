import { defineConfig } from "vitest/config";

// The fixture's own config, used only by test-totals.mjs, which points the totals tool at this folder as if it were e2e/.
export default defineConfig({ test: { include: ["**/*.test.ts"] } });
