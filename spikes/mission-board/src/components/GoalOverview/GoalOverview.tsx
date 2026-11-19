// The goal written once, as a Linear project page of blocks: the score first, then a main column (the fallout diagram,
// the story played as a terminal, its commands, the write-up) and a rail (done when, Aaron's open calls). Every word
// and number comes from grid.json through derive.ts.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { FlagCheckeredIcon, PuzzlePieceIcon, QuestionIcon, WarningIcon } from "@phosphor-icons/react";
import type { BoardView } from "../../data/derive.ts";
import type { OutputId } from "../../data/types.ts";
import { FalloutDiagram } from "../FalloutDiagram/FalloutDiagram.tsx";
import { GoalScore } from "../GoalScore/GoalScore.tsx";
import { StoryReplay } from "../StoryReplay/StoryReplay.tsx";
import { Callout, H2, Numbered, Text } from "../shared/blocks.tsx";
import { Code } from "../shared/code.tsx";
import { Inline } from "../shared/inline.tsx";

export interface GoalOverviewProps {
  readonly view: BoardView;
  readonly onOutput?: (output: OutputId) => void;
}

/** A write-up paragraph that opens with a bold lead ("**Why a grid measures it.** …") is a heading and its text. */
const section = (p: string) => {
  const m = /^\*\*([^*]+?)\.?\*\*\s*(.*)$/s.exec(p);
  return m ? { head: m[1]!, text: m[2]! } : { head: null, text: p };
};
const COMMAND = /^(npm|ortho|plugged-in)\b/;
const storyCommands = (view: BoardView) =>
  view.story.steps.flatMap((s) => [...s.step.matchAll(/`([^`]+)`/g)].map((m) => m[1]!).filter((c) => COMMAND.test(c)));

export const GoalOverview = ({ view, onOutput }: GoalOverviewProps) => {
  const [first, ...rest] = view.goal.writeUp.map(section);
  return (
    <div className="overview">
      <Widget className="overview-score">
        <Widget.Header><div className="head-text"><Widget.Title>Score</Widget.Title><Widget.Description>Cards by state, of {view.score.needed} needed. Green: its evidence ran and passed. Built: the code carries it, no verdict yet.</Widget.Description></div></Widget.Header>
        <GoalScore now={view.score} />
      </Widget>

      <div className="overview-cols">
        <article className="doc overview-main" aria-label="The goal">
          {first && <div className="doc-block">{first.head && <H2>{first.head}</H2>}<Text text={first.text} /></div>}

          <H2>The outputs, by tier</H2>
          <Text muted text={`Each output in its tier, with what it depends on. The squares are the ${view.lanes.length} building blocks, in hill-climb order, coloured by state. Pick an output to see its cards.`} />
          <div className="doc-figure"><FalloutDiagram lanes={view.lanes} outputs={view.outputs} onOutput={onOutput} /></div>

          <H2>The end-to-end story</H2>
          <Text text={view.story.summary} />
          <StoryReplay steps={view.story.steps} />
          <Code language="bash" label="The story's commands" code={storyCommands(view).join("\n")} />
          <Numbered items={view.story.steps.map((s) => ({
            key: String(s.n),
            body: (
              <>
                <p className="doc-li-title"><Inline text={s.step} /></p>
                <p className="muted small">Proves {s.proves} · lanes: {s.lanes}</p>
                <p className="muted small">Described by <Inline text={s.describedBy} /> · gap: <Inline text={s.gap} /></p>
              </>
            ),
          }))} />
          <Callout icon={<WarningIcon size={16} />} tone="warning" title="Missing"><Text text={view.story.missing} /></Callout>

          {rest.map((s) => <div key={s.text.slice(0, 48)} className="doc-block">{s.head && <H2>{s.head}</H2>}<Text text={s.text} /></div>)}
        </article>

        <aside className="overview-rail" aria-label="Goal properties">
          <Callout icon={<FlagCheckeredIcon size={16} />} tone="success" title="Done when"><Text text={view.goal.doneWhen} /></Callout>
          <section className="rail-section">
            <p className="rail-title">Waiting on Aaron</p>
            <ItemCardGroup variant="transparent">
              {view.questions.map((q) => (
                <ItemCard key={q.id}>
                  <ItemCard.Icon><QuestionIcon size={16} /></ItemCard.Icon>
                  <ItemCard.Content>
                    <ItemCard.Title>{q.id}. {q.question}</ItemCard.Title>
                    <ItemCard.Description>Recommended: {q.recommendation} · decides {q.cells.length} cards</ItemCard.Description>
                  </ItemCard.Content>
                  <ItemCard.Action><Chip size="sm" variant="soft" color={q.answer ? "success" : "warning"}>{q.answer ?? "Open"}</Chip></ItemCard.Action>
                </ItemCard>
              ))}
            </ItemCardGroup>
          </section>
          <Callout icon={<PuzzlePieceIcon size={16} />} title="Proposed slice"><Text text={view.story.proposedSlice} /></Callout>
        </aside>
      </div>
    </div>
  );
};
