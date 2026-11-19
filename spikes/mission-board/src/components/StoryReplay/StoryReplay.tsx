// The end-to-end story played as a terminal: each step's command types itself, then what the step proves. Every line
// comes from `story.steps` (a step with no command shows as a comment). CSS animation only; Replay restarts it.
import { Button } from "@heroui/react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import type { StoryStep } from "../../data/types.ts";

export interface StoryReplayProps {
  readonly steps: ReadonlyArray<StoryStep>;
  /** Seconds between steps. */
  readonly pace?: number;
}

const COMMAND = /^(npm|ortho|plugged-in)\b/;
const commands = (step: string) => [...step.matchAll(/`([^`]+)`/g)].map((m) => m[1]!).filter((c) => COMMAND.test(c));
const plain = (s: string) => s.replace(/`/g, "");

export const StoryReplay = ({ steps, pace = 1.6 }: StoryReplayProps) => {
  const [run, setRun] = useState(0);
  let i = 0;
  return (
    <div className="replay" aria-label="The end-to-end story, as typed">
      <div className="replay-bar">
        <span className="replay-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="replay-title mono">plugged-in — the story</span>
        <Button size="sm" variant="ghost" onPress={() => setRun((r) => r + 1)}><ArrowCounterClockwiseIcon size={14} />Replay</Button>
      </div>
      <div className="replay-body mono" key={run}>
        {steps.map((s) => {
          const cmds = commands(s.step);
          const lines = cmds.length ? cmds.map((c) => ({ kind: "cmd" as const, text: c })) : [{ kind: "note" as const, text: `# ${s.n}. ${plain(s.step)}` }];
          return (
            <div key={s.n} className="replay-step">
              {lines.map((l) => {
                const at = i++ * pace;
                return l.kind === "cmd"
                  ? <p key={l.text} className="replay-line is-cmd" style={{ "--n": l.text.length, animationDelay: `${at}s` } as React.CSSProperties}><span className="replay-prompt">$</span> <span className="replay-typed">{l.text}</span></p>
                  : <p key={l.text} className="replay-line replay-note" style={{ animationDelay: `${at}s` }}>{l.text}</p>;
              })}
              <p className="replay-out" style={{ animationDelay: `${(i - 1) * pace + 0.9}s` }}>✓ proves {plain(s.proves)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
