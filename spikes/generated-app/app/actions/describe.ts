// The shell's own action: a declaration exactly as the model has it.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { readModel } from "../server/forman/model.ts";

export default defineAction({
  description: "Read a declaration from the project's model exactly as compiled: an operation (allowance.spend), a thing (allowance), an environment (local), or a refusal code list (refusals).",
  schema: z.object({ name: z.string().describe("allowance.spend, allowance, local, or refusals") }),
  readOnly: true,
  run: async ({ name }) => {
    const m = readModel();
    return m.operations[name] ?? m.things[name] ?? m.environments[name] ?? (name === "refusals" ? m.refusals : { error: `nothing named ${name} in the model`, operations: Object.keys(m.operations), things: Object.keys(m.things) });
  },
});
