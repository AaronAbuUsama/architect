// Live telemetry on the reference pages (round 3 Q5, Aaron: "reference pages and we have telemetry on the page with
// spans and tracing etc"). Each row gets its rate and trend in the window; each page gets its recent spans, and every
// span opens its trace. Sample numbers, fixed so two renders match; in the product they come from `ortho.calls`
// (by error tag), the commit spans (`event.name`) and the door refusals.
import { Chip } from "@heroui/react";
import { page } from "./model.ts";
import { Block, SparkBars } from "./ui.tsx";

const seed = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 11);
/** Per-minute counts over the 30-minute window that add up to `total`. */
export const trend = (key: string, total: number): number[] => {
  const k = seed(key) % 9, raw = Array.from({ length: 30 }, (_, i) => 1 + Math.abs(Math.sin((i + k) / (2 + (k % 3)))) + ((i * k) % 4) / 3);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => (v / sum) * total);
};
export const perMin = (total: number) => (total / 30).toFixed(total / 30 < 1 ? 2 : 1);
export const TrendCell = ({ k, total, tone }: { k: string; total: number; tone?: string }) =>
  total ? <SparkBars values={trend(k, total)} tone={tone ?? "accent"} label={`${k}: ${total} in the window`} w={88} h={22} /> : <span className="muted small">none</span>;

/** A span's attributes, each its own chip: key in mono, then its value. */
const Attrs = ({ attr }: { attr: string }) => (
  <span className="chips">{attr.split(" · ").map((p) => { const [k, ...v] = p.split(" "), kv = /[._]/.test(k!) || v.length === 0;
    return <Chip key={p} size="sm" variant="soft" className="attr">{kv ? <><span className="mono">{k}</span>{v.length > 0 && <span className="muted">{v.join(" ")}</span>}</> : p}</Chip>; })}</span>
);
export type Span = { at: string; op: string; who: string; what: string; tone: "warning" | "success" | "danger" | "default"; ms: number; attr: string; door?: boolean };
/** The latest spans that touch this page's subject, newest first. Each opens its operation's trace. */
export const Recent = ({ title, spans }: { title: string; spans: Span[] }) => (
  <Block title={title} desc="Newest first, in the window. A call refused at the door has no span, only its count in ortho.calls (M1.20); the rest open their trace" flush>
    <table className="tbl"><thead><tr><th>at</th><th>operation</th><th>caller</th><th>outcome</th><th>span says</th><th className="num">ms</th><th /></tr></thead>
      <tbody>{spans.map((s) => (
        <tr key={s.at + s.op}><td className="mono small">{s.at}</td><td><a className="mono" href={page.op(s.op)}>{s.op}</a></td><td className="small">{s.who}</td>
          <td><Chip size="sm" variant="soft" color={s.tone}>{s.what}</Chip></td><td><Attrs attr={s.attr} /></td><td className="num mono">{s.ms}</td>
          <td>{s.door ? <span className="small muted">no span</span> : <a className="small" href={page.op(s.op, "spans", s.tone === "success" ? "answered" : s.what)}>trace →</a>}</td></tr>))}</tbody></table>
  </Block>
);

export const recentRefusals: Span[] = [
  { at: "12:04:29", op: "handle.claim", who: "signed-in", what: "HandleTaken", tone: "warning", ms: 3, attr: "refusal.code HN-001" },
  { at: "12:03:40", op: "profile.get", who: "anyone", what: "ProfileNotFound", tone: "warning", ms: 2, attr: "refusal.code PR-001" },
  { at: "12:03:12", op: "session.sign-in", who: "anyone", what: "SessionCredentialsWrong", tone: "warning", ms: 38, attr: "refusal.code SE-001" },
  { at: "12:02:57", op: "link.add", who: "signed-in", what: "LinkNeedsHandle", tone: "warning", ms: 4, attr: "refusal.code LI-001" },
];
export const recentEvents: Span[] = [
  { at: "12:04:31", op: "handle.claim", who: "signed-in", what: "HandleClaimed", tone: "success", ms: 9, attr: "commit.outcome committed · attempt 2" },
  { at: "12:03:58", op: "link.add", who: "signed-in", what: "LinkAdded", tone: "success", ms: 7, attr: "move.from · → listed" },
  { at: "12:03:02", op: "link.remove", who: "signed-in", what: "LinkRemoved", tone: "success", ms: 6, attr: "move.from listed → removed" },
  { at: "11:58:44", op: "handle.release", who: "signed-in", what: "HandleReleased", tone: "success", ms: 5, attr: "move.from claimed → released" },
];
