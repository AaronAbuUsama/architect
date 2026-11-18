import { Data, Schema, type Effect } from "effect";
import type { ExtensionManifest } from "../extension-host/types.ts";
import { operationViews, type Capture, type OperationsBlueprint } from "../operations/types.ts";

export const Screen = Schema.Struct({
  path: Schema.String,
  pageKey: Schema.optionalKey(Schema.String),
  operation: Schema.optionalKey(Schema.String),
  view: Schema.optionalKey(Schema.Literals(operationViews)),
  environment: Schema.optionalKey(Schema.String),
  window: Schema.optionalKey(Schema.Literals(["run", "15", "30", "60"])),
  outcome: Schema.optionalKey(Schema.Literals(["all", "refused", "defect"])),
  trace: Schema.optionalKey(Schema.String),
});
export type ScreenContext = typeof Screen.Type;
export interface ActiveScreen { readonly tabId: string; readonly screen: ScreenContext }

export interface ActionContext {
  readonly blueprint: OperationsBlueprint;
  readonly capture: Capture | undefined;
  readonly extensions: readonly ExtensionManifest[];
  readonly screen: (tabId?: string) => ActiveScreen | undefined;
  readonly navigate: (tabId: string, path: string) => boolean;
}

export class ActionRefused extends Data.TaggedError("ActionRefused")<{
  readonly status: number;
  readonly message: string;
}> {}

export interface ActionFields {
  readonly description: string;
  readonly errors: readonly string[];
  readonly readOnly: boolean;
  readonly retrySafe: boolean;
  readonly needsApproval: boolean;
  readonly agentTool: boolean;
  readonly mcpTool: false;
}

export interface Action {
  readonly manifest: ActionFields & {
    readonly schema: Readonly<Record<string, unknown>>;
    readonly outputSchema: Readonly<Record<string, unknown>>;
  };
  readonly run: (input: unknown, context: ActionContext) => Effect.Effect<unknown, ActionRefused | Schema.SchemaError>;
}
