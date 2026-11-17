import { mkdirSync, mkdtempSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource } from "@formants/compiler";
import { PublishFailed, type Binary, type PublishApi, type Published, type Staged } from "./types.ts";
import { isPrerelease, planOf, projectName, type Plan } from "./internal/plan.ts";
import { isNpmjs, nextPrerelease, publishPackage, registryOf, versionsOf } from "./internal/registry.ts";
import { buildBinary, hostTarget, NODE_VERSION } from "./internal/sea.ts";
import { stage } from "./internal/stage.ts";
import { withSource } from "./internal/source.ts";
import { formulaText, writeFormula } from "./internal/tap.ts";

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;

const prerelease: PublishApi["prerelease"] = ({ root, env, version }) =>
  Effect.gen(function* () {
    const registry = registryOf(env);
    if (registry === undefined) return yield* new PublishFailed({ message: "no registry: set ARCHITECT_REGISTRY to the registry to publish to" });
    const project = projectName(root);
    return yield* nextPrerelease(registry, [`@${project}/sdk`, `@${project}/cli`], version);
  });

/** The tap repository this run writes to: the one named, or `.architect/tap/` for a run that is local by its own say-so. */
const tapOf = (root: string, env: Parameters<PublishApi["run"]>[0]["env"], localTap: boolean) => {
  const given = env["ARCHITECT_TAP_REPO"]?.trim();
  return given ? resolve(given) : localTap ? join(resolve(root), ".architect/tap") : undefined;
};

type Options = Parameters<PublishApi["run"]>[0];

const publishCaptured = ({ root, env, environment, version, mode, localTap, say }: Options, source: string) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(source)),
      Effect.mapError((e) => new PublishFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const declared = model.environments?.[environment];
    if (declared === undefined) return yield* new PublishFailed({ message: `no environment "${environment}" in blueprint/environments/` });
    const plan: Plan = planOf(root, declared, version);
    const dry = mode === "dry-run";
    const registry = registryOf(env);
    if (registry !== undefined && isNpmjs(registry)) return yield* new PublishFailed({ message: `${registry} is the real npm: publishing there is the cloud pass's` });
    const out = yield* Effect.try({ try: () => {
      const parent = join(resolve(root), ".architect/publish", version);
      mkdirSync(parent, { recursive: true });
      return mkdtempSync(join(parent, "run-"));
    }, catch: (e) => new PublishFailed({ message: String(e) }) });

    yield* say(dry ? `publish --dry-run: ${plan.project} ${version}, ${environment}'s publish list; nothing is sent anywhere` : `publish ${plan.project} ${version}, ${environment}'s publish list`);

    const packages: Array<Staged> = [];
    if (!dry && registry === undefined && plan.npm.length > 0) yield* say("skipped npm (set ARCHITECT_REGISTRY to a registry on this machine to publish to)");
    for (const pkg of plan.npm.filter(() => dry || registry !== undefined)) {
      const staged = yield* stage({ root: source, env, project: plan.project, kind: pkg.kind, version, out });
      packages.push(staged);
      if (dry) {
        yield* say(`npm ${pkg.name}@${version} --tag ${pkg.tag} to ${registry ?? "no registry set"}  (${staged.files.length} files, ${kb(staged.files.reduce((n, f) => n + f.bytes, 0))})`);
        for (const f of staged.files) yield* say(`  ${f.path}  ${f.bytes} B`);
        continue;
      }
      const have = yield* versionsOf(registry!, pkg.name);
      if (have.versions.includes(version)) {
        if (have.integrities[version] !== staged.integrity) return yield* new PublishFailed({ message: `refused: ${pkg.name}@${version} has different or unknown package integrity on the registry` });
        yield* say(`npm ${pkg.name}@${version} is already on ${registry}: left alone`);
        continue;
      }
      yield* publishPackage({ dir: staged.dir, registry: registry!, tag: pkg.tag, env });
      yield* say(`npm ${pkg.name}@${version} published --tag ${pkg.tag} to ${registry}`);
    }

    // The CLI as a single executable and a formula pointing at it: for the platform this machine is.
    let binary: Binary | undefined;
    let formula: string | undefined;
    if (plan.homebrew !== undefined) {
      const name = env["ARCHITECT_FORMULA"]?.trim() || plan.project;
      const tap = tapOf(root, env, localTap);
      const target = hostTarget();
      const tarball = `${plan.project}-${version}-${target ?? `${process.platform}-${process.arch}`}.tar.gz`;
      if (dry) {
        yield* say(target === undefined ? `skipped binary (no single executable for ${process.platform}-${process.arch})` : `binary ${tarball}  (Node ${NODE_VERSION} single executable, built when published)`);
        yield* say(`homebrew ${plan.homebrew}: Formula/${name}.rb in ${tap === undefined ? "ARCHITECT_TAP_REPO (not set)" : relative(resolve(root), tap) || tap}`);
      } else if (tap === undefined) {
        yield* say("skipped homebrew (set ARCHITECT_TAP_REPO to a git repository to commit the formula to)");
      } else if (target === undefined) {
        yield* say(`skipped binary (no single executable for ${process.platform}-${process.arch})`);
      } else {
        binary = yield* buildBinary({ root: source, project: plan.project, version, out, cache: env["ARCHITECT_CACHE"] || join(homedir(), ".cache/architect"), target });
        yield* say(`binary ${tarball} sha256:${binary.sha256}  (${kb(binary.bytes)})`);
        formula = yield* writeFormula({ repo: tap, formula: name, text: formulaText({ formula: name, project: plan.project, version, binaries: [binary] }), version });
        yield* say(`homebrew ${plan.homebrew}: Formula/${name}.rb committed to ${tap}`);
      }
    }
    if (plan.githubReleases) yield* say("skipped github releases (cloud pass)");
    if (plan.npm.length > 0 && (dry || registry !== undefined)) yield* say("skipped npmjs.org (cloud pass)");
    if (dry) yield* say("dry run: the registry, the tap and Node's download were left alone");
    return { version, tag: plan.npm[0]?.tag ?? (isPrerelease(version) ? "next" : "latest"), packages, ...(binary ? { binary } : {}), ...(formula ? { formula } : {}) } satisfies Published;
  });

const run: PublishApi["run"] = (options) => withSource(options.root, options.sourceRevision, (source) => publishCaptured(options, source));

export const Publish: PublishApi = { run, prerelease, registry: registryOf };
