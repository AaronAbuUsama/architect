// Reading HeroUI's and Pro's precompiled sheets from where the package manager put them. This is the one file of the package that
// touches the file system, and it is for a Node host (the dev server, a test, a build step); a Worker never reaches it.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { stylesUnavailable, type StylesUnavailable } from "../types.ts";

const here = createRequire(import.meta.url);

/** One installed package's file, by its package name and the path under its folder. */
export const sheet = (name: string, file: string): Effect.Effect<string, StylesUnavailable> =>
  Effect.try({
    try: () => readFileSync(join(dirname(here.resolve(`${name}/package.json`)), file), "utf8"),
    catch: () => stylesUnavailable(`${name} is not installed here, so its stylesheet cannot be read`),
  });
