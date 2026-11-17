import { subscribe } from "node:diagnostics_channel";
import { appendFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("./check04-requests.jsonl", import.meta.url));
writeFileSync(output, "");
const ids = new WeakMap<object, number>();
let serial = 0;
const record = (event: string, message: unknown) => {
  if (typeof message !== "object" || message === null) return;
  const m = message as Record<string, unknown>;
  if (typeof m.request !== "object" || m.request === null) return;
  const request = m.request as Record<string, unknown>;
  const origin = String(request.origin);
  const path = request.path;
  if (request.method !== "GET" || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || typeof path !== "string") return;
  if (path !== "/_architect/bundle" && !/^\/@acme%2fsdk$/i.test(path)) return;
  if (!ids.has(request)) ids.set(request, ++serial);
  const socket = typeof m.socket === "object" && m.socket !== null ? m.socket as Record<string, unknown> : {};
  const error = typeof m.error === "object" && m.error !== null ? m.error as Record<string, unknown> : {};
  const response = typeof m.response === "object" && m.response !== null ? m.response as Record<string, unknown> : {};
  const connection = typeof m.headers === "string" ? /(?:^|\r\n)connection:\s*([^\r\n]+)/i.exec(m.headers)?.[1] : undefined;
  // Only loopback GET identity, socket numbers and status/code are kept. No headers, bodies, tokens or cookies are recorded.
  appendFileSync(output, JSON.stringify({ event, request: ids.get(request), url: origin + path, localPort: socket.localPort,
    remotePort: socket.remotePort, connection, status: response.statusCode, errorCode: error.code, syscall: error.syscall }) + "\n");
};
for (const event of ["undici:client:sendHeaders", "undici:request:headers", "undici:request:error"]) subscribe(event, (message) => record(event, message));
