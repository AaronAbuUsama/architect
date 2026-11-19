// The anchors of one operation file, `blueprint/things/<thing>/verbs/<verb>.ts`: the operation and each of its parts.
import { type Ctx, type Node, FOLDER, MARK, escape, keyOf, regex, removal, renameKey, replaceNode, restring, span, textOf } from "./ast.ts";

export const operation = (c: Ctx, verb: string, statement: Node, obj: Node): string => {
  const t = c.thing!;
  const op = `${t}.${verb}`;
  const dir = c.file.slice(0, c.file.lastIndexOf("/"));
  c.add({ id: op, kind: "operation", label: `the operation ${op}, named by its path`, thing: t, op, file: c.file, ...span(c, statement), edits: [
    { kind: "move", from: c.file, to: `${dir}/${verb}${FOLDER}.ts` },
    // A journey that imports the verb file follows the move.
    regex(["blueprint", "journeys"], `${escape(t)}/verbs/${escape(verb)}\\.ts(["'])`, `${t}/verbs/${verb}${FOLDER}.ts$1`),
  ] });
  const part = (_key: string, p: Node) => ({ thing: t, op, file: c.file, ...span(c, p), parent: op });

  for (const p of obj?.properties ?? []) {
    const key = keyOf(c, p);
    const value = p.initializer;
    const at = part(key, p);
    switch (key) {
      case "description":
        c.add({ ...at, id: `${op}/description`, kind: "description", label: "its description", edits: [restring(c, value, (s) => `${s} ${MARK}`)] });
        break;
      case "payload":
      case "answer":
        for (const f of value.properties ?? []) {
          const k = keyOf(c, f);
          c.add({ ...part(key, f), id: `${op}/${key}:${k}`, kind: key, label: `${key} field ${k}`, edits: [renameKey(c, f)] });
        }
        if ((value.properties ?? []).length === 0) c.add({ ...at, id: `${op}/${key}`, kind: key, label: `an empty ${key}` });
        break;
      case "move": {
        const id = `${op}/move`;
        c.add({ ...at, id, kind: "move", label: `its move, ${textOf(c, value)}`, edits: [removal(c, p)] });
        c.refer(id, [`move:${textOf(c, value).split(".").at(-1)}@${t}`]);
        break;
      }
      case "errors":
        for (const e of value.elements ?? []) {
          const name = textOf(c, e);
          const id = `${op}/refuses:${name}`;
          c.add({ ...part(key, e), id, kind: "refusal", label: `refuses ${name}`, edits: [removal(c, e)] });
          c.refer(id, [`error:${name}`]);
        }
        if ((value.elements ?? []).length === 0) c.add({ ...at, id: `${op}/errors`, kind: "refusal", label: "declares no refusals" });
        break;
      case "allowed": {
        const id = `${op}/allowed`;
        const text = textOf(c, value);
        c.add({ ...at, id, kind: "allowed", label: `who may call: ${text}`, edits: [replaceNode(c, value, text.includes("Blueprint.anyone") ? "[Blueprint.signedIn]" : "[Blueprint.anyone]")] });
        c.refer(id, (value.elements ?? []).map((e: Node) => `role:${textOf(c, e)}`));
        break;
      }
      case "steps":
        for (const s of value.properties ?? []) {
          const k = keyOf(c, s);
          c.add({ ...part(key, s), id: `${op}/step:${k}`, kind: "step", label: `step ${k}, ${textOf(c, s.initializer)}`, edits: [renameKey(c, s)] });
        }
        break;
      case "idempotent":
        c.add({ ...at, id: `${op}/idempotent`, kind: "idempotent", label: `idempotent by ${value.text}`, edits: [removal(c, p)] });
        break;
      case "budget": {
        const p95 = value.properties?.find((q: Node) => keyOf(c, q) === "p95");
        c.add({ ...at, id: `${op}/budget`, kind: "budget", label: `its budget, ${textOf(c, value)}`, edits: p95 ? [restring(c, p95.initializer, (s) => s.replace(/\d+/, (n) => String(Number(n) + 7)))] : [removal(c, p)] });
        break;
      }
      default:
        c.add({ ...at, id: `${op}/${key}`, kind: "other", label: `${key}: ${textOf(c, value).slice(0, 40)}`, edits: [removal(c, p)] });
    }
  }
  return op;
};
