import { Effect, Schema } from "effect";
import { workspacePages } from "../../workspace/service.ts";
import { extensionSlots } from "../../extension-host/types.ts";
import { ActionRefused, Screen, type Action, type ActionContext, type ActionFields } from "../types.ts";

const toolSchema = (value: Schema.Constraint) => {
  const { schema, definitions } = Schema.toJsonSchemaDocument(value);
  return Object.keys(definitions).length ? { ...schema, $defs: definitions } : schema;
};

export const defineAction = <Input extends Schema.ConstraintDecoder<unknown>, Output extends Schema.ConstraintDecoder<unknown>>(
  spec: ActionFields & {
    readonly schema: Input;
    readonly outputSchema: Output;
    readonly run: (args: Input["Type"], context: ActionContext) => Effect.Effect<Output["Type"], ActionRefused>;
  },
): Action => {
  const { schema, outputSchema, run, ...fields } = spec;
  return {
    manifest: { ...fields, schema: toolSchema(schema), outputSchema: toolSchema(outputSchema) },
    run: (input, context) => Effect.gen(function* () {
      if (spec.needsApproval) return yield* new ActionRefused({ status: 403, message: "This action requires approval." });
      const result = yield* run(yield* Schema.decodeUnknownEffect(schema)(input), context);
      return yield* Schema.decodeUnknownEffect(outputSchema)(result);
    }),
  };
};

const read = {
  errors: ["Unknown operation", "Evidence unavailable"],
  needsApproval: false, readOnly: true, retrySafe: true, agentTool: true, mcpTool: false,
} as const;

const OperationScope = Schema.Struct({
  operation: Schema.String,
  environment: Schema.optionalKey(Schema.String),
  window: Schema.optionalKey(Schema.Literals(["run", "15", "30", "60"])),
  outcome: Schema.optionalKey(Schema.Literals(["all", "refused", "defect"])),
  tabId: Schema.optionalKey(Schema.String),
});

const refused = (message: string, status = 404) => new ActionRefused({ status, message });

export const isPortalPath = (path: string, context: ActionContext) => {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f]/u.test(path)) return false;
  const base = path.split(/[?#]/u, 1)[0]!;
  if (["/", "/workspace", "/things", "/operations", "/extensions"].includes(base)) return true;
  if (base.startsWith("/workspace/")) return workspacePages(context.blueprint).some((page) => page.path === base);
  const match = /^\/operations\/([^/]+)(?:\/(?:activity|proof|notes))?$/u.exec(base);
  return Boolean(match && Object.hasOwn(context.blueprint.model.operations, match[1]!))
    || /^\/extensions\/[a-z][a-z0-9-]*$/u.test(base);
};

const captureOf = (context: ActionContext, input: typeof OperationScope.Type) => {
  const environment = input.environment ?? context.screen(input.tabId)?.screen.environment ?? "local";
  return environment === context.capture?.environment ? context.capture : undefined;
};

export const actions: Readonly<Record<string, Action>> = {
  "list-extension-slots": defineAction({
    ...read, description: "List named extension mount points and what part of the portal they occupy.",
    schema: Schema.Struct({}), outputSchema: Schema.Struct({
      slots: Schema.Array(Schema.Struct({ id: Schema.String, description: Schema.String })),
    }),
    run: () => Effect.succeed({ slots: Object.entries(extensionSlots).map(([id, description]) => ({ id, description })) }),
  }),
  "list-extensions": defineAction({
    ...read, description: "List installed repo extensions, their mount points and their permitted app actions.",
    schema: Schema.Struct({}), outputSchema: Schema.Struct({ extensions: Schema.Array(Schema.Unknown) }),
    run: (_, { extensions }) => Effect.succeed({ extensions }),
  }),
  "view-screen": defineAction({
    ...read, description: "Read semantic context for the current portal tab, including the selected operation, view, environment and trace.",
    schema: Schema.Struct({ tabId: Schema.optionalKey(Schema.String) }),
    outputSchema: Schema.Struct({ project: Schema.String, tab: Schema.NullOr(Schema.Struct({ tabId: Schema.String, screen: Screen })) }),
    run: ({ tabId }, context) => Effect.succeed({ project: context.blueprint.project, tab: context.screen(tabId) ?? null }),
  }),
  navigate: defineAction({
    ...read, readOnly: false, retrySafe: false, description: "Ask an open portal tab to navigate to one of this template's routes.",
    schema: Schema.Struct({ path: Schema.String, tabId: Schema.optionalKey(Schema.String) }),
    outputSchema: Schema.Struct({ tabId: Schema.String, path: Schema.String, queued: Schema.Literal(true) }),
    run: ({ tabId, path }, context) => Effect.gen(function* () {
      if (!isPortalPath(path, context)) return yield* refused("Choose a route inside this portal.", 400);
      const tab = context.screen(tabId);
      if (!tab || !context.navigate(tab.tabId, path)) return yield* refused("No matching portal tab is open.");
      return { tabId: tab.tabId, path, queued: true as const };
    }),
  }),
  "list-operations": defineAction({
    ...read, description: "List the compiled operations and reads in the portal blueprint.",
    schema: Schema.Struct({}),
    outputSchema: Schema.Struct({ operations: Schema.Array(Schema.Struct({ name: Schema.String, kind: Schema.String, description: Schema.String })) }),
    run: (_, { blueprint }) => Effect.succeed({ operations: Object.values(blueprint.model.operations).map(({ name, kind, description }) => ({ name, kind, description })) }),
  }),
  "read-operation": defineAction({
    ...read, description: "Read an operation's declaration and generated contract reference.",
    schema: Schema.Struct({ operation: Schema.String }),
    outputSchema: Schema.Struct({ declaration: Schema.Unknown, contract: Schema.NullOr(Schema.String) }),
    run: ({ operation }, { blueprint }) => Effect.gen(function* () {
      if (!Object.hasOwn(blueprint.model.operations, operation)) return yield* refused("Unknown operation.");
      const declaration = blueprint.model.operations[operation]!;
      return { declaration, contract: blueprint.docs[`${declaration.thing}/${declaration.verb}.md`] ?? null };
    }),
  }),
  "read-calls": defineAction({
    ...read, description: "Read captured call outcomes for an operation without raw payloads or log messages.",
    schema: OperationScope,
    outputSchema: Schema.Struct({ calls: Schema.Array(Schema.Unknown) }),
    run: (input, context) => Effect.gen(function* () {
      const capture = captureOf(context, input);
      if (!capture || !Object.hasOwn(capture.calls, input.operation)) return yield* refused("No call capture for that operation and environment.");
      const screen = context.screen(input.tabId)?.screen;
      const window = input.window ?? screen?.window ?? "run";
      const outcome = input.outcome ?? screen?.outcome ?? "all";
      const start = window === "run" ? Date.parse(capture.proof.beganAt) : capture.end - Number(window) * 60_000;
      return { calls: (capture.calls[input.operation] ?? []).filter((call) =>
        call.start >= start && call.start < capture.end && (outcome === "all" || call.outcome === outcome)).map(({ spans, ...call }) => call) };
    }),
  }),
  "read-trace": defineAction({
    ...read, description: "Read the sanitized spans of a captured trace for an operation.",
    schema: Schema.Struct({ operation: Schema.String, trace: Schema.String, environment: Schema.optionalKey(Schema.String), tabId: Schema.optionalKey(Schema.String) }),
    outputSchema: Schema.Struct({ trace: Schema.Unknown }),
    run: (input, context) => Effect.gen(function* () {
      const capture = captureOf(context, input);
      const wanted = capture && Object.hasOwn(capture.calls, input.operation)
        ? capture.calls[input.operation]?.find((call) => call.traceId === input.trace) : undefined;
      if (!wanted) return yield* refused("No matching trace in the selected environment.");
      return { trace: wanted };
    }),
  }),
  "read-capture": defineAction({
    ...read, agentTool: false, description: "Load the sanitized capture for the portal views.",
    schema: Schema.Struct({}),
    outputSchema: Schema.Unknown,
    run: (_, context) => Effect.succeed(context.capture ?? null),
  }),
};
