// A copy of examples/acme of a test file's own, so no test proves or starts a world on the shared example and writes its
// `.ortho/` there. The copy sits in a fresh temp folder, its node_modules linked to acme's; `remove` deletes only that folder.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

export const acme = resolve(import.meta.dirname, "../../../examples/acme");
const repo = resolve(acme, "../..");

// Dot-folders (.ortho, .wrangler) belong to whatever runs there.
const visible = (from: string) => !basename(from).startsWith(".");

export const acmeCopy = () => {
  const parent = mkdtempSync(join(realpathSync(tmpdir()), "ortho-prove-"));
  const root = join(parent, "acme");
  mkdirSync(root);
  for (const part of ["ortho.config.ts", "blueprint", "generated", "src", "journeys", "package.json"]) {
    if (existsSync(join(acme, part))) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  }
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(acme, "node_modules"))) if (entry !== ".bin") symlinkSync(join(acme, "node_modules", entry), join(root, "node_modules", entry));
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    extends: join(acme, "tsconfig.json"),
    compilerOptions: { typeRoots: [join(repo, "node_modules/@types"), join(acme, "node_modules")] },
    include: ["ortho.config.ts", "blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"] }));
  return { root, remove: () => rmSync(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) };
};
