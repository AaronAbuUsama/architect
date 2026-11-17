// The macOS keychain, read by service name. The value goes to the caller and nowhere else: it is not logged, not put in
// an error, not kept.
import { execFile } from "node:child_process";
import { Effect } from "effect";
import type { Reader } from "../types.ts";

export const keychain: Reader = (service) =>
  process.platform !== "darwin"
    ? Effect.succeed(undefined)
    : Effect.callback<string | undefined>((resume) => {
        const child = execFile("security", ["find-generic-password", "-s", service, "-w"], { encoding: "utf8", timeout: 10_000 }, (error, stdout) => {
          const value = stdout.trim();
          resume(Effect.succeed(error === null && value !== "" ? value : undefined));
        });
        return Effect.sync(() => void child.kill());
      });
