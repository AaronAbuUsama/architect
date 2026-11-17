import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { BuildFailed } from "../types.ts";

export const digest = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
export const failure = (error: unknown) => new BuildFailed({ message: String(error).replace(/^Error: /, "") });
export const io = <A>(work: () => A) => Effect.try({ try: work, catch: failure });

const Manifest = Schema.Struct({
  schemaVersion: Schema.Literal(1), source: Schema.Literal("clean"),
  revision: Schema.String, commit: Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/)),
  sha256: Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
});

/** Legacy records are deliberately not inferred from whatever source happens to be present now. */
export const read = (dir: string, revision: string) =>
  Effect.gen(function* () {
    const main = join(dir, "main.js");
    const record = join(dir, "bundle.json");
    if (!existsSync(main) && !existsSync(record)) return undefined;
    if (!existsSync(main) || !existsSync(record)) return yield* new BuildFailed({ message: `the artefact of ${revision} is incomplete: move its local cache aside, then run forman build and forman prove --env test` });
    const raw: unknown = yield* io(() => JSON.parse(readFileSync(record, "utf8")));
    const manifest = yield* Schema.decodeUnknownEffect(Manifest)(raw).pipe(
      Effect.mapError(() => new BuildFailed({ message: `the artefact of ${revision} has no trusted clean-source provenance: move its local cache aside, then run forman build and forman prove --env test` })),
    );
    if (manifest.revision !== revision || !manifest.commit.startsWith(revision)) return yield* new BuildFailed({ message: `the artefact's source commit does not match ${revision}` });
    const actual = yield* io(() => digest(main));
    if (actual !== manifest.sha256) return yield* new BuildFailed({ message: `${main} no longer matches the hash recorded when it was built` });
    return { revision, commit: manifest.commit, sha256: actual, main };
  });
