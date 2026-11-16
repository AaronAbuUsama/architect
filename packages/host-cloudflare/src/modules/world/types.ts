// The world: one Durable Object per running world. Its front door is `/_world/*`. In stage one it keeps the cast and
// signs their tokens; the clock and the registry of things join it in stage five.
export interface WorldEnv {
  /** Made fresh by `architect dev` for each run; never written to a file. */
  readonly WORLD_SECRET: string;
}

/** `POST /_world/cast` with `{ names }`: each name's person id (made once, then kept) and a token for it. */
export interface Cast {
  readonly [name: string]: { readonly person: string; readonly token: string };
}
