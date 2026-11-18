// Generated from blueprint/things/person/verbs/sign-up.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("PersonEmailTaken");

export default defineAction({
  description: "Sign up with an email address and a password. (acme's person.sign-up; open to anyone.)",
  schema: z.object({
    email: z.string().max(254).describe("the person.email"),
    password: z.string().max(128).describe("Password; secret: never shown, never logged"),
    name: z.string().max(200).describe("the person.name"),
  }),
  outputSchema: z.object({
    person: z.string().startsWith("per_").describe("the person.id"),
  }),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"person.sign-up","route":"person/sign-up","requestKey":false,"secret":{"payload":["password"],"answer":[]}}, args, ctx, errors),
});
