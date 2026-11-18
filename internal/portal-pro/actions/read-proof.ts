import { Effect, Schema } from "effect";
import { defineAction } from "../src/modules/agent/service.ts";
import { ActionRefused } from "../src/modules/agent/types.ts";

export default defineAction({
  description: "Read actual recorded eval results and timing for one operation in the selected environment.",
  schema: Schema.Struct({
    operation: Schema.String,
    environment: Schema.optionalKey(Schema.String),
    tabId: Schema.optionalKey(Schema.String),
  }),
  outputSchema: Schema.Struct({
    environment: Schema.Literal("local"),
    endedAt: Schema.String,
    checks: Schema.Array(Schema.Struct({
      name: Schema.String,
      passed: Schema.Boolean,
      timing: Schema.optionalKey(Schema.Struct({ p50Ms: Schema.Number, p95Ms: Schema.Number })),
    })),
  }),
  errors: ["Evidence unavailable"],
  readOnly: true,
  retrySafe: true,
  needsApproval: false,
  agentTool: true,
  mcpTool: false,
  run: (input, context) => Effect.gen(function* () {
    const environment = input.environment ?? context.screen(input.tabId)?.screen.environment ?? "local";
    const capture = environment === context.capture?.environment ? context.capture : undefined;
    const checks = capture && Object.hasOwn(capture.proof.checks, input.operation)
      ? capture.proof.checks[input.operation] : undefined;
    if (!capture || !checks?.length) {
      return yield* new ActionRefused({ status: 404, message: "No recorded proof for that operation and environment." });
    }
    return { environment: capture.environment, endedAt: capture.proof.endedAt, checks };
  }),
});
