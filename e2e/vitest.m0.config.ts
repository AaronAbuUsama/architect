import { defineConfig } from "vitest/config";

// Gate M0's name check only reads the repository's tracked files: no Docker, no teardown, so none of layer 1's setup.
export default defineConfig({ test: { include: ["m0/**/*.test.ts"], testTimeout: 60_000 } });
