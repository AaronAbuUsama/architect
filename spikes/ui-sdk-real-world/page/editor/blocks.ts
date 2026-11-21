// The editor's document: a list of blocks, as Notion has them, written out as Markdown. Pure: no DOM, no React.

export type BlockType = "p" | "h1" | "h2" | "h3" | "bullet" | "number" | "todo" | "quote" | "code" | "callout" | "divider";
export type Block = { readonly id: string; readonly type: BlockType; readonly text: string; readonly checked?: boolean };
export type Page = { readonly id: string; readonly icon: string; readonly title: string; readonly blocks: ReadonlyArray<Block> };

let next = 0;
export const block = (type: BlockType, text = "", checked?: boolean): Block => ({ id: `b${++next}`, type, text, ...(checked === undefined ? {} : { checked }) });

/** What the "/" menu offers, in Notion's words and order. */
export const kinds: ReadonlyArray<{ readonly type: BlockType; readonly label: string; readonly hint: string; readonly glyph: string }> = [
  { type: "p", label: "Text", hint: "Just start writing with plain text.", glyph: "Aa" },
  { type: "h1", label: "Heading 1", hint: "Big section heading.", glyph: "H1" },
  { type: "h2", label: "Heading 2", hint: "Medium section heading.", glyph: "H2" },
  { type: "h3", label: "Heading 3", hint: "Small section heading.", glyph: "H3" },
  { type: "bullet", label: "Bulleted list", hint: "Create a simple bulleted list.", glyph: "•" },
  { type: "number", label: "Numbered list", hint: "Create a list with numbering.", glyph: "1." },
  { type: "todo", label: "To-do list", hint: "Track tasks with a to-do list.", glyph: "☐" },
  { type: "quote", label: "Quote", hint: "Capture a quote.", glyph: "❝" },
  { type: "callout", label: "Callout", hint: "Make writing stand out.", glyph: "💡" },
  { type: "code", label: "Code", hint: "Capture a code snippet.", glyph: "</>" },
  { type: "divider", label: "Divider", hint: "Visually divide blocks.", glyph: "—" },
];

/** Markdown typed at the start of a block turns it into that block, as in Notion: `# `, `- `, `[] `, `> `, ``` and `---`. */
const shortcuts: ReadonlyArray<readonly [RegExp, BlockType, boolean?]> = [
  [/^### $/, "h3"], [/^## $/, "h2"], [/^# $/, "h1"], [/^[-*+] $/, "bullet"], [/^1[.)] $/, "number"],
  [/^\[ ?\] $/, "todo"], [/^\[x\] $/i, "todo", true], [/^> $/, "quote"], [/^```$/, "code"], [/^---$/, "divider"],
];
export const shortcut = (text: string): { readonly type: BlockType; readonly checked?: boolean } | undefined => {
  for (const [pattern, type, checked] of shortcuts) if (pattern.test(text)) return { type, ...(checked ? { checked } : {}) };
  return undefined;
};

/** Enter on a list item keeps the list going; on an empty one, it leaves the list. */
export const continues = (type: BlockType): BlockType => (type === "bullet" || type === "number" || type === "todo" ? type : "p");

export const toMarkdown = (page: Page): string => {
  let n = 0;
  const lines = page.blocks.map((b) => {
    n = b.type === "number" ? n + 1 : 0;
    switch (b.type) {
      case "h1": return `# ${b.text}`;
      case "h2": return `## ${b.text}`;
      case "h3": return `### ${b.text}`;
      case "bullet": return `- ${b.text}`;
      case "number": return `${n}. ${b.text}`;
      case "todo": return `- [${b.checked ? "x" : " "}] ${b.text}`;
      case "quote": return b.text.split("\n").map((l) => `> ${l}`).join("\n");
      case "callout": return `> 💡 ${b.text}`;
      case "code": return "```\n" + b.text + "\n```";
      case "divider": return "---";
      default: return b.text;
    }
  });
  return [`# ${page.icon} ${page.title}`, "", ...lines.flatMap((l, i) => (i > 0 && !sameList(page.blocks[i - 1]!, page.blocks[i]!) ? ["", l] : [l]))].join("\n") + "\n";
};
const sameList = (a: Block, b: Block) => a.type === b.type && (a.type === "bullet" || a.type === "number" || a.type === "todo");

export const starter: ReadonlyArray<Page> = [
  {
    id: "launch", icon: "🚀", title: "Plugged In launch plan",
    blocks: [
      block("p", "One page for everything you are: claim a name, add your links, share the address."),
      block("h2", "This week"),
      block("todo", "Claim the handle firstpage", true),
      block("todo", "Add GitHub and the newsletter as links", true),
      block("todo", "Order the links so the newsletter comes first"),
      block("h2", "How a claim works"),
      block("number", "You pick a free name. Up to 32 lowercase letters and digits, starting with a letter."),
      block("number", "The name becomes the address of your public page."),
      block("number", "Anyone can read the page; only you can change it."),
      block("callout", "A name is claimed once. Asking twice with the same request answers the same handle."),
      block("quote", "The blueprint is declared once, and every output is generated from it."),
      block("code", "ortho prove --only \"a name is claimed once\""),
      block("divider"),
      block("p", "Type / for blocks, or start a line with #, -, [] or > ."),
    ],
  },
  { id: "notes", icon: "📝", title: "Meeting notes", blocks: [block("h2", "20 November"), block("bullet", "UI SDK: second spike in a real world"), block("bullet", "Marks: secret, hidden, confirm")] },
  { id: "ideas", icon: "💡", title: "Ideas", blocks: [block("p", "")] },
];
