import { Names } from "orthograph/server";
import type { RenderedFile } from "#modules/render/types.js";

const GENERATED = "// Generated from the blueprint. Do not edit.";

/** The host entry: the generated blueprint and the portal package, nothing of the project's own. The Worker's one door into the portal. */
export const renderMain = (): RenderedFile => ({
  path: "generated/portal/main.ts",
  scaffold: false,
  content: [
    GENERATED,
    "// The portal's host entry: this project's blueprint (blueprint.json, from the model and the generated docs), served by",
    `// ${Names.pkg("portal")} over the logbook. \`/portal\` is for people and \`/_portal/v1/*\` for data; nothing else is the portal's.`,
    `import { Effect } from "effect";`,
    `import { Portal, type PortalEnv } from "${Names.pkg("portal")}";`,
    `import blueprint from "./blueprint.json" with { type: "json" };`,
    "",
    "export type { PortalEnv };",
    "export const owns: (pathname: string) => boolean = Portal.owns;",
    "export const serve = (request: Request, env: PortalEnv): Promise<Response> => Effect.runPromise(Portal.serve(blueprint, request, env));",
    "",
  ].join("\n"),
});
