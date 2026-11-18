// Scaffolded from blueprint/things/link/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/link/add.handler.ts";
import { Link } from "../../blueprint/things/link/thing.ts";
import { LinkNeedsHandle } from "../../blueprint/things/link/errors.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { find, profileId, signedInPerson } from "../modules/page/internal/records.ts";

const add: Handler = ({ title, url }, { principal, steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const owner = yield* signedInPerson(principal);
    const profile = yield* profileId(owner);
    const page = yield* steps.load(find(Profile, profile));
    if (page?.status !== "active") {
      yield* Effect.logInfo("the person needs a claimed name before adding links");
      return yield* new LinkNeedsHandle({});
    }

    const link = yield* Ids.of(Link.fields.id);
    yield* steps.record(Effect.gen(function* () {
      yield* records.insert(Link, { id: link, owner, title, url });
      yield* records.update(Profile, profile, { links: [...page.links, link] });
    }));
    yield* move();
    return { link };
  });

export default add;
