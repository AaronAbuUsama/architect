// What the model on `links/stage-1` doesn't carry yet, because it predates M1.03 and M1.35. On `m1` each of these is a
// model field (named beside it); here it is written once, by hand, so the drawing can show where it lands. Every page
// that uses one says so in its footer.

/** `ThingModel.from` and `Model.mounts` (M1.03): stage 1 mounts handles and auth (K9). */
export const mounts = {
  handles: {
    kind: "feature", file: "blueprint/features/handles.ts", package: "@orthograph/handles", version: "0.1.0",
    integrity: "sha256-q8Rk…3fA", chosen: { "reserved names": "off" }, omitted: [] as string[],
    narrowed: { "handle.resolve": ["api", "sdk", "cli"] } as Record<string, string[]>, needs: ["auth"], things: ["handle"],
  },
  auth: {
    kind: "feature", file: "blueprint/features/auth.ts", package: "@orthograph/auth", version: "0.1.0",
    integrity: "sha256-7Ty2…c0E", chosen: { identity: "better-auth" }, omitted: ["person.delete"],
    narrowed: {} as Record<string, string[]>, needs: [], things: ["person", "session"],
  },
} as const;
export type MountName = keyof typeof mounts;
export const groups: { name: string; label: string; mount?: MountName; things: string[] }[] = [
  { name: "app", label: "Plugged In", things: ["profile", "link"] },
  { name: "handles", label: "handles", mount: "handles", things: ["handle"] },
  { name: "auth", label: "auth", mount: "auth", things: ["person", "session"] },
];
export const groupOf = (thing: string) => groups.find((g) => g.things.includes(thing))!;

/** `ThingModel.roleRules` (on m1), from each thing's roles.ts. */
export const roleRules: Record<string, string> = {
  "handle.handleOwner": "handle.owner === caller.person",
  "link.linkOwner": "link.owner === caller.person",
};

/** `FieldModel.visibility` (M1.35): the password and the session token are secret. */
export const secretFields = new Set(["person.sign-up.password", "session.sign-in.password", "session.sign-in.token"]);

/** `Model.stores` (on m1): stage 1 declares none, so everything lives in the project's default store. */
export const stores = [{ name: "default", kind: "database", from: "the app", file: "(the project's default)", things: ["profile", "link", "handle", "person", "session"] }];

/** A blank operation, drawn to show where one sits. Plugged In has none today. */
export const blank = {
  name: "link.pin", thing: "link", verb: "pin", file: "blueprint/things/link/verbs/pin.ts",
  description: "Pin a link to the top of your public profile.",
  has: ["description", "payload", "answer"], blanks: ["move", "allowed"],
};

/** Notes (the portal's `note` thing, M3.21): Markdown pinned to a declaration's hash. */
export const notes: Record<string, { body: string; by: string; when: string; stale: boolean }[]> = {
  "handle.claim": [
    { body: "Retrying with the same request key returns the same handle and does no work. That's the idempotency, not a bug.", by: "aaron", when: "18 Nov", stale: false },
    { body: "Reserved names (admin, support) were discussed for the handles plugin; not built.", by: "builder agent", when: "17 Nov", stale: true },
  ],
};
