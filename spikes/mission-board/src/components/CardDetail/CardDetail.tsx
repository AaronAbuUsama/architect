// One eval's page (GRILL Q3; GRILL-2 Q1 "eval page"): a Notion-like page of blocks. Properties first, then what green
// means, where it stands today, what it waits on, its evidence and its history. Every line is a field of the card.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Timeline } from "@heroui-pro/react/timeline";
import { Button, Chip } from "@heroui/react";
import { ArrowRightIcon, CheckCircleIcon, CircleDashedIcon, FileCodeIcon, ProhibitIcon, QuestionIcon, TargetIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import type { CardView, LaneView } from "../../data/derive.ts";
import type { CellId, Evidence } from "../../data/types.ts";
import { PageNotes } from "../PageNotes/PageNotes.tsx";
import { Callout, Doc, DocHead, H2, Properties, Text } from "../shared/blocks.tsx";
import { chipColor, stageName, stageOf, stateMeans, stateTone, stateWord } from "../shared/vocab.ts";

export interface CardDetailProps {
  readonly card: CardView;
  readonly lane: LaneView;
  /** The commit the grid was graded at. */
  readonly asOf: string;
  readonly onCard?: (cell: CellId) => void;
  readonly onClose?: () => void;
}

const passIcon = (e: Evidence) =>
  e.passing === true ? <CheckCircleIcon size={16} className="tone-text-success" aria-label="passing" />
    : e.passing === false ? <XCircleIcon size={16} className="tone-text-danger" aria-label="failing" />
    : <CircleDashedIcon size={16} className="muted" aria-label="not run yet" />;

const when = (at: string) => at.slice(0, 16).replace("T", " ");
const markTone = { red: "danger", partly: "warning", built: "warning", green: "success", "not-needed": "muted" } as const;

export const CardDetail = ({ card, lane, asOf, onCard, onClose }: CardDetailProps) => {
  const who = (id: string) => {
    const t = [card.thread, ...card.hadIt].find((x) => x?.id === id);
    return t ? `${t.emoji} ${t.name}` : id;
  };
  return (
    <Doc label={`${lane.block.name}, ${card.output.name}`}>
      <DocHead crumb={`${lane.block.name} · eval`} title={card.output.name} icon={<TargetIcon size={20} />}
        action={onClose && <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><XIcon size={16} /></Button>} />
      <Properties rows={[
        { name: "State", value: <><Chip size="sm" variant="soft" color={chipColor(stateTone[card.state])}>{stateWord[card.state]}</Chip> <span className="muted small">{stateMeans[card.state]}</span></> },
        { name: "Slice", value: card.task ? <><span className="mono">{card.task.ref}</span> {card.task.title}</> : <span className="muted">None yet · planned {card.cell.owner}</span> },
        { name: "Stage", value: card.task ? stageName(stageOf(card)) : <span className="muted">Not started</span> },
        { name: "On it now", value: card.thread ? `${card.thread.emoji} ${card.thread.name}` : <span className="muted">Nobody</span> },
        { name: "Had it before", value: card.hadIt.length ? card.hadIt.map((t) => `${t.emoji} ${t.name}`).join(", ") : <span className="muted">Nobody</span> },
        { name: "Graded at", value: <span className="mono">{asOf}</span> },
      ]} />

      {card.proposedNotNeeded && (
        <Callout icon={<ProhibitIcon size={16} />} title="Proposed not needed"><Text text={card.cell.notNeededProposal ?? ""} /></Callout>
      )}
      {card.question && (
        <Callout icon={<QuestionIcon size={16} />} tone="warning" title={`${card.question.id} for Aaron`}>
          <Text text={card.question.question} />
          <Text muted text={`Recommended: ${card.question.recommendation}`} />
        </Callout>
      )}

      <H2>Green means</H2>
      <Text text={card.cell.greenMeans || "Not written yet."} />

      <H2>Today</H2>
      <p className="doc-text"><span className="mono grade">{card.cell.today}</span> {card.cell.todayNote}</p>
      {card.cell.todayRef && <p className="mono small muted">{card.cell.todayRef}</p>}

      {card.waitsOn.length > 0 && (
        <>
          <H2>Waits on</H2>
          <div className="d-links">
            {card.waitsOn.map((o) => {
              const dep = lane.cards.find((c) => c.output.id === o)!;
              return (
                <Button key={o} size="sm" variant="secondary" onPress={() => onCard?.(dep.cell.id)}>
                  {dep.output.name} · {stateWord[dep.state]}<ArrowRightIcon size={12} aria-hidden="true" />
                </Button>
              );
            })}
          </div>
        </>
      )}

      <H2>Evidence</H2>
      {card.cell.evidence.length === 0 ? <Text muted text="None recorded." /> : (
        <ItemCardGroup variant="transparent">
          {card.cell.evidence.map((e) => (
            <ItemCard key={e.kind + e.ref + e.label}>
              <ItemCard.Icon><FileCodeIcon size={16} /></ItemCard.Icon>
              <ItemCard.Content>
                <ItemCard.Title>{e.label}</ItemCard.Title>
                <ItemCard.Description><span className="mono">{e.kind} · {e.ref}</span></ItemCard.Description>
              </ItemCard.Content>
              <ItemCard.Action>{passIcon(e)}</ItemCard.Action>
            </ItemCard>
          ))}
        </ItemCardGroup>
      )}

      <H2>History</H2>
      {card.history.length === 0 ? <Text muted text={`No moves recorded since ${asOf}.`} /> : (
        <Timeline size="sm">
          {[...card.history].reverse().map((e) => (
            <Timeline.Item key={e.at + e.state} status={markTone[e.state]}>
              <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
              <Timeline.Content>
                <p><b>{stateWord[e.state]}</b> <span className="muted small mono">{when(e.at)}</span></p>
                <p className="muted small">{e.note}{e.thread ? ` · ${who(e.thread)}` : ""}</p>
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      <PageNotes key={card.cell.id} markdown={card.notes.markdown} stale={card.notes.stale} />
    </Doc>
  );
};
