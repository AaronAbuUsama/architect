import { Effect, Layer } from "effect";
import type { Thing } from "@architect/blueprint";
import { Records, type Instance } from "./types.ts";

/** Records held in memory, for tests of roles and reads. */
export const recordsMemory = (initial: ReadonlyArray<readonly [Thing, Instance]>) => {
  const rows = [...initial];
  return Layer.succeed(Records, Records.of({
    find: (thing, id) => Effect.succeed(rows.find(([t, r]) => t === thing && r["id"] === id)?.[1]),
    insert: (thing, fields, state) => Effect.sync(() => void rows.push([thing, { ...(fields as Instance), ...(state ? { state } : {}) }])),
  }));
};

/** The one thing a `thing.ts` module exports, whatever its export is called. */
export const thingIn = (module: Readonly<Record<string, unknown>>): Thing => {
  const found = Object.values(module).find((x) => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "thing");
  return found as Thing;
};
