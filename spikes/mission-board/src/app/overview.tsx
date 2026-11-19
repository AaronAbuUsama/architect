// The Overview tab (GRILL Q2): the goal's write-up once, its score, Aaron's open calls and the end-to-end story.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { QuestionIcon } from "@phosphor-icons/react";
import type { BoardView } from "../data/derive.ts";
import { ScoreKPIs } from "./climb.tsx";
import { Inline } from "./inline.tsx";

export const Overview = ({ view }: { view: BoardView }) => (
  <div className="overview">
    <div className="ov-main">
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>The goal</Widget.Title><Widget.Description>{view.goal.summary}</Widget.Description></div></Widget.Header>
        <Widget.Content className="prose">
          {view.goal.writeUp.map((p) => <p key={p.slice(0, 40)}><Inline text={p} /></p>)}
          <p><b>Done when</b> {view.goal.doneWhen}</p>
        </Widget.Content>
      </Widget>
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>The end-to-end story</Widget.Title><Widget.Description>{view.story.summary}</Widget.Description></div></Widget.Header>
        <Widget.Content>
          <Timeline size="sm">
            {view.story.steps.map((s) => (
              <Timeline.Item key={s.n} status={s.gap ? "default" : "success"}>
                <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
                <Timeline.Content>
                  <p><b>{s.n}. <Inline text={s.step} /></b></p>
                  <p className="muted small">Proves {s.proves} · lanes: {s.lanes}</p>
                  {s.gap && <p className="small">Gap: <Inline text={s.gap} /></p>}
                </Timeline.Content>
              </Timeline.Item>
            ))}
          </Timeline>
          <p className="small"><b>Missing:</b> <Inline text={view.story.missing} /></p>
          <p className="small muted">Proposed slice: {view.story.proposedSlice}</p>
        </Widget.Content>
      </Widget>
    </div>
    <aside className="ov-rail">
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>Score</Widget.Title><Widget.Description>Cards by state, of {view.score.needed} needed</Widget.Description></div></Widget.Header>
        <ScoreKPIs now={view.score} then={null} sinceLabel="" />
      </Widget>
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>Waiting on Aaron</Widget.Title><Widget.Description>Calls that decide cards; from {view.record}</Widget.Description></div></Widget.Header>
        <Widget.Content>
          <ItemCardGroup variant="secondary">
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
        </Widget.Content>
      </Widget>
    </aside>
  </div>
);
