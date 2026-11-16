// The whole proof, written against a `fetch` so it runs both from outside a real `wrangler dev`
// (scripts/e2e.ts) and from vitest-pool-workers (SELF.fetch). No mocks: every call is a real HTTP request
// into the worker, which talks to real local D1.
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface Report {
  checks: { name: string; ok: boolean; detail?: unknown }[]
  facts: Record<string, unknown>
  timings: Record<string, { n: number; p50: number; p95: number; min: number; max: number }>
}

const BASE = "http://localhost:8801"
const pass = "throwaway-pass-1"
const run = Math.random().toString(36).slice(2, 8)

const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const q = (p: number) => s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]!
  const r = (n: number) => Math.round(n * 10) / 10
  return { n: s.length, p50: r(q(0.5)), p95: r(q(0.95)), min: r(s[0]!), max: r(s[s.length - 1]!) }
}

export const runFlow = async (f: Fetch, opts: { timingRuns?: number } = {}): Promise<Report> => {
  const report: Report = { checks: [], facts: {}, timings: {} }
  const check = (name: string, ok: boolean, detail?: unknown) => report.checks.push({ name, ok, detail: ok ? undefined : detail })
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    f(BASE + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
  const bearer = (t: string) => ({ authorization: `Bearer ${t}` })
  const now = () => performance.now()

  // ---- 2. sign up / sign in over HTTP
  const emailA = `a-${run}@example.test`
  const emailB = `b-${run}@example.test`
  const up = await post("/api/auth/sign-up/email", { email: emailA, password: pass, name: "Alice" })
  const upBody: any = await up.json()
  const tokenA = up.headers.get("set-auth-token")!
  check("sign-up 200 + set-auth-token", up.status === 200 && !!tokenA, { status: up.status, upBody })
  const userA: string = upBody.user.id
  const upB = await post("/api/auth/sign-up/email", { email: emailB, password: pass, name: "Bob" })
  const userB: string = ((await upB.json()) as any).user.id
  const tokenB0 = upB.headers.get("set-auth-token")!

  // a non-browser client that sends Sec-Fetch-* (Node 26 fetch does) but no Origin header
  const noOrigin = await f(BASE + "/api/auth/sign-in/email", { method: "POST", headers: { "content-type": "application/json", "sec-fetch-mode": "cors", origin: "" }, body: JSON.stringify({ email: emailA, password: pass }) })
  report.facts["sign-in with Sec-Fetch-Mode but no Origin"] = { status: noOrigin.status, body: await noOrigin.json() }
  const evil = await post("/api/auth/sign-in/email", { email: emailA, password: pass }, { origin: "https://evil.example" })
  report.facts["sign-in from untrusted Origin"] = { status: evil.status, body: await evil.json() }

  const dup = await post("/api/auth/sign-up/email", { email: emailA, password: pass, name: "Alice" })
  report.facts["sign-up duplicate email"] = { status: dup.status, body: await dup.json() }
  const shortPw = await post("/api/auth/sign-up/email", { email: `s-${run}@example.test`, password: "x", name: "S" })
  report.facts["sign-up short password"] = { status: shortPw.status, body: await shortPw.json() }

  const inn = await post("/api/auth/sign-in/email", { email: emailA, password: pass })
  const signedTokenA = inn.headers.get("set-auth-token")!
  check("sign-in 200 + set-auth-token", inn.status === 200 && !!signedTokenA, { status: inn.status })
  report.facts["token shape"] = { setAuthToken: signedTokenA.replace(/[A-Za-z0-9+/=]/g, "x").length, hasDot: signedTokenA.includes("."), bodyTokenIsPrefix: signedTokenA.startsWith(((await inn.clone().json()) as any).token) }
  const bad = await post("/api/auth/sign-in/email", { email: emailA, password: "wrong-password-123" })
  report.facts["sign-in wrong password"] = { status: bad.status, body: await bad.json(), hasToken: !!bad.headers.get("set-auth-token") }
  const nouser = await post("/api/auth/sign-in/email", { email: `nobody-${run}@example.test`, password: pass })
  report.facts["sign-in unknown email"] = { status: nouser.status, body: await nouser.json() }

  // ---- 3. bearer -> principal
  const me = await f(BASE + "/me", { headers: bearer(signedTokenA) })
  const meBody: any = await me.json()
  check("bearer resolves user id + email", me.status === 200 && meBody.id === userA && meBody.email === emailA, { status: me.status, meBody })
  const meNone = await f(BASE + "/me")
  report.facts["/me without token"] = { status: meNone.status, body: await meNone.json() }
  const meBad = await f(BASE + "/me", { headers: bearer("garbage.garbage") })
  report.facts["/me with garbage token"] = { status: meBad.status, body: await meBad.json() }
  const meRaw = await f(BASE + "/me", { headers: bearer(tokenA.split(".")[0]!) })
  report.facts["/me with unsigned token (body token, no signature)"] = { status: meRaw.status }
  const meTampered = await f(BASE + "/me", { headers: bearer(signedTokenA.slice(0, -4) + "AAAA") })
  report.facts["/me with tampered signature"] = { status: meTampered.status }
  const direct = await f(BASE + "/api/auth/get-session", { headers: bearer(signedTokenA) })
  report.facts["GET /api/auth/get-session with bearer"] = { status: direct.status }

  // ---- 5. organization
  const org = await post("/spike/org/create", { name: "Acme", slug: `acme-${run}` }, bearer(signedTokenA))
  const orgBody: any = await org.json()
  check("createOrganization", org.status === 200 && orgBody.id?.startsWith("org_"), { status: org.status, orgBody })
  const orgId: string = orgBody.id
  report.facts["organization create result (shape)"] = { keys: Object.keys(orgBody), memberRoles: orgBody.members?.map((m: any) => m.role) }

  const inv = await post("/spike/org/invite", { organizationId: orgId, email: emailB, role: "member" }, bearer(signedTokenA))
  const invBody: any = await inv.json()
  check("createInvitation without sendInvitationEmail", inv.status === 200 && invBody.id?.startsWith("inv_"), { status: inv.status, invBody })

  // B must sign in to hold a session (sign-up already gave one); list and accept.
  const signInB = await post("/api/auth/sign-in/email", { email: emailB, password: pass })
  const tokenB = signInB.headers.get("set-auth-token") ?? tokenB0
  const listSess = await f(BASE + "/spike/invitations/list-with-session", { method: "POST", headers: { "content-type": "application/json", ...bearer(tokenB) }, body: "{}" })
  report.facts["listUserInvitations with B's session (unverified email)"] = { status: listSess.status, body: await listSess.json() }
  const list = await f(BASE + "/spike/invitations/list", { method: "POST", headers: { "content-type": "application/json", ...bearer(tokenB) }, body: "{}" })
  const listBody: any = await list.json()
  check("B lists the invitation", Array.isArray(listBody) && listBody.some((i: any) => i.id === invBody.id), { listBody })
  const wrongAccept = await post("/spike/invitations/accept", { invitationId: invBody.id }, bearer(signedTokenA))
  report.facts["inviter (wrong user) accepts invitation"] = { status: wrongAccept.status, body: await wrongAccept.json() }
  const acc = await post("/spike/invitations/accept", { invitationId: invBody.id }, bearer(tokenB))
  const accBody: any = await acc.json()
  check("B accepts invitation", acc.status === 200 && accBody.member?.role === "member" && accBody.member?.userId === userB, { status: acc.status, accBody })
  const full = await f(BASE + `/spike/org/full?id=${orgId}`, { headers: bearer(tokenB) })
  const fullBody: any = await full.json()
  report.facts["org members after accept"] = (fullBody.members ?? []).map((m: any) => ({ id: m.id, userId: m.userId, role: m.role }))
  check("org has A as owner and B as member", fullBody.members?.some((m: any) => m.userId === userA && m.role === "owner") && fullBody.members?.some((m: any) => m.userId === userB && m.role === "member"), fullBody)
  const reaccept = await post("/spike/invitations/accept", { invitationId: invBody.id }, bearer(tokenB))
  report.facts["accept the same invitation twice"] = { status: reaccept.status, body: await reaccept.json() }

  // ---- 6. api keys
  const kNoSession = await post("/spike/apikey/create", { configId: "user", name: "ci", userId: userA }, {})
  report.facts["createApiKey via HTTP route, body.userId, no session"] = { status: kNoSession.status, body: await kNoSession.json() }
  const kSrv = await post("/spike/apikey/create-server", { configId: "user", name: "srv", userId: userA })
  const kSrvBody: any = await kSrv.json()
  report.facts["createApiKey server-side (no headers) with body.userId"] = { status: kSrv.status, id: kSrvBody.id, referenceId: kSrvBody.referenceId }
  const k = await post("/spike/apikey/create", { configId: "user", name: "ci" }, bearer(signedTokenA))
  const kBody: any = await k.json()
  report.facts["createApiKey user key via bearer"] = { status: k.status, keys: Object.keys(kBody), id: kBody.id, configId: kBody.configId, referenceId: kBody.referenceId, keyPrefix: String(kBody.key).slice(0, 8), keyLength: String(kBody.key).length, start: kBody.start }
  check("api key created with key_ id", k.status === 200 && kBody.id?.startsWith("key_") && !!kBody.key, { status: k.status, kBody })
  const v = await post("/spike/apikey/verify", { key: kBody.key, configId: "user" })
  const vBody: any = await v.json()
  check("verifyApiKey valid", vBody.valid === true && vBody.key?.referenceId === userA, vBody)
  const vBad = await post("/spike/apikey/verify", { key: kBody.key + "x", configId: "user" })
  report.facts["verifyApiKey with wrong key"] = { status: vBad.status, body: await vBad.json() }
  const viaKey = await f(BASE + "/me", { headers: { "x-api-key": kBody.key } })
  const viaKeyBody: any = await viaKey.json()
  report.facts["/me with x-api-key (enableSessionForAPIKeys on user config)"] = { status: viaKey.status, body: viaKeyBody }
  const viaKeyBad = await f(BASE + "/me", { headers: { "x-api-key": "nope" } })
  report.facts["/me with bad x-api-key"] = { status: viaKeyBad.status }

  const ok = await post("/spike/apikey/create", { configId: "org", name: "org-key", organizationId: orgId }, bearer(signedTokenA))
  const okBody: any = await ok.json()
  report.facts["createApiKey org-scoped (config 'org', A is owner)"] = { status: ok.status, body: ok.status === 200 ? { id: okBody.id, referenceId: okBody.referenceId, configId: okBody.configId } : okBody }
  if (ok.status === 200) {
    const ov = await post("/spike/apikey/verify", { key: okBody.key, configId: "org" })
    const ovBody: any = await ov.json()
    check("verify org key -> referenceId is the org", ovBody.valid === true && ovBody.key?.referenceId === orgId, ovBody)
    const orgKeyMe = await f(BASE + "/me", { headers: { "x-api-key": okBody.key } })
    report.facts["/me with org api key"] = { status: orgKeyMe.status, body: await orgKeyMe.json() }
  }
  const okB = await post("/spike/apikey/create", { configId: "org", name: "x", organizationId: orgId }, bearer(tokenB))
  report.facts["createApiKey org-scoped by plain member B"] = { status: okB.status, body: await okB.json() }

  // ---- 4. ids in D1
  const ids: Record<string, string[]> = (await (await f(BASE + "/spike/ids")).json()) as any
  const want: Record<string, string> = { user: "per", session: "ses", account: "acc", verification: "ver", organization: "org", member: "mem", invitation: "inv", apikey: "key" }
  const sample: Record<string, string> = {}
  for (const [t, p] of Object.entries(want)) {
    const re = new RegExp(`^${p}_[0-9a-z]{16}$`)
    const rows = ids[t] ?? []
    if (rows.length > 0) sample[t] = rows[0]!
    check(`ids in "${t}" look like ${p}_<16 base36> (${rows.length} rows)`, rows.length > 0 ? rows.every((i) => re.test(i)) : t === "verification", { t, rows: rows.slice(0, 3) })
  }
  report.facts["id samples from D1"] = sample

  // ---- 7. timings
  const n = opts.timingRuns ?? 30
  const su: number[] = [], si: number[] = [], gs: number[] = [], gsKey: number[] = []
  let tok = ""
  for (let i = 0; i < n; i++) {
    const e = `t${i}-${run}@example.test`
    let t0 = now()
    const r1 = await post("/api/auth/sign-up/email", { email: e, password: pass, name: "T" })
    await r1.text()
    su.push(now() - t0)
    t0 = now()
    const r2 = await post("/api/auth/sign-in/email", { email: e, password: pass })
    await r2.text()
    si.push(now() - t0)
    tok = r2.headers.get("set-auth-token")!
    t0 = now()
    const r3 = await f(BASE + "/me", { headers: bearer(tok) })
    await r3.text()
    gs.push(now() - t0)
    t0 = now()
    const r4 = await f(BASE + "/me", { headers: { "x-api-key": kBody.key } })
    await r4.text()
    gsKey.push(now() - t0)
  }
  report.timings["sign-up"] = stats(su)
  report.timings["sign-in"] = stats(si)
  report.timings["getSession (bearer)"] = stats(gs)
  report.timings["getSession (x-api-key)"] = stats(gsKey)
  return report
}
