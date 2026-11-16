# Spike: publish workspace packages to a local Verdaccio, install through `create-nx-workspace`

## Question

Can Architect's workspace packages be published to a local Verdaccio (Docker) and then installed into a brand-new
workspace made by `npx create-nx-workspace@24.0.3 <name> --preset=@architect/preset`, so the new workspace can run
TypeScript from those packages with Node?

**Answer: yes, but only if the published packages ship JavaScript.** The source-only exports cannot run from
`node_modules`. The cleanest fix keeps the monorepo running from source and publishes `dist/` through `publishConfig`.

## Tried

1. Node type stripping from `node_modules` (does it still fail, does any flag help).
2. (a) Build each package with the repo's TypeScript 7 (`node_modules/.bin/tsc`, 7.0.2) to `dist/` and publish with `publishConfig`.
3. (b) A Node loader (`--import` + `module.register` + `module.stripTypeScriptTypes`) that strips types under `node_modules`.
4. `pnpm publish` rewriting of `workspace:*`, and `publishConfig` overriding `exports`, `imports`, `bin`.
5. Verdaccio 6.11.1 in Docker, env-var-only registry config, `create-nx-workspace@24.0.3` with a minimal preset.
6. A preset whose generator is `.ts` (loaded by Nx from `node_modules`) versus compiled `.js`.

## Found

Versions: Node v26.13.1, pnpm 11.20.0, Nx / create-nx-workspace 24.0.3, tsc 7.0.2 (tsgo), Docker 29.7.2, effect 4.1.1.

### Node and `node_modules`

- Still refused on Node 26.13.1: `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. `--experimental-strip-types` changes nothing
  (type stripping is on by default and the `node_modules` check is path-based). `--experimental-transform-types` does not exist ("bad option").
- (b) The loader works (`node --import ./register.mjs t.ts` printed the 19 Blueprint keys from real `blueprint` TS source under
  `node_modules`), but it needs a flag on every invocation, uses the deprecated `module.register` and the experimental
  `stripTypeScriptTypes`, does not fix bin shebangs, and cannot help Nx load a generator. Rejected.
- Nx 24.0.3 does not fix it for generators either. A `.ts` generator factory inside `node_modules` fails with the same Node error
  ("Failed to load ... under Node's native TypeScript stripping"). `NX_PREFER_NODE_STRIP_TYPES=false` (the swc/ts-node fallback) fails
  too: "loadTsFile could not find a workspace tsconfig" in a bare new workspace. **Generators must be JS.**

### (a) Build to `dist/` works, with one wrinkle

The base config already has `allowImportingTsExtensions`. The build adds `rewriteRelativeImportExtensions` + `declaration`
(`tsconfig.build.base.json`). tsc 7 then emits correct `.js` specifiers for relative imports (`./a.ts` becomes `./a.js`).

The wrinkle: `#modules/x/service.ts` is not relative, so tsc 7 does **not** rewrite it. It reports TS2877 on every such import and
emits `"#modules/x/service.ts"` verbatim into both `.js` and `.d.ts`. Two ways out, both verified:

- **Staging (used by `stage.mjs`, no source change):** in the staged copy, respell `#modules/...ts` as `#modules/...js`, and publish
  with `imports: {"#modules/*": "./dist/modules/*"}`. tsc is then silent (exit 0) and emits JS + d.ts. The compiler package, which depends on
  blueprint, also built cleanly.
- **Recommended for the real repo (needs a one-time source change):** write the specifiers as `#modules/x/service.js` in source and use
  `"imports": {"#modules/*.js": "./src/modules/*.ts"}` for dev. Verified on a copy of blueprint: `node run.ts` runs from source (19 keys) and `tsc --noEmit`
  passes. tsc emits the specifiers untouched, no staging needed, and the publish map becomes
  `"#modules/*.js": "./dist/modules/*.js"`.

### The recipe (per package `package.json`; the staged copy in `stage.mjs` is generated from this shape)

```jsonc
{
  "exports": { ".": "./src/index.ts" },              // dev: Node strips types in the monorepo
  "imports": { "#modules/*.js": "./src/modules/*.ts" }, // (or "#modules/*" + staging, see above)
  "bin": { "architect": "./src/main.ts" },
  "files": ["dist", "generators.json", "schema.json"],
  "publishConfig": {                                  // pnpm applies this only when packing/publishing
    "access": "public",
    "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
    "imports": { "#modules/*.js": "./dist/modules/*.js" },
    "bin": { "architect": "./dist/main.js" }
  }
}
```

`tsconfig.build.base.json`:

```jsonc
{ "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": false, "allowImportingTsExtensions": true, "rewriteRelativeImportExtensions": true,
                       "declaration": true, "sourceMap": false } }
```

Per package: `rootDir: src`, `outDir: dist`, `include: src/**/*.ts` (tests excluded in the staged copy), run `tsc -p tsconfig.build.json`.
pnpm 11.20.0 does apply `publishConfig.exports`, `.imports` and `.bin` (checked with `pnpm pack`: published manifest shows dist paths).
Published manifest of `@architect/compiler`: `dependencies: {"effect":"4.1.1","@architect/blueprint":"0.0.0"}`,
`imports {"#modules/*":"./dist/modules/*"}`, `bin {"architect-model":"./dist/main.js"}`.

### `workspace:*`

Confirmed: `pnpm publish`/`pack` rewrites `"@architect/blueprint": "workspace:*"` to the real version (`"0.0.0"`; in a probe workspace
`workspace:*` against `1.2.3` became `"1.2.3"`). It needs `pnpm install` to have linked the workspace first, otherwise
`ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`.
Not changed by `publishConfig`: `generators.json` (its `factory: ./src/main.ts` is a plain file, not a manifest field). The real
`@architect/generators` needs its own JS-pointing `generators.json` in the published tarball (a staged copy or a second file named by the `generators` field).

### Verdaccio

- Image `verdaccio/verdaccio:6.11.1` (pushed 2026-10-24, 23 days before today; matches the repo's `verdaccio` devDependency).
- Run: `docker run -d --name architect-spike-verdaccio -p 127.0.0.1:4880:4873 -v $PWD/verdaccio/config.yaml:/verdaccio/conf/config.yaml:ro -v $PWD/work/vstorage:/verdaccio/storage verdaccio/verdaccio:6.11.1`
  (the storage dir was `chmod 777` so the container user could write it; no problems on Docker Desktop).
- Config: `verdaccio/config.yaml` (htpasswd `max_users: 10`; `@architect/*` has `access/publish/unpublish: $all`; `**` has `access: $all, proxy: npmjs`; uplink `https://registry.npmjs.org/`).
- Publishing still needs *a* token (npm/pnpm refuse unauthenticated publish). A throwaway user was created against this Verdaccio only:
  `curl -X PUT localhost:4880/-/user/org.couchdb.user:spike -d '{"name":"spike","password":"<random>"}'` returns `{token}`; written to
  `work/npmrc.publish` as `//localhost:4880/:_authToken=...` and passed as `NPM_CONFIG_USERCONFIG=<that file>` for the publish commands only.
  `~/.npmrc` was never touched. The file was deleted with `work/`.

### Env vars (no config files)

```bash
export npm_config_registry=http://localhost:4880/ pnpm_config_registry=http://localhost:4880/
```

Both are needed. Tested with `create-nx-workspace@24.0.3`:

| Set | Result |
|---|---|
| both | works |
| only `npm_config_registry` | fails at `pnpm install --no-frozen-lockfile` (pnpm 11 ignores it) |
| only `pnpm_config_registry` | fails at `pnpm install --no-frozen-lockfile` (the npm-side lookup of the preset goes to npmjs, where it does not exist) |

`pnpm-lock.yaml` of the new workspace stores no registry URL (0 hits for `localhost:4880`), so every later `pnpm install` in it needs the same env vars.
Verdaccio storage afterwards held `@architect/{blueprint,compiler,preset}` plus proxied `effect`, `@nx/*`, etc.

### create-nx-workspace

```bash
npx --yes create-nx-workspace@24.0.3 demo --preset=@architect/preset --no-interactive \
  --nxCloud=skip --trustThirdPartyPreset --pm=pnpm --skipGit
```

Result with the JS generator (`@architect/preset@0.0.0-spike.1`): workspace created, generator wrote `@architect/blueprint` and `@architect/compiler`
(`0.0.0`) into `package.json` plus `hello.ts`, the generator's `installPackagesTask` installed them, and in the new workspace:

```text
$ node hello.ts
preset demo blueprint keys: value,id,uint,text,email,thing,event,error,machine,role,anyone,signedIn,operation,read,step,journey,startingWorld,NotAllowed,todo
$ node node_modules/@architect/compiler/dist/main.js     # the bin runs (complains only about missing arguments)
$ tsc --noEmit hello.ts   (nodenext, skipLibCheck false)  # exit 0: published d.ts with #modules imports resolve for consumers
```

The preset: `generators.json` `{"generators":{"preset":{"factory":"./dist/preset.js","schema":"./schema.json"}}}`, `package.json` has
`"generators": "./generators.json"` and `"dependencies": {"@nx/devkit": "24.0.3"}`, and the generator uses `addDependenciesToPackageJson` and returns
`() => installPackagesTask(tree)`. Source in `preset/`.

### Timings (M-series Mac, Docker Desktop)

| Step | Time |
|---|---|
| `tsc` 7 build of blueprint (or compiler, preset) to `dist/` | about 0.2 s each (1.3 s cold, including the failing TS2877 run) |
| `pnpm publish` of one package | about 0.5 s |
| `create-nx-workspace` end to end, Verdaccio cold (npx fetch, install, preset, install) | 47.5 s |
| same, Verdaccio warm | 16 to 19 s |

### What broke, and the fix

- TS2877 on `#modules/*.ts` imports, and `.ts` specifiers left in the emit: respell as `.js` (staging or source change, above).
- A hung first command was my own stray `cat` waiting on stdin; unrelated to the tools.
- `.ts` generator in a published preset: Node and Nx both refuse; compile the generator to JS.
- After publishing a second preset version, `latest` pointed to the broken `.ts` one and the default `--preset=@architect/preset` failed; fixed with
  `npm dist-tag add @architect/preset@0.0.0-spike.1 latest`. A reminder that the version the generator resolves is the `latest` tag, so publish discipline matters.
- Verdaccio refuses nothing anonymously for read, but publishing needs a token even with `publish: $all`; use a throwaway one.

### Files here

`stage.mjs` (stages `packages/<pkg>` into `work/ws/packages/<pkg>`: copy of `src`, `#modules` respelling, generated `publishConfig`),
`tsconfig.build.base.json`, `verdaccio/config.yaml`, `preset/` (minimal `@architect/preset`).
Repro: `node stage.mjs blueprint compiler && (cd work/ws && pnpm install)`, build each with
`../../../../../../node_modules/.bin/tsc -p tsconfig.build.json`, publish each with `pnpm publish --no-git-checks`.

Cleanup done: container stopped and removed, `work/` (storage, tokens, temp workspaces) deleted, port 4880 free. The pulled image
`verdaccio/verdaccio:6.11.1` was left in the local Docker image cache.

## The decision it supports

Publish JS, run source in the monorepo: every package keeps `exports` pointing at `src/*.ts` for local dev, gains a `publishConfig` with `dist` exports,
imports and bin, and a build step that is only a publish-time step (`tsc` 7 with `rewriteRelativeImportExtensions`, about 0.2 s a package). Spell
`#modules` specifiers with `.js` (`"#modules/*.js": "./src/modules/*.ts"`). Presets and generators ship compiled JS and a `generators.json` that points at it.
Local Verdaccio 6.11.1 in Docker is a workable e2e registry for `create-nx-workspace` once both registry env vars are set.

## Open risks

- Only `blueprint`, `compiler` and a toy preset were built and published. The other packages (`cli`, `generators`, `prove`, `host-cloudflare`, `lint`, `target-*`) were not,
  and they carry heavy deps (`wrangler`, `@nx/devkit`, `@effect/platform-node`). Things to check there: `generators.json` factory paths, the `lint` plugin entry (`./plugin` export),
  `import.meta.resolve("wrangler/package.json")`, and any code that reads its own `src/` at runtime or generated code that imports package-internal `.ts` paths.
- Subpath exports pointing into `modules/*/service.ts` (for example `@architect/generators/sync`) map to `dist/modules/.../service.js`, which the staging script handles, but
  consumer type resolution was verified only for the root export of blueprint.
- `rewriteRelativeImportExtensions` only handles relative paths; a bare `.ts` specifier in any other form (package self-reference, other `imports` keys) will still emit as `.ts`.
- The new workspace's `pnpm-lock.yaml` has no registry, so installs depend on env vars; for real use a registry URL belongs in an `.npmrc` or the preset should leave that to the user.
- Version policy: every package is `0.0.0`, `workspace:*` becomes `0.0.0` (exact, not a range), and `latest` dist-tag management is manual.
- Dual module graph risk: dev runs `.ts` source, consumers run `dist/*.js`. A project mixing both (for example linking a monorepo package into a workspace that also installs the published one) would load two copies of `Blueprint`.
- tsc 7.0.2 and Node 26 type stripping are both moving targets (`stripTypeScriptTypes` is experimental; the `node_modules` refusal could be lifted in a later Node, which would make the build step optional, not wrong).
