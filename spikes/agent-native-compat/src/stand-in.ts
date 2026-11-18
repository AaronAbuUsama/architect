// Stand-in for what a blueprint declares and the generated SDK exposes (examples/signup shapes: Schema.TaggedError
// with a `code` and httpApiStatus; an operation returns a handle whose `.confirmed` is the answer).
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Effect, Schema } from "effect";

export const ProposalId = Schema.String.pipe(Schema.brand("ProposalId"));
export const payloadSchema = Schema.Struct({
  proposal: ProposalId,
  choice: Schema.Literals(["yes", "no", "abstain"]),
  note: Schema.optional(Schema.String),
  weight: Schema.Number,
  stake: Schema.BigIntFromString,
});
export const answerSchema = Schema.Struct({ voteId: Schema.String, tally: Schema.Number });

export class SoldOut extends Schema.TaggedError<SoldOut>()("SoldOut", { code: Schema.Literal("PR-001"), remaining: Schema.Number }, { httpApiStatus: 422 }) {
  static readonly code = "PR-001" as const;
  override get message() { return `Sold out: ${this.remaining} places left`; }
}
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001") }, { httpApiStatus: 403 }) {
  static readonly code = "AR-001" as const;
}
export const declaration = {
  description: "Cast a vote on a proposal.",
  payloadSchema,
  answerSchema,
  refusals: [SoldOut, NotAllowed],
} as const;

export type Payload = typeof payloadSchema.Type;
export type Answer = typeof answerSchema.Type;
export type Refusal = SoldOut | NotAllowed;

/** What the stand-in worker saw, so a check can count requests and read the key each one carried. */
export const worker = {
  baseUrl: "",
  calls: [] as Array<{ body: unknown; requestKey: string | undefined }>,
  /** Votes actually committed: a replayed request key does not commit again (the Worker's own replay). */
  committed: new Map<string, Answer>(),
  /** What the next call does. */
  mode: "ok" as "ok" | "soldout" | "defect",
};

/** A real HTTP server on 127.0.0.1 that plays the Orthograph Worker, so the SDK call is a real outbound fetch POST. */
export const startWorker = (): Promise<{ stop: () => Promise<void> }> =>
  new Promise((resolve) => {
    const server = createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const key = req.headers["x-request-key"] as string | undefined;
        worker.calls.push({ body: raw ? JSON.parse(raw) : undefined, requestKey: key });
        const send = (status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
        if (worker.mode === "soldout") return send(422, { _tag: "SoldOut", code: "PR-001", remaining: 0 });
        if (worker.mode === "defect") return send(500, { message: "D1 exploded: secret-connection-detail" });
        const replay = key ? worker.committed.get(key) : undefined;
        if (replay) return send(200, replay);
        const answer = { voteId: `v${worker.committed.size + 1}`, tally: worker.committed.size + 1 };
        if (key) worker.committed.set(key, answer);
        return send(200, answer);
      });
    });
    server.listen(0, "127.0.0.1", () => {
      worker.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve({ stop: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }) });
    });
  });

/** Stand-in for `proposal.vote(payload, { requestKey })` from the generated SDK: a handle whose `.confirmed` is the answer. */
export const vote = (payload: Payload, opts: { readonly requestKey?: string }) =>
  Effect.succeed({
    confirmed: Effect.tryPromise({
      try: async (): Promise<{ status: number; body: any }> => {
        const res = await fetch(`${worker.baseUrl}/proposal/vote`, {
          method: "POST",
          headers: { "content-type": "application/json", ...(opts.requestKey ? { "x-request-key": opts.requestKey } : {}) },
          body: JSON.stringify(Schema.encodeSync(payloadSchema)(payload)),
        });
        return { status: res.status, body: await res.json() };
      },
      catch: (e) => new Error(`SdkDown: ${String(e)}`),
    }).pipe(
      Effect.flatMap(({ status, body }): Effect.Effect<Answer, Refusal> =>
        status === 200 ? Effect.succeed(body as Answer)
        : status === 422 ? Effect.fail(new SoldOut({ code: "PR-001", remaining: body.remaining }))
        : Effect.die(new Error(`Worker ${status}: ${body.message}`))),
      Effect.catch((e) => (e instanceof SoldOut || e instanceof NotAllowed ? Effect.fail(e) : Effect.die(e))),
    ),
  });
