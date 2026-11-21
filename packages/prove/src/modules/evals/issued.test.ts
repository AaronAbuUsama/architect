// HAN-15 (S-17): an answer field declared `Blueprint.issued` must be on the answer of the operation that issues it.
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import type { OperationModel } from "@orthograph/compiler";
import type { CallRecord } from "#modules/journeys/types.js";
import type { Evidence } from "./types.ts";
import { answerShape } from "./internal/calls.ts";

const TOKEN = "tok_0123456789abcdef";

const secret = (max: number) => ({ value: { type: "text", max }, visibility: "secret" });
const model = (answer: Record<string, unknown>, kind = "operation") => ({
  name: "session.sign-in", thing: "session", verb: "sign-in", kind, move: null, refusals: [], allowed: [{ kind: "anyone" }], steps: {}, budget: null, payload: {}, answer,
}) as unknown as OperationModel;

const issuing = model({ session: { value: { type: "id", prefix: "ses" }, visibility: "secret", issued: true }, token: { ...secret(512), issued: true }, nickname: { value: { type: "text", max: 30 } } });
const declare = (answer: object, kind = "operation") => ({ operations: new Map([["session.sign-in", { kind, answer }]]) });
const issuedDeclaration = declare({
  session: Blueprint.issued(Blueprint.visibility.secret(Blueprint.id("ses"))), token: Blueprint.issued(Blueprint.visibility.secret(Blueprint.text({ max: 512 }))), nickname: Blueprint.text({ max: 30 }),
});

const seen = (body: object, op: OperationModel = issuing): Evidence => ({
  call: { journey: "sign in", step: "ada signs in", actor: "ada", person: "per_a", operation: op.name, payload: {}, status: 200, body, trace: "t", parent: "p", mayCall: true, journal: [] } as CallRecord,
  trace: { spans: [], logs: [] }, refusal: undefined, stored: undefined,
  opSpan: { traceId: "t", spanId: "s", parentSpanId: "p", name: op.name, attrs: { "answer.nickname": "ada" }, status: 1, ms: 1, start: 0 },
});
const judge = (e: Evidence, op: OperationModel = issuing, declaration: object = issuedDeclaration) =>
  answerShape(op, [e], { project: declaration as never, all: [] }).failures;

describe("answer shape: an issued field must be on the answer", () => {
  it("fails a sign-in answer that leaves out its issued token, naming the operation and the field", () => {
    const failures = judge(seen({ session: "ses_abc123", nickname: "ada" }));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("answer.token");
    expect(failures[0]).toContain("session.sign-in");
  });

  it("fails an answer that leaves out every issued field", () => {
    const failures = judge(seen({ nickname: "ada" }));
    expect(failures.map((f) => /answer\.(\w+)/.exec(f)![1]).sort()).toEqual(["session", "token"]);
  });

  it("passes the same handler once it returns the token", () => {
    expect(judge(seen({ session: "ses_abc123", token: TOKEN, nickname: "ada" }))).toEqual([]);
  });

  it("names the field and never prints a value: not on a missing token, not on a malformed one, not for a present secret", () => {
    const missing = judge(seen({ session: "ses_abc123", nickname: "ada" })).join("\n");
    expect(missing).not.toContain("ses_abc123");
    const malformed = judge(seen({ session: "ses_abc123", token: 42 as unknown as string, nickname: "ada" })).join("\n");
    expect(malformed).toContain("answer.token");
    expect(malformed).not.toContain("42");
    const wrongSession = judge(seen({ session: "nope_zzz-secret-value", token: TOKEN, nickname: "ada" })).join("\n");
    expect(wrongSession).toContain("answer.session");
    expect(wrongSession).not.toContain(TOKEN);
    expect(wrongSession).not.toContain("nope_zzz-secret-value");
  });

  it("keeps an issued field out of telemetry: a span carrying it is still a secret leak, and the report never prints it", () => {
    const e = seen({ session: "ses_abc123", token: TOKEN, nickname: "ada" });
    const span = { ...e.opSpan!, attrs: { "answer.token": TOKEN } };
    const failures = judge({ ...e, opSpan: span, trace: { spans: [span], logs: [] } }).join("\n");
    expect(failures).toContain("answer.token");
    expect(failures).not.toContain(TOKEN);
  });

  it("control: an ordinary optional (private) field that is absent still passes", () => {
    const op = model({ label: { value: { type: "text", max: 60 } }, note: { value: { type: "text", max: 60 }, visibility: { private: ["locker.owner"] } } });
    const declaration = declare({ label: Blueprint.text({ max: 60 }), note: Blueprint.text({ max: 60 }) });
    expect(judge(seen({ label: "tools" }, op), op, declaration)).toEqual([]);
  });

  it("control: a hidden, non-issued secret field behaves as before: absent passes, present is still checked", () => {
    const op = model({ code: secret(60) });
    const declaration = declare({ code: Blueprint.visibility.secret(Blueprint.text({ max: 60 })) });
    expect(judge(seen({}, op), op, declaration)).toEqual([]);
    expect(judge(seen({ code: "c-1" }, op), op, declaration)).toEqual([]);
    expect(judge(seen({ code: "x".repeat(61) }, op), op, declaration)[0]).toContain("answer.code");
  });

  it("control: a read's secret field is not issued, so a stranger's answer may omit it", () => {
    const op = model({ code: secret(60) }, "read");
    const declaration = declare({ code: Blueprint.visibility.secret(Blueprint.text({ max: 60 })) }, "read");
    expect(judge(seen({}, op), op, declaration)).toEqual([]);
  });
});
