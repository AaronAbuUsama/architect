import { defineAction } from "@agent-native/core/action";
import { Schema } from "effect";
const mk = (note: any) => defineAction({
  description: "x", schema: Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(Schema.Struct({ id: Schema.String, note }))) as any,
  run: (a: any) => JSON.stringify(a),
}) as any;
for (const [label, f] of [["optional(String)", Schema.optional(Schema.String)], ["optionalKey(String)", Schema.optionalKey(Schema.String)], ["optional(NullOr(String))", Schema.optional(Schema.NullOr(Schema.String))]] as const) {
  const e = mk(f);
  console.log(label, "advertised note:", JSON.stringify(e.tool.parameters.properties.note), "required:", JSON.stringify(e.tool.parameters.required));
  for (const inp of [{ id: "a" }, { id: "a", note: null }, { id: "a", note: "n" }]) {
    console.log("   ", JSON.stringify(inp), "->", await e.run(inp, { caller: "http" }).catch((x: any) => "ERR " + String(x.message).slice(0, 50)));
  }
}
