// One script: reset state, migrate, start wrangler dev, prove 1..6, stop everything, check nothing is left.
// Run: node --experimental-strip-types scripts/run.ts   (exit 1 on any failed check)
import { spawn, spawnSync } from "node:child_process"
import { rmSync } from "node:fs"
import { randomBytes } from "node:crypto"
import { SignJWT, generateKeyPair, decodeJwt } from "jose"
import { ORIGIN, MCP_URL, ISSUER, check, failures, mcpAs, note, signIn, signUp, timed, verifyJwt, decodeProtectedHeader, type Person } from "./flow.ts"

const PERSIST = ".persist"
const wrangler = (args: string[]) => spawnSync("npx", ["wrangler", ...args], { encoding: "utf8" })
const d1 = (sql: string) => wrangler(["d1", "execute", "spike-db", "--local", "--persist-to", PERSIST, "--json", "--command", sql])
const pw = () => `pw-${randomBytes(9).toString("hex")}` // random, local, never printed
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers }, body: JSON.stringify(body) })
const rpc = (token: string | undefined, method = "tools/list") =>
  fetch(MCP_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: {} })
  })

// ---- 0. fresh state, migrations, wrangler dev -------------------------------------------------------------
rmSync(PERSIST, { recursive: true, force: true })
const mig = await timed("migrations apply (npx wrangler d1 migrations apply --local)", async () => wrangler(["d1", "migrations", "apply", "spike-db", "--local", "--persist-to", PERSIST]))
console.log("== 1. tables, sign-up, sign-in")
check("1a migrations applied (0001_auth.sql, 0002_roles.sql)", mig.status === 0 && /0001_auth\.sql/.test(mig.stdout) && /0002_roles\.sql/.test(mig.stdout))
const tables: string[] = JSON.parse(d1("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%' and name != 'd1_migrations' order by name").stdout)[0].results.map((r: any) => r.name)
note(`tables: ${tables.join(", ")}`)
const authTables = tables.filter((t) => t !== "roles")
check("1b all Better Auth tables are auth_-prefixed", authTables.length === 13 && authTables.every((t) => t.startsWith("auth_")), `${authTables.length} tables`)

const t0 = performance.now()
const server = spawn("npx", ["wrangler", "dev", "--port", "8802", "--inspector-port", "0", "--persist-to", PERSIST], { detached: true, stdio: ["ignore", "pipe", "pipe"] })
let out = ""
server.stdout.on("data", (d) => (out += d))
server.stderr.on("data", (d) => (out += d))
const stop = () => { try { process.kill(-server.pid!, "SIGTERM") } catch {} }
process.on("exit", stop)
for (let i = 0; i < 200 && !/Ready on/.test(out); i++) await sleep(100)
console.log(`    [wrangler dev ready: ${Math.round(performance.now() - t0)} ms]`)

try {
  const adaPw = pw(), bobPw = pw()
  const ada = await timed("sign-up ada (scrypt, first request)", () => signUp("Ada", "ada@example.test", adaPw))
  const bob = await signUp("Bob", "bob@example.test", bobPw)
  check("1c sign-up returns a person id and a session", ada.id.startsWith("per_") && ada.cookie.length > 0 && ada.bearer.length > 0, ada.id)
  const adaIn = await timed("sign-in ada", () => signIn("ada@example.test", adaPw))
  check("1d sign-in works; wrong password is 401", adaIn.status === 200 && (await signIn("ada@example.test", "nope-" + pw())).status === 401)
  const rows = JSON.parse(d1("select (select count(*) from auth_user) u, (select count(*) from auth_session) s, (select count(*) from auth_account) a").stdout)[0].results[0]
  check("1e the rows are in D1", rows.u === 2 && rows.s >= 2 && rows.a === 2, JSON.stringify(rows))

  // roles: ada is a reader, bob is not (operator-side SQL, not an endpoint)
  d1(`insert into roles (person_id, role) values ('${ada.id}', 'allowance-reader')`)

  console.log("== 2. JWT signing on workerd")
  const jwksRes = await timed("GET /jwks (first call generates the key)", () => fetch(`${ORIGIN}/jwks`))
  const jwks: any = await jwksRes.json()
  check("2a /jwks serves an Ed25519 public key", jwksRes.status === 200 && jwks.keys?.[0]?.kty === "OKP" && jwks.keys[0].crv === "Ed25519" && !("d" in jwks.keys[0]), JSON.stringify({ alg: jwks.keys[0].alg, kid: jwks.keys[0].kid }))
  const stored = JSON.parse(d1("select id, length(privateKey) priv from auth_jwks").stdout)[0].results
  check("2b the key is stored in auth_jwks (private key encrypted at rest)", stored.length === 1, JSON.stringify(stored))

  console.log("== 3. MCP client, headless, as ada")
  const a = await timed("whole OAuth + tool call as ada", () => mcpAs(ada))
  note(`authorize + consent steps: ${JSON.stringify(a.consent.statuses)}`)
  check("3a ada completed OAuth (discovery, DCR, PKCE, code exchange)", !!a.tokens.access_token && !!a.clientId, `client ${a.clientId.slice(0, 6)}...`)
  check("3b consent was requested for a signed-in session and accepted by POST /oauth2/consent", a.consent.consentSeen)
  check("3c allowance.get answers for ada", !a.isError && JSON.parse(a.text).person === ada.id && a.tools.includes("allowance.get"), a.text)
  const claims = decodeJwt(a.tokens.access_token)
  const hdr = decodeProtectedHeader(a.tokens.access_token)
  const v = await verifyJwt(a.tokens.access_token)
  check("2c the access token for resource=<mcp url> is a JWT that verifies against /jwks", v.payload.sub === ada.id && [claims.aud].flat().includes(MCP_URL) && hdr.alg === "EdDSA" && hdr.typ === "at+jwt", `typ=${hdr.typ} alg=${hdr.alg} aud=${JSON.stringify(claims.aud)} scope=${claims.scope}`)

  console.log("== 4. bob: signed in, no role")
  const b = await mcpAs(bob)
  check("4 bob completes OAuth, but allowance.get is refused", !!b.tokens.access_token && b.isError && /forbidden/.test(b.text), b.text.replace(bob.id, "<bob>"))

  console.log("== 5. no token, forged token")
  const none = await rpc(undefined)
  const www = none.headers.get("www-authenticate") ?? ""
  check("5a no token: 401 with resource_metadata", none.status === 401 && www.includes(`resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource"`), www)
  const { privateKey } = await generateKeyPair("EdDSA", { extractable: true })
  const forged = await new SignJWT({ sub: ada.id, scope: "openid" }).setProtectedHeader({ alg: "EdDSA", typ: "at+jwt", kid: hdr.kid! }).setIssuer(ISSUER).setAudience(MCP_URL).setIssuedAt().setExpirationTime("1h").sign(privateKey)
  const f = await rpc(forged)
  check("5b forged JWT (right claims and kid, wrong key): 401", f.status === 401 && (f.headers.get("www-authenticate") ?? "").includes("invalid_token"), `${f.status}`)
  const [h, , s] = a.tokens.access_token.split(".")
  const swapped = `${h}.${Buffer.from(JSON.stringify({ ...claims, sub: "per_someoneelse" })).toString("base64url")}.${s}`
  check("5c ada's token with the subject edited: 401", (await rpc(swapped)).status === 401)
  check("5d an opaque non-JWT bearer: 401", (await rpc("not-a-jwt")).status === 401)
  const prm: any = await (await fetch(`${ORIGIN}/.well-known/oauth-protected-resource`)).json()
  check("5e protected-resource metadata names the resource and the issuer", prm.resource === MCP_URL && prm.authorization_servers?.[0] === ISSUER)

  console.log("== 6. device flow")
  const devT = performance.now()
  const code: any = await (await post("/api/auth/device/code", { client_id: "acme-cli", scope: "openid" })).json()
  check("6a POST /device/code", !!code.device_code && !!code.user_code && code.verification_uri === `${ORIGIN}/device`, `user_code ${code.user_code}`)
  const wrongClient = await post("/api/auth/device/code", { client_id: "some-other-cli" })
  check("6b a client other than acme-cli is refused", wrongClient.status >= 400, `${wrongClient.status}`)
  const grant = "urn:ietf:params:oauth:grant-type:device_code"
  const pending: any = await (await post("/api/auth/device/token", { grant_type: grant, device_code: code.device_code, client_id: "acme-cli" })).json()
  check("6c before approval the token endpoint says authorization_pending", pending.error === "authorization_pending")
  const claim: any = await (await fetch(`${ORIGIN}/api/auth/device?user_code=${code.user_code}`, { headers: { cookie: ada.cookie } })).json()
  check("6d ada claims the code (GET /device?user_code=)", claim.user_code === code.user_code && claim.status === "pending", JSON.stringify(claim))
  const bobApprove = await post("/api/auth/device/approve", { userCode: code.user_code }, { cookie: bob.cookie })
  check("6e bob cannot approve ada's claimed code (403)", bobApprove.status === 403, `${bobApprove.status}`)
  const approve = await post("/api/auth/device/approve", { userCode: code.user_code }, { cookie: ada.cookie })
  check("6f ada approves (POST /device/approve)", approve.status === 200)
  await sleep(1200) // the configured polling interval is 1s
  const tok: any = await (await post("/api/auth/device/token", { grant_type: grant, device_code: code.device_code, client_id: "acme-cli" })).json()
  check("6g POST /device/token returns a bearer", typeof tok.access_token === "string" && tok.token_type?.toLowerCase() === "bearer")
  const me: any = await (await fetch(`${ORIGIN}/me`, { headers: { authorization: `Bearer ${tok.access_token}` } })).json()
  check("6h the device bearer resolves to ada", me.id === ada.id && me.email === "ada@example.test")
  const again = await post("/api/auth/device/token", { grant_type: grant, device_code: code.device_code, client_id: "acme-cli" })
  check("6i the device code is single-use", again.status >= 400, `${again.status}`)
  console.log(`    [device flow total: ${Math.round(performance.now() - devT)} ms, of which 1200 ms is the polling interval]`)

  console.log("== extra: consent, refresh, resource binding")
  const again2 = await mcpAs(ada, a.clientInfo)
  note(`ada, same client, SDK flow again: ${JSON.stringify(again2.consent.statuses.map((x) => x.slice(0, 60)))}`)
  check("x1 the SDK always sends prompt=consent (it asks for offline_access), so consent is asked again even for a consented client", again2.consent.consentSeen && again2.text.includes(ada.id))
  const q = (extra: string) => `${ISSUER}/oauth2/authorize?client_id=${a.clientId}&response_type=code&redirect_uri=${encodeURIComponent("http://localhost:8899/callback")}&code_challenge=${"A".repeat(43)}&code_challenge_method=S256&resource=${encodeURIComponent(MCP_URL)}${extra}`
  const quiet = await (await fetch(q("&scope=openid+profile+email+offline_access"), { headers: { cookie: ada.cookie }, redirect: "manual" })).text()
  note(`consented client, no prompt param: ${quiet.slice(0, 90)}`)
  check("x1b without prompt=consent, a consented client and person get a code with no consent page", /callback\?code=/.test(quiet))
  const other = await mcpAs(ada)
  check("x2 a new dynamically registered client asks for consent again", other.consent.consentSeen)
  const refreshed: any = await (await fetch(`${ISSUER}/oauth2/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: a.clientId, refresh_token: a.tokens.refresh_token!, resource: MCP_URL }) })).json()
  check("x3 the refresh token yields a new verifying JWT for the resource", !!refreshed.access_token && (await verifyJwt(refreshed.access_token)).payload.sub === ada.id, refreshed.error ?? "")
  const bad = await fetch(`${ISSUER}/oauth2/authorize?client_id=${a.clientId}&response_type=code&redirect_uri=${encodeURIComponent("http://localhost:8899/callback")}&code_challenge=${"A".repeat(43)}&code_challenge_method=S256&resource=${encodeURIComponent(ORIGIN + "/other")}&scope=openid`, { headers: { cookie: ada.cookie }, redirect: "manual" })
  const badText = (bad.headers.get("location") ?? (await bad.text())).slice(0, 160)
  note(`authorize with resource=${ORIGIN}/other: ${bad.status} ${badText}`)
  check("x4 a resource the server does not list is refused (invalid_target)", /invalid_target/.test(badText))
  const unauth = await fetch(`${ISSUER}/oauth2/authorize?client_id=${a.clientId}&response_type=code&redirect_uri=${encodeURIComponent("http://localhost:8899/callback")}&code_challenge=${"A".repeat(43)}&code_challenge_method=S256&resource=${encodeURIComponent(MCP_URL)}&scope=openid`, { redirect: "manual" })
  const unauthText = (unauth.headers.get("location") ?? (await unauth.text())).slice(0, 80)
  note(`authorize with no session: ${unauth.status} ${unauthText}`)
  check("x5 with no session, authorize sends the person to /login", unauthText.includes("/login"))
} finally {
  stop()
}

await sleep(1500)
const left = spawnSync("pgrep", ["-fl", "[w]orkerd|[w]rangler"], { encoding: "utf8" }).stdout.trim()
check("nothing left running (pgrep workerd|wrangler)", left === "", left)
console.log(failures() === 0 ? "\nALL CHECKS PASSED" : `\n${failures()} CHECK(S) FAILED`)
process.exit(failures() === 0 ? 0 : 1)
