// Reads the environments into the model: the name comes from the file, never from a string inside it.
import { Duration, Option } from "effect";
import type { Publication } from "@architect/blueprint";
import type { EnvironmentModel, PublicationModel } from "../types.ts";
import { hashOf } from "./hash.ts";
import type { Layout } from "./layout.ts";

const SECRET = /^[A-Z][A-Z0-9_]*$/;
const byKey = <V>(entries: ReadonlyArray<readonly [string, V]>) => [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

const publication = (p: Publication): PublicationModel =>
  p.how === "npm" ? { how: "npm", tag: p.tag } : p.how === "homebrew" ? { how: "homebrew", tap: p.tap } : { how: "binaries", on: p.on };

export const environmentsOf = (layout: Layout, problems: Array<string>): Readonly<Record<string, EnvironmentModel>> =>
  Object.fromEntries(byKey([...layout.environments]).map(([name, { file, declaration: e }]) => {
    const lifetime = e.lifetime === undefined ? Option.none() : Duration.fromInput(e.lifetime);
    if (e.lifetime !== undefined && Option.isNone(lifetime)) problems.push(`${file}: lifetime isn't a duration`);
    if (e.promotesFrom !== undefined && (e.promotesFrom === name || !layout.environments.has(e.promotesFrom))) {
      problems.push(`${file}: promotesFrom "${e.promotesFrom}" isn't another environment in blueprint/environments/`);
    }
    for (const secret of Object.keys(e.secrets ?? {})) if (!SECRET.test(secret)) problems.push(`${file}: secret "${secret}" must be UPPER_SNAKE_CASE`);
    if ((e.deploy !== undefined || e.publish !== undefined) && e.cloud === undefined) problems.push(`${file}: deploys or publishes, so it needs a cloud`);
    const entry = {
      name, file, runs: e.runs, identity: e.identity.which,
      lifetimeMs: Option.isSome(lifetime) ? Duration.toMillis(lifetime.value) : null,
      cloud: e.cloud ? { provider: e.cloud.provider, database: e.cloud.database.which } : null,
      database: e.database?.which ?? null,
      secrets: Object.fromEntries(byKey(Object.entries(e.secrets ?? {})).map(([k, s]) => [k, s.how])),
      promotesFrom: e.promotesFrom ?? null,
      deploy: Object.fromEntries(byKey(Object.entries(e.deploy ?? {})).map(([k, d]) => [k, { how: d.how, domain: d.domain }])),
      publish: Object.fromEntries(byKey(Object.entries(e.publish ?? {})).map(([k, p]) => [k, (Array.isArray(p) ? p : [p]).map(publication)])),
    };
    return [name, { ...entry, hash: hashOf(entry) }];
  }));
