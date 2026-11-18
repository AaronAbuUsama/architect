import type { Model } from "@orthograph/compiler";

/** The human form: one line per thing and operation, so a glance shows what the blueprint declares. */
export const summary = (model: Model): string =>
  [
    ...Object.values(model.things).map(
      (t) => `thing ${t.name}${t.machine ? ` (${t.machine.states.join(", ")})` : ""}  ${t.hash}`,
    ),
    ...Object.values(model.operations).map(
      (o) => `operation ${o.name}  refuses ${o.refusals.join(", ") || "nothing"}  ${o.hash}`,
    ),
    ...Object.entries(model.blanks ?? {}).map(([owner, parts]) => `unfinished ${owner}  ${parts.length} blank${parts.length === 1 ? "" : "s"}`),
  ].join("\n") + "\n";
