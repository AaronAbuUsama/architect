// The goal written once, as a Notion-like page of blocks (Aaron, 19 November: pages of rich blocks, not markdown in
// stacked frames). Prose, a done-when callout, the score as the one framed block, the end-to-end story as a numbered
// list, and the calls waiting on Aaron as a list of items.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { FlagCheckeredIcon, PuzzlePieceIcon, QuestionIcon, WarningIcon } from "@phosphor-icons/react";
import type { BoardView } from "../../data/derive.ts";
import { GoalScore } from "../GoalScore/GoalScore.tsx";
import { Callout, Doc, H2, Numbered, Text } from "../shared/blocks.tsx";
import { Inline } from "../shared/inline.tsx";

export interface GoalOverviewProps {
  readonly view: BoardView;
}

/** A write-up paragraph that opens with a bold lead ("**Why a grid measures it.** …") is a heading and its text. */
const section = (p: string) => {
  const m = /^\*\*([^*]+?)\.?\*\*\s*(.*)$/s.exec(p);
  return m ? { head: m[1]!, text: m[2]! } : { head: null, text: p };
};

export const GoalOverview = ({ view }: GoalOverviewProps) => (
  <Doc label="Goal overview">
    {view.goal.writeUp.map((p) => {
      const s = section(p);
      return <div key={p.slice(0, 48)} className="doc-block">{s.head && <H2>{s.head}</H2>}<Text text={s.text} /></div>;
    })}
    <Callout icon={<FlagCheckeredIcon size={16} />} tone="success" title="Done when"><Text text={view.goal.doneWhen} /></Callout>

    <H2>Score</H2>
    <Widget>
      <Widget.Header><div className="head-text"><Widget.Title>Cards by state</Widget.Title><Widget.Description>Of {view.score.needed} needed. Green: its evidence ran and passed. Built: the code carries it, no verdict yet.</Widget.Description></div></Widget.Header>
      <GoalScore now={view.score} />
    </Widget>

    <H2>The end-to-end story</H2>
    <Text text={view.story.summary} />
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
    <Callout icon={<PuzzlePieceIcon size={16} />} title="Proposed slice"><Text text={view.story.proposedSlice} /></Callout>

    <H2>Waiting on Aaron</H2>
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
  </Doc>
);
