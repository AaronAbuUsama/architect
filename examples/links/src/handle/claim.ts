// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/claim.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";
import { HandleAlreadyOwned, HandleTaken } from "../../blueprint/things/handle/errors.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { find, handleId, profileId, signedInPerson } from "../modules/page/internal/records.ts";

const claim: Handler = ({ name }, { principal, steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const owner = yield* signedInPerson(principal);
    const handle = yield* handleId(name);
    const profile = yield* profileId(owner);
    const [named, page] = yield* steps.load(Effect.all([find(Handle, handle), find(Profile, profile)]));
    if (named?.state === "claimed") {
      yield* Effect.logInfo("the name has already been claimed");
      return yield* new HandleTaken({});
    }
    if (page?.status === "active") {
      yield* Effect.logInfo("the person already has a claimed name");
      return yield* new HandleAlreadyOwned({});
    }

    yield* steps.record(Effect.gen(function* () {
      if (named) yield* records.update(Handle, handle, { owner });
      else yield* records.insert(Handle, { id: handle, name, owner });

      if (page) yield* records.update(Profile, profile, { handle, status: "active" });
      else yield* records.insert(Profile, { id: profile, handle, owner, status: "active", links: [] });
    }));
    yield* move();
    return { handle };
  });

export default claim;
