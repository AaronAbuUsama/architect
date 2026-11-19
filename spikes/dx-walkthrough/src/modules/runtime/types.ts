// The runtime's wrapper around a handler, step by step, with the source lines each step is.

/** What decides whether a step runs for an operation: read from the operation's model. */
export interface OpFacts {
  readonly allowed: ReadonlyArray<string>;
  readonly idempotent?: string;
  readonly move?: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string };
  readonly steps: ReadonlyArray<string>;
}

export interface Step {
  readonly id: string;
  readonly phase: "before" | "handler" | "after";
  /** Checkout-relative. */
  readonly file: string;
  readonly find: string;
  readonly to?: string;
  /** One plain line, for the ear. */
  readonly caption: string;
  readonly when: (facts: OpFacts) => readonly [boolean, string];
}

export interface RuntimeStep {
  readonly id: string;
  readonly phase: Step["phase"];
  readonly caption: string;
  readonly file: string;
  readonly line: number;
  readonly endLine: number;
  readonly code: ReadonlyArray<string>;
}
