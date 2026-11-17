{ id: "intro", group: "Start", t: "What Architect is", h: () => `
<h1>What Architect is</h1>
<p class="lede">Architect is Effect, one level up. Effect makes you declare, in the types, which errors a piece of code can fail
with and which services it needs, and that makes the code objectively better. Architect asks the same of the whole system. You
declare its things, their state machines, the events each change emits, the errors, the steps and telemetry, who may call each
operation, how fast it must be, where it runs, and what depends on what. That is the blueprint.</p>
<p>Once the system is specified like that, a great deal falls out of it. Every operation gets rich, exact context and a scaffold
that already fits, so an agent can implement it, improve it, or climb a metric against it. The blueprint becomes the basis for
building the code, for building the system that builds the code, and for the docs, the SDK, the CLI and the infrastructure.
Everything is derived from one place, so nothing drifts.</p>
<h2>Why it's built this way</h2>
<ul>
<li><b>Correct from the beginning.</b> The declarations are a contract. Code that breaks it doesn't compile, and everything is instrumented by construction, because every step is declared.</li>
<li><b>Measurable, so hill-climbable.</b> Every operation has evals: the right answers, the right events and refusals, speed within its budget, its time explained, in every environment. Building becomes climbing those numbers, and a new standard arrives as a ratchet that can only tighten.</li>
<li><b>Standardised.</b> One layout, one naming scheme, one place for everything. A person or an agent can read what the system is, and what it can and can't do, from the folders alone.</li>
<li><b>Agent native.</b> Agents are the main users. The blueprint is the conversation between you and your agent, the contract the implementing agents work to and prove against, and the map that says exactly what a change invalidates later.</li>
<li><b>It scales.</b> Prove something thin, then build out something complicated quickly, because every new piece is held to the same contract.</li>
</ul>
<p>The trade is deliberate. Architect is very opinionated, and in exchange everything is accounted for: the system is measurable,
hill-climbable, monitorable and auditable from the first commit.</p>
<h2>Who it's for</h2>
<p>For anyone who builds agent-natively: you describe the intent, agents do most of the building, and you want to know, at any
moment, that what they built is correct. Interfaces for people can be built on top, but the primary users are agents, either
working in the system or building on it.</p>
<h2>What you get</h2>
<ul>
<li>A starter project that signs people up and in, holds organisations and their members, and is proven from its first commit.</li>
<li>For every operation: an API endpoint, an SDK call, a CLI command, a docs page and tracing, all generated from its one declaration.</li>
<li>Scaffolds for the code that still needs writing, with the imports and names right and the blanks marked.</li>
<li>A check that fails whenever the code and the blueprint disagree, in your editor, in git hooks and in CI.</li>
<li>A portal that shows the whole blueprint, what's proven in which environment, and what a change has put back in doubt.</li>
</ul>
<div class="callout">Next, <a href="#loop">the dev loop</a>: how you work with it, from an idea to a watched production system. Or see <a href="#example">the worked example</a> built from nothing.</div>` },
{ id: "loop", group: "Start", t: "The dev loop", h: () => `
<h1>The dev loop</h1>
<p class="lede">Working with Architect is two loops. The first turns an idea into a blueprint that's ready to build. The second
builds it, proves it, and carries it through every environment. Every operation stays traceable through both.</p>
<div class="loops">
  <div class="loop"><div class="loop-name">Design loop</div><div class="loop-stages"><span>Ideate</span><span>Spike</span><span>Specify</span></div><div class="loop-out">until the blueprint is ready to build</div></div>
  <div class="loop"><div class="loop-name">Build loop</div><div class="loop-stages"><span>Build</span><span>Test</span><span>Deploy</span><span>Watch</span></div><div class="loop-out">through local, test, staging and production</div></div>
</div>
<h2>The design loop</h2>
<ul>
<li><b>Ideate.</b> You and your agent agree what you want: a goal, then milestones, then tasks. "An owner should be able to let a member spend from the organisation's money, up to a limit each month."</li>
<li><b>Spike.</b> You try directions in throwaway code, in <code>spikes/</code>, outside the blueprint. It's never built or deployed. You may drop the idea here, and nothing else is touched.</li>
<li><b>Specify.</b> You fill the blueprint's holes properly: the things, their state machines, the events, the errors, the roles, the steps and what the telemetry should say, the budgets and the dependencies. It takes several passes, each a probe, and it ends when nothing is left blank.</li>
</ul>
<p>The design loop's output is a blueprint with no blanks. From that point the context and the scaffolds exist, and the work can be handed out.</p>
<h2>The build loop</h2>
<ul>
<li><b>Build.</b> Handlers are scaffolded; agents fill their blanks. Each agent works from a brief that says what to change, what it must not touch, and which evals must pass.</li>
<li><b>Test.</b> Journeys run locally and every eval reports. Agents climb the numbers until everything passes.</li>
<li><b>Deploy.</b> The same revision is promoted, from a fresh test world to staging to production. Provisioning is declared too, so every environment is created from code and gets its own verdict.</li>
<li><b>Watch.</b> The same evals keep monitoring the running system: speed against budgets, refusals, errors, events. If something drifts, the portal says which operation, where, and since when.</li>
</ul>
<h2>Round again</h2>
<p>When the blueprint changes, the dependencies say exactly what's affected. Those verdicts turn stale and go back round the build
loop; everything else stays proven. That is what lets you build something large quickly: you only ever re-prove what a change touches.</p>` },
{ id: "effect", group: "Why", t: "Effect, one level up", h: () => `
<h1>Effect, one level up</h1>
<p class="lede">Architect is built on Effect, and everything it generates is Effect code. That's a choice, and it's worth saying why.</p>
<h2>What Effect gives you</h2>
<p>In plain TypeScript, a function's type says what it returns when things go well, and nothing else. In Effect, a value's type also
says which errors it can fail with and which services it needs. So the compiler knows that <code>acme.allowance.spend</code> can fail
with <code>AllowanceExceeded</code>, <code>AllowanceNotActive</code> or <code>NotAllowed</code>, and nothing else. You can't forget to handle
an error, and you can't throw one nobody declared. Effect also traces every step as a span, so instrumenting code is a matter of
naming it, not adding it.</p>
<h2>What Architect adds</h2>
<p>Effect asks you to declare errors and dependencies for each piece of code. Architect asks you to declare the whole system the same
way, before the code exists:</p>
<ul>
<li>the <b>things</b> and their <b>state machines</b>, so "you can't do that from this state" is a declared refusal, not a forgotten check;</li>
<li>the <b>events</b> each change emits, so what happened is part of the contract;</li>
<li>the <b>steps</b> each operation runs through, so every span has a declared name and every millisecond can be explained;</li>
<li><b>who may call</b>, so permission is a declaration, not scattered <code>if</code> statements;</li>
<li>the <b>budgets</b> and the <b>environments</b>, so "fast enough" and "where" are measurable;</li>
<li>what <b>depends</b> on what, so a change says what it invalidates.</li>
</ul>
<p>Architect then generates the Effect code that holds all of that together, and leaves you the blanks where behaviour goes. The
result is code that's correct in the way Effect code is correct, across the whole system instead of one function at a time.</p>` },
{ id: "native", group: "Why", t: "Built for agents", h: () => `
<h1>Built for agents</h1>
<p class="lede">Architect is agent native: agents are its main users. The blueprint plays three parts for them.</p>
<h2>The conversation</h2>
<p>Building the architecture is the conversation between you and your agent. You bring the intent; the agent frames it in the blueprint's
pattern: these things, these states, these operations, these refusals. Because the pattern is fixed and the folders are opinionated, the
idea is easy to communicate, and you can read back what was agreed from the files.</p>
<h2>The contract</h2>
<p>The blueprint is the contract between the agents that implement it. Each gets a small, exact job: one declaration to read, blanks to
fill, a brief that says what not to touch, and evals that say when it's done. An agent can't prove its own work by writing its own tests:
journeys are written by someone else, and verdicts only by CI.</p>
<h2>The map for change</h2>
<p>Later, when the system changes, the blueprint says exactly what depends on the change. An agent updating the system knows which proofs
it invalidated, which evals must pass again, and in which environments. The same evals keep watching production, so drift is caught,
not discovered.</p>
<p>The result is building correct software with AI: you work at the level of the blueprint, and the code is correct because it passes the evals.</p>` },
