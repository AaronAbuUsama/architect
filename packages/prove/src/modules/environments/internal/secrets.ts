// An environment's secrets: made once, kept in a file only its owner reads, and passed to wrangler as that file.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const parse = (text: string): ReadonlyMap<string, string> =>
  new Map(text.split("\n").flatMap((line) => {
    const at = line.indexOf("=");
    return at > 0 ? [[line.slice(0, at), line.slice(at + 1)] as const] : [];
  }));

/**
 * `secrets.env`, mode 0600: Better Auth's `AUTH_SECRET` and every secret the environment names. A value that is already
 * there stays (so a restart keeps sessions valid); a new name gets a generated one. Values never reach a command line.
 */
export const ensureSecrets = (file: string, names: ReadonlyArray<string>): void => {
  const have = existsSync(file) ? parse(readFileSync(file, "utf8")) : new Map<string, string>();
  const all = ["AUTH_SECRET", ...names.filter((n) => n !== "AUTH_SECRET")];
  const lines = all.map((name) => `${name}=${have.get(name) ?? randomBytes(32).toString("hex")}`);
  writeFileSync(file, `${lines.join("\n")}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
};
