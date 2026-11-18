import { Blueprint } from "@architect/blueprint";
import { Mission } from "../mission/thing.ts";
import { AttentionKind, Note, TaskKey, Title } from "../../values/work.ts";

// The only way a question reaches you once a mission runs. What stays yours (F4 8.10): promoting to production, money past
// the cap, credentials.
export const Attention = Blueprint.thing({
  description: "Something waiting on you: a promote, money past the cap, a credential, a question mid-mission.",
  fields: { id: Blueprint.id("att"), mission: Mission.fields.id, kind: AttentionKind, title: Title, why: Note, task: TaskKey },
});
