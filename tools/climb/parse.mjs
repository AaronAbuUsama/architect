// Reads `ortho prove`'s text (it prints no machine-readable report: snag S-01) into one entry per journey line:
// `journey <name> ✔|✘ <green>/<total> steps`. Pure: no clock, no git, no files.

const LINE = /^journey (.+) [✔✘] (\d+)\/(\d+) steps$/;

/** @param {string} output prove's stdout and stderr, as printed. @returns {Array<{journey: string, green: number, total: number}>} */
export const journeys = (output) =>
  output.split("\n").flatMap((line) => {
    const found = LINE.exec(line.trimEnd());
    return found === null ? [] : [{ journey: found[1], green: Number(found[2]), total: Number(found[3]) }];
  });

/**
 * The lines to append to runs.jsonl: one per journey prove reported, each with the run's own time and exit.
 * @param {{ output: string, at: string, commit: string, seconds: number, exit: number | null }} run
 */
export const entries = ({ output, at, commit, seconds, exit }) =>
  journeys(output).map((j) => ({ at, commit, journey: j.journey, green: j.green, total: j.total, seconds, exit }));
