import { Effect, Schema } from "effect";
import { Records } from "@orthograph/language-effect";
import type { InstanceOf, Principal, Thing } from "orthograph";
import { Handle } from "../../../../blueprint/things/handle/thing.ts";
import { Person } from "../../../../blueprint/things/person/thing.ts";
import { Profile } from "../../../../blueprint/things/profile/thing.ts";

// The primary keys reserve one row per name and per person, even under concurrent claims.
export const handleId = (name: string) =>
  Schema.decodeUnknownEffect(Handle.fields.id.value.schema)(`hdl_${name}`).pipe(Effect.orDie);

export const profileId = (person: string) =>
  Schema.decodeUnknownEffect(Profile.fields.id.value.schema)(person.replace(/^per_/, "prf_")).pipe(Effect.orDie);

export const signedInPerson = (principal: Principal) =>
  principal.kind === "person"
    ? Schema.decodeUnknownEffect(Person.fields.id.value.schema)(principal.person).pipe(Effect.orDie)
    : Effect.die(new Error("a signed-in operation reached its handler without a person"));

// Records decodes stored fields with the thing's schema before returning them.
export const find = <T extends Thing>(thing: T, id: string) =>
  Effect.gen(function* () {
    const records = yield* Records;
    return (yield* records.find(thing, id)) as InstanceOf<T> | undefined;
  });
