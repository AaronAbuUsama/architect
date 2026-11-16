// Machines: a thing's states and the moves between them. Moves take their names from their keys.
import type { Event } from "#modules/events/types.ts";
import type { Thing } from "#modules/things/types.ts";
import type { Assertion } from "#modules/journeys/types.ts";

export interface MoveSpec<S extends string> {
  /** The states it may start from; `[]` means it creates the thing. */
  readonly from: ReadonlyArray<S>;
  /** Where it ends: one state, or a list when the handler chooses the outcome. */
  readonly to: S | ReadonlyArray<S>;
  readonly emits: Event;
}

export interface Move<S extends string = string, To extends S = S> {
  readonly kind: "move";
  readonly machine: Machine;
  readonly key: string;
  readonly from: ReadonlyArray<S>;
  readonly to: ReadonlyArray<To>;
  readonly emits: Event;
}

/** The machine's own refusal: a move called from a state it can't start from. Generated as `<Thing>Not<State>`. */
export interface NotFrom {
  readonly kind: "not-from";
  readonly machine: Machine;
  readonly exit: number;
}

export interface Machine<
  S extends string = string,
  Mv extends Record<string, MoveSpec<S>> = Record<string, MoveSpec<S>>,
> {
  readonly kind: "machine";
  readonly thing: Thing;
  readonly states: ReadonlyArray<S>;
  readonly moves: { readonly [K in keyof Mv]: Move<S, ToOf<Mv[K]["to"]> & S> };
  readonly notFrom: NotFrom;
  /** A journey check: the instance with this id is in `state` once the step's call has come back. */
  readonly isIn: (id: unknown, state: S) => Assertion;
}

type ToOf<T> = T extends ReadonlyArray<infer X> ? X : T;

export interface MachinesApi {
  readonly machine: <const S extends string, const Mv extends Record<string, MoveSpec<S>>>(
    thing: Thing,
    spec: { readonly states: ReadonlyArray<S>; readonly moves: Mv; readonly notFrom: { readonly exit: number } },
  ) => Machine<S, Mv>;
}
