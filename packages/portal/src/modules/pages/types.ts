// The pages module: every page of the portal as the bytes of a document, drawn from `@orthograph/portal-ui` and nothing else.
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { WindowTrace, WindowView } from "#modules/window/types.js";
import type { BlueprintWire, OperationWire, ThingWire } from "#modules/wire/types.js";

/** What every page is drawn from: the blueprint, and the window's view of the environment (none when no source is wired). */
export interface PageData {
  readonly blueprint: BlueprintWire;
  readonly view: WindowView | undefined;
  /** The stylesheet's address. The page links it and never carries it, so a page is small and its bytes are its content's. */
  readonly css: string;
}

/** The reference pages: one table each, with its live numbers. The values page (and refusal codes) wait for M1.42's wire. */
export const referenceKinds = ["access", "events", "machines", "refusals"] as const;
export type ReferenceKind = (typeof referenceKinds)[number];

export interface PagesApi {
  readonly home: (data: PageData, snapshot: PortalSnapshot) => string;
  readonly thing: (data: PageData, thing: ThingWire) => string;
  readonly operation: (data: PageData, snapshot: PortalSnapshot, operation: OperationWire) => string;
  /** A trace as the drawer's content: structure, timing, outcome and counts, never a value. */
  readonly trace: (data: PageData, id: string, found: WindowTrace) => string;
  readonly journeys: (data: PageData) => string;
  readonly reference: (data: PageData, kind: ReferenceKind) => string;
  readonly notFound: (data: PageData) => string;
}
