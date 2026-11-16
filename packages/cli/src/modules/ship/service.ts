import { Effect } from "effect";
import { Compiler, nodeSource, type Model } from "@architect/compiler";
import { Impact, Releases, type Shipping } from "@architect/prove";
import type { Said, ShipApi, ShipOptions } from "./types.ts";

const NO_LOGBOOK = "no logbook: start one with `architect env up logbook`, or set ARCHITECT_LOGBOOK_URL";

const modelOf = (root: string) => Compiler.model.pipe(Effect.provide(nodeSource(root)));

const refused = (err: string): Said => ({ out: "", err: `${err.trimEnd()}\n`, exit: 2 });

/** The logbook's word on the working model; undefined when there is no logbook to ask. */
const shipping = ({ root, env }: ShipOptions, model: Model) =>
  Releases.locate({ root, env }).pipe(
    Effect.flatMap((logbook) => (logbook === undefined ? Effect.succeed(undefined) : Releases.shipping(logbook, model))),
  );

const next: ShipApi["next"] = (options) =>
  modelOf(options.root).pipe(
    Effect.flatMap((model) => shipping(options, model)),
    Effect.map((s): Said => (s === undefined ? refused(NO_LOGBOOK) : { out: `${s.version}\n`, err: "", exit: 0 })),
    Effect.catchTags({
      ReleaseFailed: (e) => Effect.succeed(refused(e.message)),
      BlueprintInvalid: (e) => Effect.succeed(refused(e.problems.join("\n"))),
      SourceError: (e) => Effect.succeed(refused(e.message)),
    }),
  );

const impact: ShipApi["impact"] = (options) =>
  modelOf(options.root).pipe(
    Effect.flatMap((model) =>
      Impact.of(options.root, model).pipe(
        Effect.flatMap((local) =>
          shipping(options, model).pipe(
            Effect.flatMap((s) => (s === undefined ? Effect.succeed(undefined) : Releases.writeChanges(options.root, s).pipe(Effect.as(s)))),
            Effect.map((s: Shipping | undefined): Said => ({ out: Impact.lines(local, s).join("\n") + "\n", err: "", exit: 0 })),
            // A logbook that doesn't answer is a warning, never a wrong `stale none`: the local lines are printed as they are.
            Effect.catchTag("ReleaseFailed", (e) => Effect.succeed<Said>({ out: Impact.lines(local).join("\n") + "\n", err: `warning: the logbook was not consulted: ${e.message}\n`, exit: 0 })),
          ),
        ),
      ),
    ),
    Effect.catchTags({ BlueprintInvalid: (e) => Effect.succeed(refused(e.problems.join("\n"))), SourceError: (e) => Effect.succeed(refused(e.message)) }),
  );

const changes: ShipApi["changes"] = (options) =>
  modelOf(options.root).pipe(
    Effect.flatMap((model) => shipping(options, model)),
    Effect.flatMap((s) => (s === undefined ? Effect.void : Releases.writeChanges(options.root, s))),
    // `generate` has done its work: a logbook that is down or a blueprint that doesn't compile is not its failure.
    Effect.catch(() => Effect.void),
  );

export const Ship: ShipApi = { next, impact, changes };
