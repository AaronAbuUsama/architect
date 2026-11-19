// One eval's page, laid out like a Linear issue (GRILL-3 Q1 A): the title and what green means in the main column,
// then where it stands, what it waits on, its evidence, Activity and Notes; properties in a right rail. In the side
// panel the rail folds under the title. Every line is a field of the card, its lane or the board.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Button, Chip } from "@heroui/react";
import { ArrowRightIcon, ArrowSquareOutIcon, CheckCircleIcon, CircleDashedIcon, FileCodeIcon, ProhibitIcon, QuestionIcon, TargetIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import type { BoardView, CardView, LaneView } from "../../data/derive.ts";
import type { CellId, Evidence } from "../../data/types.ts";
import { Activity } from "../Activity/Activity.tsx";
import { PageNotes } from "../PageNotes/PageNotes.tsx";
import { AgentFace, kindWord } from "../shared/agent.tsx";
import { Callout, DocHead, H2, Properties, Text } from "../shared/blocks.tsx";
import { chipColor, stageName, stageOf, stateMeans, stateTone, stateWord } from "../shared/vocab.ts";

export interface CardDetailProps {
  readonly card: CardView;
  readonly lane: LaneView;
  readonly view: BoardView;
  /** "page": a full page with a properties rail; "panel": one column for the side panel or a modal. */
  readonly layout?: "page" | "panel";
  readonly onCard?: (cell: CellId) => void;
  readonly onClose?: () => void;
}

const passIcon = (e: Evidence) =>
  e.passing === true ? <CheckCircleIcon size={16} className="tone-text-success" aria-label="passing" />
    : e.passing === false ? <XCircleIcon size={16} className="tone-text-danger" aria-label="failing" />
    : <CircleDashedIcon size={16} className="muted" aria-label="not run yet" />;

export const CardDetail = ({ card, lane, view, layout = "panel", onCard, onClose }: CardDetailProps) => {
  const pr = card.task?.pr ?? null;
  const rail = (
    <Properties rows={[
      { name: "State", value: <><Chip size="sm" variant="soft" color={chipColor(stateTone[card.state])}>{stateWord[card.state]}</Chip> <span className="muted small">{stateMeans[card.state]}</span></> },
      { name: "Role", value: card.role === "carries" ? "Carries the block" : card.role === "absence" ? "Absence check" : card.proposedNotNeeded ? "Proposed not needed" : "Not needed" },
      { name: "Building block", value: lane.block.name },
      { name: "Output", value: <>{card.output.name} <span className="muted small">· proved by {card.output.provedBy}</span></> },
      { name: "Slice", value: card.task ? <><span className="mono">{card.task.ref}</span> {card.task.title}</> : <span className="muted">None yet · planned {card.cell.owner}</span> },
      { name: "Stage", value: card.task ? stageName(stageOf(card)) : <span className="muted">Not started</span> },
      { name: "Pull request", value: pr === null ? <span className="muted">None</span> : view.repo
        ? <a className="act-link" href={`${view.repo}/pull/${pr}`} target="_blank" rel="noreferrer">#{pr}<ArrowSquareOutIcon size={12} aria-hidden="true" /></a> : `#${pr}` },
      { name: "On it now", value: card.thread ? <span className="prop-agent"><AgentFace t={card.thread} size={20} />{card.thread.name} <span className="muted small">· {kindWord[card.thread.kind]}</span></span> : <span className="muted">Nobody</span> },
      { name: "Had it before", value: card.hadIt.length ? <span className="prop-agent">{card.hadIt.map((t) => <AgentFace key={t.id} t={t} size={20} faded />)}{card.hadIt.map((t) => t.name).join(", ")}</span> : <span className="muted">Nobody</span> },
      { name: "Graded at", value: <span className="mono">{view.asOf}</span> },
    ]} />
  );
  const main = (
    <>
      <Text text={card.cell.greenMeans || "Green not written yet."} />
      {card.proposedNotNeeded && <Callout icon={<ProhibitIcon size={16} />} title="Proposed not needed"><Text text={card.because ?? ""} /></Callout>}
      {card.role === "absence" && <Callout icon={<ProhibitIcon size={16} />} tone="warning" title="An absence check"><Text text={card.because ?? ""} /></Callout>}
      {card.question && (
        <Callout icon={<QuestionIcon size={16} />} tone="warning" title={`${card.question.id} for Aaron`}>
          <Text text={card.question.question} />
          <Text muted text={`Recommended: ${card.question.recommendation}`} />
        </Callout>
      )}

      <H2>Today</H2>
      <p className="doc-text"><span className="mono grade">{card.cell.today}</span> {card.cell.todayNote}</p>
      {card.cell.todayRef && <p className="mono small muted doc-ref">{card.cell.todayRef}</p>}

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

      <H2>Activity</H2>
      <Activity card={card} tasks={view.tasks} threads={view.threads} repo={view.repo} asOf={view.asOf} record={view.record} />

      <PageNotes key={card.cell.id} markdown={card.notes.markdown} stale={card.notes.stale} />
    </>
  );
  return (
    <article className={`doc issue is-${layout}`} aria-label={`${lane.block.name}, ${card.output.name}`}>
      <DocHead crumb={`${lane.block.name} · ${card.cell.id}`} title={card.output.name} icon={<TargetIcon size={20} />}
        action={onClose && <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><XIcon size={16} /></Button>} />
      {layout === "page"
        ? <div className="issue-grid"><div className="issue-main">{main}</div><aside className="issue-rail" aria-label="Properties">{rail}</aside></div>
        : <>{rail}{main}</>}
    </article>
  );
};
