// Node entry: observes package-exports resolution, pure selection, and the real SDK call.
import assert from "node:assert/strict";
import { Effect, Schema } from "effect";
import { Fixture } from "@architect/spike-fixture-kit";
import * as declarations from "@architect/spike-fixture-kit/blueprint";
import { fingerprint } from "@architect/spike-fixture-kit/node";
import selected from "./blueprint/kits/fixture.ts";
import { repeat } from "./generated/sdk.ts";

assert.equal(Fixture.declarations.repeat, declarations.repeat);
assert.equal(declarations.repeat.thing, declarations.Echo);
assert.deepEqual(Schema.decodeUnknownSync(Fixture.choices)(selected.choices), { prefix: "configured: " });
assert.equal(fingerprint("fixture").length, 64);
console.log(JSON.stringify({ descriptor: "resolved by package exports", exports: Object.keys(Fixture.declarations).sort(), nodeEntry: "actual node:crypto executed" }));
if (process.argv[2]) {
  const answer = await Effect.runPromise(repeat(process.argv[2], "hello"));
  assert.deepEqual(answer, { text: "configured: hello" });
  console.log(JSON.stringify({ sdk: answer }));
}
