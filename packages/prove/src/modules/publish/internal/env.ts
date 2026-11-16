import type { Env } from "../types.ts";

/** A process environment for a child process: no undefined values. */
export const cleanEnv = (env: Env): Record<string, string> => Object.fromEntries(Object.entries(env).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]])));
