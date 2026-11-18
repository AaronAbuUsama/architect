import type { BriefApi, Briefed } from "./types.ts";

const forbidden = [
  "blueprint/**", "blueprint/journeys/**", "blueprint/starting-worlds/**", "journeys/**", "generated/**", "test/**",
] as const;

/** The nine evals, in their numbered order, as prove prints them. */
const EVALS = ["answer shape", "declared errors", "machine path", "events", "who may call", "steps", "performance", "coverage", "explainability"];

const of: BriefApi["of"] = (model, name, journeys): Briefed => {
  const op = model.operations[name];
  if (!op || op.kind !== "operation") return { unknown: `${name} is not an operation with a handler: ${Object.values(model.operations).filter((o) => o.kind === "operation").map((o) => o.name).join(", ")}` };
  const thing = model.things[op.thing]!;
  const own = `things/${op.thing}/verbs/${op.verb}.ts`;
  const calling = journeys.filter((j) => j.text.includes(own)).map((j) => j.path);
  const declared = op.errors.map((e) => `${e} (exit ${thing.errors[e]?.exit ?? "?"})`);
  const runtime = op.refusals.filter((r) => !op.errors.includes(r));
  return {
    lines: [
      `brief ${name}`,
      "",
      `Write   src/${op.thing}/${op.verb}.ts, and nothing else.`,
      "",
      "Read",
      `  ${op.file}  the declaration: payload, answer, move, steps, errors`,
      `  generated/api/src/${op.thing}/${op.verb}.handler.ts  what the handler is given and may return`,
      `  generated/docs/${op.thing}/${op.verb}.md  the same, in words, with every refusal`,
      `  generated/docs/${op.thing}/index.md  the ${op.thing}: fields, machine, roles`,
      "",
      "Do",
      ...Object.values(op.steps).map((s) => `  run step ${s.name} (${s.type}) through steps.${s.name.split(".").pop()}(...)`),
      ...(op.move ? [`  make the move with move(${op.move.to.length > 1 ? op.move.to.map((t) => `"${t}"`).join(" | ") : ""}): ${op.move.key}, emitting ${op.move.emits}`] : []),
      ...(declared.length ? [`  refuse with ${declared.join(", ")}, each after an Effect.logInfo saying why`] : []),
      ...(runtime.length ? [`  never refuse ${runtime.join(" or ")} yourself: the runtime does, before the handler runs`] : []),
      "",
      "Don't touch",
      ...forbidden.map((f) => `  ${f}`),
      "",
      "Done when",
      `  forman prove --env local passes, with ${name}'s 9 evals: ${EVALS.join(", ")}`,
      ...(calling.length ? [`  and the journeys that call it: ${calling.join(", ")}`] : [`  (no journey calls ${name} yet: coverage will fail until one does)`]),
      "  forman check passes",
    ],
  };
};

export const Brief: BriefApi = { of, forbidden };
