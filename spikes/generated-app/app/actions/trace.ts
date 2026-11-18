// The shell's own action: one trace's spans and logs, and who the app called as if it made the call.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { callLog } from "../server/forman/acme.ts";
import { source } from "../server/forman/draw.ts";
import { callOf, waterfall } from "../server/forman/live.ts";
import { readModel } from "../server/forman/model.ts";

export default defineAction({
  description: "Read one trace by id from the local telemetry: its span tree with attributes (operation, principal.person, refusal, move, event), its logs, the call it was, and the app's call-log entry when the app made it.",
  schema: z.object({ id: z.string().regex(/^[0-9a-f]{32}$/).describe("32 hex characters") }),
  readOnly: true,
  run: async ({ id }) => {
    const t = source.find(id);
    if (!t) return { error: `no trace ${id} in ${source.stats().dir} (${source.stats().traces} traces read)` };
    return { ...waterfall(t), call: callOf(readModel(), t), appCall: (await callLog()).find((l) => l.trace === id) };
  },
});
