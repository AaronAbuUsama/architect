import { Layer } from "effect";
import { D1Client } from "@effect/sql-d1";
import type { DatabaseApi } from "./types.ts";

export const Database: DatabaseApi = {
  // A binding that is missing or wrong is a broken deploy, not something a caller can handle: it dies.
  d1: (db) => D1Client.layer({ db }).pipe(Layer.orDie),
};
