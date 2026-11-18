// The project's one loose file, `architect.config.ts`: what to generate, how people sign in, what it generates.
export interface AuthKit {
  readonly kind: "auth";
  readonly adapter: "better-auth";
  readonly organizations: boolean;
  readonly apiKeys: boolean;
  readonly deviceLogin: boolean;
  /** Agents sign in to the remote MCP server (layer two). */
  readonly oauthProvider: boolean;
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
