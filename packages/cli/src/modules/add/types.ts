// Adding to a blueprint: `architect add thing | operation | read | journey` writes declarations with blanks in them.
// A blank (`Blueprint.todo`) compiles, and `architect check` names each one until it is filled.
import { Data } from "effect";

/** One file `add` would write: its path from the project's root, and what goes in it. */
export interface Written {
  readonly path: string;
  readonly content: string;
}

export type What = "thing" | "operation" | "read" | "journey";

/** The name doesn't fit what is being added, or a file it would write is already there. */
export class AddRefused extends Data.TaggedError("AddRefused")<{ readonly message: string }> {}

export interface AddApi {
  /**
   * The files for `add <what> <name>`, never overwriting one that `exists`. A thing is `allowance`; an operation or a
   * read is `allowance.spend`; a journey is its title, `"spend within an allowance"`.
   */
  readonly plan: (what: What, name: string, exists: (path: string) => boolean) => ReadonlyArray<Written> | AddRefused;
}
