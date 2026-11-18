// A feature's things, renamed for the mount: kept when the mount's name is the plugin's own, else prefixed with it.
import type { From, Layout, ThingFiles } from "#modules/model/internal/layout.js";

/** `@fixture/echo` is `echo`: the last part of its package name. */
export const ownName = (pkg: string): string => pkg.slice(pkg.lastIndexOf("/") + 1);

export const renamed = (plugin: Layout, mount: string, pkg: string, version: string): ReadonlyArray<ThingFiles> =>
  [...plugin.things.values()].map((t) => {
    const from: From = { mount, package: pkg, version, thing: t.name };
    return { ...t, name: mount === ownName(pkg) ? t.name : `${mount}-${t.name}`, from };
  });
