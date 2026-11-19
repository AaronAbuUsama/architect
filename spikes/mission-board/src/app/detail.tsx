// A card's detail (GRILL Q3) and a lane's end state (GRILL Q5): every line is a field of the card or the lane.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Timeline } from "@heroui-pro/react/timeline";
import { Button, Chip } from "@heroui/react";
import { ArrowRightIcon, CheckCircleIcon, CircleDashedIcon, FileCodeIcon, FlagBannerIcon, UserIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { BoardView, CardView, LaneView } from "../data/derive.ts";
import type { CellId, Evidence } from "../data/types.ts";
import { Inline } from "./inline.tsx";
import { chipColor, stageName, stageOf, stateMeans, stateTone, stateWord } from "./vocab.ts";

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="d-section"><h3>{title}</h3>{children}</section>
);

const passIcon = (e: Evidence) =>
  e.passing === true ? <CheckCircleIcon size={16} className="tone-text-success" aria-label="passing" />
    : e.passing === false ? <XCircleIcon size={16} className="tone-text-danger" aria-label="failing" />
    : <CircleDashedIcon size={16} className="muted" aria-label="not run yet" />;

const when = (at: string) => at.slice(0, 16).replace("T", " ");
const markTone = { red: "danger", partly: "warning", built: "warning", green: "success", "not-needed": "muted" } as const;
const who = (card: CardView, id: string) => {
  const t = [card.thread, ...card.hadIt].find((x) => x?.id === id);
  return t ? `${t.emoji} ${t.name}` : id;
};

export const CardDetail = ({ view, card, lane, onCard, onClose }: {
  view: BoardView; card: CardView; lane: LaneView; onCard: (c: CellId) => void; onClose: () => void;
}) => (
  <article className="detail" aria-label={`${lane.block.name}, ${card.output.name}`}>
    <header className="d-head">
      <div>
        <p className="muted small">{lane.block.name}</p>
        <h2>{card.output.name}</h2>
      </div>
      <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><XIcon size={16} /></Button>
    </header>
    <div className="d-props">
      <Chip size="sm" variant="soft" color={chipColor(stateTone[card.state])}>{stateWord[card.state]}</Chip>
      <span className="muted small">{stateMeans[card.state]}</span>
    </div>

    {card.proposedNotNeeded && <p className="d-note">Proposed not needed: <Inline text={card.cell.notNeededProposal ?? ""} /></p>}
    {card.question && (
      <Section title={`${card.question.id} for Aaron`}>
        <p>{card.question.question}</p>
        <p className="muted small">Recommended: {card.question.recommendation}</p>
      </Section>
    )}

    <Section title="Green means">
      <p>{card.cell.greenMeans ? <Inline text={card.cell.greenMeans} /> : "Not written yet."}</p>
    </Section>

    <Section title="Today">
      <p className="muted small">Graded at <span className="mono">{view.asOf}</span></p>
      <p><span className="mono grade">{card.cell.today}</span> <Inline text={card.cell.todayNote} /></p>
      {card.cell.todayRef && <p className="mono small muted">{card.cell.todayRef}</p>}
    </Section>

    {card.waitsOn.length > 0 && (
      <Section title="Waits on">
        <div className="d-links">
          {card.waitsOn.map((o) => {
            const dep = lane.cards.find((c) => c.output.id === o)!;
            return (
              <Button key={o} size="sm" variant="secondary" onPress={() => onCard(dep.cell.id)}>
                {dep.output.name} · {stateWord[dep.state]}<ArrowRightIcon size={12} aria-hidden="true" />
              </Button>
            );
          })}
        </div>
      </Section>
    )}

    <Section title="Who">
      <ItemCardGroup variant="secondary">
        <ItemCard>
          <ItemCard.Icon><FlagBannerIcon size={16} /></ItemCard.Icon>
          <ItemCard.Content>
            <ItemCard.Title>{card.task ? `${card.task.ref} · ${card.task.title}` : "No slice on it"}</ItemCard.Title>
            <ItemCard.Description>Planned owner: {card.cell.owner}</ItemCard.Description>
          </ItemCard.Content>
          {card.task && <ItemCard.Action><Chip size="sm" variant="soft">{stageName(stageOf(card))}</Chip></ItemCard.Action>}
        </ItemCard>
        <ItemCard>
          <ItemCard.Icon><UserIcon size={16} /></ItemCard.Icon>
          <ItemCard.Content>
            <ItemCard.Title>{card.thread ? `${card.thread.emoji} ${card.thread.name}` : "Nobody on it now"}</ItemCard.Title>
            <ItemCard.Description>
              {card.hadIt.length ? `Had it before: ${card.hadIt.map((t) => `${t.emoji} ${t.name}`).join(", ")}` : "Nobody had it before"}
            </ItemCard.Description>
          </ItemCard.Content>
        </ItemCard>
      </ItemCardGroup>
    </Section>

    <Section title="Evidence">
      {card.cell.evidence.length === 0 ? <p className="muted">None recorded.</p> : (
        <ItemCardGroup variant="secondary">
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
    </Section>

    <Section title="History">
      {card.history.length === 0 ? <p className="muted">No moves recorded since {view.asOf}.</p> : (
        <Timeline size="sm">
          {[...card.history].reverse().map((e) => (
            <Timeline.Item key={e.at + e.state} status={markTone[e.state]}>
              <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
              <Timeline.Content>
                <p><b>{stateWord[e.state]}</b> <span className="muted small mono">{when(e.at)}</span></p>
                <p className="muted small">{e.note}{e.thread ? ` · ${who(card, e.thread)}` : ""}</p>
              </Timeline.Content>
            </Timeline.Item>
          ))}
        </Timeline>
      )}
    </Section>
  </article>
);

export const EndStateDetail = ({ lane, onClose }: { lane: LaneView; onClose: () => void }) => (
  <article className="detail" aria-label={`${lane.block.name} end state`}>
    <header className="d-head">
      <div><p className="muted small">{lane.block.name} · end state</p><h2>{lane.block.endState.title}</h2></div>
      <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><XIcon size={16} /></Button>
    </header>
    <Section title="What done looks like"><p><Inline text={lane.block.endState.description} /></p></Section>
    <Section title="How the lane is proved"><p><Inline text={lane.block.proof} /></p></Section>
    <Section title="Where it lives">
      <p className="mono small">{lane.block.endState.ref ?? "Not built yet"}</p>
    </Section>
  </article>
);
