import { Blueprint } from "@formants/forman";
import { Attention } from "./thing.ts";
import { Note } from "../../values/work.ts";

export const AttentionRaised = Blueprint.event({ attention: Attention.fields.id, mission: Attention.fields.mission, kind: Attention.fields.kind, task: Attention.fields.task });
export const AttentionApproved = Blueprint.event({ attention: Attention.fields.id });
export const AttentionDeclined = Blueprint.event({ attention: Attention.fields.id, why: Note });
