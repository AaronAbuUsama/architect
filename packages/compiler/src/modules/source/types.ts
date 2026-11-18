// Where blueprint files come from: listed under a root, and loaded as modules. The compiler sees only this.
import { Context, Data, type Effect } from "effect";

export class SourceError extends Data.TaggedError("SourceError")<{ readonly message: string }> {}

/** One blueprint file: its path under `blueprint/`, with forward slashes, and what it exports. */
export interface LoadedFile {
  readonly path: string;
  readonly exports: Readonly<Record<string, unknown>>;
}

export class BlueprintSource extends Context.Service<BlueprintSource, {
  /** Every `.ts` file under the project's `blueprint/`, sorted, paths relative to it. */
  readonly list: Effect.Effect<ReadonlyArray<string>, SourceError>;
  /** Import one file by its relative path. Blueprint files must have no side effects on import. */
  readonly load: (path: string) => Effect.Effect<LoadedFile, SourceError>;
}>()("@formants/compiler/BlueprintSource") {}
