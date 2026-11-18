// The shell's own action: calls seen in telemetry, each joined to the app's call log, which names who the app called as.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { callLog } from "../server/forman/acme.ts";
import { scopedCalls } from "../server/forman/draw.ts";
import { readModel } from "../server/forman/model.ts";

export default defineAction({
  description:
    "Calls to the project's operations seen in the local telemetry, newest first. A call the app made itself carries calledAs (ada, olga or bob) from the app's call log; NotAllowed calls made elsewhere name nobody, because the role check refuses before the operation's span opens. Also returns the app's own call log.",
  schema: z.object({
    operation: z.string().optional().describe("e.g. allowance.spend"),
    outcome: z.enum(["answered", "refused", "defect"]).optional(),
    calledAs: z.enum(["ada", "olga", "bob"]).optional(),
    windowMin: z.number().int().min(1).max(1440).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  }),
  readOnly: true,
  run: async ({ operation, outcome, calledAs, windowMin, limit }) => {
    const all = await scopedCalls(readModel(), { windowMin: windowMin ?? 30 }, Date.now());
    const calls = all.filter((c) => (!operation || c.op === operation) && (!outcome || c.outcome === outcome) && (!calledAs || c.calledAs === calledAs)).sort((a, b) => b.at - a.at);
    const log = (await callLog()).filter((l) => (!operation || l.operation === operation) && (!calledAs || l.as === calledAs));
    return { window: `${windowMin ?? 30} min`, total: calls.length, calls: calls.slice(0, limit ?? 25), appCallLog: log.slice(0, limit ?? 25) };
  },
});
