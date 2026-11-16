import type { Model } from "@architect/compiler";

/** The human form: one line per thing and operation, so a glance shows what the blueprint declares. */
export const summary = (model: Model): string =>
  [
    ...Object.values(model.things).map(
      (t) => `thing ${t.name}${t.machine ? ` (${t.machine.states.join(", ")})` : ""}  ${t.hash}`,
    ),
    ...Object.values(model.operations).map(
      (o) => `operation ${o.name}  refuses ${o.refusals.join(", ") || "nothing"}  ${o.hash}`,
    ),
  ].join("\n") + "\n";
