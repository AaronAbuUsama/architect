// Spike entry (a named entry file, so async is allowed): a Run Durable Object that owns one E2B sandbox.
// It keeps only the sandbox id in its SQLite storage, so after an eviction it reconnects instead of starting over.
import { DurableObject } from "cloudflare:workers";
import { Sandbox } from "e2b";

type Env = { RUN: DurableObjectNamespace<Run>; E2B_API_KEY: string };
const ms = (a: number) => Math.round(performance.now() - a);

export class Run extends DurableObject<Env> {
  private opts() { return { apiKey: this.env.E2B_API_KEY }; }
  async start() {
    const a = performance.now();
    const sb = await Sandbox.create({ ...this.opts(), timeoutMs: 300_000, metadata: { spike: "e2b-sandbox" } });
    await this.ctx.storage.put("sandbox", sb.sandboxId);
    await sb.files.write("/home/user/handler.ts", "export const spend = () => 'written';\n");
    return { sandbox: sb.sandboxId, createMs: ms(a) };
  }
  async step(cmd: string) {
    const id = await this.ctx.storage.get<string>("sandbox"); if (!id) return { error: "no sandbox" };
    const a = performance.now();
    const sb = await Sandbox.connect(id, this.opts());
    const r = await sb.commands.run(cmd);
    return { sandbox: id, reconnectAndRunMs: ms(a), stdout: r.stdout, exit: r.exitCode };
  }
  /** Starts a command that outlives this request (and this Durable Object, if it is evicted meanwhile). */
  async spawn(cmd: string) {
    const id = await this.ctx.storage.get<string>("sandbox"); if (!id) return { error: "no sandbox" };
    const sb = await Sandbox.connect(id, this.opts());
    const h = await sb.commands.run(cmd, { background: true });
    return { sandbox: id, pid: h.pid };
  }
  async stop() {
    const id = await this.ctx.storage.get<string>("sandbox"); if (!id) return { error: "no sandbox" };
    await Sandbox.kill(id, this.opts()); await this.ctx.storage.delete("sandbox");
    return { killed: id };
  }
}

export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url), run = env.RUN.get(env.RUN.idFromName(u.searchParams.get("run") ?? "r1"));
    const out = u.pathname === "/start" ? await run.start()
      : u.pathname === "/step" ? await run.step(u.searchParams.get("cmd") ?? "cat /home/user/handler.ts")
      : u.pathname === "/spawn" ? await run.spawn(u.searchParams.get("cmd") ?? "sleep 15; date > /home/user/out")
      : u.pathname === "/stop" ? await run.stop() : { routes: ["/start", "/step?cmd=", "/stop"] };
    return Response.json(out);
  },
};
