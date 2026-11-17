import { join, resolve } from "node:path";
import { Effect } from "effect";
import { Compiler, nodeSource, type EnvironmentModel } from "@architect/compiler";
import { Build } from "#modules/build/service.js";
import { Prove } from "#modules/prove/service.js";
import { Releases } from "#modules/releases/service.js";
import { Verdicts } from "#modules/verdicts/service.js";
import { PromoteFailed, type PromoteApi, type Promoted, type Target } from "./types.ts";
import { runningOn } from "./internal/environment.ts";
import { bundleOf, verdictsIn } from "./internal/gate.ts";
import { productionRelease, stagingPrerelease } from "./internal/publishing.ts";

const failed = (e: { readonly message: string }) => new PromoteFailed({ message: e.message });

/** Which environment's verdicts a target needs: test for staging, and for production what it declares (`promotesFrom`), else staging. */
const earnedIn = (target: Target, environment: EnvironmentModel) => (target === "staging" ? "test" : (environment.promotesFrom ?? "staging"));

/** What the local pass can't reach, said so: the real cloud, and each domain it would be served at. */
const skipped = (environment: EnvironmentModel) => [
  ...(environment.cloud ? [`skipped ${environment.cloud.provider} (cloud pass)`] : []),
  ...Object.entries(environment.deploy).flatMap(([what, d]) => (d.domain ? [`skipped ${what} domain ${d.domain} (cloud pass)`] : [])),
];

const to: PromoteApi["to"] = ({ root, env, target, say }) =>
  Effect.gen(function* () {
    const model = yield* Compiler.model.pipe(
      Effect.provide(nodeSource(root)),
      Effect.mapError((e) => new PromoteFailed({ message: e._tag === "BlueprintInvalid" ? `the blueprint is invalid:\n  - ${e.problems.join("\n  - ")}` : e.message })),
    );
    const environment = model.environments?.[target];
    if (!environment) return yield* new PromoteFailed({ message: `no environment "${target}" in blueprint/environments/` });

    // Refusals first: nothing is started for a promotion the rules turn away.
    const revision = yield* Build.revision(root).pipe(Effect.mapError(failed));
    const built = yield* bundleOf(root, revision);
    const logbook = yield* Releases.locate({ root, env }).pipe(Effect.mapError(failed));
    if (logbook === undefined) return yield* new PromoteFailed({ message: "no logbook: start one with `architect env up logbook`, or set ARCHITECT_LOGBOOK_URL" });
    const from = earnedIn(target, environment);
    yield* verdictsIn(logbook, model, revision, from, built.sha256);
    yield* say(`${target} from ${from} ${revision} sha256:${built.sha256}`);

    const up = yield* runningOn(root, target, built);
    yield* say(`${target} up ${up.url}   bundle ${revision} sha256:${built.sha256} ✔`);

    if (target === "staging") {
      // The staging verdicts: the journeys and evals, run where staging runs, by people who really sign up.
      if (up.telemetry === undefined) return yield* new PromoteFailed({ message: "staging records no telemetry, so its evals have nothing to judge: another environment must declare promotesFrom: \"staging\"" });
      const proved = yield* Prove.against({ root, url: up.url, telemetry: up.telemetry, state: join(resolve(root), ".architect/environments", target, "state"), say }).pipe(Effect.mapError(failed));
      // Staleness judges these verdicts against the model of the revision they proved, so the logbook keeps that model first.
      yield* Releases.keep({ logbook, env, model, revision }).pipe(Effect.mapError(failed));
      const source = yield* Verdicts.sourceOf(env).pipe(Effect.mapError(failed));
      // Minted just before posting: the issuer's tokens live ten minutes and a prove can take longer.
      const token = yield* Verdicts.mint(source).pipe(Effect.mapError(failed));
      // The prerelease goes out only for a revision that proved itself where it runs, and before the verdicts are said.
      if (proved.passed) yield* stagingPrerelease({ root, env, say, logbook, model });
      else yield* say("skipped publish (staging's proof failed: nothing is published for a revision that did not pass)");
      yield* Verdicts.post({ logbook, token, revision, sha256: built.sha256, environment: "staging", results: proved.results }).pipe(Effect.mapError((e) => new PromoteFailed({ message: `the verdicts weren't recorded: ${e.message}` })));
      yield* say(`verdicts ${proved.results.map((r) => `${r.operation} ${r.verdict === "pass" ? "✔" : "✘"}`).join("  ")}   (revision ${revision})`);
      for (const line of skipped(environment)) yield* say(line);
      return { revision, sha256: built.sha256, passed: proved.passed } satisfies Promoted;
    }

    // Production: what staging proved is what runs, and the release is the logbook's record of it.
    const last = yield* Releases.last(logbook).pipe(Effect.mapError(failed));
    if (last?.revision === revision) {
      yield* say(`release ${last.version} already recorded for ${revision}`);
      // A run that stopped after recording the release publishes now: what is already on the registry is left alone.
      yield* productionRelease({ root, env, say, version: last.version });
      for (const line of skipped(environment)) yield* say(line);
      return { revision, sha256: built.sha256, passed: true, version: last.version } satisfies Promoted;
    }
    const version = yield* Releases.next(logbook, model).pipe(Effect.mapError(failed));
    yield* Releases.record({ logbook, env, model, revision, version }).pipe(Effect.mapError(failed));
    yield* say(`released ${version}`);
    // Nobody runs journeys in production: its verdict is staging's, carried to the same bundle the environment just reported. It
    // is what puts production in the logbook beside staging, so a change that unproves an operation stales it there too.
    const carried = Object.keys(model.operations).map((operation) => ({ operation, verdict: "pass" as const }));
    const token = yield* Verdicts.sourceOf(env).pipe(Effect.flatMap(Verdicts.mint), Effect.mapError(failed));
    yield* Verdicts.post({ logbook, token, revision, sha256: built.sha256, environment: "production", results: carried }).pipe(Effect.mapError((e) => new PromoteFailed({ message: `the verdicts weren't recorded: ${e.message}` })));
    // The release is out in the logbook and in production: now the packages, with `latest` moved to it.
    yield* productionRelease({ root, env, say, version });
    for (const line of skipped(environment)) yield* say(line);
    return { revision, sha256: built.sha256, passed: true, version } satisfies Promoted;
  });

export const Promote: PromoteApi = { to };
