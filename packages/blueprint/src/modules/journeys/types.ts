// Journeys: a story told in declared operations, and the starting worlds it begins from. Pure descriptions: `prove`
// runs them against a real world and checks every step. Nothing here calls anything.
import type { Allowed } from "#modules/roles/types.ts";
import type { AnyErrorClass } from "#modules/errors/types.ts";
import type { Event } from "#modules/events/types.ts";
import type { Operation, PayloadOf } from "#modules/operations/types.ts";

/**
 * A value known only once the world runs: `s.world.organization`, `s.olga.person`, `s.last.allowance`. Its path is
 * read by `prove`; `last` is the answer of the most recent call, so a step's own checks see that step's answer.
 */
export interface Ref {
  readonly path: ReadonlyArray<string>;
}

/** One declared operation, called by one cast member. */
export interface Call {
  readonly kind: "call";
  readonly actor: string;
  readonly operation: Operation;
  readonly payload: { readonly [field: string]: unknown };
}

/** What a step checks once its call has come back. */
export type Assertion =
  | { readonly kind: "expect"; readonly pick: (answer: any) => unknown; readonly match: RegExp }
  | { readonly kind: "emits"; readonly event: Event; readonly fields: { readonly [field: string]: unknown } }
  | { readonly kind: "no-events" }
  | { readonly kind: "refuses"; readonly error: AnyErrorClass; readonly fields: { readonly [field: string]: unknown } }
  | { readonly kind: "spans"; readonly present: ReadonlyArray<string>; readonly absent: ReadonlyArray<string> }
  | { readonly kind: "is-in"; readonly thing: unknown; readonly id: unknown; readonly state: string };

export interface Step {
  readonly kind: "step";
  readonly title: string;
  readonly call: Call;
  readonly checks: ReadonlyArray<Assertion>;
}

/** A cast member as a script sees them. `person` is the id the world gave them. */
export interface Actor {
  readonly person: any;
  readonly run: <O extends Operation>(operation: O, payload: { readonly [K in keyof PayloadOf<O>]: PayloadOf<O>[K] | Ref }) => Call;
}

export type Cast = { readonly [name: string]: Allowed };

export type Script<C extends Cast> = { readonly [K in keyof C]: Actor } & {
  /** What the starting world gave. */
  readonly world: any;
  /** The answer of the most recent call. */
  readonly last: any;
  readonly step: (title: string, call: Call, ...checks: ReadonlyArray<Assertion>) => Step;
};

export interface Journey<C extends Cast = Cast> {
  readonly kind: "journey";
  readonly name: string;
  readonly cast: C;
  readonly starts: string | undefined;
  readonly steps: (s: Script<C>) => ReadonlyArray<Step>;
}

export interface StartingWorld<C extends Cast = Cast> {
  readonly kind: "starting-world";
  readonly name: string;
  readonly cast: C;
  readonly makes: (s: Script<C>) => ReadonlyArray<Call>;
  readonly gives: (s: Script<C>) => { readonly [key: string]: unknown };
}

export interface JourneysApi {
  readonly journey: <const C extends Cast>(name: string, spec: {
    readonly cast: C;
    readonly starts?: string;
    readonly steps: (s: Script<C>) => ReadonlyArray<Step>;
  }) => Journey<C>;
  readonly startingWorld: <const C extends Cast>(name: string, spec: {
    readonly cast: C;
    readonly makes: (s: Script<C>) => ReadonlyArray<Call>;
    readonly gives: (s: Script<C>) => { readonly [key: string]: unknown };
  }) => StartingWorld<C>;
}

/** The checks a step can make, imported by name: `import { emits, expect } from "@architect/blueprint"`. */
export interface ChecksApi {
  readonly expect: (pick: (answer: any) => unknown) => { readonly toMatch: (match: RegExp) => Assertion };
  readonly emits: <E extends Event>(event: E, fields: { readonly [K in keyof E["fields"]]?: unknown }) => Assertion;
  readonly noEvents: () => Assertion;
  readonly refuses: (error: AnyErrorClass, fields?: { readonly [field: string]: unknown }) => Assertion;
  readonly spans: (spec: { readonly present?: ReadonlyArray<string>; readonly absent?: ReadonlyArray<string> }) => Assertion;
}

/** What `prove` uses to run a script: the refs in it, read against what the world has said so far. */
export interface Scripts {
  readonly script: <C extends Cast>(cast: C) => Script<C>;
  readonly isRef: (x: unknown) => x is Ref;
  /** Every ref inside `value` replaced by what `env` holds at its path; paths the world never gave are `missing`. */
  readonly resolve: (value: unknown, env: { readonly [root: string]: unknown }) => { readonly value: unknown; readonly missing: ReadonlyArray<string> };
}
