import { strict as assert } from "node:assert";
import { Effect } from "effect";
import { failureCategory, makeMonitor } from "./service.js";
import { AllowanceExceeded } from "~/modules/client/types.js";

export const checkTelemetry = Effect.gen(function* () {
  const monitor = makeMonitor();
  monitor.watch(987654321n);
  monitor.log('{"level":30,"message":"private 987654321 value"}');
  monitor.log('{"level":987654321}');
  assert.equal(failureCategory(new AllowanceExceeded({ remaining: 987654321n })), "operation");
  assert.equal(failureCategory(new Error("private 987654321 value")), "operation");
  yield* Effect.annotateCurrentSpan("architect.outcome", 987654321n).pipe(Effect.withSpan("987654321"), Effect.withTracer(monitor.tracer));
  yield* Effect.exit(Effect.fail(new AllowanceExceeded({ remaining: 987654321n })).pipe(
    Effect.withSpan("refusal"), Effect.withTracer(monitor.tracer),
  ));
  const report = monitor.report();
  assert.equal(report.spanLeaks, 0);
  assert.ok(report.rawLibraryLogLeaks > 0);
  assert.equal(report.recordedLibraryLogLeaks, 0);
});
