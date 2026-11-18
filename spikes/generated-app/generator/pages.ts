// The page tree: one page per declaration, each a list of blocks by reference. Pure: the model in, the pages out.
// A block names what it draws (`of`) and which part (`show`); the app draws it from today's model or telemetry at view
// time, so nothing here can drift. Prose is a slot: the app reads it from the repo file named by `prose`.
import type { Block, Model, Page } from "../app/server/forman/types.ts";

const M = (of: string, show: string): Block => ({ block: "Model", of, show });
const L = (of: string, show: string): Block => ({ block: "Live", of, show });
const P: Block = { block: "Prose" };
const dir = (thing: string) => `blueprint/things/${thing}`;

export const pages = (model: Model): ReadonlyArray<Page> => {
  const out: Page[] = [
    { path: "/live", kind: "live", title: "Live", blocks: [L("system", "kpis"), L("system", "budgets"), L("system", "refusals"), L("system", "events"), L("system", "defects")] },
    { path: "/environments", kind: "environments", title: "Environments", blocks: [M("environments", "all"), L("environments", "status")] },
  ];
  for (const [name, t] of Object.entries(model.things)) {
    const thing = `thing:${name}`;
    const ops = Object.values(model.operations).filter((o) => o.thing === name);
    out.push({
      path: `/${name}`, kind: "thing", title: name, about: thing, hash: t.hash, file: `${dir(name)}/thing.ts`, prose: `${dir(name)}/thing.md`,
      blocks: [M(thing, "fields"), P, M(thing, "operations"), L(thing, "counts"), ...(t.machine ? [M(thing, "machine")] : []), M(thing, "events"), M(thing, "errors"), M(thing, "roles")],
    });
    for (const op of ops) {
      const of = `operation:${op.name}`;
      out.push({
        path: `/${name}/${op.verb}`, kind: "operation", title: op.name, about: of, hash: op.hash, file: op.file, prose: op.file.replace(/\.ts$/, ".md"), under: `/${name}`,
        blocks: [
          M(of, "summary"), P, L(of, "calls"),
          M(of, "payload"), M(of, "answer"), ...(op.move ? [M(of, "move")] : []),
          M(of, "refusals"), L(of, "refusals"), L(of, "recent"), L(of, "trace"), M(of, "action"),
        ],
      });
    }
    if (t.machine) {
      out.push({
        path: `/${name}/machine`, kind: "machine", title: `${name} machine`, about: thing, hash: t.hash, file: `${dir(name)}/machine.ts`, prose: `${dir(name)}/machine.md`, under: `/${name}`,
        blocks: [M(thing, "machine"), L(thing, "moves"), P],
      });
    }
    for (const event of Object.keys(t.events ?? {})) {
      const of = `event:${name}.${event}`;
      out.push({ path: `/${name}/events/${event}`, kind: "event", title: event, about: thing, hash: t.hash, file: `${dir(name)}/events.ts`, prose: `${dir(name)}/events.${event}.md`, under: `/${name}`, blocks: [M(of, "fields"), L(of, "latest"), P] });
    }
    for (const error of Object.keys(t.errors ?? {})) {
      const of = `error:${name}.${error}`;
      out.push({ path: `/${name}/errors/${error}`, kind: "error", title: error, about: thing, hash: t.hash, file: `${dir(name)}/errors.ts`, prose: `${dir(name)}/errors.${error}.md`, under: `/${name}`, blocks: [M(of, "summary"), L(of, "seen"), P] });
    }
    for (const role of t.roles ?? []) {
      const of = `role:${name}.${role}`;
      out.push({ path: `/${name}/roles/${role}`, kind: "role", title: `${name}.${role}`, about: thing, hash: t.hash, file: `${dir(name)}/roles.ts`, prose: `${dir(name)}/roles.${role}.md`, under: `/${name}`, blocks: [M(of, "opens"), L(of, "refused"), P] });
    }
  }
  return out;
};

/** The pages module, as source text. */
export const pagesFile = (model: Model): string =>
  [
    `// Generated from examples/acme/generated/model/model.json. Do not edit.`,
    `import type { Page } from "../types.ts";`,
    ``,
    `export const pages: ReadonlyArray<Page> = ${JSON.stringify(pages(model), null, 1)};`,
    ``,
  ].join("\n");
