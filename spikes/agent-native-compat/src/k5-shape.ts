// K5's example, verbatim in shape, passed to agent-native's OWN defineAction (ours would be an identity port).
import { defineAction } from "@agent-native/core/action";
import { Effect, Schema } from "effect";
import { declaration, vote } from "./stand-in.ts";

const standard = <T, E>(s: Schema.Codec<T, E, never, never>) => Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(s));
declare const refusalsOf: (d: typeof declaration) => { readonly codes: readonly string[]; fail(m: string, c: string): never; noWrite(m: string, c: string): never };

export default defineAction({
  description: declaration.description,
  schema: standard(declaration.payloadSchema),
  outputSchema: standard(declaration.answerSchema),
  errors: refusalsOf(declaration),
  readOnly: false,
  retrySafe: true,
  needsApproval: true,
  agentTool: true,
  mcpTool: false,
  run: (args, ctx) => ctx.sdk(vote(args, { requestKey: ctx.callId }).pipe(Effect.flatMap((s) => s.confirmed))),
});
