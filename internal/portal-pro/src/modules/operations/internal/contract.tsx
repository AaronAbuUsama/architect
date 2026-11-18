import { Reference } from "../../reference/service.tsx";
import { documentBody } from "../../workspace/service.ts";
import type { Operation, OperationsBlueprint } from "../types.ts";

const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");
const fieldTable = (fields: Operation["payload"]) => {
  const rows = Object.entries(fields).map(([name, field]) => {
    const value = field.value;
    const type = String(value["type"] ?? "Value");
    const notes = [value["prefix"] && `prefix ${value["prefix"]}`, value["bits"] && `${value["bits"]} bits`,
      value["max"] !== undefined && `up to ${value["max"]} characters`, field.optional && "optional"].filter(Boolean).join(" · ");
    return `| \`${cell(name)}\` | ${cell(notes ? `${type} · ${notes}` : type)} | ${cell(field.named ?? field.ref ?? "—")} |`;
  });
  return rows.length ? ["| Field | Type | Declaration |", "| --- | --- | --- |", ...rows].join("\n") : "No fields declared.";
};

export const Contract = ({ operation, blueprint }: { operation: Operation; blueprint: OperationsBlueprint }) => {
  const docName = `${operation.thing}/${operation.verb}.md`;
  const source = blueprint.docs[docName];
  if (!source) return <p className="op-empty">Generated reference is unavailable for this operation.</p>;
  const generated = documentBody(source);
  const [intro, ...blocks] = generated.split(/(?=^## )/mu);
  const invocation = blocks.find((block) => block.startsWith("## How to call\n"));
  const remainder = blocks.filter((block) => block !== invocation).map((block) => {
    if (block.startsWith("## Payload\n")) return `## Payload\n\n${fieldTable(operation.payload)}\n\n`;
    if (block.startsWith("## Answer\n")) return `## Answer\n\n${fieldTable(operation.answer)}\n\n`;
    return block;
  });
  const doc = [intro, invocation, ...remainder].filter(Boolean).join("\n");
  return <Reference markdown={doc} />;
};
