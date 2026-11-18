// Scaffolded from blueprint/things/link/verbs/order.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/link/order.handler.ts";
import { LinkAlreadyRemoved } from "../../blueprint/things/link/errors.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { PageRecords } from "#modules/page/service.js";

const order: Handler = ({ link, position }, { principal, steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const person = yield* PageRecords.signedInPerson(principal);
    const profile = yield* PageRecords.profileId(person);
    const page = yield* steps.load(PageRecords.find(Profile, profile));
    if (!page?.links.includes(link)) {
      yield* Effect.logInfo("the link is no longer on the profile");
      return yield* new LinkAlreadyRemoved({});
    }

    const links = page.links.filter((id) => id !== link);
    links.splice(Number(position), 0, link);
    yield* steps.record(records.update(Profile, profile, { links }));
    return {};
  });

export default order;
