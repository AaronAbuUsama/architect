// A thread told as a story: one plain sentence per thing that happened, written to be heard. "Listen" reads it aloud
// with the browser's speech, lighting each line as it goes. In the real system the Run object writes these lines as the
// run goes (a cheap model summarising each step); here they are made from the recorded events.
import { ArrowRight, Play, Stop } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { Segment, TextShimmer, Timeline } from "@heroui-pro/react";
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

const STATUS = { plain: "default", good: "success", bad: "danger", warn: "warning" } as const;

export function Narration({ run, onJump }: { run: Run; onJump: (i: number) => void }) {
  const lines = run.events.map((e) => ({ at: e.at, ...narrate(e) }));
  const [at, setAt] = useState<number | null>(null), [rate, setRate] = useState("1.1");
  const stopped = useRef(false);
  useEffect(() => () => { stopped.current = true; globalThis.speechSynthesis?.cancel(); }, []);
  const play = (from: number) => {
    const synth = globalThis.speechSynthesis; if (!synth) return;
    stopped.current = false; synth.cancel();
    const say = (i: number) => {
      if (stopped.current || i >= lines.length) { setAt(null); return; }
      setAt(i);
      const u = new SpeechSynthesisUtterance(lines[i]!.text); u.rate = Number(rate); u.onend = () => say(i + 1);
      synth.speak(u);
    };
    say(from);
  };
  const stop = () => { stopped.current = true; globalThis.speechSynthesis?.cancel(); setAt(null); };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-2 pl-3">
        {at === null ? <Button size="sm" variant="primary" onPress={() => play(0)}><Play />Listen</Button> : <Button size="sm" variant="secondary" onPress={stop}><Stop />Stop</Button>}
        <span className="text-sm text-muted">{at === null ? `${plural(lines.length, "line")}, about ${Math.max(1, Math.round(lines.map((l) => l.text).join(" ").length / 900))} min to hear` : `Reading line ${at + 1} of ${lines.length}`}</span>
        <span className="ml-auto flex items-center gap-2 text-xs text-muted">Speed
          <Segment size="sm" aria-label="Speech speed" selectedKey={rate} onSelectionChange={(key) => setRate(String(key))}>
            {["1", "1.1", "1.4"].map((r) => <Segment.Item key={r} id={r}>{r}x</Segment.Item>)}
          </Segment></span>
        {run.status === "running" && <Chip size="sm" color="accent" variant="soft">Following live</Chip>}
      </div>
      <Timeline density="compact">
        {lines.map((l, i) => (
          <Timeline.Item key={i} status={at === i ? "current" : STATUS[l.tone]}>
            <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
            <Timeline.Content>
              <div className={`flex flex-col gap-1 rounded-xl px-2 py-1 ${at === i ? "bg-accent-soft" : ""}`}>
                <time className="font-mono text-xs text-muted tabular-nums">{clock(l.at)}</time>
                <p className={`text-[15px] leading-relaxed ${l.tone === "bad" ? "text-danger" : ""}`}>{l.text}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onPress={() => play(i)}><Play />Play from here</Button>
                  <Button size="sm" variant="ghost" onPress={() => onJump(i)}>Show in transcript<ArrowRight /></Button>
                </div>
              </div>
            </Timeline.Content>
          </Timeline.Item>))}
        {run.status === "running" && (
          <Timeline.Item status="current"><Timeline.Rail><Timeline.Marker /></Timeline.Rail><Timeline.Content><TextShimmer className="text-[15px]">Still working...</TextShimmer></Timeline.Content></Timeline.Item>)}
      </Timeline>
    </div>
  );
}
