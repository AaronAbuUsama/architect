import { Reading } from "../../reading/service.ts";
import { operationsOf, over, typeName } from "./over.ts";

/** thing.model: the thing is in the model with its description, and every field with its value type; a reference or named value says which. */
export const model = over("thing.model", (thing) => [
  ...((thing.description ?? "").trim() === "" ? ["it has no description"] : []),
  ...(Object.keys(thing.fields).length === 0 ? ["it has no fields"] : []),
  ...Object.entries(thing.fields).flatMap(([name, field]) => [
    ...(typeof field.value?.type === "string" ? [] : [`field ${name} has no value type`]),
    ...(field.visibility !== undefined && JSON.stringify(field.visibility) === undefined ? [`field ${name} has a visibility the model cannot write down`] : []),
  ]),
]);

/** thing.api: every endpoint of the thing's operations types its payload and answer from the declaration's own fields. */
export const api = over("thing.api", (thing, e) => operationsOf(e, thing.name).flatMap((op) => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  return [
    ...(source.includes("payload: declaration.payloadSchema") ? [] : [`${path} does not type its payload from the declaration`]),
    ...(source.includes("wireStruct(declaration.answer") ? [] : [`${path} does not type its answer from the declaration`]),
  ];
}));

/** thing.server: the server decodes each answer of the thing's operations against the declaration (prove's `answer shape`), and the calls ran. */
export const server = over("thing.server", (thing, e) => {
  const ops = operationsOf(e, thing.name);
  return [
    ...(ops.length === 0 ? [`no operation acts on ${thing.name}`] : []),
    ...ops.flatMap((op) => Reading.proved(e.prove, `${op.name} answer shape`)),
  ];
});

/** thing.sdk: the SDK exports a type for the thing (`Link`) that names each of its fields, so a caller can name it. */
export const sdk = over("thing.sdk", (thing, e) => {
  const sources = Object.entries(e.files).filter(([path]) => path.startsWith("generated/sdk/"));
  const declared = sources.map(([path, text]) => ({ path, at: new RegExp(`export (?:type|interface) ${thing.identifier}\\b`).exec(text), text })).find((s) => s.at !== null);
  if (declared === undefined) return [`the SDK exports no type ${thing.identifier}: a caller cannot name a ${thing.name}`];
  const body = declared.text.slice(declared.at!.index, declared.at!.index + 2000);
  return Object.keys(thing.fields).filter((field) => !new RegExp(`\\b${field}\\b`).test(body)).map((field) => `${declared.path}'s ${thing.identifier} leaves out the field ${field}`);
});

/** thing.telemetry: a thing's public fields appear on its operations' spans as `payload.*` and `answer.*` (text only when `traced`), and no others do. */
export const telemetry = over("thing.telemetry", (thing, e) => {
  if (e.spans === undefined) return ["no spans were read from the prove run"];
  const spans = operationsOf(e, thing.name).flatMap((op) => Reading.spansNamed(e.spans ?? [], op.name).map((span) => ({ op, span })));
  return operationsOf(e, thing.name).flatMap((op) => {
    const mine = spans.filter((s) => s.op.name === op.name).map((s) => s.span);
    if (mine.length === 0) return [`no span of ${op.name} was recorded`];
    return (["payload", "answer"] as const).flatMap((side) => {
      const fields = Object.entries(op[side]);
      const shown = new Set(fields.filter(([, f]) => f.visibility === undefined && (f.value.type !== "text" || f.traced === true)).map(([name]) => `${side}.${name}`));
      const seen = new Set(mine.flatMap((s) => Object.keys(s.attrs)).filter((k) => k.startsWith(`${side}.`)));
      return [
        ...[...shown].filter((k) => !seen.has(k)).map((k) => `${op.name}'s spans never carry ${k} (public, ${typeName(op[side][k.slice(side.length + 1)]!)})`),
        ...[...seen].filter((k) => !shown.has(k)).map((k) => `${op.name}'s span carries ${k}, which the thing does not show (private, secret or text not marked traced, or not declared)`),
      ];
    });
  });
});
