// One eval card, drawn the way HeroUI Pro draws its richest Kanban card (docs, "Usage" and "Project Board"): title,
// two-line description, chips, progress, avatars and counts. Every slot is a field of `CardView`; a slot with no true
// value is left out (no eval has run yet, so the progress bar waits for a first verdict). GRILL-2 Q2.
import { Avatar, Chip, ProgressBar } from "@heroui/react";
import { ClockCounterClockwiseIcon, FileCodeIcon, HourglassMediumIcon, QuestionIcon } from "@phosphor-icons/react";
import type { CardView } from "../../data/derive.ts";
import type { Thread } from "../../data/types.ts";
import { Inline } from "../shared/inline.tsx";
import { chipColor, stageName, stageOf, stateTone, stateWord } from "../shared/vocab.ts";

export interface OutputCardProps {
  readonly card: CardView;
  /** The building block's name, shown above the title. */
  readonly block: string;
  /** Names of the outputs this card waits on that are still red or partly. */
  readonly heldBy: ReadonlyArray<string>;
}

const Face = ({ t, now }: { t: Thread; now: boolean }) => (
  <Avatar size="sm" className={`oc-face${now ? "" : " is-before"}`} aria-label={`${t.name}${now ? ", on it now" : ", had it before"}`}>
    <Avatar.Fallback>{t.emoji}</Avatar.Fallback>
  </Avatar>
);

export const OutputCard = ({ card, block, heldBy }: OutputCardProps) => {
  const ev = card.cell.evidence;
  const ran = ev.filter((e) => e.passing !== null);
  const passed = ev.filter((e) => e.passing === true).length;
  const people = [...(card.thread ? [{ t: card.thread, now: true }] : []), ...card.hadIt.map((t) => ({ t, now: false }))];
  return (
    <div className={`oc${card.proposedNotNeeded ? " is-proposed" : ""}`}>
      <div className="oc-top">
        <span className={`oc-square st-${card.state}`} aria-hidden="true" />
        <span className="oc-block">{block}</span>
      </div>
      <span className="oc-title">{card.output.name}</span>
      <p className="oc-desc">{card.cell.greenMeans ? <Inline text={card.cell.greenMeans} /> : "Green not written yet."}</p>

      <div className="oc-chips">
        <Chip size="sm" variant="soft" color={chipColor(stateTone[card.state])}>{stateWord[card.state]}</Chip>
        {card.task && <Chip size="sm" variant="soft"><span className="mono">{card.task.ref}</span>&nbsp;· {stageName(stageOf(card))}</Chip>}
        {card.question && <Chip size="sm" variant="soft" color="warning"><QuestionIcon size={12} aria-hidden="true" />{card.question.id}</Chip>}
        {card.proposedNotNeeded && <Chip size="sm" variant="soft">Proposed not needed</Chip>}
      </div>

      {ran.length > 0 && (
        <div className="oc-progress">
          <ProgressBar aria-label="Evidence passing" size="sm" color={passed === ev.length ? "success" : "accent"} value={(passed / ev.length) * 100}>
            <ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track>
          </ProgressBar>
          <span className="oc-count">{passed} of {ev.length}</span>
        </div>
      )}

      {heldBy.length > 0 && (
        <span className="oc-held"><HourglassMediumIcon size={12} aria-hidden="true" />Held by {heldBy.join(", ")}</span>
      )}

      <div className="oc-foot">
        <span className="oc-faces">
          {people.length ? people.slice(0, 3).map((p) => <Face key={p.t.id} t={p.t} now={p.now} />) : <span className="oc-nobody">Nobody on it</span>}
        </span>
        <span className="oc-meta">
          <span title="Evidence"><FileCodeIcon size={13} aria-hidden="true" />{ev.length}</span>
          <span title="Moves recorded"><ClockCounterClockwiseIcon size={13} aria-hidden="true" />{card.history.length}</span>
        </span>
      </div>
    </div>
  );
};
