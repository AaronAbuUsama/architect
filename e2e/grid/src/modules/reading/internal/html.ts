const ENTITIES: Readonly<Record<string, string>> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const htmlText = (html: string): string =>
  html.replace(/<[^>]*>/g, " ").replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e).replace(/\s+/g, " ").trim();

export const portalOwn = (html: string): string => {
  const docs = html.indexOf("<h2>Docs</h2>");
  return docs < 0 ? html : html.slice(0, docs);
};

export const htmlSection = (html: string, level: number, title: string): string | undefined => {
  const open = new RegExp(`<h${level}>\\s*${escaped(title)}\\s*</h${level}>`).exec(html);
  if (open === null) return undefined;
  const rest = html.slice(open.index + open[0].length);
  const closes = new RegExp(`<h[1-${level}]>`).exec(rest);
  return closes === null ? rest : rest.slice(0, closes.index);
};

export const htmlRows = (html: string): ReadonlyArray<ReadonlyArray<string>> =>
  [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((row) => [...row[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => htmlText(cell[1]!)))
    .filter((cellsOfRow) => cellsOfRow.length > 0);

export const htmlItems = (html: string): ReadonlyArray<string> => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => htmlText(m[1]!));

export const htmlRecords = (html: string): ReadonlyArray<Readonly<Record<string, string>>> => {
  const table = /<table[^>]*>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
  const head = [...(/<tr>([\s\S]*?)<\/tr>/.exec(table)?.[1] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => htmlText(m[1]!).toLowerCase());
  return htmlRows(table).map((row) => Object.fromEntries(row.map((c, i) => [head[i] ?? String(i), c])));
};
