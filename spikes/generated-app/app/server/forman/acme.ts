// Calling acme's Worker as a member of the local world's cast (F6 #4), and the app's own log of what it called as whom.
// The cast's test tokens stay in this process's memory: never in a file, a setting or a log. Each call sends a
// `traceparent`, so the Worker's trace has the id the app picked and the call log can name who made it (design gap 2).
import { fail, type ActionErrors, type ActionRunContext } from "@agent-native/core/action";
import { getSetting, mutateSetting, putSetting } from "@agent-native/core/settings";
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "./config.ts";

export const CAST = ["ada", "olga", "bob"] as const;
export type CastName = (typeof CAST)[number];

export interface CallSpec {
  readonly operation: string;
  readonly route: string;
  readonly requestKey: boolean;
  readonly secret: { readonly payload: ReadonlyArray<string>; readonly answer: ReadonlyArray<string> };
}

export interface LoggedCall {
  readonly at: number;
  readonly operation: string;
  readonly as: CastName;
  readonly person: string;
  readonly trace: string;
  readonly status: number;
  readonly outcome: string;
  readonly args: Record<string, unknown>;
  readonly answer?: Record<string, unknown>;
  readonly requestKey?: string;
  /** Who pressed it: the UI, the agent, MCP, the CLI. */
  readonly via: string;
}

let cast: Record<CastName, { person: string; token: string }> | undefined;

const castOf = async () => {
  if (cast) return cast;
  const r = await fetch(`${config.acme}/_world/cast`, { method: "POST", body: JSON.stringify({ names: CAST }) });
  if (!r.ok) fail(`acme's world didn't give a cast (HTTP ${r.status} from ${config.acme}/_world/cast): is forman dev running?`, { errorCode: "AcmeUnreachable", statusCode: 502 });
  cast = (await r.json()) as typeof cast;
  return cast!;
};

/** The cast's names and person ids, never their tokens. */
export const people = async () => Object.fromEntries(Object.entries(await castOf()).map(([n, c]) => [n, c.person])) as Record<CastName, string>;

export const actingAs = async (): Promise<CastName | undefined> => {
  const s = await getSetting("forman-acting-as");
  const name = s?.["name"];
  return CAST.includes(name as CastName) ? (name as CastName) : undefined;
};
export const actAs = (name: CastName | null) => putSetting("forman-acting-as", { name });

const LOG = "forman-calls";
export const callLog = async (): Promise<LoggedCall[]> => ((await getSetting(LOG))?.["calls"] as LoggedCall[] | undefined) ?? [];
const remember = (c: LoggedCall) =>
  mutateSetting(LOG, (cur) => ({ calls: [c, ...(((cur?.["calls"] as LoggedCall[] | undefined) ?? []))].slice(0, 300) }));

const redact = (o: Record<string, unknown>, keys: ReadonlyArray<string>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, keys.includes(k) ? "•••" : v]));

export const acme = {
  call: async <A>(spec: CallSpec, args: Record<string, unknown>, ctx: ActionRunContext | undefined, errors: ActionErrors<string> | undefined): Promise<A> => {
    const as = await actingAs();
    if (!as) fail(`Nobody to call ${spec.operation} as: choose ada, olga or bob in the top bar (or run act-as).`, { errorCode: "NoCaller", statusCode: 400 });
    const who = (await castOf())[as];
    const trace = randomBytes(16).toString("hex");
    const requestKey = spec.requestKey ? `app-${ctx?.toolCallId ?? randomUUID()}` : undefined;
    const r = await fetch(`${config.acme}/${spec.route}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${who.token}`,
        traceparent: `00-${trace}-${randomBytes(8).toString("hex")}-01`,
        ...(requestKey ? { "idempotency-key": requestKey } : {}),
      },
      body: JSON.stringify(args),
    }).catch(() => fail(`acme isn't answering at ${config.acme}: is forman dev running?`, { errorCode: "AcmeUnreachable", statusCode: 502 }));
    const body = ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
    const tag = typeof body["_tag"] === "string" ? (body["_tag"] as string) : undefined;
    const answer = r.ok ? redact(body, spec.secret.answer) : undefined;
    await remember({
      at: Date.now(), operation: spec.operation, as, person: who.person, trace, status: r.status, outcome: r.ok ? "answered" : (tag ?? `HTTP ${r.status}`),
      args: redact(args, spec.secret.payload), ...(answer ? { answer } : {}), ...(requestKey ? { requestKey } : {}), via: ctx?.caller ?? "unknown",
    });
    if (r.ok) return answer as A; // outputSchema checks it at the edge
    // acme's refusal leaves the shell as 422, whatever acme's own status: agent-native reads a 403 as "the app's user
    // lacks permission" and toasts that, which is wrong here. acme's status stays in details.
    const details = { ...redact(body, spec.secret.answer), trace, calledAs: as, person: who.person, acmeStatus: r.status };
    const message = `acme refused ${spec.operation} called as ${as}: ${tag ?? `HTTP ${r.status}`} (trace ${trace})`;
    if (tag && errors?.codes.includes(tag)) errors.fail(message, tag, { statusCode: 422, details });
    return fail(message, { errorCode: tag ?? `HTTP${r.status}`, statusCode: r.status >= 500 ? 502 : 422, details });
  },
};
