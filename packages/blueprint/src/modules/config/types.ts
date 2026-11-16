// The project's one loose file, `architect.config.ts`: what to generate, how people sign in, where telemetry goes.
export interface AuthKit {
  readonly kind: "auth";
  readonly adapter: "better-auth";
  readonly organizations: boolean;
  readonly apiKeys: boolean;
  readonly deviceLogin: boolean;
  /** Agents sign in to the remote MCP server (layer two). */
  readonly oauthProvider: boolean;
}

export interface TelemetrySink {
  readonly kind: "telemetry";
  readonly protocol: "otlp";
  readonly sink: string;
  readonly dataset: string;
}

/** `true` is the standard name; text renames the output. */
export type Output = boolean | string;

export interface ConfigSpec {
  readonly name: string;
  readonly outputs?: {
    readonly server?: Output; readonly api?: Output; readonly sdk?: Output; readonly cli?: Output;
    readonly docs?: Output; readonly mcp?: Output; readonly portal?: Output;
  };
  readonly auth?: AuthKit;
  readonly telemetry?: TelemetrySink;
}

export interface Config extends ConfigSpec {
  readonly kind: "config";
}

export interface ConfigApi {
  readonly config: (spec: ConfigSpec) => Config;
}

export interface AuthApi {
  readonly betterAuth: (spec?: Partial<Omit<AuthKit, "kind" | "adapter">>) => AuthKit;
}

export interface TelemetryApi {
  readonly otlp: (spec: { readonly sink: string; readonly dataset: string }) => TelemetrySink;
}
