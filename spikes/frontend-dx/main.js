// Static design entry. Reads only the generated acme fixture. No network or agent execution.
const model = ACME.model;
const operations = Object.values(model.operations);
const allowance = model.things.allowance;
const spend = model.operations["allowance.spend"];
const envs = Object.keys(model.environments);
const content = document.querySelector("#content");
let scenario = "empty";
let loopStep = 0;
let previewRequest = "Make allowance.spend's p95 budget 120 ms. Show me the impact before changing it.";
const titles = { home: "Overview", design: "Specification", work: "Derived work", thing: "Things", operation: "Operations & reads", journeys: "Journeys", environments: "Environments", releases: "Releases", docs: "Docs", future: "Kits, chain & time", loop: "Change request" };
function esc(value) { return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
function tag(text, kind = "") { return `<span class="tag ${kind}">${esc(text)}</span>`; }
function empty(title, detail) { return `<div class="empty"><strong>${esc(title)}</strong>${esc(detail)}</div>`; }
function heading(title, detail, action = "") { return `<div class="heading"><div class="intro"><h1>${title}</h1><p>${detail}</p></div>${action}</div>`; }
function panel(title, body) { return `<section class="panel"><h2>${title}</h2>${body}</section>`; }
function table(headers, rows, caption = "") {
  return `<div class="table-wrap"><table>${caption ? `<caption>${caption}</caption>` : ""}<thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function status(op, env) {
  if (scenario === "empty") return tag("No evidence");
  if (scenario === "offline") return tag("Unavailable");
  if (env === "local") return tag("No evidence");
  if (op === spend.name && scenario === "fail" && env === "staging") return tag("Failed", "fail");
  if (op === spend.name && scenario === "budget" && ["staging", "production"].includes(env)) return tag("Stale", "stale");
  return tag("Recorded pass", "pass");
}
function scenarioNote() {
  if (scenario === "budget") return '<div class="notice"><strong>Illustrative evidence.</strong> A proposed spend budget of 120 ms differs from this model’s 150 ms. Only spend is stale. The green cells are synthetic examples, not actual verdicts.</div>';
  if (scenario === "fail") return '<div class="notice"><strong>Illustrative evidence.</strong> A later staging failure replaces an earlier pass. These are synthetic states. No proof run took place.</div>';
  if (scenario === "offline") return '<div class="notice"><strong>Logbook unavailable · illustration.</strong> The last observation cannot establish current proof. Retry when the logbook is reachable.</div>';
  return "";
}
function matrix(ops) { return table(["Operation / read", ...envs], ops.map((o) => [`${o.name === spend.name ? `<a class="pill-link" href="#operation">${esc(o.name)}</a>` : `<code>${esc(o.name)}</code>`} ${o.kind === "read" ? tag("read", "read") : ""}`, ...envs.map((e) => status(o.name, e))])); }
function typeText(f) {
  const v = f.value;
  const type = v.type === "uint" ? `uint${v.bits}` : v.type === "text" ? `text · max ${v.max}` : v.type === "id" ? `id · ${v.prefix}` : "schema · detail unavailable";
  return `${esc(f.named || type)}${f.named ? ` <span class="subtle">${esc(type)}</span>` : ""}`;
}
function fields(fs) { return table(["Field", "Type", "Reference"], Object.entries(fs).map(([name, f]) => [`<code>${esc(name)}</code>`, typeText(f), f.ref ? `<code>${esc(f.ref)}</code>` : "—"])); }
function home() {
  return heading("Understand the system. Then trust it.", "An owner gives a member an allowance. The member can spend within its limit. Every change has rules and evidence.", '<a class="primary button-link" href="#loop">Preview a change request</a>') +
    '<div class="summary"><div><strong>8</strong><small>things</small></div><div><strong>15</strong><small>operations & reads</small></div><div><strong>4</strong><small>declared environments</small></div><div><strong>Unavailable</strong><small>live proof coverage</small></div></div>' +
    panel("From intent to a system that improves", '<div class="graph"><section><h3><a href="#design">Design the specification</a></h3><p>Ideate, spike and resolve the blanks. The specification becomes executable code.</p></section><section><h3><a href="#work">Build from the blueprint</a></h3><p>Generate the interfaces, scaffolds and instrumentation. Give workers context and checks derived from the same declarations.</p></section><section><h3>Measure and improve</h3><p>Prove, promote and watch. Use evidence to direct the next attempt.</p></section></div>') +
    panel("How acme hangs together", '<div class="graph"><section><h3>Organization</h3><p>An owner grants an allowance to a member. The organization holds the cap.</p><code>organization.owner</code></section><section><h3><a href="#thing">Allowance</a></h3><p>Limit and spent total. Active, exhausted or revoked.</p><code>organization → allowance ← person</code></section><section><h3><a href="#operation">Spend</a></h3><p>The grantee spends. The system returns what remains, or refuses.</p><code>AllowanceSpent</code></section></div><div class="route-list"><a href="#thing">Explore the allowance</a><a href="#docs">Read how spend works</a><a href="#loop">Ask for a change</a></div>') +
    panel("Evidence by environment", '<p class="subtle">Repository scope: main. A recorded pass is scoped to its evidence revision. Production may carry staging evidence.</p>' + matrix(operations.filter((o) => o.thing === "allowance"))) +
    '<div class="cols">' + panel("Start with allowance", `<p>${esc(allowance.description)}</p><div class="route-list"><a href="#thing">Fields and machine</a><a href="#operation">Inspect spend</a><a href="#journeys">Journey coverage</a></div>`) +
    panel("Evidence that is still missing", '<ul class="list"><li>Journeys and starting worlds<small>Not yet projected into the compiler model.</small></li><li>Individual evals and traces<small>Not in the retained logbook contract.</small></li><li>Ratchets<small>No generated portal projection supplied.</small></li></ul>') + '</div>' +
    panel("The rest of the blueprint", '<div class="route-list">' + Object.values(model.things).map((t) => tag(t.name)).join("") + '</div><p class="subtle">The allowance detail is the worked screen in this spike. Other thing names are shown from the real model.</p>');
}
function thing() {
  return heading("Allowance", esc(allowance.description), tag("database")) +
    '<div class="cols">' + panel("Fields", fields(allowance.fields)) + panel("Who takes part", '<ul class="list"><li><code>allowance.grantee</code><small>Declared role; predicate details unavailable in the model.</small></li><li><code>organization.owner</code><small>May grant and revoke; follows the organization reference.</small></li></ul>') + '</div>' +
    panel("Walk the machine through its events", '<p>This is a declaration walkthrough. It does not change a live allowance.</p><div class="machine"><div class="state active">active<span>grant arrives here</span></div><div class="state">exhausted<span>spend may arrive here</span></div><div class="state">revoked<span>revoke ends the allowance</span></div></div><div class="event-controls"><button data-move="grant">Walk grant</button><button data-move="spend">Walk spend</button><button data-move="revoke">Walk revoke</button></div><div id="event-result" class="event-result" role="status">Choose a move to see its event and allowed states.</div>') +
    panel("Operations and reads", matrix(operations.filter((o) => o.thing === "allowance"))) +
    panel("Events and typed refusals", table(["Event", "Fields"], Object.entries(allowance.events).map(([n, f]) => [`<code>${esc(n)}</code>`, esc(Object.keys(f).join(", "))])) + '<p class="subtle">Errors: ' + Object.entries(allowance.errors).map(([n, e]) => `${esc(n)} · exit ${e.exit}`).join("; ") + '. Machine refusal: AllowanceNotActive · exit 40.</p>') +
    panel("Docs", `<div class="docs"><p>${esc(allowance.description)}</p><p>The machine currently declares grant, spend and revoke. The monthly reset described in the product intent arrives in the time layer; this model has no reset move.</p></div>`);
}
function operation() {
  return heading(esc(spend.name), esc(spend.description), '<a class="button-link" href="#loop">Request a change</a>') +
    '<div class="cols">' + panel("Payload", fields(spend.payload)) + panel("Answer", fields(spend.answer)) + '</div>' +
    '<div class="cols">' + panel("Who may call, and what happens", '<ul class="list"><li><code>allowance.grantee</code><small>Role check happens before the handler.</small></li><li>active → active or exhausted<small>Emits AllowanceSpent.</small></li><li>Idempotent by request<small>A retry with the same key spends once.</small></li></ul>') +
    panel("Declared budget", `<div class="value">${spend.budget.p95Ms} <span class="subtle">ms p95</span></div><p>Measured p95 and sample count are unavailable.</p><div class="route-list"><a href="#loop">Preview a budget change</a></div>`) + '</div>' +
    panel("Errors and refusals", table(["Outcome", "Origin", "Details"], spend.refusals.map((r) => [`<code>${esc(r)}</code>`, r === "AllowanceExceeded" ? "Declared" : "Generated", r === "AllowanceExceeded" ? "remaining: Amount · exit 41" : r === "AllowanceNotActive" ? "Machine state · exit 40" : "Caller does not hold the required role"]))) +
    panel("Proof in each environment", matrix([spend]) + '<p class="subtle">Individual eval details unavailable. An aggregate pass cannot supply nine fabricated green checks.</p>') +
    '<div class="cols">' + panel("Declared steps", '<ol class="timeline">' + Object.values(spend.steps).map((s) => `<li><strong><code>${esc(s.name)}</code></strong><p>${esc(s.type)}</p></li>`).join("") + '</ol>') +
    panel("Traces and journeys", empty("No retained trace or journey links", "TraceSource and the generated journey projection will fill this view. A refusal is an expected result; a defect is a failure.") + '<button disabled>Open retained trace</button>') + '</div>';
}
function design() {
  return heading("Make the specification executable.", "Ideate, spike and specify. Then build, prove and improve against the same coded promises.") +
    panel("Acme’s current specification", '<p>The generated artifact contains 8 things and 15 operations or reads. It records no blanks. That does not establish a fresh check, complete ideation history or passing behaviour.</p><div class="route-list"><a href="#thing">Explore allowance</a><a href="#operation">Inspect spend’s promise</a><a href="#docs">Read the docs</a></div>') +
    panel("What falls out of a declaration", '<ol class="timeline"><li><strong>Caller interfaces</strong><p>API, SDK, CLI and MCP where the target is built; generated from the operation.</p></li><li><strong>Implementation context</strong><p>Typed scaffolds, permitted errors, declared steps and runtime instrumentation.</p></li><li><strong>Proof obligations</strong><p>Journeys and evals judge the implementation. Results attach to revisions and environments.</p></li></ol>') +
    panel("Ideas, spikes and open decisions", empty("History projection unavailable", "This model has no idea or decision history. The portal must expose that design work when generated projections exist; it cannot reconstruct it from a green badge."));
}
function work() {
  return heading("Work with context already attached.", "Managers organise bounded work. Workers execute it against promises and measurable checks. This is a later tooling preview.") +
    panel("Context derived from allowance.spend", table(["The worker needs", "The blueprint provides"], [["Promise",esc(spend.description)],["Payload",esc(Object.keys(spend.payload).join(", "))],["Answer",esc(Object.keys(spend.answer).join(", "))],["Declared errors",esc(spend.errors.join(", "))],["Event",esc(spend.move.emits)],["Declared steps",esc(Object.values(spend.steps).map((s)=>s.name).join(", "))],["Target", "Effect server today; other targets only after their gates"],["Budget", `${spend.budget.p95Ms} ms p95 · measured result unavailable`]])) +
    panel("Goals, milestones and live workers", empty("No work-plan or run projection attached", "No task assignment, manager, worker or progress is inferred from the model. A future code-declared plan links work to these operations; observed run state belongs in durable storage.")) +
    panel("Durable execution", '<p>Pi Durable sits behind Architect’s Effect seam. Show the request, current checkpoint, tool activity, limits, result and resume state. Managers coordinate; workers act within their bounded context. An independent author owns journeys and evals.</p><a href="#loop">Preview the person–agent change loop</a>');
}
function journeys() {
  return heading("Journeys", "Follow a starting world through calls, refusals and state changes.") + panel("Journey coverage", empty("Journey projection unavailable", "The reviewed generated model contains no journeys or starting worlds. The app cannot infer coverage from operations or manufacture passing assertions.")) +
    panel("The view when the extension is present", '<ol class="timeline"><li><strong>Starting world</strong><p>Generated world name, cast aliases, and seed operation references; no passwords or personal details.</p></li><li><strong>Calls and checks</strong><p>Each call links to an operation, its expected outcome and its recorded assertion result.</p></li><li><strong>Run and cleanup</strong><p>Environment, revision, eval evidence, and observed world destruction. Missing details stay unavailable.</p></li></ol>');
}
function environments() {
  return heading("Environments", "A declared destination is separate from an observed running deployment.") + panel("Declared configuration", table(["Environment", "Identity", "Lifetime", "Promotes from", "Observed deployment"], Object.values(model.environments).map((e) => [esc(e.name), esc(e.identity), e.lifetimeMs ? `${e.lifetimeMs / 3600000} hours` : "—", esc(e.promotesFrom || "—"), tag("Unavailable")]))) +
    panel("Production destinations", table(["Output", "Method", "Declared domain"], Object.entries(model.environments.production.deploy).map(([n, d]) => [esc(n), esc(d.how), `<code>${esc(d.domain)}</code>`])) + '<p class="subtle">These are declarations from acme, not links to verified live services. G1’s current production pass is local.</p>');
}
function releases() {
  return heading("Releases", "The version comes from a comparison of compiled models.") + panel("Last recorded release", empty("No release record attached", "There is no logbook response in this design fixture. No release number is asserted.")) +
    panel("Preview: change the spend budget", '<p>Illustrative diff against the real current model. This is not a released change.</p><pre><code>allowance.spend.budget.p95Ms\n<span class="removed">− 150</span>\n<span class="added">+ 120</span>\n\nclassification: patch\nnext version: unavailable (no release baseline)</code></pre><p>Payload or answer changes are major. Adding an operation or read is minor. Budget changes are patch, as classified by Compare.release.</p>');
}
function docs() {
  return heading("Spend, explained", "Generated documentation sits beside the operation and its evidence.") + panel("allowance.spend", `<p>${esc(spend.description)}</p><p>Only the grantee may call it. Sending the same idempotency key twice makes one call.</p><h3>What you send</h3>${fields(spend.payload)}<h3>What comes back</h3>${fields(spend.answer)}<p>The system emits AllowanceSpent and leaves the allowance active or exhausted.</p><div class="route-list"><a href="#operation">Inspect the full contract</a><a href="acme-spend.md">Read the generated Markdown</a></div>`) + panel("Original generated document", `<pre><code>${esc(SPEND_DOC)}</code></pre>`);
}
function future() {
  return heading("Kits, chain and time", "The navigation grows from generated capabilities after each layer’s gate.") + '<div class="graph">' +
    '<section><h2>Kits · layer 3</h2><p>Kit origin, its configuration choices, dependency edges and generated operations. No kit declarations exist in this model.</p></section>' +
    '<section><h2>On chain · layer 4</h2><p>Contract, network, bytecode and ABI hashes, signer, receipt and follower checkpoint. Allowance currently lives in the database.</p></section>' +
    '<section><h2>Time · layer 5</h2><p>Clock mode, anchor, due time, actual move and lateness. Reset counts calendar months from the grant. No time move exists in this model.</p></section></div>' +
    panel("Capability-driven pages", empty("Design preview only", "No wallet, chain, clock or keeper control is enabled. The Noir target stays after Gate 5, as N1 requires."));
}
function loop() {
  const labels = ["Draft request", "Proposed diff", "Check found a problem", "Ready for review", "New evidence returned"];
  let body = '';
  if (loopStep === 0) body = '<label for="request"><strong>What should change?</strong></label><p>The request is scoped to allowance.spend. The generated files remain read only.</p><textarea id="request">' + esc(previewRequest) + '</textarea><button class="primary" id="loop-next">Preview proposed diff</button>';
  else {
    body = '<div class="message person"><small>Your request · preview</small>' + esc(previewRequest) + '</div><div class="message"><small>Agent response · authored scenario</small><strong>Reduce spend’s declared p95 budget to 120 ms.</strong><p>This affects allowance.spend’s contract hash and its proofs. It does not establish that the implementation can meet the new budget.</p><pre><code>blueprint/things/allowance/verbs/spend.ts\n<span class="removed">− budget: { p95: "150 millis" }</span>\n<span class="added">+ budget: { p95: "120 millis" }</span></code></pre></div>';
    if (loopStep === 1) body += '<p>Next: regenerate and check in an isolated project copy. An independent author owns journeys and evals.</p><button id="loop-next" class="primary">Preview a failing check</button>';
    if (loopStep === 2) body += '<div class="notice"><strong>Illustrative failure: generated output differs.</strong> The agent changed the blueprint but has not regenerated. Existing proof stays attached to the old revision.</div><button id="loop-next" class="primary">Preview corrected patch</button>';
    if (loopStep === 3) body += '<p><strong>Review the corrected patch.</strong> In the real flow, check and prove must finish on the exact patch. Merging a green PR and promoting a bundle are separate actions.</p><button id="loop-next" class="primary">Preview returned evidence</button>';
    if (loopStep === 4) body += '<p><strong>End of the illustrative flow.</strong> A real app would reload the newly generated model and its signed evidence. This mock keeps the real fixture at 150 ms. No files were changed and no proof was run.</p><button id="loop-reset">Start preview again</button>';
  }
  return heading("A request becomes a reviewed change.", "The chat is the conversation. The blueprint and proof remain the record.") + '<div class="chat"><p class="loop-state">Later agent integration · step ' + (loopStep + 1) + ' of 5 · ' + labels[loopStep] + '</p>' + panel("Change allowance.spend", body) + '</div>';
}
function render() {
  const route = location.hash.slice(1) || "home";
  const views = { home, design, work, thing, operation, journeys, environments, releases, docs, future, loop };
  const current = Object.hasOwn(views, route) ? route : "home";
  document.querySelector("#crumb").textContent = titles[current];
  document.querySelectorAll("nav a").forEach((a) => a.setAttribute("aria-current", a.hash === `#${current}` ? "page" : "false"));
  document.querySelector("#scenario-note").textContent = scenario === "empty" ? "Model snapshot only" : "Synthetic evidence scenario";
  content.innerHTML = scenarioNote() + views[current]();
}
function walkMove(name) {
  const move = allowance.machine.moves[name];
  document.querySelector("#event-result").innerHTML = `<code>${esc(move.emits)}</code>${esc(move.from.length ? move.from.join(" or ") : "creation")} → ${esc(move.to.join(" or "))}.`;
}
function onAction(event) {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.move) walkMove(button.dataset.move);
  if (button.id === "loop-next") {
    if (loopStep === 0) previewRequest = document.querySelector("#request").value.trim() || previewRequest;
    loopStep = Math.min(4, loopStep + 1); render(); content.focus();
  }
  if (button.id === "loop-reset") { loopStep = 0; render(); content.focus(); }
}
document.querySelector("#scenario").addEventListener("change", (e) => { scenario = e.target.value; render(); });
content.addEventListener("click", onAction);
window.addEventListener("hashchange", () => { render(); content.focus(); });
render();
