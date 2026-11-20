// Spike code: a stand-in OTLP sink on workers.dev. One Durable Object keeps each signal's posts as lines (the shape of the
// Collector's file exporter: traces.jsonl, logs.jsonl, metrics.jsonl), so a reader sees them whatever isolate it reaches.
//   POST /v1/<signal>        append the body as one line
//   GET  /dump/<signal>      the lines, as the file would hold them
//   GET  /seen               how many posts, per signal, and the content types
//   GET  /via?u=<url>        fetch <url> from here (Worker to Worker on workers.dev) and answer its status
import { DurableObject } from "cloudflare:workers";

export class Sink extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const signal = url.pathname.split("/").pop();
    if (request.method === "POST") {
      const text = await request.text();
      const lines = (await this.ctx.storage.get(signal)) ?? [];
      let line = text;
      try { line = JSON.stringify(JSON.parse(text)); } catch { line = `base64:${btoa(String.fromCharCode(...new Uint8Array(new TextEncoder().encode(text).slice(0, 2000))))}`; }
      lines.push(line);
      await this.ctx.storage.put(signal, lines);
      await this.ctx.storage.put(`type:${signal}`, request.headers.get("content-type"));
      return Response.json({});
    }
    if (url.pathname.startsWith("/dump/")) return new Response(((await this.ctx.storage.get(signal)) ?? []).map((l) => `${l}\n`).join(""));
    const all = await this.ctx.storage.list();
    return Response.json(Object.fromEntries([...all].map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/via") {
      try {
        const res = await fetch(url.searchParams.get("u"));
        return Response.json({ status: res.status, body: (await res.text()).slice(0, 200) });
      } catch (e) {
        return Response.json({ threw: String(e) });
      }
    }
    return env.SINK.get(env.SINK.idFromName("sink")).fetch(request);
  },
};
