import { Effect, ManagedRuntime } from "effect";
import { AuthD1 } from "@architect/host-cloudflare";
import { Busy, BusyLive } from "@architect/target-effect";
import type { AuthInstance } from "@architect/host-cloudflare";
import { Links } from "./modules/links/service.ts";
import type { Env } from "./modules/links/types.ts";

let auth: AuthInstance | undefined;
const runtime = ManagedRuntime.make(BusyLive);
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const instance = auth ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET });
    const work = new URL(request.url).pathname.startsWith("/api/auth/")
      ? AuthD1.handle(instance, request) : Links.handle(env, instance, request);
    return runtime.runPromise(Effect.flatMap(Busy, (busy) => busy.counted(work)));
  },
};
