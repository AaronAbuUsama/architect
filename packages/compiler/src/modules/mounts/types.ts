// Mounts: a project's `blueprint/{features,adapters,projections}/<name>.ts`, each matched to the installed plugin it
// imports, its choices checked, and a feature's things folded in under the mount's name (M1-plugins sections 4 to 7).
import type { Effect } from "effect";
import type { BlueprintSource } from "#modules/source/types.js";
import type { Layout, ThingFiles } from "#modules/model/internal/layout.js";

/** What a mount adds to the model, by the mount's name. */
export interface MountModel {
  readonly kind: "feature" | "adapter" | "projection";
  readonly file: string;
  readonly package: string;
  readonly version: string;
  /** `sha256-…` over the installed package's files: changed bytes at the same version change it. */
  readonly integrity: string;
  /** Each choice by its path in the plugin's choices, and the option picked: chosen, or the first. */
  readonly chosen: Readonly<Record<string, string>>;
  readonly omitted?: ReadonlyArray<string>;
  readonly narrowed?: Readonly<Record<string, ReadonlyArray<string>>>;
  readonly needs?: ReadonlyArray<string>;
  readonly hash: string;
}

export interface Folded {
  /** The plugins' things, under their final names, each with `from`. */
  readonly things: ReadonlyMap<string, ThingFiles>;
  readonly journeys: Layout["journeys"];
  readonly mounts: Readonly<Record<string, MountModel>>;
  readonly problems: ReadonlyArray<string>;
}

export interface MountsApi {
  /** Match each mount in the layout to its installed plugin and fold the plugin in. Problems name the mount's file. */
  readonly fold: (layout: Layout) => Effect.Effect<Folded, never, BlueprintSource>;
  /** Each problem that names a plugin's path, prefixed with the mount file that brought the plugin in. */
  readonly attributed: (problems: ReadonlyArray<string>, mounts: Readonly<Record<string, MountModel>>) => ReadonlyArray<string>;
}
