// An exit means one thing (K16 section g, M1.47): the CLI exits with a refusal's code, so a declared exit can't be one
// the runtime keeps for itself, can't be past what a shell reports as a code, and can't be another refusal's of the same
// thing (its other errors and its machine's). Exits are unique per thing, not per app: two machines both at 40 is fine.
import type { FromModel } from "../types.ts";

/** Exits the runtime keeps, and whose they are. */
export const RESERVED_EXITS: ReadonlyMap<number, string> = new Map([
  [0, "success"], [1, "a defect"], [2, "InvalidPayload"], [3, "NotAllowed"], [4, "NotFound"],
]);
const LOWEST = 5;
const HIGHEST = 125;

type ThingExits = {
  readonly errors: Readonly<Record<string, { readonly exit: number }>>;
  readonly machine: { readonly notFrom: { readonly error: string; readonly exit: number } } | null;
  readonly from: FromModel;
};

/** One problem per declared exit that clashes, naming the error, its exit, whose it is, and the errors file. */
export const exitClashes = (things: Readonly<Record<string, ThingExits>>): ReadonlyArray<string> =>
  Object.entries(things).flatMap(([thing, t]) => {
    const file = t.from.kind !== "app" ? `${t.from.package}/blueprint/things/${t.from.thing}/errors.js` : `blueprint/things/${thing}/errors.ts`;
    const taken = new Map<number, string>(t.machine ? [[t.machine.notFrom.exit, t.machine.notFrom.error]] : []);
    return Object.entries(t.errors).flatMap(([name, { exit }]) => {
      // A thing's own declared `<Thing>NotFound` may keep the not-found exit: it is that refusal.
      const reserved = exit === 4 && name.endsWith("NotFound") ? undefined : RESERVED_EXITS.get(exit);
      const owner = reserved ?? taken.get(exit);
      if (owner === undefined && !taken.has(exit)) taken.set(exit, name);
      if (owner !== undefined) return [`${file}: ${name}'s exit ${exit} is ${owner}'s; pick another`];
      if (exit < LOWEST || exit > HIGHEST) return [`${file}: ${name}'s exit ${exit} is outside ${LOWEST} to ${HIGHEST}, the exits a refusal may use; pick another`];
      return [];
    });
  });
