// Independently planted wrong adapter. It still performs the actual HTTP request, but releases counted work on interruption.
import { Effect } from "effect";
import { Busy } from "@architect/target-effect";
export const missingMask = <A>(call: () => Promise<A>) =>
  Effect.flatMap(Busy, (busy) => busy.counted(Effect.tryPromise({ try: call, catch: (error) => error })));
