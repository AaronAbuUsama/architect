// The test page: hand-written harness, never generated. It wires the generated forms to Plugged In's real generated
// SDK and gives the tests a handle (`window.spike`) on the agent bridge. `?page=claim` (default), `marks` or `style`.
import "@ui-sdk/core/web.css";
import { createRoot } from "react-dom/client";
import { createAgent } from "@ui-sdk/react/agent";
import { Effect } from "effect";
import { FetchHttpClient } from "effect/http";
import * as PluggedIn from "../.plugged-in/generated/sdk/src/index.ts";
import { refusal, type ActionContext, type ActionHost, type ActionResult } from "../src/action.ts";
import { handleClaimAction } from "../generated/handle-claim.action.ts";
import { HandleClaimForm } from "../generated/handle-claim.react.tsx";
import { handleReleaseAction } from "../generated/handle-release.action.ts";
import { HandleReleaseForm } from "../generated/handle-release.react.tsx";
import { sessionSignInAction } from "../generated/session-sign-in.action.ts";
import { SessionSignInForm } from "../generated/session-sign-in.react.tsx";

type Step = { readonly confirm?: string };
/** What the tests set and read. The token is set by the test before load and never shown. */
type Spike = {
  token?: string;
  nextRequestKey?: string;
  /** For the marks page: the next recorded send is refused with this, as a declared error would be. */
  refuseNext?: { name: string; code: string };
  approve: boolean;
  /** How many times an action asked a person itself (it must not, when the bridge or the press already did). */
  asked: number;
  sent: Array<{ verb: string; payload: unknown; via: string }>;
  /** handle.release run straight through its action, as a host that has not asked anyone would (an MCP tool call). */
  releaseDirect: (args: { handle: string }) => Promise<ActionResult<unknown>>;
  agent: ReturnType<typeof createAgent>;
  approvingAgent: ReturnType<typeof createAgent>;
};
declare global {
  interface Window { spike: Spike }
}
const spike: Spike = (window.spike = {
  ...(window.spike ?? {}),
  approve: false,
  asked: 0,
  sent: [],
  releaseDirect: () => Promise.reject(new Error("not on this page")),
  // Without `allow`, a step under data-agent-confirm fails with "Needs a person".
  agent: createAgent(),
  // With one: the person's answer, which the test flips.
  approvingAgent: createAgent({ allow: (step: Step) => !step.confirm || window.spike.approve }),
});

const hex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * The page's source of a press, as a header on the request: the SDK has no other way to carry it. And a `traceparent`,
 * as `ortho prove` sends one, so the call's journal entries can be read back by trace (without one, a world with no
 * collector keys them by a trace nobody is told).
 */
const fetchAs = (via: string): typeof fetch => (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set("x-ortho-source", via);
  headers.set("traceparent", `00-${hex(16)}-${hex(8)}-01`);
  return fetch(input, { ...init, headers });
};

/** The host's one way to ask a person; here the test's answer, counted. */
const ask: ActionHost["ask"] = () => {
  spike.asked += 1;
  return Promise.resolve(spike.approve);
};

/** handle.claim through the real generated SDK: its client, its payload check, its declared errors. */
const claim = (payload: unknown, { caller }: ActionContext): Promise<ActionResult<{ handle: string }>> => {
  const via = caller.via;
  const requestKey = spike.nextRequestKey;
  spike.nextRequestKey = undefined;
  const client = PluggedIn.layer({ url: location.origin, credential: spike.token ? PluggedIn.Credential.session(spike.token) : undefined });
  return Effect.runPromise(
    PluggedIn.handle.claim(payload as never, requestKey === undefined ? undefined : { requestKey }).pipe(
      Effect.map((answer) => ({ ok: true as const, answer: { handle: String(answer.handle) } })),
      Effect.catch((error: { readonly _tag: string; readonly code?: string }) =>
        Effect.succeed({ ok: false as const, refusal: refusal(error._tag, error.code ?? "none") })),
      Effect.provide(client),
      Effect.provideService(FetchHttpClient.Fetch, fetchAs(via)),
    ),
  );
};

/** For the marks page: nothing leaves the page, each send is recorded and answered as the declaration says. */
const recorded = (answers: Record<string, unknown>): ActionHost => ({
  ask,
  call: <A,>(verb: string, payload: unknown, { caller }: ActionContext) => {
    spike.sent.push({ verb, payload, via: caller.via });
    const refuse = spike.refuseNext;
    spike.refuseNext = undefined;
    return Promise.resolve((refuse ? { ok: false, refusal: refusal(refuse.name, refuse.code) } : { ok: true, answer: answers[verb] }) as ActionResult<A>);
  },
});
const recorder = recorded({ "session.sign-in": { session: "ses_spike01", token: "tok-issued-once-0000" }, "handle.release": {} });
const world: ActionHost = { ask, call: (_operation, args, ctx) => claim(args, ctx) as never };
const claimAction = handleClaimAction(world);
const signIn = sessionSignInAction(recorder);
const release = handleReleaseAction(recorder);
spike.releaseDirect = (args) => release.run(args as never, { caller: { via: "agent" }, approved: false });

const page = new URLSearchParams(location.search).get("page") ?? "claim";
const root = createRoot(document.getElementById("root")!);
if (page === "claim") {
  root.render(<HandleClaimForm action={claimAction} label="Claim your name" />);
} else if (page === "marks") {
  root.render(
    <>
      <SessionSignInForm action={signIn} label="Sign in" />
      <HandleReleaseForm action={release} label="Release your name" />
    </>,
  );
} else {
  // Proof 7: only web.css and a few --ui-* tokens; no other library, no other stylesheet.
  document.documentElement.style.cssText = "--ui-primary: oklch(0.55 0.2 260); --ui-primary-foreground: oklch(0.99 0 0); --ui-radius: 0.5rem; --ui-font-size: 0.9375rem;";
  // web.css styles its components and leaves the page itself to the app: these three come from its own tokens.
  document.body.style.cssText = "margin: 0; font-family: var(--ui-font-sans); background: var(--ui-background); color: var(--ui-foreground);";
  root.render(
    <div style={{ maxWidth: "26rem", margin: "3rem auto", display: "grid", gap: "2rem" }}>
      <HandleClaimForm action={claimAction} label="Claim your name" />
      <SessionSignInForm action={signIn} label="Sign in" />
    </div>,
  );
}
