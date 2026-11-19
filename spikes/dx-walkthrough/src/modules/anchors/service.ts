// Every declaration of a blueprint, read from its syntax tree: where it is, what it refers to, and how to change it.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { Anchor } from "./types.ts";
import { type Ctx, type Node, type TS, callOf, textOf } from "./internal/ast.ts";
import { error, event, machine, role, thing, value, visibility } from "./internal/declarations.ts";
import { operation } from "./internal/operation.ts";

const tsFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir).sort().flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tsFiles(path) : name.endsWith(".ts") ? [path] : [];
  });

/** One blueprint file's declarations. */
const readFile = (c: Ctx): void => {
  const { ts, sf } = c;
  const verb = /\/verbs\/([^/]+)\.ts$/.exec(c.file)?.[1];
  let op: string | undefined;
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) {
      const found = callOf(c, st.expression);
      if (found?.callee === "Blueprint.operation" && verb) op = operation(c, verb, st, found.call.arguments[1]);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const name = textOf(c, d.name);
        const found = callOf(c, d.initializer);
        if (!found) continue;
        const obj = found.call.arguments[0];
        if (found.callee === "Blueprint.thing") thing(c, name, st, obj);
        else if (found.callee === "Blueprint.machine") machine(c, st, found.call.arguments[1]);
        else if (found.callee === "Blueprint.event") event(c, name, st, obj);
        else if (found.callee === "Blueprint.role") role(c, name, st, found.call.arguments[1]);
        else if (c.file.startsWith("blueprint/values/")) value(c, name, st);
      }
    } else if (ts.isClassDeclaration(st) && st.name) {
      const base = callOf(c, st.heritageClauses?.[0]?.types?.[0]?.expression);
      if (base?.callee === "Blueprint.error") error(c, textOf(c, st.name), st, base.call);
    }
  }
  const walk = (n: Node): void => {
    const found = callOf(c, n);
    if (found?.callee.startsWith("Blueprint.visibility.")) visibility(c, found.call, found.callee, op);
    ts.forEachChild(n, walk);
  };
  walk(sf);
};

/** Resolve `error:HandleTaken`, `event:HandleClaimed`, `role:handleOwner`, `move:claim@handle` to anchor ids. */
const resolve = (anchors: ReadonlyArray<Anchor>, names: ReadonlyArray<string>): ReadonlyArray<string> =>
  names.flatMap((n) => {
    const [kind, rest] = n.split(":") as [string, string];
    const [name, thingName] = rest.split("@");
    const hit = anchors.find((a) =>
      kind === "move" ? a.id === `${thingName}/machine/move:${name}` : a.kind === kind && a.id.endsWith(`/${kind}:${name}`));
    return hit ? [hit.id] : [];
  });

export const anchorsOf = (ts: TS, projectDir: string): ReadonlyArray<Anchor> => {
  const found: Array<Anchor> = [];
  const refers = new Map<string, ReadonlyArray<string>>();
  for (const path of tsFiles(join(projectDir, "blueprint"))) {
    const file = relative(projectDir, path);
    const text = readFileSync(path, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    readFile({
      ts,
      sf,
      text,
      file,
      thing: /^blueprint\/things\/([^/]+)\//.exec(file)?.[1],
      add: (a) => found.push(a),
      refer: (id, names) => refers.set(id, [...(refers.get(id) ?? []), ...names]),
    });
  }
  // The app's name is its folder's: a change to it is a render under another name.
  const project: Anchor = { id: "project", kind: "project", label: "the app's name, from its folder", file: "", line: 0, endLine: 0, edits: [{ kind: "name", name: "plugged-in-zq" }] };
  return [project, ...found.map((a) => (refers.has(a.id) ? { ...a, refers: resolve(found, refers.get(a.id)!) } : a))];
};
