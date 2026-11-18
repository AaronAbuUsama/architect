// Generated from blueprint/things/proposal/verbs/vote.ts. Do not edit. (hand-written in the shape a generator emits)
// Exports the OPTIONS object only. It imports Effect, the SDK and `orthograph/actions` (stand-in), never agent-native.
import { Effect, Schema } from "effect";
import { declaration, vote, type Answer, type Payload } from "../stand-in.ts";
import { errorsOf, runForAction } from "./refusal.ts";

/** The part of agent-native's ActionRunContext the action reads. Structural, so assignable from the real one. */
export interface CallContext {
  readonly caller: string;
  readonly toolCallId?: string;
  readonly userEmail?: string;
  readonly signal?: AbortSignal;
  readonly requestHeaders?: Headers;
}
/** What the hosting app supplies: how this call's request key is derived. */
export interface Host { readonly requestKey: (ctx: CallContext | undefined) => string | undefined }

const standard = <T, E>(s: Schema.Codec<T, E, never, never>) => Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(s));

export const options = (host: Host) => ({
  description: declaration.description,
  schema: standard(declaration.payloadSchema),
  outputSchema: standard(declaration.answerSchema),
  errors: errorsOf(["PR-001", "AR-001"] as const),
  readOnly: false,
  retrySafe: true,
  needsApproval: true,
  agentTool: true,
  mcpTool: false,
  run: (args: Payload, ctx?: CallContext): Promise<Answer> => {
    const key = host.requestKey(ctx);
    return runForAction(
      vote(args, key === undefined ? {} : { requestKey: key }).pipe(Effect.flatMap((s) => s.confirmed)),
      ctx, declaration.refusals.map((r) => r.name),
    );
  },
});
