// Named entry: local client checks only.
import "../modules/probes/service.js";
import { Effect } from "effect";
import { checkRefusals } from "../modules/client/client.test.js";
import { checkTelemetry } from "../modules/telemetry/telemetry.test.js";
await Effect.runPromise(Effect.all([checkRefusals, checkTelemetry]));
console.log("PASS typed refusals and full-span/log redaction");
