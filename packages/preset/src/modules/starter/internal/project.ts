// The files around the blueprint that make the workspace a project: its package.json, tsconfig and ignores.
const EXACT = {
  effect: "4.1.1",
  "@effect/platform-node": "4.1.1",
  "@effect/sql-d1": "4.1.1",
};
const DEV = {
  "@cloudflare/workers-types": "5.20261101.1",
  "@types/node": "24.19.2",
  "@typescript/native": "npm:typescript@7.0.2",
  oxlint: "1.90.0",
  wrangler: "4.156.1",
};

export const packageJson = (existing: Record<string, unknown>, name: string, version: string) => {
  const architect = Object.fromEntries(["blueprint", "host-cloudflare", "target-effect"].map((p) => [`@architect/${p}`, version]));
  return {
    ...existing,
    type: "module",
    scripts: { ...(existing["scripts"] as object | undefined), architect: "architect" },
    bin: { [name]: "./generated/cli/src/main.ts" },
    dependencies: { ...(existing["dependencies"] as object | undefined), ...architect, ...EXACT },
    devDependencies: { ...(existing["devDependencies"] as object | undefined), "@architect/cli": version, ...DEV },
  };
};

export const TSCONFIG = {
  compilerOptions: {
    target: "es2024", module: "nodenext", moduleResolution: "nodenext", lib: ["es2024"],
    types: ["node", "@cloudflare/workers-types"],
    strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, noImplicitOverride: true,
    verbatimModuleSyntax: true, erasableSyntaxOnly: true, allowImportingTsExtensions: true, noEmit: true,
    skipLibCheck: true, resolveJsonModule: true, isolatedModules: true,
  },
  include: ["blueprint/**/*.ts", "generated/**/*.ts", "implementation/**/*.ts", "journeys/**/*.ts"],
};

export const IGNORES = [".architect/", ".wrangler/", "node_modules/"];
