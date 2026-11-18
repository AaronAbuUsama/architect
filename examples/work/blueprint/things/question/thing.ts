import { Blueprint } from "orthograph";
import { Mission } from "../mission/thing.ts";
import { Note, Options, Subject, Title } from "../../values/work.ts";

// Intake (F4 8.6): the manager asks about the blueprint's gaps, one at a time, as lettered choices.
export const Question = Blueprint.thing({
  description: "Something the manager needs you to decide before the mission starts, taken from a gap in the blueprint.",
  fields: { id: Blueprint.id("qst"), mission: Mission.fields.id, asks: Title, about: Subject, gap: Note, options: Options },
});
