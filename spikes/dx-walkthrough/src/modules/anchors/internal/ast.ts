// Small helpers over the TypeScript syntax tree: where a node is, and the edits that change it a little.
import type { Anchor, Edit } from "../types.ts";

// The TypeScript compiler is loaded from the m1 checkout at run time, so its types are not imported here.
export type TS = any;
export type Node = any;

/** The suffix every change adds: short, and found in no blueprint. */
export const MARK = "Zq";
/** The suffix for a folder or file name, which must stay lower-case words joined by dashes. */
export const FOLDER = "-zq";

export interface Ctx {
  readonly ts: TS;
  readonly sf: Node;
  readonly text: string;
  /** Project-relative. */
  readonly file: string;
  readonly thing?: string;
  readonly add: (a: Anchor) => void;
  /** Names an anchor refers to, resolved once every file is read: `error:HandleTaken`. */
  readonly refer: (id: string, names: ReadonlyArray<string>) => void;
}

export const lineAt = (c: Ctx, pos: number): number => c.sf.getLineAndCharacterOfPosition(pos).line + 1;
export const span = (c: Ctx, node: Node) => ({ line: lineAt(c, node.getStart(c.sf)), endLine: lineAt(c, node.end) });
export const textOf = (c: Ctx, node: Node): string => node.getText(c.sf);
export const keyOf = (c: Ctx, p: Node): string => (p.name ? textOf(c, p.name).replace(/^["']|["']$/g, "") : "");
export const propOf = (c: Ctx, obj: Node, name: string): Node | undefined =>
  obj && c.ts.isObjectLiteralExpression(obj) ? obj.properties.find((p: Node) => keyOf(c, p) === name) : undefined;

export const splice = (c: Ctx, start: number, end: number, text: string): Edit => ({ kind: "splice", file: c.file, start, end, text });

/** Remove a property or an array element, with its trailing comma. */
export const removal = (c: Ctx, node: Node): Edit => {
  const comma = /^\s*,/.exec(c.text.slice(node.end));
  return splice(c, node.getStart(c.sf), node.end + (comma ? comma[0].length : 0), "");
};

export const renameKey = (c: Ctx, p: Node): Edit => splice(c, p.name.getStart(c.sf), p.name.end, `${keyOf(c, p)}${MARK}`);

/** Replace a string literal by another string. */
export const restring = (c: Ctx, literal: Node, change: (s: string) => string): Edit =>
  splice(c, literal.getStart(c.sf), literal.end, JSON.stringify(change(literal.text)));

export const replaceNode = (c: Ctx, node: Node, text: string): Edit => splice(c, node.getStart(c.sf), node.end, text);

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Rename an identifier everywhere the compiler reads: the blueprint and the journeys. */
export const renameIdentifier = (name: string): Edit => ({
  kind: "regex",
  within: ["blueprint", "journeys"],
  pattern: `(?<![\\w$])${escape(name)}(?![\\w$])`,
  replace: `${name}${MARK}`,
});

export const regex = (within: ReadonlyArray<string>, pattern: string, replace: string): Edit => ({ kind: "regex", within, pattern, replace });
export const quoted = (s: string): string => `(["'])${escape(s)}\\1`;
export { escape };

/** The call a declaration is made with, `Blueprint.thing(...)`, and its callee's text. */
export const callOf = (c: Ctx, node: Node): { readonly call: Node; readonly callee: string } | undefined =>
  node && c.ts.isCallExpression(node) ? { call: node, callee: textOf(c, node.expression) } : undefined;
