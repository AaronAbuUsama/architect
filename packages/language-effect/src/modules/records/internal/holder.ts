// Who holds a key: the one instance in a rule's scope with this key, as one call's writes leave it, else as the store has it.
import { Effect } from "effect";
import type { Thing } from "orthograph";
import { holds, ruleKey, type Rule } from "./unique.ts";
import type { Instance, Store } from "../types.ts";

/**
 * `holder(rule, row, except)`: the instance holding the key `row` fixes under the rule, leaving out the one named `except` (the row asking). The store's
 * candidates are asked for per state of the scope and judged as this call left them; then the rows this call wrote itself.
 */
export const holderOf = (
  store: Store["Service"],
  find: (thing: Thing, id: string) => Effect.Effect<Instance | undefined>,
  written: (thing: Thing) => ReadonlyArray<string>,
) => (rule: Rule, row: Instance, except: string | undefined): Effect.Effect<Instance | undefined> =>
  Effect.gen(function* () {
    const key = ruleKey(rule, row);
    const where = Object.fromEntries(rule.fields.map((f) => [f, row[f]]));
    for (const state of rule.scope ?? [undefined]) {
      // One more than asked for, so the row asking can be one of them and another still shows.
      const { items } = yield* store.list({ thing: rule.thing, where, state, order: "oldest", limit: except === undefined ? 1 : 2, after: undefined });
      for (const item of items) {
        if (String(item["id"]) === except) continue;
        const current = yield* find(rule.thing, String(item["id"]));
        if (current && holds(rule, current, key)) return current;
      }
    }
    for (const id of written(rule.thing)) {
      if (id === except) continue;
      const current = yield* find(rule.thing, id);
      if (current && holds(rule, current, key)) return current;
    }
    return undefined;
  });
