import { defineConfig } from "vitest/config";

// The break attempts: no worlds, no ports. Each file is run by itself and is expected to behave as the README says.
export default defineConfig({ test: { include: ["*.break.ts"] } });
