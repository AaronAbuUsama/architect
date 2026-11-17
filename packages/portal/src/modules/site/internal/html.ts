// The plain face's building blocks: escaping, the page, a table. Every dynamic string goes through `esc`.
export const esc = (text: unknown): string =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const STYLE = `
body{font:15px/1.5 system-ui,sans-serif;margin:0 auto;max-width:72rem;padding:1.5rem;color:#1c1b1a;background:#fbfaf8}
a{color:#0b57d0}h1{font-size:1.5rem;margin:0 0 .25rem}h2{font-size:1.1rem;margin:1.75rem 0 .5rem}
table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:.35rem .6rem;border-bottom:1px solid #e3dfd8;vertical-align:top}
.meta,.note{color:#5d574f;font-size:.85rem}.pass{color:#0a6b2d}.fail{color:#a31515}.old{color:#8a5a00}.none,.na{color:#5d574f}
.banner{border:1px solid #a31515;background:#fdf0ef;padding:.5rem .75rem;margin:1rem 0}pre{background:#f1eee8;padding:.75rem;overflow:auto;font-size:.8rem}
`;

export const page = (title: string, body: string): string =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>${esc(title)}</title><style>${STYLE}</style></head><body><nav><a href="/portal">${esc(title.split(" ")[0])}</a></nav>${body}</body></html>`;

export const html = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export const table = (head: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>): string =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
