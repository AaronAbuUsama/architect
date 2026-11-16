import { createRemoteJWKSet, jwtVerify } from "jose";

let jwks; // module-scope cache; the isolate may be recycled
const list = (s) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
// `*` matches one path segment, so refs/pull/*/merge matches refs/pull/7/merge only.
const matches = (pattern, value) =>
  new RegExp("^" + pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+") + "$").test(value);
const allowed = (patterns, value) => typeof value === "string" && list(patterns).some((p) => matches(p, value));
const no = (reason) => Response.json({ ok: false, reason }, { status: 401 });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname !== "/verdicts") return new Response("not found", { status: 404 });
    const m = (req.headers.get("authorization") ?? "").match(/^Bearer (.+)$/);
    if (!m) return no("missing token");
    jwks ??= createRemoteJWKSet(new URL(env.OIDC_JWKS_URL), { timeoutDuration: 5000 });
    try {
      const { payload: c } = await jwtVerify(m[1], jwks, {
        issuer: env.OIDC_ISSUER,
        audience: env.OIDC_AUDIENCE,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "iat", "repository", "ref", "workflow"],
        clockTolerance: 30,
      });
      if (c.repository !== env.ALLOWED_REPOSITORY) return no("repository");
      if (!allowed(env.ALLOWED_REFS, c.ref)) return no("ref");
      if (!allowed(env.ALLOWED_WORKFLOWS, c.workflow)) return no("workflow");
      const keys = ["repository", "ref", "workflow", "event_name", "sha", "sub", "job_workflow_ref", "runner_environment"];
      return Response.json({ ok: true, claims: Object.fromEntries(keys.map((k) => [k, c[k]])) });
    } catch (e) {
      return no(e.code ?? e.name);
    }
  },
};
