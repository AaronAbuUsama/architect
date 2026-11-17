import { Blueprint, Schema } from "@architect/blueprint";
import { Digest, Environment, Note, Subject } from "../../values/work.ts";

// SPIKE ONLY (spikes/work-real). Stands in for the logbook's facts until work can read them through a declared
// dependency (L3.01). What is fed here is real: acme's compiled model and its `architect prove` output.
export const Fact = Blueprint.thing({
  description: "Something true about a subject of the project's blueprint: compiled, an eval's result, or a verdict.",
  fields: {
    id: Blueprint.id("fct"),
    subject: Subject,
    kind: Blueprint.value(Schema.Literals(["compiled", "eval", "verdict"])),
    env: Environment,
    result: Blueprint.value(Schema.Literals(["pass", "fail", "info"])),
    note: Note,
    revision: Digest,
  },
  code: "FA",
});
