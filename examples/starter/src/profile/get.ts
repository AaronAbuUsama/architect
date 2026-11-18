// Scaffolded from blueprint/things/profile/verbs/get.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/profile/get.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";
import { Link } from "../../blueprint/things/link/thing.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { ProfileNotFound } from "../../blueprint/things/profile/errors.ts";
import { PageRecords } from "#modules/page/service.js";

const load = (name: string) =>
  Effect.gen(function* () {
    const id = yield* PageRecords.handleId(name);
    const named = yield* PageRecords.find(Handle, id);
    if (named?.state !== "claimed") return;
    const profile = yield* PageRecords.profileId(named.owner);
    const page = yield* PageRecords.find(Profile, profile);
    if (page?.status !== "active" || page.handle !== id) return;
    return yield* Effect.forEach(page.links, (id) =>
      Effect.gen(function* () {
        const link = yield* PageRecords.find(Link, id);
        if (!link) return yield* Effect.die(new Error("the profile refers to a missing link"));
        return { id: link.id, title: link.title, url: link.url };
      }));
  });

const get: Handler = ({ handle }, { steps }) =>
  Effect.gen(function* () {
    const links = yield* steps.load(load(handle));
    if (!links) {
      yield* Effect.logInfo("there is no public profile at the name");
      return yield* new ProfileNotFound({});
    }
    return { handle, links };
  });

export default get;
