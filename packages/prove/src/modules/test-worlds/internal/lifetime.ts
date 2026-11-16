// A lifetime as people write it (`20s`, `2 hours`) and as the alarm needs it (milliseconds).
const UNITS: ReadonlyArray<readonly [RegExp, number, string]> = [
  [/^(ms|millis?|milliseconds?)$/, 1, "ms"],
  [/^(s|secs?|seconds?)$/, 1000, "s"],
  [/^(m|mins?|minutes?)$/, 60_000, "m"],
  [/^(h|hrs?|hours?)$/, 3_600_000, "h"],
  [/^(d|days?)$/, 86_400_000, "d"],
];

export const parse = (text: string): number | undefined => {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)\s*$/i.exec(text);
  const unit = match ? UNITS.find(([name]) => name.test(match[2]!.toLowerCase())) : undefined;
  const ms = match && unit ? Number(match[1]) * unit[1] : undefined;
  return ms !== undefined && ms > 0 ? Math.round(ms) : undefined;
};

/** The largest unit that divides it exactly. */
export const format = (ms: number): string => {
  const unit = [...UNITS].reverse().find(([, size]) => ms % size === 0) ?? UNITS[0]!;
  return `${ms / unit[1]}${unit[2]}`;
};
