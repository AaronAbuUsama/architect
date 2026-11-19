// The lines of `before` that `after` doesn't keep: Myers' shortest edit script, after trimming the common ends.
// Fast when few lines change, which is what one small change to a declaration does.

/** Past this many edits the change touched most of the file; every middle line is counted as moved. */
const MAX_EDITS = 3000;

const myersDeleted = (a: ReadonlyArray<string>, b: ReadonlyArray<string>): ReadonlyArray<number> | undefined => {
  const n = a.length;
  const m = b.length;
  const max = n + m;
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Array<Int32Array> = [];
  for (let d = 0; d <= Math.min(max, MAX_EDITS); d++) {
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1]! < v[off + k + 1]!) ? v[off + k + 1]! : v[off + k - 1]! + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, n, m);
    }
  }
  return undefined;
};

/** Walk the saved rounds back from the end; a step that moves only in `a` deletes `a`'s line. */
const backtrack = (trace: ReadonlyArray<Int32Array>, n: number, m: number): ReadonlyArray<number> => {
  const deleted: Array<number> = [];
  let x = n;
  let y = m;
  for (let d = trace.length - 1; d > 0; d--) {
    const saved = trace[d]!;
    // `saved` holds v[-d-1 .. d+1]: index k + d + 1.
    const at = (k: number) => saved[k + d + 1]!;
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      x--;
      y--;
    }
    if (x !== prevX) deleted.push(prevX);
    x = prevX;
    y = prevY;
  }
  return deleted.reverse();
};

export const movedLines = (before: ReadonlyArray<string>, after: ReadonlyArray<string>): ReadonlyArray<number> => {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  const a = before.slice(start, before.length - end);
  const b = after.slice(start, after.length - end);
  if (a.length === 0) return [];
  const deleted = b.length === 0 ? a.map((_, i) => i) : myersDeleted(a, b) ?? a.map((_, i) => i);
  return deleted.map((i) => start + i);
};
