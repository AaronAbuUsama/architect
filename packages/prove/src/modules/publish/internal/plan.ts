// What an environment's `publish` list comes to at a version: pure, so the rules (the project's names, the dist-tag) are plain to test.
import { basename, resolve } from "node:path";
import type { EnvironmentModel, PublicationModel } from "@formants/compiler";

export type Kind = "sdk" | "cli";

export interface NpmPackage {
  readonly kind: Kind;
  /** `@acme/sdk`, `@acme/cli`. */
  readonly name: string;
  readonly tag: string;
}

export interface Plan {
  readonly project: string;
  readonly version: string;
  readonly npm: ReadonlyArray<NpmPackage>;
  /** The tap the blueprint names (`acme/tap`), when the CLI is published through Homebrew. */
  readonly homebrew: string | undefined;
  /** The CLI's binaries go to GitHub releases, which only the cloud pass can reach. */
  readonly githubReleases: boolean;
}

/** `1.1.0-next.2` is a prerelease: a version with a hyphen. */
export const isPrerelease = (version: string) => version.includes("-");

/**
 * The dist-tag a package goes out under. A release takes the blueprint's tag, else `latest`. A prerelease never takes `latest`:
 * npm would otherwise make it what `npm install` gives people (pnpm does so silently), so it goes under `next` whatever the
 * blueprint says (D3 #9).
 */
export const tagFor = (declared: string | null | undefined, version: string): string => {
  if (!isPrerelease(version)) return declared ?? "latest";
  return declared === undefined || declared === null || declared === "latest" ? "next" : declared;
};

/** The project's name is its folder's, the way the generators name it (`generated/cli` is `acme` because the folder is). */
export const projectName = (root: string) => basename(resolve(root));

const withHow = <H extends PublicationModel["how"]>(list: ReadonlyArray<PublicationModel> | undefined, how: H) =>
  (list ?? []).filter((p): p is Extract<PublicationModel, { readonly how: H }> => p.how === how);

export const planOf = (root: string, environment: EnvironmentModel, version: string): Plan => {
  const project = projectName(root);
  const npm = (["sdk", "cli"] as const).flatMap((kind) =>
    withHow(environment.publish[kind], "npm").map((p) => ({ kind, name: `@${project}/${kind}`, tag: tagFor(p.tag, version) })),
  );
  return {
    project,
    version,
    npm,
    homebrew: withHow(environment.publish["cli"], "homebrew")[0]?.tap,
    githubReleases: withHow(environment.publish["cli"], "binaries").length > 0,
  };
};
