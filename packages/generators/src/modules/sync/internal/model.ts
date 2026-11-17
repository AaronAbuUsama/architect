import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import type { Model } from "@formants/compiler";
import { ModelFailed } from "../types.ts";

const compiler = fileURLToPath(import.meta.resolve("@formants/compiler/main"));

/** The model, from a fresh process: a long-lived Nx daemon would otherwise keep blueprint files it imported earlier. */
export const modelOf = (absoluteRoot: string, root: string): Effect.Effect<Model, ModelFailed> =>
  Effect.try({
    try: () => JSON.parse(execFileSync(process.execPath, [compiler, absoluteRoot], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })) as Model,
    catch: (e) => new ModelFailed({ root, problems: String((e as { readonly stderr?: unknown }).stderr ?? e) }),
  });
