// The steps, in the order a person takes them. Each command is run for real; each edit copies the draft's own files in.

export interface Planned {
  readonly id: string;
  readonly title: string;
  readonly caption: string;
  readonly kind: "command" | "edit";
  readonly who?: string;
  /** The preset, run as `create-nx-workspace` runs it. */
  readonly preset?: true;
  /** `ortho` commands, each as its arguments. */
  readonly commands?: ReadonlyArray<ReadonlyArray<string>>;
  /** The parts of the draft this edit makes the project match: each folder ends exactly as the draft has it. */
  readonly copy?: ReadonlyArray<string>;
  readonly open?: string;
  readonly note?: string;
}

/** Plugged In is the starter plus three things; these are the ones `ortho add` makes. */
const THINGS = ["handle", "link", "profile"];
const OPERATIONS = ["handle.claim", "handle.release", "handle.resolve", "link.add", "link.order", "link.remove", "profile.get"];

export const PLAN: ReadonlyArray<Planned> = [
  {
    id: "create",
    title: "Start a project",
    caption: "One command makes the project. It starts as the starter: people, organisations, sign-in and API keys, already generated.",
    kind: "command",
    preset: true,
    open: "blueprint/things/person/thing.ts",
    note: "In this repository the project runs on the workspace's own packages, so its package.json, tsconfig.json and project.json are Codex's, not the preset's, and the preset's pnpm-workspace.yaml is left out.",
  },
  {
    id: "things",
    title: "Add the things",
    caption: "Plugged In is about three new things: a handle, a link and a profile. Adding one writes its files, and every gap in them is a todo.",
    kind: "command",
    commands: THINGS.map((t) => ["add", "thing", t]),
    open: "blueprint/things/handle/thing.ts",
  },
  {
    id: "operations",
    title: "Add the operations",
    caption: "Then what people can do to them: claim a handle, add a link, and so on. Each operation is one file, with its own todos.",
    kind: "command",
    commands: OPERATIONS.map((o) => ["add", "operation", o]),
    open: "blueprint/things/handle/verbs/claim.ts",
  },
  {
    id: "check-gaps",
    title: "Check names the gaps",
    caption: "Check reads the blueprint and names every gap still to fill, so you always know what is left.",
    kind: "command",
    commands: [["check"]],
  },
  {
    id: "blueprint",
    title: "Write the blueprint",
    caption: "You fill the gaps: the fields, each thing's states and moves, who may call, and what each operation takes and answers. This is Codex's draft, copied in.",
    kind: "edit",
    who: "you (here, Codex's draft)",
    copy: ["blueprint"],
    open: "blueprint/things/handle/machine.ts",
  },
  {
    id: "journeys",
    title: "The journeys are written",
    caption: "A different agent writes the journeys: what must be true, step by step, in the product's own words. They are how the work is judged.",
    kind: "edit",
    who: "another agent (here, Codex's draft)",
    copy: ["journeys"],
    open: "journeys/a-name-is-claimed-once.ts",
  },
  {
    id: "generate",
    title: "Generate",
    caption: "Everything else comes from the blueprint: the API, the SDK, the command line, the MCP tools, the docs, the portal and the model. Never edit these; they are made again every time.",
    kind: "command",
    commands: [["generate"]],
    open: "generated/api/src/handle/claim.ts",
  },
  {
    id: "check-handlers",
    title: "Check again",
    caption: "Check passes. But open a new handler: generate scaffolded it, and it is nothing but blanks. Check doesn't count those today, so it can't tell you they are left.",
    kind: "command",
    commands: [["check"]],
    open: "src/handle/claim.ts",
  },
  {
    id: "handlers",
    title: "Write the handlers",
    caption: "The only code you write by hand: what each operation does once the runtime has checked everything the blueprint says. This is Codex's.",
    kind: "edit",
    who: "you (here, Codex's draft)",
    copy: ["src", "test"],
    open: "src/handle/claim.ts",
  },
  {
    id: "check-done",
    title: "Check passes",
    caption: "No gaps, the types hold, the rules hold, and nothing generated has drifted.",
    kind: "command",
    commands: [["check"]],
    open: "src/handle/claim.ts",
  },
  {
    id: "prove",
    title: "Prove",
    caption: "Prove starts a real local world, runs every journey against it, and judges each operation on nine evals from its traces.",
    kind: "command",
    commands: [["prove"]],
    open: "journeys/a-name-is-claimed-once.ts",
  },
  {
    id: "trace",
    title: "Read a trace",
    caption: "Every call leaves a trace. This one is a name being claimed: the runtime's checks, your handler's steps, then the commit.",
    kind: "command",
    commands: [["telemetry", "trace", "{claim}"]],
    open: "src/handle/claim.ts",
  },
];
