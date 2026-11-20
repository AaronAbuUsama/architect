// The entry's one job for time: make the global `Date` answer with the world's instant for the request that is running.
// Imported first by the entry, so it is installed before any library module evaluates. Throwaway spike code.
import { AsyncLocalStorage } from "node:async_hooks";

export const RealDate = globalThis.Date;
const store = new AsyncLocalStorage<number>();

/** Mode "swap" only: the naive alternative, one isolate-wide instant set at the start of a request. */
let swapped: number | undefined;

const now = (): number => store.getStore() ?? swapped ?? RealDate.now();

export const WorldDate: DateConstructor = new Proxy(RealDate, {
  // newTarget is forwarded so a subclass of Date keeps its own prototype and methods.
  construct: (target, args, newTarget) => Reflect.construct(target, args.length === 0 ? [now()] : args, newTarget),
  apply: () => new RealDate(now()).toString(), // `Date()` called without `new` returns a string
  get: (target, key) => (key === "now" ? now : Reflect.get(target, key, target)),
});

export const install = (): void => {
  globalThis.Date = WorldDate;
};
install();

/** Run `f` with the global `Date` reading `instant`, through every await, timer and waitUntil it starts. */
export const inWorld = <A>(instant: number, f: () => A): A => store.run(instant, f);

/** The naive version, to show why it leaks: set one isolate-wide instant, clear it when the request ends. */
export const swappedWorld = async <A>(instant: number, f: () => Promise<A>): Promise<A> => {
  swapped = instant;
  try {
    return await f();
  } finally {
    swapped = undefined;
  }
};
