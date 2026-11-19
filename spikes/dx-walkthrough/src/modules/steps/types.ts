// Steps: Plugged In made from nothing, one real command at a time, with the project's files after each step and the
// traces prove's own Collector wrote. The page steps through these; nothing in them is typed by hand but the captions.

/** The real tools, as functions; the entry file builds them from the checkout. */
export interface StepTools {
  /** `create-nx-workspace <name> --preset=@orthograph/preset`: the preset run through Nx's own tree into `dir`. The paths it wrote. */
  readonly preset: (dir: string, name: string) => ReadonlyArray<string>;
  /** `ortho <args>` with `dir` as the current folder: what it printed (stdout and stderr, in order) and its exit code. */
  readonly ortho: (dir: string, args: ReadonlyArray<string>) => { readonly out: string; readonly exit: number };
  readonly now: () => number;
}

export interface StepsInput {
  /** The project folder the steps run in; it ends as Codex's draft plus what the commands made. */
  readonly projectDir: string;
  /** A copy of Codex's draft, as checked out: where the "you write it" steps take their files from. */
  readonly draftDir: string;
  readonly name: string;
  readonly tools: StepTools;
}

/** One command the terminal shows, and what it really printed. */
export interface Run {
  /** As a person types it: `pnpm ortho generate`. */
  readonly command: string;
  readonly out: ReadonlyArray<string>;
  readonly exit: number;
  readonly millis: number;
}

/** A file after a step: its path and its content's index in `blobs`. */
export type FileAt = readonly [path: string, blob: number];

export interface Step {
  readonly id: string;
  readonly title: string;
  /** One plain spoken sentence. */
  readonly caption: string;
  /** "command": the terminal runs it. "edit": a person or an agent writes files; nothing runs. */
  readonly kind: "command" | "edit";
  /** Who does it, for an edit step. */
  readonly who?: string;
  readonly runs: ReadonlyArray<Run>;
  /** Anything the page must say so the step isn't misread. */
  readonly note?: string;
  readonly files: ReadonlyArray<FileAt>;
  readonly added: ReadonlyArray<string>;
  readonly changed: ReadonlyArray<string>;
  readonly removed: ReadonlyArray<string>;
  /** The file the editor opens on. */
  readonly open?: string;
}

/** A span of a trace, its times in milliseconds from the trace's start. */
export interface Span {
  readonly name: string;
  /** Index of the parent in the trace's spans, or -1 for the root. */
  readonly parent: number;
  readonly start: number;
  readonly duration: number;
  /** OTLP status: 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
  readonly events: ReadonlyArray<{ readonly name: string; readonly at: number }>;
}

export interface Trace {
  readonly id: string;
  /** Milliseconds from the first trace of the run to this one's start. */
  readonly at: number;
  readonly journey: string;
  /** The journey's step that made the call, as prove names it. */
  readonly step: string;
  readonly operation: string;
  readonly refusal?: string;
  readonly spans: ReadonlyArray<Span>;
}

export interface Steps {
  readonly steps: ReadonlyArray<Step>;
  readonly blobs: ReadonlyArray<string>;
  readonly traces: ReadonlyArray<Trace>;
  /** A step whose command failed, or generate's files that differ from the traced render. */
  readonly problems: ReadonlyArray<string>;
}
