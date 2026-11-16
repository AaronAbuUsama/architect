import { makeAuth, type AuthEnv } from "./auth.ts"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

export default {
  async fetch(request: Request, env: AuthEnv): Promise<Response> {
    const url = new URL(request.url)
    const auth = makeAuth(env, url.origin)
    const headers = request.headers
    try {
      if (url.pathname.startsWith("/api/auth/")) return await auth.handler(request)

      // Architect-style principal resolution: Authorization: Bearer <token>  or  x-api-key
      if (url.pathname === "/me") {
        const session = await auth.api.getSession({ headers })
        if (!session) return json({ error: "unauthenticated" }, 401)
        return json({ id: session.user.id, email: session.user.email, sessionId: session.session.id })
      }

      const body: any = request.method === "POST" ? await request.json() : {}
      switch (url.pathname) {
        case "/spike/org/create": return json(await auth.api.createOrganization({ headers, body }))
        case "/spike/org/invite": return json(await auth.api.createInvitation({ headers, body }))
        case "/spike/org/full": return json(await auth.api.getFullOrganization({ headers, query: { organizationId: url.searchParams.get("id")! } }))
        // listUserInvitations with a session ALWAYS demands a verified email (measured: 403). The trusted-server
        // form takes ?email, so resolve the principal ourselves and pass the email with no headers.
        case "/spike/invitations/list-with-session": return json(await auth.api.listUserInvitations({ headers }))
        case "/spike/invitations/list": {
          const session = await auth.api.getSession({ headers })
          if (!session) return json({ error: "unauthenticated" }, 401)
          return json(await auth.api.listUserInvitations({ query: { email: session.user.email } }))
        }
        case "/spike/invitations/accept": return json(await auth.api.acceptInvitation({ headers, body }))
        case "/spike/apikey/create": return json(await auth.api.createApiKey({ headers, body }))
        case "/spike/apikey/create-server": return json(await auth.api.createApiKey({ body })) // no headers: trusted server call
        case "/spike/apikey/verify": return json(await auth.api.verifyApiKey({ body }))
        case "/spike/ids": {
          const out: Record<string, string[]> = {}
          for (const t of ["user", "session", "account", "verification", "organization", "member", "invitation", "apikey"]) {
            const r = await env.DB.prepare(`select id from "${t}"`).all<{ id: string }>()
            out[t] = r.results.map((x) => x.id)
          }
          return json(out)
        }
      }
      return json({ error: "not found" }, 404)
    } catch (e: any) {
      // better-auth APIError carries status + body
      if (e && typeof e === "object" && "statusCode" in e) return json({ apiError: true, status: e.statusCode, body: e.body }, e.statusCode)
      return json({ error: String(e?.stack ?? e) }, 500)
    }
  }
}
