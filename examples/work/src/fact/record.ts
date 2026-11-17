// Scaffolded from blueprint/things/fact/verbs/record.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import { Fact } from "../../blueprint/things/fact/thing.ts";
import type { Handler } from "../../generated/api/src/fact/record.handler.ts";

const record: Handler = (payload, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const fact = yield* Ids.of(Fact.fields.id);
    yield* steps.insert(records.insert(Fact, { id: fact, ...payload }));
    return { fact };
  });

export default record;
