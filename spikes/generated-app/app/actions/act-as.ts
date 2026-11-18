// The shell's own action: who the app calls acme as, from the local world's cast (F6 #4).
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { actAs, actingAs, CAST, people } from "../server/forman/acme.ts";

export default defineAction({
  description: "Choose which member of acme's local cast the app calls acme as: ada (owns the organisation), olga (holds the allowance), bob (an outsider), or nobody. Without a name, says who it is now and lists the cast's person ids.",
  schema: z.object({ name: z.enum([...CAST, "nobody"]).optional() }),
  run: async ({ name }) => {
    if (name) await actAs(name === "nobody" ? null : name);
    return { actingAs: (await actingAs()) ?? "nobody", cast: await people().catch((e) => ({ error: String(e?.message ?? e) })) };
  },
});
