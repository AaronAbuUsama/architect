// The anchors of a thing's own files: the thing, its machine, events, errors and roles, and the shared values.
import { type Ctx, type Node, FOLDER, MARK, escape, keyOf, propOf, quoted, regex, removal, renameIdentifier, renameKey, replaceNode, restring, span, textOf } from "./ast.ts";

export const thing = (c: Ctx, name: string, statement: Node, obj: Node): void => {
  const t = c.thing!;
  const at = span(c, statement);
  // The thing as a whole is the sum of its parts. Renaming its TypeScript name reached no output, so it has no change of its own.
  c.add({ id: `${t}/thing`, kind: "thing", label: `the thing ${name}`, thing: t, file: c.file, ...at });
  c.add({
    id: `${t}/folder`,
    kind: "thing",
    label: `its folder, things/${t}`,
    thing: t,
    file: c.file,
    line: at.line,
    endLine: at.line,
    parent: `${t}/thing`,
    // The folder names the thing; every import of a file in it follows the move.
    edits: [
      { kind: "move", from: `blueprint/things/${t}`, to: `blueprint/things/${t}${FOLDER}` },
      regex(["blueprint", "journeys"], `(["']\\.{1,2}/(?:[^"']*/)?)${escape(t)}/`, `$1${t}${FOLDER}/`),
    ],
  });
  const description = propOf(c, obj, "description");
  if (description) c.add({ id: `${t}/description`, kind: "description", label: "its description", thing: t, file: c.file, ...span(c, description), parent: `${t}/thing`, edits: [restring(c, description.initializer, (s) => `${s} ${MARK}`)] });
  const code = propOf(c, obj, "code");
  if (code) c.add({ id: `${t}/code`, kind: "thing", label: `its refusal code prefix, ${code.initializer.text}`, thing: t, file: c.file, ...span(c, code), parent: `${t}/thing`, edits: [restring(c, code.initializer, () => "QZ")] });
  const fields = propOf(c, obj, "fields")?.initializer;
  for (const p of fields?.properties ?? []) {
    const k = keyOf(c, p);
    c.add({
      id: `${t}/field:${k}`,
      kind: "field",
      label: `field ${k}`,
      thing: t,
      file: c.file,
      ...span(c, p),
      parent: `${t}/thing`,
      edits: [renameKey(c, p), regex(["blueprint", "journeys"], `(?<![\\w$])${escape(name)}\\.fields\\.${escape(k)}(?![\\w$])`, `${name}.fields.${k}${MARK}`)],
    });
    // A field's value written as text, such as an id's prefix (`Blueprint.id("hdl")`): renaming the field leaves it as it is.
    const literal = p.initializer?.arguments?.find((x: Node) => c.ts.isStringLiteral(x));
    if (literal) c.add({ id: `${t}/field:${k}/value`, kind: "field", label: `field ${k}'s value, ${textOf(c, p.initializer)}`, thing: t, file: c.file, ...span(c, p), parent: `${t}/field:${k}`, edits: [restring(c, literal, (s) => `${s}q`)] });
  }
};

export const machine = (c: Ctx, statement: Node, obj: Node): void => {
  const t = c.thing!;
  const id = `${t}/machine`;
  c.add({ id, kind: "machine", label: "the machine", thing: t, file: c.file, ...span(c, statement) });
  for (const s of propOf(c, obj, "states")?.initializer.elements ?? []) {
    c.add({ id: `${id}/state:${s.text}`, kind: "state", label: `state ${s.text}`, thing: t, file: c.file, ...span(c, s), parent: id, edits: [regex([c.file], quoted(s.text), `$1${s.text}${MARK}$1`)] });
  }
  for (const m of propOf(c, obj, "moves")?.initializer.properties ?? []) {
    const k = keyOf(c, m);
    const moveId = `${id}/move:${k}`;
    c.add({
      id: moveId,
      kind: "move",
      label: `move ${k}`,
      thing: t,
      file: c.file,
      ...span(c, m),
      parent: id,
      edits: [renameKey(c, m), regex([`blueprint/things/${t}`], `(?<![\\w$])moves\\.${escape(k)}(?![\\w$])`, `moves.${k}${MARK}`)],
    });
    const emits = propOf(c, m.initializer, "emits");
    if (emits) c.refer(moveId, [`event:${textOf(c, emits.initializer)}`]);
  }
  const notFrom = propOf(c, obj, "notFrom");
  const exit = propOf(c, notFrom?.initializer, "exit");
  if (notFrom) c.add({ id: `${id}/notFrom`, kind: "exit", label: "refusal when the move can't start from here", thing: t, file: c.file, ...span(c, notFrom), parent: id, edits: exit ? [replaceNode(c, exit.initializer, "98")] : [removal(c, notFrom)] });
};

export const event = (c: Ctx, name: string, statement: Node, obj: Node): void => {
  const t = c.thing!;
  const id = `${t}/event:${name}`;
  c.add({ id, kind: "event", label: `event ${name}`, thing: t, file: c.file, ...span(c, statement), edits: [renameIdentifier(name)] });
  for (const p of obj?.properties ?? []) {
    const k = keyOf(c, p);
    c.add({ id: `${id}/field:${k}`, kind: "field", label: `${name} field ${k}`, thing: t, file: c.file, ...span(c, p), parent: id, edits: [renameKey(c, p)] });
  }
};

export const error = (c: Ctx, name: string, statement: Node, call: Node): void => {
  const t = c.thing!;
  const id = `${t}/error:${name}`;
  c.add({ id, kind: "error", label: `error ${name}`, thing: t, file: c.file, ...span(c, statement), edits: [renameIdentifier(name)] });
  const exit = propOf(c, call.arguments[1], "exit");
  if (exit) c.add({ id: `${id}/exit`, kind: "exit", label: `${name}'s exit code, ${textOf(c, exit.initializer)}`, thing: t, file: c.file, ...span(c, exit), parent: id, edits: [replaceNode(c, exit.initializer, "97")] });
  for (const p of call.arguments[0]?.properties ?? []) {
    const k = keyOf(c, p);
    c.add({ id: `${id}/field:${k}`, kind: "field", label: `${name} field ${k}`, thing: t, file: c.file, ...span(c, p), parent: id, edits: [renameKey(c, p)] });
  }
};

export const role = (c: Ctx, name: string, statement: Node, obj: Node): void => {
  const t = c.thing!;
  const id = `${t}/role:${name}`;
  c.add({ id, kind: "role", label: `role ${name}`, thing: t, file: c.file, ...span(c, statement), edits: [renameIdentifier(name)] });
  const rule = propOf(c, obj, "rule");
  const body = rule?.initializer?.body;
  if (body) c.add({ id: `${id}/rule`, kind: "rule", label: `${name}'s rule`, thing: t, file: c.file, ...span(c, rule), parent: id, edits: [replaceNode(c, body, `true && (${textOf(c, body)})`)] });
};

export const value = (c: Ctx, name: string, statement: Node): void => {
  c.add({ id: `value:${name}`, kind: "value", label: `value ${name}`, file: c.file, ...span(c, statement), edits: [renameIdentifier(name)] });
};

/** `Blueprint.visibility.secret(x)`, wherever it is written: the change takes the wrapper off. */
export const visibility = (c: Ctx, call: Node, callee: string, op: string | undefined): void => {
  const at = span(c, call);
  const level = callee.split(".").at(-1);
  c.add({
    id: `visibility:${c.file}:${at.line}:${call.getStart(c.sf)}`,
    kind: "visibility",
    label: `${level}: ${textOf(c, call.arguments[0])}`,
    thing: c.thing,
    op,
    file: c.file,
    ...at,
    edits: [replaceNode(c, call, textOf(c, call.arguments[0]))],
  });
};
