// Decorators that give a part the surroundings HeroUI Pro's anatomy needs: a card sits in a Kanban card list, a
// column header in a Kanban column, a page in a panel of a set width.
import { Kanban } from "@heroui-pro/react/kanban";
import type { ComponentType, JSX } from "react";

type Decorator = (Story: ComponentType) => JSX.Element;

export const inCard = (width = 300): Decorator => (Story) => (
  <Kanban className="story-kanban" aria-label="Story">
    <Kanban.Column style={{ width }}>
      <Kanban.ColumnBody>
        <Kanban.CardList aria-label="One card" items={[{ id: "story" }]}>
          {() => <Kanban.Card textValue="Story card"><Story /></Kanban.Card>}
        </Kanban.CardList>
      </Kanban.ColumnBody>
    </Kanban.Column>
  </Kanban>
);

export const inColumn: Decorator = (Story) => (
  <Kanban className="story-kanban" aria-label="Story">
    <Kanban.Column style={{ width: 300 }}><Story /><Kanban.ColumnBody><span className="muted small">Cards go here</span></Kanban.ColumnBody></Kanban.Column>
  </Kanban>
);

export const inPanel = (width: number): Decorator => (Story) => <div className="story-panel" style={{ width }}><Story /></div>;
