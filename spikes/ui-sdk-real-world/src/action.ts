// The one seam between a generated form and the app: an action, shaped as M1.22 and M1.23 describe it (K5 decision 3,
// K9 finding 1 to 5), so a real generated action can replace this file later. A stand-in, in plain TypeScript.
//   caller    who the call is made as: the person, or an agent for that person (ST1.05's `agent for <person>`)
//   payload   the operation's payload, checked by the SDK
//   refusal   a declared error leaves as the no-write `ActionRefusal`, in agent-native's shape (K9 finding 2)
//   approval  `needsApproval` is the wrapper's, never `run`'s: a host that asked first is never asked twice (finding 5)

/** Who a call is made as. The page knows only how a press happened; the host turns this into a credential. */
export type Caller = { readonly via: "person" } | { readonly via: "agent" };

/** A declared refusal: nothing was written. The fields are the ones agent-native reads (K9 finding 2). */
export type ActionRefusal = {
  readonly actionContractError: true;
  readonly noWrite: true;
  readonly errorCode: string;
  readonly statusCode: 422;
  readonly details: { readonly name: string };
};
export const refusal = (name: string, errorCode: string): ActionRefusal =>
  ({ actionContractError: true, noWrite: true, errorCode, statusCode: 422, details: { name } });

export type ActionResult<Answer> = { readonly ok: true; readonly answer: Answer } | { readonly ok: false; readonly refusal: ActionRefusal };

export type ActionContext = {
  readonly caller: Caller;
  /** The host already asked a person and got a yes (the agent bridge's `allow`, or the person pressed it themself). */
  readonly approved: boolean;
};

/** What a generated action module returns from `options(host)`: agent-native's field names, no `retrySafe`. */
export type ActionOptions<Payload, Answer> = {
  readonly name: string;
  readonly description: string;
  readonly readOnly: boolean;
  readonly needsApproval: boolean;
  /** False when the operation is `.notVia(Via.agent)`. Nothing in Plugged In is, today. */
  readonly agentTool: boolean;
  readonly errors: Readonly<Record<string, string>>;
  readonly run: (args: Payload, ctx: ActionContext) => Promise<ActionResult<Answer>>;
};

/**
 * What the host supplies (M1.22: the SDK client, the caller's credential, the request key). Here it is one function
 * per call by operation name, so the marks page can record instead of send. In M1.22 the generated `run` calls the
 * SDK function itself and the host supplies only the client.
 */
export type ActionHost = {
  readonly call: <Answer>(operation: string, args: unknown, ctx: ActionContext) => Promise<ActionResult<Answer>>;
  /** How this host asks a person for a yes, when nobody has yet. */
  readonly ask: (action: { readonly name: string; readonly description: string }, args: unknown) => Promise<boolean>;
};

export type Action<Payload, Answer> = ActionOptions<Payload, Answer>;

/** Our `defineAction` (M1.23): the approval lives here. `ask` is the host's way to ask a person, used only if nobody has. */
export const defineAction = <Payload, Answer>(
  options: ActionOptions<Payload, Answer>,
  ask: ActionHost["ask"],
): Action<Payload, Answer> => ({
  ...options,
  run: (args, ctx) =>
    !options.needsApproval || ctx.approved
      ? options.run(args, ctx)
      : ask(options, args).then((yes) => (yes ? options.run(args, { ...ctx, approved: true }) : { ok: false, refusal: refusal("NotApproved", "approval") })),
});
