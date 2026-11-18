// The Worker's side of an entity: name it from the thing's table and the instance id, then find or commit over RPC.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import type { Commit, Instance, Stored } from "@orthograph/language-effect";
import type { EntityApi, EntityWrite } from "#modules/entities/types.js";
import { decodeRow, encodeFields } from "./rows.ts";

const stubOf = (entities: DurableObjectNamespace, table: string, id: string) =>
  entities.get(entities.idFromName(`${table}:${id}`)) as unknown as { [K in keyof EntityApi]: (...a: Parameters<EntityApi[K]>) => Promise<ReturnType<EntityApi[K]>> };

export const entityFind = (entities: DurableObjectNamespace, thing: Thing, table: string, id: string): Effect.Effect<Stored | undefined> =>
  Effect.gen(function* () {
    const found = yield* Effect.promise(() => stubOf(entities, table, id).find());
    if (!found) return undefined;
    const { instance } = yield* decodeRow(thing, { ...found.row, ...(found.state !== null ? { state: found.state } : {}) });
    return { instance, version: found.version };
  });

/** An entity commit: every write is to one instance, because one entity owns one instance (D2 #38). */
export const entityCommit = (entities: DurableObjectNamespace, { writes, entries }: Commit, tableOf: (thing: Thing) => string) =>
  Effect.gen(function* () {
    const ids = new Set(writes.map((w) => (w.kind === "insert" ? String(w.fields["id"]) : w.id)));
    if (ids.size !== 1) return yield* Effect.die(new Error("an entity commit writes exactly one instance"));
    const first = writes[0]!;
    const id = [...ids][0]!;
    const wire = yield* Effect.forEach(writes, (w): Effect.Effect<EntityWrite> =>
      w.kind === "insert"
        ? Effect.map(encodeFields(w.thing, w.fields as Instance, false), (row) => ({ kind: "insert", row, state: w.state ?? null }))
        : Effect.map(encodeFields(w.thing, w.changes as Instance, true), (changes) => ({ kind: "update", version: w.version, changes, state: w.state ?? null })),
    );
    const journal = entries.map((e) => ({ ...e, fields: JSON.stringify(e.fields) }));
    return yield* Effect.promise(() => stubOf(entities, tableOf(first.thing), id).commit(wire, journal));
  });
