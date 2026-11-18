// The forman lint rules: what the types can't see, as an oxlint JS plugin (`forman/*`). Each rule gets what the
// project declares through one options object, which `forman check` writes from the model (rules have no types).

/** What `forman check` tells every rule about the project. */
export interface ProjectFacts {
  /** The project's root, absolute: rules see absolute file names and judge them by their path from here. */
  readonly root: string;
  /** Every declared name: operations, steps, events and errors. None may be written as a string outside generated/. */
  readonly names: ReadonlyArray<string>;
  /** Every declared error class name, across all things. */
  readonly errors: ReadonlyArray<string>;
  /** Each handler file (from the root) and the errors its operation declares. */
  readonly handlers: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** The subset of oxlint's (ESLint's) rule context the rules use. */
export interface Context {
  readonly options: ReadonlyArray<unknown>;
  readonly filename: string;
  readonly sourceCode: { readonly getText: (node?: Node) => string };
  readonly report: (r: { readonly node: Node; readonly message: string }) => void;
}

export interface Node {
  readonly type: string;
  readonly parent?: Node;
  readonly [key: string]: unknown;
}

export interface Rule {
  readonly meta: { readonly schema: ReadonlyArray<unknown>; readonly docs: { readonly description: string } };
  readonly create: (context: Context) => Record<string, (node: Node) => void>;
}

export interface Plugin {
  readonly meta: { readonly name: "forman" };
  readonly rules: Readonly<Record<string, Rule>>;
}
