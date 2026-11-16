// Comparing two models: what changed, declaration by declaration, and what each operation's proof depends on.
import type { Model } from "#modules/model/types.js";

export type Kind = "value" | "thing" | "operation";

/** One declaration that differs between two models. `parts` names the fields of its entry that changed. */
export interface Change {
  readonly kind: Kind;
  readonly name: string;
  readonly change: "added" | "removed" | "changed";
  readonly parts: ReadonlyArray<string>;
}

/** What an operation's proof rests on: `operation:<name>` and `thing:<name>`, each with the hash it had. */
export type Depends = Readonly<Record<string, string>>;

export interface CompareApi {
  /** Every declaration that was added, removed or changed from `before` to `after`, in kind then name order. */
  readonly models: (before: Model, after: Model) => ReadonlyArray<Change>;
  /** The declarations an operation's proof depends on: itself, its thing, the things its own or its
   * thing's fields refer to, and the things whose roles may call it. */
  readonly dependsOn: (model: Model, operation: string) => Depends;
  /** The current hash of each key of `depends`, or undefined when it no longer exists. */
  readonly hashOf: (model: Model, key: string) => string | undefined;
}
