import { defineAction } from "@agent-native/core/action";
import { Schema } from "effect";
import { options } from "../src/generated/proposal-vote.ts";
import { host } from "../app/actions/_host.ts";
import { payloadSchema } from "../src/stand-in.ts";

const good = defineAction(options(host)) as any;
console.log("== good: toStandardJSONSchemaV1(toStandardSchemaV1(payload))");
console.log(JSON.stringify(good.tool.parameters, null, 2));

const onlyValidate = defineAction({
  description: "trap", schema: Schema.toStandardSchemaV1(payloadSchema), run: () => "ok",
}) as any;
console.log("== trap: only ~standard.validate");
console.log(JSON.stringify(onlyValidate.tool.parameters));

const onlyJson = defineAction({
  description: "json only", schema: Schema.toStandardJSONSchemaV1(payloadSchema) as any, run: () => "ok",
}) as any;
console.log("== jsonSchema only (no validate): keys of ~standard =", Object.keys((Schema.toStandardJSONSchemaV1(payloadSchema) as any)["~standard"]));

// validation really runs (not just advertised): drive entry.run with good / bad input
const ok = await good.run({ proposal: "p1", choice: "yes", weight: 2, stake: "100" }, { caller: "http" }).catch((e: any) => `ERR ${e.message}`);
console.log("== run with valid wire input ->", JSON.stringify(ok, (_, v) => typeof v === "bigint" ? `${v}n` : v));
const bad = await good.run({ proposal: "p1", choice: "maybe", weight: "x", stake: "1.5" }, { caller: "http" }).catch((e: any) => `ERR ${e.message}`);
console.log("== run with invalid input ->", bad);

// Attribution: what Effect emits raw vs what agent-native advertises
const raw = (Schema.toStandardJSONSchemaV1(payloadSchema) as any)["~standard"].jsonSchema.input({ target: "draft-2020-12" });
console.log("== raw Effect note/required/additionalProperties:", JSON.stringify({ note: raw.properties.note, required: raw.required, additionalProperties: raw.additionalProperties }));
const seen: unknown[] = [];
const probe = defineAction({ description: "probe", schema: options(host).schema, run: (a: any) => { seen.push(a); return "ok"; } }) as any;
for (const input of [
  { proposal: "p", choice: "no", weight: 1, stake: "7" },
  { proposal: "p", choice: "no", weight: 1, stake: "7", note: null },
  { proposal: "p", choice: "no", weight: 1, stake: 7 },
]) {
  const r = await probe.run(input, { caller: "http" }).catch((e: any) => `ERR ${String(e.message).slice(0, 90)}`);
  console.log("input", JSON.stringify(input), "->", r);
}
console.log("run received (decoded):", seen.map((s) => JSON.stringify(s, (_, v) => typeof v === "bigint" ? `${v}n` : v)));

// What the in-app agent is actually given as the tool's input schema (the end of the post-processing chain)
import { actionsToEngineTools } from "@agent-native/core/server";
const tools: any[] = actionsToEngineTools({ vote: good, trap: onlyValidate } as any);
for (const t of tools) console.log("engine tool", t.name, "inputSchema.properties =", JSON.stringify(Object.keys(t.inputSchema?.properties ?? {})), "| trap action advertised?", t.name === "trap");
console.log("engine tool names:", JSON.stringify(tools.map((t) => t.name)));
process.exit(0);
