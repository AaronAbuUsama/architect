// The canon's MDX components: their props, and nothing else yet. The React site that renders them comes in its own
// thread; until then docs/canon/check.mjs checks every use against these shapes and against the repository.

/** A path relative to the repository's root, such as `examples/acme/journeys/spend-within-allowance.ts`. */
export type RepoPath = string;

/** A milestone slice from design/milestones.md, such as `M1.17`. */
export type Slice = `M${number}.${number}`;

/** A milestone, such as `M1`. */
export type Milestone = `M${number}`;

/** A decision record's id: the start of its file name in design/decisions/, such as `K3` or `O2`. */
export type DecisionId = string;

/**
 * A note the page keeps about itself, so a doc carries its own open questions.
 *
 * - `question`: unsettled. Names the slice that must settle it. Closed by a decision record, and then rewritten as a
 *   `decision` note naming it.
 * - `decision`: settled, with the record that settled it.
 * - `status`: how far the code is from the page, today.
 */
export type NoteProps =
  | { readonly kind: "question"; readonly id: string; readonly slice?: Slice; readonly children: unknown }
  | { readonly kind: "decision"; readonly decision: DecisionId; readonly children: unknown }
  | { readonly kind: "status"; readonly slice?: Slice; readonly children: unknown };

/**
 * A journey pulled into the page from its executable file. Never a prose retelling. The site renders the steps from
 * the file and, once verdicts are published, the evidence each step left.
 */
export interface ScenarioProps {
  /** The journey's file. It must export a `Blueprint.journey`. */
  readonly journey: RepoPath;
  /** One step's name, exactly as the journey writes it. Leave it out to show the whole journey. */
  readonly step?: string;
  /** What to show beside the steps. `spans` needs a world's evidence, so it shows only once one is published. */
  readonly show?: ReadonlyArray<"steps" | "assertions" | "spans">;
}

/**
 * Something rendered from a compiled model, never copied into the page. Exactly one subject. The site compiles the
 * project (`forman check`) and renders from its model, so the page changes when the blueprint does.
 */
export type ModelProps = { readonly project: RepoPath } & (
  | { readonly thing: string; readonly show?: "fields" | "machine" | "operations" | "all" }
  | { readonly operation: string; readonly show?: "declaration" | "steps" | "errors" | "all" }
  | { readonly store: string; readonly show?: "things" | "binding" | "all" }
  | { readonly stores: true }
);

/**
 * An animation from the visuals skill (`.agents/skills/visuals/`): a scene that draws SVG as a function of time,
 * rendered to MP4, GIF and a poster PNG in dark and light. The site plays the MP4 with the PNG as its poster.
 */
export interface SceneProps {
  /** The scene's file name without `.js`, such as `handler-lifecycle`. */
  readonly name: string;
  /** What the reader should watch for, said in one sentence beside the video. */
  readonly caption: string;
  /** A time in seconds to show as a still instead of playing. */
  readonly still?: number;
}

/** The page's status, rendered from its frontmatter (`status`, `milestone`, `slices`, `decisions`). Takes no props. */
export type StatusProps = Record<string, never>;

/** The frontmatter every page carries. check.mjs refuses a page without each field. */
export interface PageFrontmatter {
  readonly title: string;
  readonly concept: string;
  readonly owns: ReadonlyArray<string>;
  readonly questions: ReadonlyArray<string>;
  readonly status: "draft" | "specified" | "proved";
  readonly milestone: Milestone;
  readonly slices: ReadonlyArray<Slice>;
  readonly decisions: ReadonlyArray<DecisionId>;
  readonly links: ReadonlyArray<string>;
}
