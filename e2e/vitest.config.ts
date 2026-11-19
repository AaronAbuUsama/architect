import { defineConfig } from "vitest/config";

// Every check runs real things (worlds on workerd, collectors and a registry as processes, an agent session): two at a
// time, each with room to finish.
export default defineConfig({ test: { globalSetup: ["layer1/teardown.ts"], maxWorkers: 2, testTimeout: 900_000, hookTimeout: 120_000 } });
