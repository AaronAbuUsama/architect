// Scaffolded from blueprint/things/link/verbs/remove.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/link/remove.handler.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { PageRecords } from "#modules/page/service.js";

const remove: Handler = ({ link }, { principal, steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const person = yield* PageRecords.signedInPerson(principal);
    const profile = yield* PageRecords.profileId(person);
    yield* steps.record(Effect.gen(function* () {
      const page = yield* PageRecords.find(Profile, profile);
      if (!page) return yield* Effect.die(new Error("the link's owner has no stored profile"));
      yield* records.update(Profile, profile, { links: page.links.filter((id) => id !== link) });
    }));
    yield* move();
    return {};
  });

export default remove;
