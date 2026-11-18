import { Effect, Layer } from "effect";
import type { Thing } from "orthograph";
import type { Entry } from "#modules/journal/types.js";
import { Journal } from "#modules/journal/types.js";
import { journalOf } from "#modules/journal/service.js";
import { Records, Store, type Instance, type UnitApi } from "./types.ts";
import { makeUnit } from "./internal/unit.ts";

export const Unit: UnitApi = { make: makeUnit };

/** A store and journal held in memory, for tests: the same versions and the same all-or-nothing commit as a host's. */
export const storeMemory = (initial: ReadonlyArray<readonly [Thing, Instance]> = []) => {
  const rows = initial.map(([thing, instance]) => ({ thing, instance, version: 0 }));
  const entries: Array<Entry> = [];
  const requests = new Map<string, string>();
  const at = (thing: Thing, id: unknown) => rows.findIndex((r) => r.thing === thing && r.instance["id"] === id);
  const store = Store.of({
    find: (thing, id) => Effect.sync(() => {
      const r = rows[at(thing, id)];
      return r && { instance: r.instance, version: r.version };
    }),
    list: ({ thing, where, state, order, limit, after }) => Effect.sync(() => {
      // A row's place in `rows` is the order it was made in, and its cursor.
      const ordered = rows.flatMap((r, i) => (r.thing === thing ? [{ r, i }] : []));
      const matching = (order === "newest" ? ordered.reverse() : ordered).filter(({ r, i }) =>
        Object.entries(where).every(([k, v]) => String(r.instance[k]) === String(v))
        && (state === undefined || r.instance.state === state)
        && (after === undefined || (order === "newest" ? i < Number(after) : i > Number(after))));
      const page = matching.slice(0, limit);
      return { items: page.map(({ r }) => r.instance), next: matching.length > limit ? String(page[page.length - 1]!.i) : null };
    }),
    answered: (key) => Effect.sync(() => requests.get(key)),
    commit: ({ writes, entries: events, request }) =>
      Effect.sync(() => {
        const stale = writes.some((w) => w.kind === "update" && rows[at(w.thing, w.id)]?.version !== w.version);
        if (stale || (request && requests.has(request.key))) return "conflict" as const;
        if (request) requests.set(request.key, request.answer);
        for (const w of writes) {
          if (w.kind === "insert") rows.push({ thing: w.thing, instance: { ...w.fields, ...(w.state ? { state: w.state } : {}) }, version: 0 });
          else {
            const r = rows[at(w.thing, w.id)]!;
            r.instance = { ...r.instance, ...w.changes, ...(w.state ? { state: w.state } : {}) };
            r.version += 1;
          }
        }
        entries.push(...events);
        return "committed" as const;
      }),
  });
  const journal = journalOf(entries);
  return { entries, rows, layer: Layer.mergeAll(Layer.succeed(Store, store), Layer.succeed(Journal, journal)) };
};

/** `Records` over an in-memory store, outside any call: for tests of roles and reads. */
export const recordsMemory = (initial: ReadonlyArray<readonly [Thing, Instance]>) =>
  Layer.effect(Records, Effect.gen(function* () {
    const store = yield* Store;
    return (yield* makeUnit(store)).records;
  })).pipe(Layer.provide(storeMemory(initial).layer));

/** The one thing a `thing.ts` module exports, whatever its export is called. */
export const thingIn = (module: Readonly<Record<string, unknown>>): Thing => {
  const found = Object.values(module).find((x) => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "thing");
  return found as Thing;
};
