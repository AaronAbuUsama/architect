// Running journeys: each starting world made by its declared calls, each step called as its cast member, every call
// recorded with its trace so the evals can read what really happened.
import { Data, type Effect } from "effect";
import type { Journey, Operation, Read, StartingWorld, Thing } from "orthograph";
import type { Model } from "@orthograph/compiler";

/** One HTTP call to the world, as `prove` saw it. */
export interface CallRecord {
  readonly journey: string;
  /** The step's title, or `starting world <name>`. */
  readonly step: string;
  readonly actor: string;
  readonly person: string;
  readonly operation: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: number;
  readonly body: unknown;
  readonly trace: string;
  /** The caller's own span id, sent in `traceparent`: the server's root span is its child. */
  readonly parent: string;
  /** Decided before the call from the world's facts and the declaration's `allowed`, never from the answer. */
  readonly mayCall: boolean;
  /** The journal entries the call's trace wrote. */
  readonly journal: ReadonlyArray<{ readonly event: string; readonly move: string; readonly subject: string; readonly fields: Readonly<Record<string, unknown>> }>;
  /** For an answered call whose operation moves: the stored state of what it moved, read right after the call. */
  readonly stored?: string | undefined;
}

/** What `prove` reads back from the environment's database: a row by table and id (wire form), and a trace's journal entries. */
export interface Facts {
  readonly record: (table: string, id: string) => Effect.Effect<Record<string, unknown> | null>;
  readonly journal: (trace: string) => Effect.Effect<CallRecord["journal"]>;
}

export interface StepResult {
  readonly journey: string;
  readonly title: string;
  readonly trace: string;
  /** Empty when the step passed (span checks are added once telemetry is in). */
  readonly failures: ReadonlyArray<string>;
  /** Span names the step expects present or absent in its trace. */
  readonly spans: { readonly present: ReadonlyArray<string>; readonly absent: ReadonlyArray<string> };
}

export interface JourneyRun {
  readonly name: string;
  readonly calls: ReadonlyArray<CallRecord>;
  readonly steps: ReadonlyArray<StepResult>;
  /** Why the journey stopped before its steps, if it did. */
  readonly stopped: string | undefined;
  /** Its steps that run an operation a mount omits: not run, and named (M1-plugins section 3). */
  readonly skipped?: ReadonlyArray<{ readonly step: string; readonly operation: string; readonly file: string }>;
}

/** What the project declares, loaded once: its operations and things by name, its journeys and starting worlds. */
export interface Project {
  readonly root: string;
  readonly model: Model;
  /** Operations and reads, by name. */
  readonly operations: ReadonlyMap<string, Operation | Read>;
  readonly things: ReadonlyMap<string, Thing>;
  readonly journeys: ReadonlyArray<Journey>;
  readonly startingWorlds: ReadonlyMap<string, StartingWorld>;
  /** Each operation a mount omits, by its declaration: a journey's step that runs one is skipped. */
  readonly omitted?: ReadonlyMap<unknown, { readonly operation: string; readonly file: string }>;
}

export class ProjectFailed extends Data.TaggedError("ProjectFailed")<{ readonly message: string }> {}

export interface JourneysApi {
  /** Facts read from an environment's database file, for one that has closed its front door (D3 #127). */
  readonly databaseFacts: (state: string) => Facts;
  readonly load: (root: string, model: Model) => Effect.Effect<Project, ProjectFailed>;
  /**
   * Run one journey against the world at `url`. Span checks wait for telemetry, so they are made later by `check`.
   * `people` is how the cast comes to be: `"world"` (the default) asks the world's `/_world/cast`; `"sign-up"` signs each
   * person up for real through Better Auth's own routes, as someone would on a real environment, which has no cast.
   * `facts` is where the rows and journal are read: by default the world's own front door at `url`; an environment that has
   * closed the door (staging) gives its database instead.
   */
  readonly run: (project: Project, url: string, journey: Journey, index: number, people?: "world" | "sign-up", facts?: Facts) => Effect.Effect<JourneyRun>;
}
