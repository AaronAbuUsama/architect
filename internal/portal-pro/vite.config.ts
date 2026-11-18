import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import blueprint from "../../examples/acme/generated/portal/blueprint.json";
import readProof from "./actions/read-proof.ts";
import { workspaceActions } from "./actions/workspace.ts";
import { portalAgent } from "./src/modules/agent/service.ts";
import type { OperationsBlueprint } from "./src/modules/operations/types.ts";

export default defineConfig({
  plugins: [tailwindcss(), portalAgent(blueprint as OperationsBlueprint,
    fileURLToPath(new URL("./public/capture.json", import.meta.url)),
    fileURLToPath(new URL("./extensions", import.meta.url)), {
      "read-proof": readProof,
      ...workspaceActions(fileURLToPath(new URL("../../examples/acme/blueprint/things", import.meta.url))),
    })],
  server: { host: "127.0.0.1", port: 45679, strictPort: true },
  preview: { host: "127.0.0.1" },
});
