import { over } from "./over.ts";

/** operation.model: the operation is in the model with its kind, description, payload, answer, who may call, idempotency, budget and where it runs. */
export const model = over("operation.model", (op) => [
  ...(op.kind === "operation" || op.kind === "read" ? [] : [`its kind is ${op.kind}, expected operation or read`]),
  ...((op.description ?? "").trim() === "" ? ["it has no description"] : []),
  ...(op.allowed.length === 0 ? ["it says nobody may call it (allowed is empty)"] : []),
  ...(typeof op.budget?.p95Ms === "number" ? [] : ["it declares no p95 budget"]),
  ...(op.idempotent === undefined ? ["the model does not say whether it is idempotent (idempotent is missing, null means not)"] : []),
  ...(op.runs === undefined ? ["the model does not say where it runs"] : []),
  ...(typeof op.payload === "object" && typeof op.answer === "object" ? [] : ["its payload or answer is not in the model"]),
]);

/** The error classes an endpoint lists: `error: [LinkNotListed, NotAllowed]`. */
const endpointErrors = (source: string): ReadonlyArray<string> | undefined => {
  const found = /\berror: \[([^\]]*)\]/.exec(source);
  return found === null ? undefined : found[1]!.split(",").map((n) => n.trim()).filter((n) => n !== "");
};

/** operation.api: one endpoint at `/<thing>/<verb>` with the declaration's own schemas, listing every refusal the model gives the operation. */
export const api = over("operation.api", (op, e) => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  const index = e.files["generated/api/src/index.ts"] ?? "";
  const listed = endpointErrors(source);
  const want = [...(op.refusals ?? [])].sort();
  return [
    ...(new RegExp(`HttpApiEndpoint\\.(?:post|get)\\("${op.verb}", "/${op.thing}/${op.verb}"`).test(source) ? [] : [`${path} has no endpoint "${op.verb}" at /${op.thing}/${op.verb}`]),
    ...(source.includes("declaration.payloadSchema") ? [] : [`${path}'s payload is not the declaration's own schema`]),
    ...(source.includes("declaration.answer") ? [] : [`${path}'s answer is not the declaration's own answer`]),
    ...(listed === undefined ? [`${path} lists no error classes`] : JSON.stringify([...listed].sort()) === JSON.stringify(want) ? [] : [`${path} lists errors [${[...listed].sort().join(", ")}], the model gives [${want.join(", ")}]`]),
    ...(index.includes(`"${op.name}":`) ? [] : [`generated/api/src/index.ts's operations table has no "${op.name}"`]),
  ];
});

/** operation.sdk: one function named for the verb, the description as its doc comment, exported through its thing's group. */
export const sdk = over("operation.sdk", (op, e) => {
  const path = `generated/sdk/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  const group = e.files[`generated/sdk/src/${op.thing}/index.ts`] ?? "";
  const root = e.files["generated/sdk/src/index.ts"] ?? "";
  // The group is the thing's identifier with a lower-case first letter (`ApiKey` is `apiKey`), the way the SDK exports it.
  const fn = op.identifier ?? op.verb;
  const identifier = e.model.things[op.thing]?.identifier ?? op.thing;
  const groupName = identifier.charAt(0).toLowerCase() + identifier.slice(1);
  return [
    ...(source.includes(`/** ${op.description ?? ""} */\nexport const ${fn} =`) ? [] : [`${path} does not export ${fn} under the doc comment "${op.description ?? ""}"`]),
    ...(group.includes(`export { ${fn} } from "./${op.verb}.ts"`) ? [] : [`the ${op.thing} group does not export ${fn}`]),
    ...(root.includes(`export * as ${groupName} from "./${op.thing}/index.ts"`) ? [] : [`the SDK does not export the ${op.thing} group as ${groupName}`]),
  ];
});
