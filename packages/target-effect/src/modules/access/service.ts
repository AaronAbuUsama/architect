import { Effect } from "effect";
import type { Allowed, Principal, Role } from "@architect/blueprint";
import { Records } from "#modules/records/types.ts";
import { NotAllowed, type AccessApi } from "./types.ts";
import { referencedThing } from "./internal/path.ts";

type Person = Extract<Principal, { kind: "person" }>;

/** `owner.of("organization")` or `owner.of("allowance.organization")`: walk the path from the payload to the role's thing. */
const roleOf = (role: Role, path: string, payloadFields: { readonly [key: string]: unknown }, payload: object, person: Person) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const [first, ...rest] = path.split(".");
    let id: unknown = (payload as Record<string, unknown>)[first ?? ""];
    let thing = referencedThing(payloadFields[first ?? ""]);
    for (const key of rest) {
      if (!thing || typeof id !== "string") return false;
      const instance = yield* records.find(thing, id);
      if (!instance) return false;
      id = instance[key];
      thing = referencedThing(thing.fields[key]);
    }
    if (thing !== role.thing || typeof id !== "string") return false;
    const instance = yield* records.find(role.thing, id);
    return instance !== undefined && role.rule(instance as never, person);
  });

const allows = (a: Allowed, payloadFields: { readonly [key: string]: unknown }, payload: object, principal: Principal): Effect.Effect<boolean, never, Records> => {
  if (a.kind === "anyone") return Effect.succeed(true);
  if (principal.kind !== "person") return Effect.succeed(false);
  if (a.kind === "signed-in") return Effect.succeed(true);
  if (a.kind === "role-of") return roleOf(a.role, a.path, payloadFields, payload, principal);
  // A bare role names no instance yet; it arrives with roles proper (L1.22). Until then it never allows.
  return Effect.succeed(false);
};

export const Access: AccessApi = {
  check: ({ allowed, payloadFields, payload, principal }) =>
    Effect.gen(function* () {
      for (const a of allowed) if (yield* allows(a, payloadFields, payload, principal)) return;
      return yield* new NotAllowed();
    }),
};
