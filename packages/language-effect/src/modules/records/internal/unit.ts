// One attempt at a call: reads go to the store and their versions are remembered; writes are held back, merged per
// instance, until the call commits them with its move.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import type { Instance, Store, Unit, Write } from "../types.ts";

type Held = { thing: Thing; id: string; kind: "insert" | "update"; version: number; fields: Record<string, unknown>; state: string | undefined };

export const makeUnit = (store: Store["Service"]): Effect.Effect<Unit> =>
  Effect.sync(() => {
    const read = new Map<Thing, Map<string, { instance: Instance; version: number } | undefined>>();
    const held: Array<Held> = [];
    const heldFor = (thing: Thing, id: string) => held.find((h) => h.thing === thing && h.id === id);
    const seen = (thing: Thing) => read.get(thing) ?? read.set(thing, new Map()).get(thing)!;

    const load = (thing: Thing, id: string) =>
      Effect.gen(function* () {
        const cache = seen(thing);
        if (!cache.has(id)) cache.set(id, yield* store.find(thing, id));
        return cache.get(id);
      });

    const find = (thing: Thing, id: string) =>
      Effect.gen(function* () {
        const stored = yield* load(thing, id);
        const h = heldFor(thing, id);
        if (!h) return stored?.instance;
        const base = h.kind === "insert" ? {} : (stored?.instance ?? {});
        return { ...base, ...h.fields, ...(h.state !== undefined ? { state: h.state } : {}) } as Instance;
      });

    const change = (thing: Thing, id: string, fields: Record<string, unknown>, state: string | undefined) =>
      Effect.gen(function* () {
        const h = heldFor(thing, id);
        if (h) {
          Object.assign(h.fields, fields);
          if (state !== undefined) h.state = state;
          return;
        }
        const stored = yield* load(thing, id);
        if (!stored) return yield* Effect.die(new Error(`${id} can't change: it was never stored`));
        held.push({ thing, id, kind: "update", version: stored.version, fields: { ...fields }, state });
      });

    return {
      records: {
        find,
        insert: (thing, fields, state) =>
          Effect.sync(() => {
            const id = String((fields as Record<string, unknown>)["id"]);
            held.push({ thing, id, kind: "insert", version: 0, fields: { ...(fields as Record<string, unknown>) }, state });
          }),
        update: (thing, id, changes) => change(thing, id, changes as Record<string, unknown>, undefined),
      },
      read: find,
      setState: (thing, id, state) => change(thing, id, {}, state),
      writes: Effect.sync(() =>
        held.map((h): Write =>
          h.kind === "insert"
            ? { kind: "insert", thing: h.thing, fields: h.fields, state: h.state }
            : { kind: "update", thing: h.thing, id: h.id, version: h.version, changes: h.fields, state: h.state },
        ),
      ),
    };
  });
