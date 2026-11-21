// Generated from blueprint/things/session/verbs/sign-in.ts (model session.sign-in). Do not edit.
import { type ActionContext, type ActionHost, type ActionOptions, defineAction } from "../src/action.ts";
import { sessionSignInRefusals, type SessionSignInAnswer, type SessionSignInPayload } from "./session-sign-in.ts";

export const options = (host: ActionHost): ActionOptions<SessionSignInPayload, SessionSignInAnswer> => ({
  name: "session.sign-in",
  description: "Sign in with email and password. The token is the bearer for every later call.",
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: sessionSignInRefusals,
  run: (args: SessionSignInPayload, ctx: ActionContext) => host.call<SessionSignInAnswer>("session.sign-in", args, ctx),
});

export const sessionSignInAction = (host: ActionHost) => defineAction(options(host), host.ask);
