import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect, Schema } from "effect";
import { defineAction } from "./service.ts";
import type { ActionContext } from "./types.ts";

const context = {} as ActionContext;

test("an invalid action input is refused before a handler runs", () => {
  let calls = 0;
  const action = defineAction({
    description: "Read an item.", schema: Schema.Struct({ id: Schema.String }), outputSchema: Schema.String,
    errors: [], readOnly: true, retrySafe: true, needsApproval: false, agentTool: true, mcpTool: false,
    run: ({ id }) => Effect.sync(() => { calls += 1; return id; }),
  });
  assert.equal(Effect.runSync(Effect.result(action.run({ id: 1 }, context)))._tag, "Failure");
  assert.equal(action.manifest.schema["type"], "object");
  assert.equal(calls, 0);
  assert.equal(Effect.runSync(action.run({ id: "ready" }, context)), "ready");
  assert.equal(calls, 1);
});

test("approval-gated actions fail closed in the local transport", () => {
  let calls = 0;
  const action = defineAction({
    description: "Apply a change.", schema: Schema.Struct({}), outputSchema: Schema.Boolean,
    errors: [], readOnly: false, retrySafe: false, needsApproval: true, agentTool: true, mcpTool: false,
    run: () => Effect.sync(() => { calls += 1; return true; }),
  });
  assert.equal(Effect.runSync(Effect.result(action.run({}, context)))._tag, "Failure");
  assert.equal(calls, 0);
});
