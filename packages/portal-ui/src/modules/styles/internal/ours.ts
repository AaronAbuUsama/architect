// The portal's own look, on HeroUI's tokens only (dark, system fonts so a page needs no network). Pro's and HeroUI's own sheets
// are read from the installed packages (`read.ts`); this is only what they do not draw: the meters, the lifecycle, the rail.
export const ours: string = `
:root{color-scheme:dark}
html,body{margin:0;background:var(--background,#0b0b0d)}
.portal-root{min-height:100vh;background:var(--background);color:var(--foreground);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px}
.portal-root a{color:var(--accent);text-decoration:none}.portal-root a:hover{text-decoration:underline}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12px}
.muted{color:var(--muted)}.small{font-size:.8rem}.num{text-align:right;font-variant-numeric:tabular-nums}
.tone-warning{color:var(--warning)!important}.tone-danger{color:var(--danger)!important}.tone-success{color:var(--success)!important}
.tone-bg-warning{background:var(--warning)}.tone-bg-danger{background:var(--danger)}.tone-bg-success{background:var(--success)}.tone-bg-accent{background:var(--accent)}
.layout-navbar{background:var(--background);border-block-end:1px solid var(--separator)}
.layout-content{padding:24px 28px 40px}
.page{display:flex;flex-direction:column;gap:18px;max-width:1180px}
.page-title h1{margin:0;font-size:1.65rem;font-weight:700;letter-spacing:-.015em}
.page-title p{margin:6px 0 0;color:var(--muted);max-width:76ch;line-height:1.55}
.title-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px}
.props{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:10px}
.project-home{display:flex;align-items:center;gap:10px;padding:4px;color:var(--foreground)!important;text-decoration:none!important;font-weight:650}
.project-mark{display:grid;place-items:center;width:30px;height:30px;color:var(--accent-foreground);background:var(--accent);border-radius:8px;font-weight:700}
.crumbs{display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--muted);white-space:nowrap}
.crumbs [aria-current]{color:var(--foreground);font-weight:600}
.blank-label{opacity:.55;font-style:italic}
.tag{font-size:10px;letter-spacing:.04em;font-weight:600;padding:1px 6px;border-radius:9px;background:var(--default);color:var(--muted);margin-left:6px}
.tag--danger{background:color-mix(in oklab,var(--danger) 25%,transparent);color:var(--danger)}
.chips{display:inline-flex;flex-wrap:wrap;gap:4px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
.thing-card.is-red{border-color:var(--danger)}
.thing-stats{display:flex;flex-direction:column;gap:10px;margin-top:12px}
.head-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.group-title{margin:0;font-size:1rem;font-weight:600}
.tbl{width:100%;border-collapse:collapse;font-size:.85rem}
.tbl th,.tbl td{text-align:left;padding:7px 12px;border-bottom:1px solid var(--separator);vertical-align:top}
.tbl th{color:var(--muted);font-weight:500;font-size:.75rem}
.tbl th.num,.tbl td.num{text-align:right}
.tbl tr.is-dark{opacity:.55}
.plain{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.page-foot{color:var(--muted);font-size:.78rem;margin:0}
.pill-ok{color:var(--success)}.pill-fail{color:var(--danger)}.pill-old{color:var(--warning)}.pill-none{color:var(--muted)}
.banner{border:1px solid var(--danger);background:color-mix(in oklab,var(--danger) 12%,transparent);padding:8px 12px;border-radius:10px}
pre.doc{background:var(--surface-secondary);padding:12px;border-radius:10px;overflow:auto;font-size:.8rem}
/* EnvironmentPill */
.env-pill{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 4px 0 10px;border-radius:999px;background:var(--surface-secondary);border:1px solid var(--border);font-size:.82rem;font-weight:500;white-space:nowrap}
.env-pill--sm{height:22px;font-size:.75rem;gap:6px;padding:0 3px 0 8px}
.env-pill__dot{width:7px;height:7px;border-radius:50%;background:var(--muted);flex:none}
.env-pill__dot.is-live{background:var(--success);box-shadow:0 0 0 3px color-mix(in oklab,var(--success) 25%,transparent)}
.env-pill__runs{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:var(--default);color:var(--muted);font-size:.7rem;font-weight:600}
.env-pill:not(:has(.env-pill__runs)){padding-right:10px}
/* CallsMeter */
.calls-meter{display:flex;flex-direction:column;gap:8px;min-width:0}
.calls-meter__head{display:flex;align-items:baseline;gap:6px}
.calls-meter__total{font-size:1.6rem;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.calls-meter--sm .calls-meter__total{font-size:1.05rem}
.calls-meter__unit{color:var(--muted);font-size:.8rem}
.calls-meter__track{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden;background:var(--surface-secondary)}
.calls-meter--sm .calls-meter__track{height:7px}
.calls-meter__seg{display:block;height:100%}
.calls-meter__legend{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;column-gap:18px;margin:0}
.calls-meter__item{display:flex;flex-direction:column;gap:1px}
.calls-meter__item dt{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:.72rem}
.calls-meter__item dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;font-size:.9rem}
.calls-meter__item.is-zero dd{color:var(--muted);font-weight:500}
.calls-meter__key{display:inline-block;width:8px;height:8px;border-radius:2px}
/* Move */
.move{display:inline-flex;align-items:center;gap:6px}
.move__state{display:inline-block;padding:1px 8px;border-radius:999px;background:var(--default);font:12px ui-monospace,Menlo,monospace}
.move__state--to{background:color-mix(in oklab,var(--accent) 22%,transparent);color:var(--accent)}
.move__state--new{font-family:inherit;color:var(--muted)}
/* The lifecycle */
.lifecycle{display:block;max-width:100%;height:auto}
.lc-move{font:12px ui-monospace,Menlo,monospace;fill:var(--foreground)}
.lc-count{fill:var(--muted)}
.lc-state{font:12px ui-monospace,Menlo,monospace;fill:var(--foreground)}
.lc-lit line{stroke:var(--accent)}.lc-lit .lc-move{fill:var(--accent);font-weight:600}
.lc-guard{font:11px ui-monospace,Menlo,monospace;fill:var(--warning)}
/* The rail */
.rail{display:flex;flex-direction:column;gap:16px;padding:16px}
.rail-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.eyebrow{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.rail-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.rail-stat{padding:8px 10px;border-radius:10px;background:var(--surface-secondary)}
.rail-stat__name{font-size:.72rem;color:var(--muted)}
.rail-stat__value{font-size:1.25rem;font-weight:600;font-variant-numeric:tabular-nums}
.calls-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.calls-list li{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:.82rem}
/* The waterfall */
.wf{display:flex;flex-direction:column}
.wf details{margin:0}
.wf summary{list-style:none;cursor:pointer}
.wf-row{display:grid;grid-template-columns:minmax(220px,1.2fr) 70px 2fr minmax(120px,1fr);gap:12px;align-items:center;padding:5px 8px;border-bottom:1px solid var(--separator);font-size:.82rem}
.wf-children{margin-left:16px;border-left:1px solid var(--separator)}
.wf-bar{position:relative;height:8px;border-radius:4px;background:var(--surface-secondary)}
.wf-bar i{position:absolute;top:0;height:100%;border-radius:4px;background:var(--accent)}
.wf-bar i.is-refused{background:var(--warning)}.wf-bar i.is-defect{background:var(--danger)}
.wf-attrs{display:flex;flex-wrap:wrap;gap:4px}
.wf-attr{padding:0 6px;border-radius:6px;background:var(--default);font:11px ui-monospace,Menlo,monospace}
/* The journey sequence */
.seq{display:block;max-width:100%;height:auto}
.seq text{font:12px ui-monospace,Menlo,monospace;fill:var(--foreground)}
.seq .seq-lane{stroke:var(--border);stroke-dasharray:3 4}
.seq .seq-arrow{stroke:var(--accent);fill:none}.seq .seq-arrow.is-refused{stroke:var(--warning)}.seq .seq-arrow.is-defect{stroke:var(--danger)}
`;
