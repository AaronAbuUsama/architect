// Running journeys: each starting world made by its declared calls, each step called as its cast member, every call
// recorded with its trace so the evals can read what really happened.
import { Data, type Effect } from "effect";
import type { Journey, Operation, StartingWorld, Thing } from "@architect/blueprint";
import type { Model } from "@architect/compiler";

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
}

/** What the project declares, loaded once: its operations and things by name, its journeys and starting worlds. */
export interface Project {
  readonly root: string;
  readonly model: Model;
  readonly operations: ReadonlyMap<string, Operation>;
  readonly things: ReadonlyMap<string, Thing>;
  readonly journeys: ReadonlyArray<Journey>;
  readonly startingWorlds: ReadonlyMap<string, StartingWorld>;
}

export class ProjectFailed extends Data.TaggedError("ProjectFailed")<{ readonly message: string }> {}

export interface JourneysApi {
  readonly load: (root: string, model: Model) => Effect.Effect<Project, ProjectFailed>;
  /** Run one journey against the world at `url`. Span checks wait for telemetry, so they are made later by `check`. */
  readonly run: (project: Project, url: string, journey: Journey, index: number) => Effect.Effect<JourneyRun>;
}
