import { Context, Data, Effect } from "effect";
export class RequiredSetting extends Context.Service<RequiredSetting, { readonly value: string }>()("fixture/RequiredSetting") {}
export class ForeignRejected extends Data.TaggedError("ForeignRejected")<{ readonly marker: string }> {}
export const quote = (mode: "ok" | "fail" | "defect" | "invoke-defect" | "interrupt") => {
  if (mode === "invoke-defect") throw new Error("effect invocation defect");
  return Effect.gen(function* () {
    const setting = yield* RequiredSetting;
    if (mode === "fail") return yield* Effect.fail(new ForeignRejected({ marker: "foreign-private-canary" }));
    if (mode === "defect") return yield* Effect.die(new Error("foreign effect defect"));
    if (mode === "interrupt") return yield* Effect.interrupt;
    return { value: setting.value };
  });
};
