// Anchors: every declaration in the blueprint the page can point at, with where it is and how to change it a little.
// A change is how provenance is measured: change one declaration, regenerate, and the output lines that moved are its.

/** The building blocks of K14's grid, plus the parts of an operation and the app's own name. */
export type Kind =
  | "project"
  | "thing"
  | "field"
  | "operation"
  | "description"
  | "payload"
  | "answer"
  | "move"
  | "refusal"
  | "allowed"
  | "step"
  | "idempotent"
  | "budget"
  | "machine"
  | "state"
  | "event"
  | "error"
  | "exit"
  | "role"
  | "rule"
  | "value"
  | "visibility"
  | "other";

/** A small change to the blueprint. Offsets are into the file as copied, before any other change. */
export type Edit =
  | { readonly kind: "splice"; readonly file: string; readonly start: number; readonly end: number; readonly text: string }
  /** A regular expression over every `.ts` file under `within` (project-relative), such as renaming an identifier. */
  | { readonly kind: "regex"; readonly within: ReadonlyArray<string>; readonly pattern: string; readonly replace: string }
  | { readonly kind: "move"; readonly from: string; readonly to: string }
  /** Render under another app name: the name comes from the project's folder, not from a file's text. */
  | { readonly kind: "name"; readonly name: string };

export interface Anchor {
  /** Stable and readable: `handle.claim/description`, `handle/machine/state:claimed`. */
  readonly id: string;
  readonly kind: Kind;
  /** A few words: "refuses HandleTaken", "state claimed". */
  readonly label: string;
  readonly thing?: string;
  /** The operation the declaration belongs to, `handle.claim`, when it is part of one. */
  readonly op?: string;
  /** Project-relative: `blueprint/things/handle/verbs/claim.ts`. */
  readonly file: string;
  readonly line: number;
  readonly endLine: number;
  /** The anchor this one sits inside: a payload field's operation, a state's machine. */
  readonly parent?: string;
  /** What the operation names by reference: `handle/error:HandleTaken` for its refusal, the move's machine move. */
  readonly refers?: ReadonlyArray<string>;
  /** Absent for a whole that is only the sum of its parts (a machine): its lines are its children's. */
  readonly edits?: ReadonlyArray<Edit>;
}
