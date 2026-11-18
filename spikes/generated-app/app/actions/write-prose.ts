// The shell's own action: write a page's prose, pinned to the declaration's current hash. "Still true" re-pins it unchanged.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { findPage } from "../server/forman/draw.ts";
import { readModel } from "../server/forman/model.ts";
import { hashOf, readProse, writeProse } from "../server/forman/prose.ts";

export default defineAction({
  description: "Write the prose of a generated page (pinned to its declaration's current hash), or mark existing prose still true (stillTrue: re-pin it to the new hash without changing it). The agent's writing is marked by: agent.",
  schema: z.object({ path: z.string(), text: z.string().max(20000).optional(), stillTrue: z.boolean().optional() }),
  run: async ({ path, text, stillTrue }, ctx) => {
    const page = findPage(path);
    if (!page?.prose || !page.about) return { error: `${path} has no prose slot` };
    const hash = hashOf(readModel(), page.about);
    if (!hash) return { error: `${page.about} is no longer in the model` };
    const before = readProse(page.prose);
    const body = stillTrue ? before?.text : text;
    if (body === undefined) return { error: stillTrue ? "there is no prose to re-pin" : "give text or stillTrue" };
    writeProse(page.prose, page.about, hash, stillTrue ? (before?.by ?? "person") : ctx?.caller === "agent" ? "agent" : "person", body);
    return { file: page.prose, pinned: `${page.about}@${hash}` };
  },
});
