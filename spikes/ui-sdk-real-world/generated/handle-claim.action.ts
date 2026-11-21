// Generated from blueprint/things/handle/verbs/claim.ts (model handle.claim). Do not edit.
import { type ActionContext, type ActionHost, type ActionOptions, defineAction } from "../src/action.ts";
import { handleClaimRefusals, type HandleClaimAnswer, type HandleClaimPayload } from "./handle-claim.ts";

export const options = (host: ActionHost): ActionOptions<HandleClaimPayload, HandleClaimAnswer> => ({
  name: "handle.claim",
  description: "Claim a free name and make it the address of your public page, with its profile.",
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: handleClaimRefusals,
  run: (args: HandleClaimPayload, ctx: ActionContext) => host.call<HandleClaimAnswer>("handle.claim", args, ctx),
});

export const handleClaimAction = (host: ActionHost) => defineAction(options(host), host.ask);
