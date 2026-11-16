import type { Context, Node, ProjectFacts } from "../types.ts";

export const SCHEMA = [{ type: "object", additionalProperties: true }] as const;

const EMPTY: ProjectFacts = { root: "", names: [], errors: [], handlers: {} };

export const factsOf = (context: Context): ProjectFacts => (context.options[0] as ProjectFacts | undefined) ?? EMPTY;

/** The file's path from the project's root, or undefined when it isn't inside it. */
export const pathOf = (context: Context, facts: ProjectFacts): string | undefined => {
  const root = facts.root.endsWith("/") ? facts.root : `${facts.root}/`;
  return context.filename.startsWith(root) ? context.filename.slice(root.length) : undefined;
};

/** `new AllowanceExceeded(...)`: the class constructed, when it is a plain name. */
export const constructed = (node: Node): string | undefined => {
  const callee = node["callee"] as { type?: string; name?: string } | undefined;
  return callee?.type === "Identifier" ? callee.name : undefined;
};
