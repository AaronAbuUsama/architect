import { defineConfig } from "vitest/config";

// The ratchet's own unit test: pure logic, no worlds, no teardown.
export default defineConfig({ test: { include: ["ratchet/**/*.test.ts"], testTimeout: 30_000 } });
