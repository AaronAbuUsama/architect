import { Effect } from "effect";
import { Watch } from "@orthograph/prove";
import type { Said, WatchCommandApi } from "./types.ts";

const UNITS: Readonly<Record<string, number>> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `30s`, `15m`, `1h`, `2d` as milliseconds; nothing for anything else. */
const duration = (text: string): number | undefined => {
  const [, n, unit] = /^(\d+)([smhd])$/.exec(text) ?? [];
  return n === undefined || unit === undefined || Number(n) === 0 ? undefined : Number(n) * UNITS[unit]!;
};

const refused = (err: string): Said => ({ out: "", err: `${err.trimEnd()}\n`, exit: 2 });

export const WatchCommand: WatchCommandApi = {
  run: ({ root, environment, source, since, env }) => {
    const window = duration(since);
    if (window === undefined) return Effect.succeed(refused(`--since "${since}" isn't a duration: a whole number and s, m, h or d, like 30m or 2h`));
    return Watch.run({ root, environment, source, since: window, env }).pipe(
      Effect.map((watched): Said => ({ out: watched.lines.join("\n") + "\n", err: "", exit: watched.passed ? 0 : 1 })),
      Effect.catchTag("WatchFailed", (e) => Effect.succeed(refused(`watch couldn't run: ${e.message}`))),
    );
  },
};
