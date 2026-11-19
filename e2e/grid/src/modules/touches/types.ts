// Which building blocks did a journey touch? Goal 3: "a cell is switched on by the first journey that touches it", and a
// journey's cells are checked "when every step of a journey is green". The answer is a function of two things the climb
// already has: the compiled model (what each step calls, expects and refuses) and prove's own report (did the journey go green).
import type { BlockId, SwitchedOn } from "../grid/types.ts";

export interface StepCheck { readonly kind: string; readonly error?: string; readonly event?: string; readonly thing?: string }
export interface JourneyView {
  readonly name: string;
  readonly cast?: Readonly<Record<string, { readonly kind: string; readonly role?: string }>>;
  readonly steps: ReadonlyArray<{ readonly title: string; readonly call: { readonly actor: string; readonly operation: string }; readonly checks: ReadonlyArray<StepCheck> }>;
}
/** What the model says that touching reads. `generated/model/model.json` has all of it. */
export interface TouchModel {
  readonly journeys?: Readonly<Record<string, JourneyView>>;
  readonly operations: Readonly<Record<string, {
    readonly name: string;
    readonly thing: string;
    readonly move?: null | { readonly emits: string };
    readonly steps?: Readonly<Record<string, { readonly name: string }>>;
    readonly payload?: Readonly<Record<string, { readonly visibility?: unknown }>>;
    readonly answer?: Readonly<Record<string, { readonly visibility?: unknown }>>;
  }>>;
  readonly things: Readonly<Record<string, {
    readonly machine?: null | { readonly notFrom: { readonly error: string } };
    readonly fields?: Readonly<Record<string, { readonly visibility?: unknown }>>;
  }>>;
}

/** One building block used, by name: `error` `HandleTaken`, `operation` `handle.claim`. */
export interface Row { readonly block: BlockId; readonly subject: string }

export interface Touched {
  /** Did prove report every step of the journey green. Nothing is touched by a journey that is not. */
  readonly green: boolean;
  readonly rows: ReadonlyArray<Row>;
  /** Why it is not green or not known, when that is the case. */
  readonly problems: ReadonlyArray<string>;
}

export interface TouchesApi {
  /** The rows a journey used, from the model, once prove's report (`journey <name> ✔ n/n steps`) says it went green. */
  readonly of: (options: { readonly model: TouchModel; readonly journey: string; readonly report: ReadonlyArray<string> }) => Touched;
  /**
   * The list entries that switch these rows on: each touched block in all nine outputs, with or without an eval (a cell with
   * none is red, which is the work for a framework builder), the journey recorded as what switched it on. Feed them to `Grid.switchOn`.
   */
  readonly entries: (touched: Touched, journey: string) => ReadonlyArray<SwitchedOn>;
}
