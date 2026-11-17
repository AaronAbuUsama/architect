// The board, worked out on read (F4 §2, F5 #2): each active milestone's kinds over its subject, each task put in a column
// by the facts. Nothing here is stored. Facts come from the fact table, which stands in for the logbook in this spike.
import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export type Column = "open" | "running" | "waiting" | "proven" | "done";
export type Task = { key: string; kind: string; subject: string; milestone: string; column: Column };
type Row = Record<string, unknown>;
const OPS = ["specify", "build", "prove", "promote"], THINGS = ["machine", "validate"];
const ENVS = ["test", "staging", "production"];

/** A thing's or mission's state, straight from its row: the runtime keeps it in the `state` column. */
export const stateOf = (table: string, id: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* sql.unsafe<Row>(`SELECT state FROM "${table}" WHERE id = ?`, [id]);
    return String(rows[0]?.["state"] ?? "");
  }).pipe(Effect.orDie);

export const board = (mission: string, target: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const q = (text: string, args: ReadonlyArray<unknown>) => sql.unsafe<Row>(text, args as Array<never>);
    const milestones = yield* q(`SELECT * FROM milestone WHERE mission = ? AND state = 'active' ORDER BY rowid`, [mission]);
    const facts = yield* q(`SELECT * FROM fact ORDER BY rowid`, []);
    const runs = yield* q(`SELECT task FROM run WHERE mission = ? AND state IN ('running','waiting')`, [mission]);
    const asks = yield* q(`SELECT task FROM attention WHERE mission = ? AND state = 'open'`, [mission]);
    const spiked = yield* q(`SELECT about FROM question WHERE mission = ? AND state = 'spiked'`, [mission]);
    const compiled = new Map<string, Row>();
    const evals = new Map<string, Map<string, string>>(); // op -> eval -> latest result
    const verdicts = new Map<string, Set<string>>(); // op -> envs with a pass
    for (const f of facts) {
      const s = String(f["subject"]);
      if (f["kind"] === "compiled") compiled.set(s, JSON.parse(String(f["note"])) as Row);
      if (f["kind"] === "eval") (evals.get(s) ?? evals.set(s, new Map()).get(s)!).set(String(f["note"]), String(f["result"]));
      if (f["kind"] === "verdict" && f["result"] === "pass") (verdicts.get(s) ?? verdicts.set(s, new Set()).get(s)!).add(String(f["env"]));
    }
    const live = new Set(runs.map((r) => String(r["task"]))), waiting = new Set(asks.map((r) => String(r["task"])));
    const opsOf = (of: string) => (of.includes(".") ? [of] : ((compiled.get(of)?.["operations"] as string[] | undefined) ?? []));
    const proven = (op: string) => { const e = evals.get(op); return !!e && e.size >= 9 && [...e.values()].every((r) => r === "pass"); };
    const columnOf = (kind: string, subject: string): Column => {
      const c = compiled.get(subject);
      switch (kind) {
        case "specify": return c && Number(c["blanks"]) === 0 ? "done" : "open";
        case "build": return c?.["implementation"] === "written" ? "done" : "open";
        case "prove": return proven(subject) ? "proven" : "open";
        case "promote": { const need = ENVS.slice(0, ENVS.indexOf(target) + 1); return need.every((e) => verdicts.get(subject)?.has(e)) ? "done" : proven(subject) ? "proven" : "open"; }
        case "machine": return ((c?.["states"] as unknown[] | undefined) ?? []).length > 0 ? "done" : "open";
        case "validate": return opsOf(subject).length > 0 && opsOf(subject).every((op) => evals.get(op)?.get("coverage") === "pass") ? "proven" : "open";
        default: return "open"; // a spike closes when its README lands on main: no such fact is fed yet
      }
    };
    const tasks: Task[] = [];
    for (const m of milestones) {
      const kinds = JSON.parse(String(m["kinds"])) as string[], of = String(m["of"]), thing = of.split(".")[0]!;
      for (const kind of kinds) {
        const subjects = OPS.includes(kind) ? opsOf(of) : THINGS.includes(kind) ? [thing] : [];
        for (const subject of subjects) tasks.push({ key: `${kind}:${subject}`, kind, subject, milestone: String(m["id"]), column: columnOf(kind, subject) });
      }
    }
    for (const s of spiked) tasks.push({ key: `spike:${String(s["about"])}`, kind: "spike", subject: String(s["about"]), milestone: "", column: "open" });
    return tasks.map((t) => ({ ...t, column: live.has(t.key) ? "running" : waiting.has(t.key) ? "waiting" : t.column }));
  }).pipe(Effect.orDie);
