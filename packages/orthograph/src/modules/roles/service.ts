import type { Via } from "#modules/plugins/types.js";
import type { Narrowed, Role, RoleOf, RolesApi, ServiceRole, SignedIn } from "./types.ts";

const ALL_WAYS: ReadonlyArray<Via> = ["session", "key", "device", "agent"];

/** The kept ways, sorted and without repeats: what the model records. */
const kept = (ways: ReadonlyArray<Via>): ReadonlyArray<Via> => [...new Set(ways)].sort();

const narrow = <A>(entry: A, via: ReadonlyArray<Via>): Narrowed<A> => Object.freeze({ kind: "narrowed" as const, entry, via: kept(via) });

/** `.via` and `.notVia` for an entry that has a person in it. */
const narrowable = <A>(entry: () => A) => ({
  via: (...ways: ReadonlyArray<Via>) => narrow(entry(), ways),
  notVia: (...ways: ReadonlyArray<Via>) => narrow(entry(), ALL_WAYS.filter((w) => !ways.includes(w))),
});

const roleOf = (role: Role<any> | ServiceRole<any>, path: string): RoleOf<any, string> => {
  const of: RoleOf<any, string> = Object.freeze({ kind: "role-of" as const, role, path, ...narrowable(() => of) });
  return of;
};

export const Roles: RolesApi = {
  role: ((thing: Role["thing"], spec: { readonly rule?: Role["rule"]; readonly service?: ServiceRole["service"] }) => {
    const role: object = Object.freeze({
      kind: "role" as const,
      thing,
      rule: spec.rule ?? (() => false),
      ...(spec.service === undefined ? {} : { service: spec.service }),
      of: (path: string): RoleOf<any, string> => roleOf(role as Role, path),
      ...(spec.service === undefined ? narrowable(() => role) : {}),
    });
    return role as unknown as Role | ServiceRole;
  }) as unknown as RolesApi["role"],
  anyone: Object.freeze({ kind: "anyone" }),
  signedIn: (() => {
    const signedIn: SignedIn = Object.freeze({ kind: "signed-in" as const, ...narrowable(() => signedIn) });
    return signedIn;
  })(),
  system: Object.freeze({ kind: "system" }),
};
