// The styles module: the one stylesheet a portal page links. HeroUI's, Pro's and ours, joined in that order.
import { Data, type Effect } from "effect";

/** A sheet the portal could not read: the package that holds it is not installed here. Carries the package's name, never a path. */
export class StylesUnavailable extends Data.TaggedError("StylesUnavailable")<{ readonly reason: string }> {}

export interface StylesApi {
  /**
   * The portal's stylesheet. HeroUI's and Pro's sheets are read from the installed packages (never copied into this repository),
   * so this runs where those files can be read (a Node host, a test, the dev server). A Worker passes the text in through
   * `PortalContext.css` instead, and this is not called there.
   */
  readonly css: Effect.Effect<string, StylesUnavailable>;
  /** Only our own sheet (the meters, the lifecycle, the rail), which needs no installed package. */
  readonly ours: string;
}
