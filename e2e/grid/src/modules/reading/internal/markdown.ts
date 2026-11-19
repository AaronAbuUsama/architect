const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const mdSection = (page: string, heading: string): string | undefined => {
  const start = new RegExp(`^## ${escaped(heading)}\\s*$`, "m").exec(page);
  if (start === null) return undefined;
  const rest = page.slice(start.index + start[0].length);
  const next = /^## /m.exec(rest);
  return (next === null ? rest : rest.slice(0, next.index)).trim();
};

const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export const mdRows = (section: string): ReadonlyArray<ReadonlyArray<string>> => {
  const rows = section.split("\n").filter((l) => l.trim().startsWith("|"));
  // The first row is the header and the second the `|---|` rule.
  return rows.slice(2).map(cells);
};

export const mdBullets = (section: string): ReadonlyArray<string> =>
  section.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());
