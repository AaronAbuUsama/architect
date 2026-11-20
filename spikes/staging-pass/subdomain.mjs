// Spike code: the fallback when `wrangler deploy` uploads a Worker but then cannot read its subdomain settings (run 1:
// code 10007 on /workers/workers/<name>). Reads the account's workers.dev subdomain, turns the Worker's own on, prints its URL.
// Reads the token and account from the environment; prints neither. Never registers a subdomain: that is an account setting.
const [name] = process.argv.slice(2);
const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/workers`;
const headers = { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "content-type": "application/json" };
const say = (what, res, body) => console.error(`${what}: HTTP ${res.status} ${JSON.stringify((body.errors ?? []).map((e) => ({ code: e.code, message: e.message })))}`);

const account = await fetch(`${base}/subdomain`, { headers });
const accountBody = await account.json().catch(() => ({}));
say("GET account subdomain", account, accountBody);
const sub = accountBody.result?.subdomain;
if (!sub) process.exit(1);

const state = await fetch(`${base}/scripts/${name}/subdomain`, { headers });
say("GET script subdomain", state, await state.json().catch(() => ({})));
const on = await fetch(`${base}/scripts/${name}/subdomain`, { method: "POST", headers, body: JSON.stringify({ enabled: true, previews_enabled: false }) });
const onBody = await on.json().catch(() => ({}));
say("POST script subdomain enabled", on, onBody);
if (!on.ok) process.exit(1);
console.log(`https://${name}.${sub}.workers.dev`);
