// Scaffolded from blueprint/things/handle/verbs/release.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/handle/release.handler.ts";
import { Profile } from "../../blueprint/things/profile/thing.ts";
import { PageRecords } from "#modules/page/service.js";

const release: Handler = (_payload, { principal, steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const owner = yield* PageRecords.signedInPerson(principal);
    const profile = yield* PageRecords.profileId(owner);
    yield* steps.record(records.update(Profile, profile, { status: "hidden" }));
    yield* move();
    return {};
  });

export default release;
