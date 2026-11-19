// What the runtime does around a handler, cut from the wrapper's own source in the checkout. Each step is found by a
// line of its code, so when the code moves the page's line numbers follow; when the code is gone, this run fails.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { OpFacts, RuntimeStep, Step } from "./types.ts";

const SERVICE = "packages/language-effect/src/modules/handler/service.ts";
const MOVE = "packages/language-effect/src/modules/handler/internal/move.ts";

/** The order the wrapper runs them in. `find` is the first line; `to` the last, when the step spans several. */
const STEPS: ReadonlyArray<Step> = [
  { id: "decode", phase: "before", file: SERVICE, find: "decode(raw).pipe(", to: "new InvalidPayload", caption: "Reads the request against the payload you declared. A bad one is refused as InvalidPayload, before anything else.", when: () => [true, "every operation"] },
  { id: "access", phase: "before", file: SERVICE, find: "yield* Access.check(", caption: "Checks the caller may call, from who you allowed. A caller who may not is refused as NotAllowed, and leaves no trace of the handler.", when: (o) => (o.allowed.every((k) => k === "anyone") ? [false, "anyone may call it, so there is nothing to check"] : [true, `allowed: ${o.allowed.join(", ")}`]) },
  { id: "span", phase: "before", file: SERVICE, find: "spanned(name, { operation: name", caption: "Opens one trace span named after the operation, with the attempt number and who called.", when: () => [true, "every operation"] },
  { id: "replay", phase: "before", file: SERVICE, find: "const kept = key === undefined", to: "return yield* decodeAnswer(JSON.parse(kept))", caption: "The same request key from the same caller is one call: it answers what it answered before, and changes nothing.", when: (o) => (o.idempotent ? [true, `idempotent by ${o.idempotent}`] : [false, "not declared idempotent"]) },
  { id: "from", phase: "before", file: MOVE, find: "export const checkFrom", to: "if (!move.from.includes(state))", caption: "Checks the thing is in a state its move can start from. If not, it refuses with the machine's own error, before your code runs.", when: (o) => (!o.move ? [false, "it has no move"] : o.move.from.length === 0 ? [false, `its move ${o.move.key} starts from nothing, so there is no state to check`] : [true, `${o.move.key} starts from ${o.move.from.join(" or ")}`]) },
  { id: "steps", phase: "before", file: SERVICE, find: "const steps = Object.fromEntries(", to: "  );", caption: "Wraps each step you declared in its own span, so the trace shows where the time went.", when: (o) => (o.steps.length === 0 ? [false, "it declares no steps"] : [true, `steps: ${o.steps.join(", ")}`]) },
  { id: "handler", phase: "handler", file: SERVICE, find: "const answer = yield* busy.counted(handler(", caption: "Your handler runs here, given the payload, the caller, its steps and its move. Its work is counted.", when: () => [true, "every operation"] },
  { id: "answer", phase: "after", file: SERVICE, find: "const wire = yield* check(answer)", to: "Effect.orDie,", caption: "Checks the answer against the answer you declared. An answer that breaks it is the handler's bug, so the call fails loudly.", when: () => [true, "every operation"] },
  { id: "choose", phase: "after", file: MOVE, find: "export const chooseOutcome", to: "return outcome;", caption: "Checks the state the handler moved to is one the move declares.", when: (o) => (o.move ? [true, `${o.move.key} goes to ${o.move.to.join(" or ")}`] : [false, "it has no move"]) },
  { id: "apply", phase: "after", file: MOVE, find: "export const applyMove", to: "return { trace, operation: name", caption: "Sets the thing's new state and writes the event to the journal, picking the event's fields from the thing, the payload and the answer. Secret fields are left out.", when: (o) => (o.move ? [true, `writes ${o.move.emits ?? "its event"}`] : [false, "it has no move"]) },
  { id: "commit", phase: "after", file: SERVICE, find: "const committed = yield* store.commit(", to: "spanned(`${name}.commit`", caption: "Commits every write, the event and the request key together, once, in a span of its own.", when: () => [true, "every operation"] },
  { id: "retry", phase: "after", file: SERVICE, find: "const loop = (number: number)", to: "Effect.die(new Error(`${name} lost its version race", caption: "If someone else changed the thing first, nothing was committed, and the whole attempt runs again, up to 64 times.", when: () => [true, "every operation"] },
  { id: "refusal", phase: "after", file: SERVICE, find: "Effect.tapCause((cause) => {", to: "}),", caption: "Writes any refusal on the operation's span, with the log line that decided it, so prove can read it.", when: () => [true, "every operation"] },
  { id: "metrics", phase: "after", file: SERVICE, find: "measureCall(name, principal, callRefusals)", caption: "Counts the call and times it, by outcome.", when: () => [true, "every operation"] },
];

const cut = (m1Dir: string, step: Step) => {
  const lines = readFileSync(join(m1Dir, step.file), "utf8").split("\n");
  const start = lines.findIndex((l) => l.includes(step.find));
  if (start < 0) throw new Error(`${step.file}: no line has "${step.find}" any more; the runtime step "${step.id}" moved or changed`);
  const end = step.to === undefined ? start : lines.findIndex((l, i) => i >= start && l.includes(step.to!));
  if (end < 0) throw new Error(`${step.file}: after line ${start + 1}, no line has "${step.to}"`);
  return { line: start + 1, endLine: end + 1, code: lines.slice(start, end + 1) };
};

export const runtimeSteps = (m1Dir: string): ReadonlyArray<RuntimeStep> =>
  STEPS.map((s) => ({ id: s.id, phase: s.phase, caption: s.caption, file: s.file, ...cut(m1Dir, s) }));

/** Which steps run for one operation, and why or why not, from its model. */
export const stepsFor = (facts: OpFacts): ReadonlyArray<{ readonly id: string; readonly runs: boolean; readonly why: string }> =>
  STEPS.map((s) => {
    const [runs, why] = s.when(facts);
    return { id: s.id, runs, why };
  });
