// The shell's own action: the page tree (generated from the model), plus prose whose declaration is gone.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { tree } from "../server/forman/draw.ts";

export default defineAction({
  description: "List every page of the project's app: one per declaration (things, operations, machines, events, errors, roles), Live and Environments, and orphaned prose.",
  schema: z.object({}),
  readOnly: true,
  run: async () => tree(),
});
