// The shell's own action, hand-written once in the template: a page of the tree, drawn (blocks resolved). The UI and the chat read the same thing.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { drawPage } from "../server/forman/draw.ts";

export default defineAction({
  description:
    "Read one page of the project's app as it is drawn now: its model blocks (from today's model), its live blocks (from the local Collector's telemetry), and its prose with whether it is stale. Paths: /live, /environments, /<thing>, /<thing>/<verb>, /<thing>/machine, /<thing>/events/<Event>, /<thing>/errors/<Error>, /<thing>/roles/<role>.",
  schema: z.object({
    path: z.string().describe("The page path, e.g. /allowance/spend"),
    windowMin: z.number().int().min(1).max(1440).optional().describe("Minutes of telemetry to read (default 30)"),
    trace: z.string().optional().describe("A trace id to show in the page's trace block"),
  }),
  readOnly: true,
  run: async ({ path, windowMin, trace }) => (await drawPage(path, { windowMin: windowMin ?? 30, trace }, Date.now())) ?? { error: `no page ${path}` },
});
