// Spike entry: drive an E2B sandbox from Node. Create, run, write, reconnect by id, kill. Prints timings, never the key.
import { Sandbox } from "e2b";
const t = () => performance.now(), ms = (a) => `${Math.round(t() - a)} ms`;
let a = t();
const sb = await Sandbox.create({ timeoutMs: 120_000, metadata: { spike: "e2b-sandbox" } });
console.log("create", ms(a), sb.sandboxId);
a = t(); const v = await sb.commands.run("node -v; git --version; pnpm -v || echo no-pnpm; nproc; free -m | head -2");
console.log("run", ms(a), JSON.stringify(v.stdout));
a = t(); await sb.files.write("/home/user/h.ts", "export const h = 1;\n"); const c = await sb.commands.run("cat /home/user/h.ts");
console.log("write+cat", ms(a), JSON.stringify(c.stdout));
a = t(); const again = await Sandbox.connect(sb.sandboxId); const r = await again.commands.run("cat /home/user/h.ts");
console.log("reconnect+cat", ms(a), JSON.stringify(r.stdout));
a = t(); await sb.kill(); console.log("kill", ms(a));
console.log("left running", (await Sandbox.list({ query: { metadata: { spike: "e2b-sandbox" } } }).nextItems()).length);
