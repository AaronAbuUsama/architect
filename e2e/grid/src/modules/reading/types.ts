// What the row evals read, and how: pure functions over the text the outputs wrote. Nothing here reads a file.
import type { CellId, Eval, Finding } from "../grid/types.ts";
import type { ProjectEvidence, ProveReport } from "../project-evidence/types.ts";
import type { SpanView } from "../refusal-evals/types.ts";

export interface ReadingApi {
  /** A finding from its problems: ok exactly when there are none. */
  readonly finding: (problems: ReadonlyArray<string>) => Finding;
  /** The text under a markdown `## <heading>`, up to the next `##`; `undefined` when the page has no such section. */
  readonly mdSection: (page: string, heading: string) => string | undefined;
  /** The body rows of the first markdown table in a section, each as its trimmed cells. */
  readonly mdRows: (section: string) => ReadonlyArray<ReadonlyArray<string>>;
  /** The `- ` bullets of a section, without the dash. */
  readonly mdBullets: (section: string) => ReadonlyArray<string>;
  /** A portal page's own part: everything before the `<h2>Docs</h2>` block, which only embeds the docs page and proves nothing about the portal. */
  readonly portalOwn: (html: string) => string;
  /** The HTML under `<h<level>>title</h<level>>` up to the next heading of the same or a higher level; `undefined` when absent. */
  readonly htmlSection: (html: string, level: number, title: string) => string | undefined;
  /** The cells of every body row of the tables in an HTML fragment, as text. */
  readonly htmlRows: (html: string) => ReadonlyArray<ReadonlyArray<string>>;
  /** The `<li>` items of an HTML fragment, as text. */
  readonly htmlItems: (html: string) => ReadonlyArray<string>;
  /** An HTML fragment as plain text: tags gone, entities decoded, spaces collapsed. */
  readonly htmlText: (html: string) => string;
  /** The problems with a prove line (`handle.claim steps`): none when prove printed it with a tick, one when it did not or was never read. */
  readonly proved: (prove: ProveReport | undefined, line: string) => ReadonlyArray<string>;
  /**
   * An eval for `cell` over a subject the model names: `find` looks it up in the project's evidence (a thing, an operation, a step);
   * a subject the model does not have is red, and otherwise `problems` says what is wrong, empty when the cell is right.
   */
  readonly over: <T>(cell: CellId, noun: string, find: (evidence: ProjectEvidence, subject: string) => T | undefined, problems: (found: T, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>) => Eval<ProjectEvidence>;
  /** The spans with exactly this name. */
  readonly spansNamed: (spans: ReadonlyArray<SpanView>, name: string) => ReadonlyArray<SpanView>;
}
