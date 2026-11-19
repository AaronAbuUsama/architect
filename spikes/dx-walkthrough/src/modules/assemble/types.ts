// The data file's parts that are per operation.
import type { Anchor } from "#modules/anchors/types.js";
import type { Traced } from "#modules/trace/types.js";

export type Output = "model" | "api" | "handler" | "server" | "sdk" | "cli" | "mcp" | "docs" | "portal" | "scaffold";

export interface AssembleInput {
  readonly projectDir: string;
  readonly anchors: ReadonlyArray<Anchor>;
  readonly traced: Traced;
  /** The compiler's model, as JSON. */
  readonly model: any;
}

export interface OpData {
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly description: string;
  readonly file: string;
  /** The files that are this operation's alone, by output. */
  readonly primary: Readonly<Record<string, string>>;
  /** Shared files (the server, MCP's catalog, the portal's data): the 0-based lines this operation's declarations make. */
  readonly excerpts: Readonly<Record<string, ReadonlyArray<number>>>;
  /** Every anchor (by index) that makes a line of this operation's own files, or that the operation names. */
  readonly related: ReadonlyArray<number>;
  readonly machine: { readonly states: ReadonlyArray<string>; readonly moves: unknown; readonly lit: string | null } | null;
  readonly runtime: ReadonlyArray<{ readonly id: string; readonly runs: boolean; readonly why: string }>;
  /** The handler in the copied example's `src/`, as its author left it. */
  readonly handler: { readonly path: string; readonly lines: ReadonlyArray<string>; readonly filled: boolean } | null;
}
