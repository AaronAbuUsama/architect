// What the app reads: the narrow view of acme's model.json, and the generated page tree. The generator imports these too.
export interface Value { readonly type: string; readonly prefix?: string; readonly bits?: number; readonly max?: number }
export interface Field { readonly value: Value; readonly ref?: string; readonly named?: string; readonly visibility?: string }
export type Fields = Readonly<Record<string, Field>>;
export interface Allowed { readonly kind: string; readonly role?: string; readonly path?: string }
export interface Move { readonly key?: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string }

export interface Operation {
  readonly kind: "operation" | "read";
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly file: string;
  readonly description?: string;
  readonly payload?: Fields;
  readonly answer?: Fields;
  readonly move?: Move;
  readonly errors?: ReadonlyArray<string>;
  readonly refusals?: ReadonlyArray<string>;
  readonly allowed?: ReadonlyArray<Allowed>;
  readonly steps?: Readonly<Record<string, { name: string; type: string }>>;
  readonly idempotent?: string | null;
  readonly budget?: { readonly p95Ms?: number };
  readonly hash: string;
}

export interface Thing {
  readonly name: string;
  readonly identifier: string;
  readonly code: string;
  readonly description?: string;
  readonly fields: Fields;
  readonly lives?: string;
  readonly machine?: {
    readonly states: ReadonlyArray<string>;
    readonly moves: Readonly<Record<string, Move>>;
    readonly notFrom?: { readonly error: string; readonly exit: number; readonly code: string };
  };
  readonly events?: Readonly<Record<string, Fields>>;
  readonly errors?: Readonly<Record<string, { fields?: Fields; exit: number; code: string }>>;
  readonly roles?: ReadonlyArray<string>;
  readonly hash: string;
}

export interface Environment {
  readonly name: string;
  readonly file: string;
  readonly runs: string;
  readonly identity: string;
  readonly cloud: { readonly provider: string; readonly database: string } | null;
  readonly database: string | null;
  readonly promotesFrom: string | null;
  readonly telemetry?: ReadonlyArray<{ sink: string }>;
  readonly deploy?: Readonly<Record<string, { how: string; domain?: string }>>;
  readonly hash: string;
}

export interface Model {
  readonly refusals: Readonly<Record<string, string>>;
  readonly values: Readonly<Record<string, Value>>;
  readonly things: Readonly<Record<string, Thing>>;
  readonly operations: Readonly<Record<string, Operation>>;
  readonly environments: Readonly<Record<string, Environment>>;
}

export type Block =
  | { readonly block: "Model"; readonly of: string; readonly show: string }
  | { readonly block: "Live"; readonly of: string; readonly show: string }
  | { readonly block: "Prose" };

export interface Page {
  readonly path: string;
  readonly kind: "live" | "environments" | "thing" | "operation" | "machine" | "event" | "error" | "role";
  readonly title: string;
  /** What the page is about, as `kind:name`; prose on it is pinned to this declaration's hash. */
  readonly about?: string;
  readonly hash?: string;
  /** The declaration's file, shown in every derived block's header. */
  readonly file?: string;
  /** Where the page's prose lives: beside the declaration, in the repo (F6 #3). */
  readonly prose?: string;
  /** The page's parent in the tree. */
  readonly under?: string;
  readonly blocks: ReadonlyArray<Block>;
}
