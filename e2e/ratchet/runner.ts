// The ratchet's test runner: vitest's own, plus two marks on each test's `meta`, so reporter.ts can tell a per-test hook's
// error (beforeEach, afterEach) from the test's own. vitest keeps all of a test's errors in one list, in the order they
// happened: beforeEach's, the body's, then afterEach's.
//   ratchetBodyRan        the body started (so an error with this unset came from a beforeEach)
//   ratchetErrorsBefore   how many errors the test had when its body and beforeEach were done (the rest are afterEach's)
import { VitestTestRunner } from "vitest/runners";
import { getFn, setFn } from "vitest/suite";

interface Task {
  readonly meta: Record<string, unknown>;
  readonly result?: { readonly errors?: ReadonlyArray<unknown> };
}
const wrapped = new WeakSet<object>();

export default class RatchetRunner extends VitestTestRunner {
  override onBeforeTryTask(test: never): void {
    super.onBeforeTryTask(test);
    const body = getFn(test) as (() => unknown) | undefined;
    if (body === undefined || wrapped.has(body)) return;
    const mark = (): unknown => {
      (test as Task).meta["ratchetBodyRan"] = true;
      return body();
    };
    wrapped.add(mark);
    setFn(test, mark as never);
  }

  // vitest calls this after the body and before afterEach (the base class does not define it).
  onTaskFinished(test: Task): void {
    test.meta["ratchetErrorsBefore"] = test.result?.errors?.length ?? 0;
  }
}
