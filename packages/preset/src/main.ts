// The preset generator Nx runs for `create-nx-workspace --preset=@orthograph/preset`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Tree } from "@nx/devkit";
import { Starter } from "#modules/starter/service.js";
import type { PresetOptions } from "#modules/starter/types.js";

const here = import.meta.dirname;
// Published: dist/main.js beside files/. In the repository: src/main.ts, two folders below examples/starter.
const root = [join(here, "../files"), join(here, "../../../examples/starter")].find((d) => existsSync(join(d, "blueprint")))!;
const { version } = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as { readonly version: string };

export default function preset(tree: Tree, options: PresetOptions) {
  return Starter.write(tree, options, Starter.read(root, version));
}
