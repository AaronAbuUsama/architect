// A thread told as a story: one plain sentence per thing that happened, written to be heard. "Listen" reads it aloud
// with the browser's speech, lighting each line as it goes. In the real system the Run object writes these lines as the
// run goes (a cheap model summarising each step); here they are made from the recorded events.
import { Button, Chip } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { clock } from "./output.tsx";
import type { Run, RunEvent } from "./types.ts";

const said = (s: string) => s.replace(/\*\*|`/g, "").replace(/\s+/g, " ").trim();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function narrate(e: RunEvent): { text: string; tone: "plain" | "good" | "bad" | "warn" } {
  switch (e.kind) {
    case "turn": return { text: said(e.text), tone: "plain" };
    case "tool": return e.ok
      ? { text: `It used ${e.name} on ${e.args}.`, tone: "plain" }
      : { text: `It tried ${e.name} on ${e.args}, and was refused: ${e.error ?? "no reason given"}.`, tone: "bad" };
    case "command": {
      const what = e.cmd.replace(/^architect /, "the architect ").replace(/^pnpm /, "pnpm ");
      if (e.ms === 0) return { text: `It started ${what}. That is still running.`, tone: "plain" };
      return e.exit === 0
        ? { text: `It ran ${what}. It passed in ${Math.round(e.ms / 1000)} seconds${e.tail ? `: ${e.tail}` : ""}.`, tone: "good" }
        : { text: `It ran ${what}, and it failed${e.tail ? `: ${e.tail}` : ""}.`, tone: "bad" };
    }
    case "edit": return { text: `It changed ${e.file}: ${plural(e.added, "line")} added, ${plural(e.removed, "line")} taken out.`, tone: "plain" };
    case "report": return { text: `It told its manager: ${e.report}. ${e.text}`, tone: e.report === "failed" || e.report === "blocked" ? "bad" : e.report === "ready" ? "good" : "plain" };
    case "resume": return { text: `It was interrupted and picked up again. ${e.text}`, tone: "warn" };
  }
}

const TONE = { plain: "bg-foreground/40", good: "bg-success", bad: "bg-danger", warn: "bg-warning" };

export function Narration({ run, onJump }: { run: Run; onJump: (i: number) => void }) {
  const lines = run.events.map((e) => ({ at: e.at, ...narrate(e) }));
  const [at, setAt] = useState<number | null>(null), [rate, setRate] = useState(1.1);
  const stopped = useRef(false);
  useEffect(() => () => { stopped.current = true; globalThis.speechSynthesis?.cancel(); }, []);
  const play = (from: number) => {
    const synth = globalThis.speechSynthesis; if (!synth) return;
    stopped.current = false; synth.cancel();
    const say = (i: number) => {
      if (stopped.current || i >= lines.length) { setAt(null); return; }
      setAt(i);
      const u = new SpeechSynthesisUtterance(lines[i]!.text); u.rate = rate; u.onend = () => say(i + 1);
      synth.speak(u);
    };
    say(from);
  };
  const stop = () => { stopped.current = true; globalThis.speechSynthesis?.cancel(); setAt(null); };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 pl-3 shadow-surface">
        {at === null ? <Button size="sm" variant="primary" onPress={() => play(0)}>▶ Listen</Button> : <Button size="sm" variant="secondary" onPress={stop}>■ Stop</Button>}
        <span className="text-sm text-muted">{at === null ? `${plural(lines.length, "line")} · about ${Math.max(1, Math.round(lines.map((l) => l.text).join(" ").length / 900))} min to hear` : `Reading line ${at + 1} of ${lines.length}`}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted">Speed {[1, 1.1, 1.4].map((r) => <button key={r} onClick={() => setRate(r)} className={`rounded-md px-1.5 py-0.5 ${rate === r ? "bg-default text-foreground" : "hover:bg-default/60"}`}>{r}×</button>)}</span>
        {run.status === "running" && <Chip size="sm" color="accent" variant="soft">● following live</Chip>}
      </div>
      <ol className="flex flex-col">
        {lines.map((l, i) => (
          <li key={i} className={`group grid grid-cols-[3rem_1.25rem_1fr] gap-x-2 rounded-xl py-1.5 transition-colors ${at === i ? "bg-accent-soft" : ""}`}>
            <span className="pt-0.5 text-right font-mono text-xs text-muted tabular-nums">{clock(l.at)}</span>
            <span className="flex justify-center pt-1.5"><span className={`size-2 rounded-full ${TONE[l.tone]}`} /></span>
            <p className={`text-[15px] leading-relaxed ${l.tone === "bad" ? "text-danger" : ""}`}>{l.text}
              <span className="ml-2 inline-flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => play(i)} className="rounded-md px-1.5 text-xs text-muted hover:bg-default">▶ from here</button>
                <button onClick={() => onJump(i)} className="rounded-md px-1.5 text-xs text-muted hover:bg-default">show detail</button></span></p>
          </li>))}
        {run.status === "running" && <li className="grid grid-cols-[3rem_1.25rem_1fr] gap-x-2 py-1.5"><span /><span className="flex justify-center pt-1.5"><span className="size-2 animate-pulse rounded-full bg-accent" /></span><p className="text-[15px] text-muted">Still working…</p></li>}
      </ol>
    </div>
  );
}
