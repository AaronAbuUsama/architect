// K16, as far as it has been pushed. Every part of it is a proposal.

export interface ProposedScaffold {
  /** The declaration its header says it was scaffolded from. */
  readonly from: string;
  readonly lines: ReadonlyArray<string>;
  /** When the example is a file on the branch rather than a block in the record. */
  readonly file?: string;
}

export type K16 =
  | { readonly status: "not-pushed"; readonly ref: string }
  | { readonly status: "no-record"; readonly ref: string; readonly sha: string }
  | {
      readonly status: "found";
      readonly ref: string;
      readonly sha: string;
      readonly path: string;
      readonly title: string;
      readonly examples: ReadonlyArray<ProposedScaffold>;
      /** The pre-handling map's table rows, the header row first, as written. */
      readonly preHandling: ReadonlyArray<ReadonlyArray<string>>;
    };
