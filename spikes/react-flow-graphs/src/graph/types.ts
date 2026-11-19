// The Graph module's whole surface. A view turns the model into a GraphSpec (pure, no positions). `layout` places it
// once, at generate time, and the portal draws the result with <Graph>. Nothing in a spec is placed by hand.

/** Which of our components draws a node. Each kind is a portal-ui component, never React Flow's default box. */
export type NodeKind =
  | "thing" // a thing card: name, where it lives, its machine's states
  | "group" // a plugin or the app: a box around its things, labelled with the mount
  | "event" // an event a move emits
  | "start" // a machine's entry, or the empty world
  | "state" // a machine's state
  | "world" // a starting world
  | "journey" // a journey card: its verdict per environment
  | "activity" // a workflow's step (sketch)
  | "wait" // a workflow's await or durable clock (sketch)
  | "op"; // an operation placed on its target (sketch)

export type GNode = {
  id: string;
  kind: NodeKind;
  label: string;
  /** One line under the label: where it comes from, what it gives. */
  sub?: string;
  /** The compound node this one sits in (a plugin's group). */
  parent?: string;
  /** Where the node's page is, so a click opens it. */
  href?: string;
  /** Anything the node's component needs, as plain data (it travels to the browser as JSON). */
  data?: Record<string, unknown>;
};

/** What an edge means. The legend and the edge's style both come from this. */
export type EdgeKind =
  | "ref" // a field that holds another thing's id
  | "payload" // an operation's payload field that takes another thing's id or name
  | "emits" // a thing's move emits this event
  | "on" // an operation listens for this event through `on:`
  | "mounts" // the app mounts a plugin
  | "needs" // a plugin needs another
  | "move" // a machine move
  | "from" // a starting world built on another
  | "starts" // a journey starts from this world
  | "flow"; // a workflow's or chain view's next step (sketch)

export type GEdge = {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  label?: string;
  /** A second line, smaller: the event a move emits, the slice a planned edge waits on. */
  note?: string;
  /** Declared but not built yet (an `on:` before M3.08): drawn dashed with its slice. */
  planned?: string;
};

export type GraphSpec = { id: string; direction: "RIGHT" | "DOWN"; nodes: GNode[]; edges: GEdge[] };

/** A placed graph: what elk returns, flattened for React Flow. Positions are relative to the parent, as RF wants. */
export type Placed = GNode & { x: number; y: number; w: number; h: number };
export type Route = GEdge & { points: { x: number; y: number }[]; labelAt: { x: number; y: number } | null };
export type Laid = { id: string; width: number; height: number; nodes: Placed[]; edges: Route[] };

/**
 * What lights a laid graph, separate from the layout so live numbers never move a node.
 * `counts` puts a number on an edge (moves answered in the window; never on a state). `path` is a trace: the edges
 * it took, in order, and where a step was refused.
 */
export type Lighting =
  | { mode: "structure" }
  | { mode: "live"; window: string; counts: Record<string, number> }
  | { mode: "trace"; name: string; path: { edge: string; step: number; refused?: string }[] };
