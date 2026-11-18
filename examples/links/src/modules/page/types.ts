import type { Effect } from "effect";
import type { Records } from "@orthograph/language-effect";
import type { InstanceOf, Principal, Thing, TypeOf } from "orthograph";
import type { Handle } from "../../../blueprint/things/handle/thing.ts";
import type { Person } from "../../../blueprint/things/person/thing.ts";
import type { Profile } from "../../../blueprint/things/profile/thing.ts";

export interface PageRecordsApi {
  readonly handleId: (name: string) => Effect.Effect<TypeOf<typeof Handle.fields.id.value>>;
  readonly profileId: (person: string) => Effect.Effect<TypeOf<typeof Profile.fields.id.value>>;
  readonly signedInPerson: (principal: Principal) => Effect.Effect<TypeOf<typeof Person.fields.id.value>>;
  readonly find: <T extends Thing>(thing: T, id: string) => Effect.Effect<InstanceOf<T> | undefined, never, Records>;
}
