// Generated from blueprint/things/session/verbs/sign-in.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("SessionCredentialsWrong");

export default defineAction({
  description: "Sign in with email and password. The token is the bearer for every later call. (acme's session.sign-in; open to anyone.)",
  schema: z.object({
    email: z.string().max(254).describe("the person.email"),
    password: z.string().max(128).describe("Password; secret: never shown, never logged"),
  }),
  outputSchema: z.object({
    session: z.string().describe("the session.id; secret: never shown, never logged"),
    token: z.string().describe("Secret; secret: never shown, never logged"),
  }),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"session.sign-in","route":"session/sign-in","requestKey":false,"secret":{"payload":["password"],"answer":["session","token"]}}, args, ctx, errors),
});
