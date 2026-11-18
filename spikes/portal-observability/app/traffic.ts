// Real traffic for the spike: acme's allowance operations called over HTTP against `forman dev`, the way a client would.
// Every outcome `spend` can have shows up: answers, AllowanceExceeded, AllowanceNotActive (exhausted and revoked),
// NotAllowed (an outsider), and a replayed request key. Entry file: it reads argv, prints and stops on its own.
//
//   node traffic.ts http://127.0.0.1:8791 120     (base URL, seconds to run)

const [base = "http://127.0.0.1:8791", seconds = "120"] = process.argv.slice(2);
const until = Date.now() + Number(seconds) * 1000;
const memos = ["train", "coffee", "lunch", "hotel", "taxi", "books", "parking"];
const pick = <A>(xs: ReadonlyArray<A>): A => xs[Math.floor(Math.random() * xs.length)]!;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const post = async (path: string, token: string, body: object, key?: string) => {
  const r = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(key ? { "idempotency-key": key } : {}) },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: (await r.json().catch(() => null)) as Record<string, string> | null };
};

const cast = (await (await fetch(`${base}/_world/cast`, { method: "POST", body: JSON.stringify({ names: ["ada", "olga", "bob"] }) })).json()) as Record<
  string,
  { person: string; token: string }
>;
const { ada, olga, bob } = cast as Record<"ada" | "olga" | "bob", { person: string; token: string }>;
const org = (await post("organization/create", ada.token, { name: "Acme Ltd", cap: "1000" })).body!["organization"]!;

const grant = async () => (await post("allowance/grant", ada.token, { organization: org, member: olga.person, limit: "500" })).body!["allowance"]!;
let allowance = await grant();
let remaining = 500;
const seen: Record<string, number> = {};
const note = (what: string) => (seen[what] = (seen[what] ?? 0) + 1);

while (Date.now() < until) {
  const roll = Math.random();
  if (remaining === 0) {
    // Exhausted: one more spend is refused by the machine, then a new month's allowance.
    const r = await post("allowance/spend", olga.token, { allowance, amount: "1", memo: "coffee" });
    note(`${r.status} ${r.body?.["_tag"] ?? "ok"}`);
    allowance = await grant();
    remaining = 500;
  } else if (roll < 0.07) {
    const r = await post("allowance/spend", bob.token, { allowance, amount: "5", memo: "snack" });
    note(`${r.status} ${r.body?.["_tag"] ?? "ok"}`);
  } else if (roll < 0.15) {
    const r = await post("allowance/spend", olga.token, { allowance, amount: String(remaining + 50), memo: "hotel" });
    note(`${r.status} ${r.body?.["_tag"] ?? "ok"}`);
  } else if (roll < 0.2) {
    const key = `req-${Date.now()}`;
    const amount = Math.min(remaining, 10);
    for (let i = 0; i < 2; i++) {
      const r = await post("allowance/spend", olga.token, { allowance, amount: String(amount), memo: "taxi" }, key);
      note(`${r.status} ${i === 0 ? "ok" : "replayed"}`);
    }
    remaining -= amount;
  } else if (roll < 0.23) {
    await post("allowance/revoke", ada.token, { allowance });
    const r = await post("allowance/spend", olga.token, { allowance, amount: "5", memo: "lunch" });
    note(`${r.status} ${r.body?.["_tag"] ?? "ok"}`);
    allowance = await grant();
    remaining = 500;
  } else {
    const amount = Math.min(remaining, 5 + Math.floor(Math.random() * 75));
    const r = await post("allowance/spend", olga.token, { allowance, amount: String(amount), memo: pick(memos) });
    if (r.status === 200) remaining = Number(r.body!["remaining"]);
    note(`${r.status} ${r.body?.["_tag"] ?? "ok"}`);
  }
  if (Math.random() < 0.1) await post("allowance/get", olga.token, { id: allowance });
  await pause(600 + Math.random() * 900);
}
console.log(JSON.stringify(seen));
