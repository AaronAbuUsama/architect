import { Effect } from "effect";
import { BlueprintSource, type PluginPackage } from "#modules/source/types.js";
import { readLayout, type MountFile, type ThingFiles } from "#modules/model/internal/layout.js";
import { hashOf } from "#modules/model/internal/hash.js";
import type { MountModel, MountsApi } from "./types.ts";
import { chosenOf, choicesIn } from "./internal/choices.ts";
import { renamed } from "./internal/fold.ts";

const byName = <V>(m: ReadonlyMap<string, V>) => [...m].sort(([a], [b]) => a.localeCompare(b));

export const Mounts: MountsApi = {
  fold: (layout) => Effect.gen(function* () {
    if (layout.mounts.size === 0) return { things: new Map(), mounts: {}, problems: [] };
    const source = yield* BlueprintSource;
    const problems: Array<string> = [];
    const plugins = yield* source.plugins.pipe(Effect.catch((e) => Effect.sync(() => { problems.push(e.message); return [] as ReadonlyArray<PluginPackage>; })));
    const things = new Map<string, ThingFiles>();
    const mounts: Record<string, MountModel> = {};
    const seen = new Map<unknown, MountFile>();

    for (const [name, m] of byName(layout.mounts)) {
      const plugin = plugins.find((p) => p.descriptor !== undefined && p.descriptor === m.mount.plugin);
      if (!plugin) {
        problems.push(`${m.file}: mounts a ${m.mount.plugin?.kind ?? "plugin"} that no installed dependency in package.json provides: install its package with pnpm add --save-exact <package>`);
        for (const p of plugins) if (p.problem) problems.push(p.problem);
        continue;
      }
      const twice = seen.get(plugin.descriptor);
      if (twice) { problems.push(`${twice.file} and ${m.file} both mount ${plugin.name}: a plugin is mounted once`); continue; }
      seen.set(plugin.descriptor, m);
      if (plugin.kind !== m.kind || m.mount.plugin.kind !== m.kind) {
        problems.push(`${m.file}: ${plugin.name} is a ${plugin.kind}, so its mount goes in blueprint/${plugin.kind}s/, not with the ${m.kind}s`);
        continue;
      }
      const { chosen, problems: picks } = chosenOf(m.file, plugin.name, m.mount, choicesIn(m.mount.plugin.choices));
      problems.push(...picks);

      const files = yield* source.pluginFiles(plugin.name).pipe(Effect.result);
      if (files._tag === "Failure") { problems.push(`${m.file}: ${files.failure.message}`); continue; }
      if (m.kind === "feature") {
        const own = readLayout(files.success.files.filter((f) => f.path.startsWith("things/")), (path) => `${plugin.name}/blueprint/${path}`);
        problems.push(...own.problems);
        for (const t of renamed(own, name, plugin.name, plugin.version)) {
          if (layout.things.has(t.name) || things.has(t.name)) problems.push(`${m.file}: ${plugin.name} brings thing ${t.name}, and the blueprint already has one by that name: mount it under another name`);
          else things.set(t.name, t);
        }
      }
      const entry = { kind: m.kind, file: m.file, package: plugin.name, version: plugin.version, integrity: files.success.integrity, chosen };
      mounts[name] = { ...entry, hash: hashOf({ ...entry, file: undefined }) };
    }
    return { things, mounts, problems };
  }),
};
