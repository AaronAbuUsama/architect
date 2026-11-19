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
  readonly identifier: string;
  readonly errors: Readonly<Record<string, { readonly exit: number }>>;
  readonly machine: { readonly notFrom: { readonly error: string; readonly exit: number } } | null;
  readonly from: FromModel;
};

/** A thing's blueprint file, as the author sees it: in the app, or in the plugin it came from. */
export const fileOf = (thing: string, from: FromModel, file: string) =>
  from.kind !== "app" ? `${from.package}/blueprint/things/${from.thing}/${file}.js` : `blueprint/things/${thing}/${file}.ts`;

/**
 * A thing's declared `<Thing>NotFound` is the runtime's not-found refusal, which carries only the missing `id`: any other
 * field would be one nothing fills, so it is refused (K16, M1.46).
 */
export const notFoundShapes = (things: Readonly<Record<string, ThingExits & { readonly errors: Readonly<Record<string, { readonly fields: object }>> }>>) =>
  Object.entries(things).flatMap(([thing, t]) => {
    const name = `${t.identifier}NotFound`;
    const extra = Object.keys(t.errors[name]?.fields ?? {}).filter((f) => f !== "id");
    return extra.length === 0 ? [] : [`${fileOf(thing, t.from, "errors")}: ${name} is the runtime's not-found refusal, which carries only the missing id; drop ${extra.join(", ")}`];
  });

/** Whose a reserved or out-of-range exit is, or undefined when a refusal may use it. */
const unusable = (exit: number, mayBeNotFound: boolean): string | undefined =>
  mayBeNotFound && exit === 4 ? undefined
  : RESERVED_EXITS.has(exit) ? `${RESERVED_EXITS.get(exit)}'s`
  : exit < LOWEST || exit > HIGHEST ? `outside ${LOWEST} to ${HIGHEST}, the exits a refusal may use` : undefined;

/** One problem per declared exit that clashes, naming the error, its exit, whose it is, and the file declaring it. */
export const exitClashes = (things: Readonly<Record<string, ThingExits>>): ReadonlyArray<string> =>
  Object.entries(things).flatMap(([thing, t]) => {
    const file = fileOf(thing, t.from, "errors");
    const notFrom = t.machine?.notFrom;
    const machineBad = notFrom === undefined ? undefined : unusable(notFrom.exit, false);
    const taken = new Map<number, string>(notFrom ? [[notFrom.exit, notFrom.error]] : []);
    return [
      ...(notFrom && machineBad ? [`${fileOf(thing, t.from, "machine")}: ${notFrom.error}'s exit ${notFrom.exit} is ${machineBad}; pick another`] : []),
      ...Object.entries(t.errors).flatMap(([name, { exit }]) => {
        // Only the thing's own declared `<Thing>NotFound` may keep the not-found exit: it is that refusal.
        const bad = unusable(exit, name === `${t.identifier}NotFound`);
        const owner = taken.get(exit);
        if (owner === undefined) taken.set(exit, name);
        if (bad !== undefined) return [`${file}: ${name}'s exit ${exit} is ${bad}; pick another`];
        return owner !== undefined ? [`${file}: ${name}'s exit ${exit} is ${owner}'s; pick another`] : [];
      }),
    ];
  });
