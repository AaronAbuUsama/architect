import type { OperationsBlueprint } from "../operations/types.ts";
import type { WorkspacePage } from "./types.ts";

const human = (name: string) => name.replaceAll("-", " ").replace(/^./u, (letter) => letter.toUpperCase());
const safe = (name: string) => /^[a-z0-9][a-z0-9-]*$/u.test(name);

export const workspacePages = (blueprint: OperationsBlueprint): readonly WorkspacePage[] => {
  const { things, operations } = blueprint.model;
  return Object.values(things).filter((thing) => safe(thing.name)).flatMap((thing) => {
    const group = thing.name;
    const thingPage: WorkspacePage = {
      key: `${group}/index.md`, title: human(group), path: `/workspace/${group}`,
      kind: "thing", group, name: group, hash: thing.hash, noteFile: `${group}/thing.md`,
    };
    const children: WorkspacePage[] = Object.values(operations).filter((op) => op.thing === group && safe(op.verb)).map((op) => ({
      key: `${group}/${op.verb}.md`, title: human(op.verb), path: `${thingPage.path}/${op.verb}`,
      kind: "operation", group, name: op.name, hash: op.hash, noteFile: `${group}/verbs/${op.verb}.md`,
    }));
    return [thingPage, ...children].filter((page) => Object.hasOwn(blueprint.docs, page.key));
  });
};

export const documentBody = (source: string) =>
  source.replace(/^<!--[^]*?-->\s*/u, "").replace(/^# [^\n]+\n+/u, "");
