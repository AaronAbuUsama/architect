// Generated from blueprint/things/handle/verbs/release.ts (model handle.release). Do not edit.
import { type ActionContext, type ActionHost, type ActionOptions, defineAction } from "../src/action.ts";
import { handleReleaseRefusals, type HandleReleaseAnswer, type HandleReleasePayload } from "./handle-release.ts";

export const options = (host: ActionHost): ActionOptions<HandleReleasePayload, HandleReleaseAnswer> => ({
  name: "handle.release",
  description: "Free your name and take its public page offline. Anyone may claim the name afterwards.",
  readOnly: false,
  needsApproval: true,
  agentTool: true,
  errors: handleReleaseRefusals,
  run: (args: HandleReleasePayload, ctx: ActionContext) => host.call<HandleReleaseAnswer>("handle.release", args, ctx),
});

export const handleReleaseAction = (host: ActionHost) => defineAction(options(host), host.ask);
