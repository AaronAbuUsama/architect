import { Effect } from "effect";
import type { SinksApi } from "./types.ts";
import { axiom, tokenService, type Exporter } from "./internal/axiom.ts";
import { keychain } from "./internal/keychain.ts";

export const Sinks: SinksApi = {
  tokenService,
  keychain,
  resolve: ({ sinks, env, read = keychain }) =>
    Effect.gen(function* () {
      const active: Array<string> = [];
      const notes: Array<string> = [];
      const exporters: Array<Exporter> = [];
      for (const sink of sinks) {
        if (sink.sink === "local") {
          active.push("local");
          continue;
        }
        const found = yield* axiom(sink.group, env, read);
        if (found.kind === "skipped") notes.push(found.note);
        else {
          exporters.push(found.exporter);
          active.push(found.exporter.id);
        }
      }
      return { secretEnv: exporters.length === 0 ? {} : { OTLP_SINKS: JSON.stringify(exporters) }, notes, active };
    }),
};
