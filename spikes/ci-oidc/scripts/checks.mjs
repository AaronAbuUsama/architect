// The checks, shared by CI and the local run. Env: BASE, TOKEN_GOOD, TOKEN_BADAUD (never printed), and optionally
// EXTRA="name|ENV_VAR_HOLDING_TOKEN|wantStatus;..." for more tokens. Prints status codes, the worker's reason
// string, and for 200s the non-secret claims the worker returns.
import { SignJWT, generateKeyPair, decodeJwt, decodeProtectedHeader } from "jose";

const { BASE, TOKEN_GOOD, TOKEN_BADAUD, EXTRA } = process.env;
const post = async (token) => {
  const r = await fetch(`${BASE}/verdicts`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ verdict: "pass" }),
  });
  return { status: r.status, body: await r.json() };
};

// Forged: the real token's claims and kid, re-signed with a fresh key the issuer never published.
const { privateKey } = await generateKeyPair("RS256");
const forged = await new SignJWT({ ...decodeJwt(TOKEN_GOOD) })
  .setProtectedHeader({ alg: "RS256", kid: decodeProtectedHeader(TOKEN_GOOD).kid })
  .sign(privateKey);

const cases = [
  ["real token", TOKEN_GOOD, 200],
  ["wrong audience", TOKEN_BADAUD, 401],
  ["forged (fresh key, real claims and kid)", forged, 401],
  ["no token", undefined, 401],
];
for (const spec of (EXTRA ?? "").split(";").filter(Boolean)) {
  const [name, envName, want] = spec.split("|");
  cases.push([name, process.env[envName], Number(want)]);
}

let failed = 0;
for (const [name, token, want] of cases) {
  const { status, body } = await post(token);
  const ok = status === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${status} (want ${want})${body.reason ? ` reason=${body.reason}` : ""}`);
  if (body.claims) for (const k of ["repository", "ref", "workflow", "event_name", "sha"]) console.log(`        ${k} = ${body.claims[k]}`);
}
process.exit(failed ? 1 : 0);
