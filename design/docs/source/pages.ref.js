{ id: "layout", group: "Reference", t: "The layout", h: () => `
<h1>The layout</h1>
<p class="lede">Every Architect project has the same three folders, named for who writes them, and which one a file is in tells you whether you may edit it.</p>
<ul>
<li><code>blueprint/</code> says <b>what the system is</b>: the declarations and journeys. Scaffolded, then yours.</li>
<li><code>implementation/</code> says <b>how it does it</b>: one handler per operation, the services they use, and the Solidity contracts you own. Scaffolded, then yours.</li>
<li><code>generated/</code> holds <b>everything Architect builds</b> from the two: the server itself, the API, the SDK, the CLI, the MCP server, the portal, the docs, the Solidity types and tests, the keeper's timers and the infrastructure. Rewritten on every run; never edited.</li>
</ul>
<p>The one loose file is <code>architect.config.ts</code> at the root: the project's name, which outputs to generate, and any you want
renamed. Throwaway experiments go in <code>spikes/</code>, which is never built. Click through the tree:</p>
<div class="mini" data-mini="layout"></div>
<h2>Inside the blueprint</h2>
<ul>
<li><code>things/&lt;thing&gt;/</code>: one folder per thing, always with the same files. For the allowance: <code>thing.ts</code> (its fields, and where its state lives: the database, an actor, or the chain), <code>machine.ts</code> (its states and moves), <code>events.ts</code>, <code>errors.ts</code>, <code>roles.ts</code> and <code>verbs/</code>, one file per operation or read (<code>grant.ts</code>, <code>spend.ts</code>, <code>revoke.ts</code>, <code>get.ts</code>, <code>list.ts</code>). A name of more than one word keeps its dashes, such as <code>change-role.ts</code>, and the compiler maps it to <code>changeRole</code> in code.</li>
<li>Roles live in the folder of the thing they're scoped to. <code>things/organization/roles.ts</code> holds owner and member; <code>things/allowance/roles.ts</code> holds grantee. On chain, the same role decides whose wallet must sign. Anyone, signed-in and the keeper are built into Architect, so nobody declares them.</li>
<li><code>values/</code>: the named types fields are made of, such as an amount, each saying what it is in every target: <code>money.ts</code>, and <code>chain.ts</code> once a thing lives on chain.</li>
<li><code>kits/</code>: the standard library's kits this project uses, and how: <code>wallets.ts</code> (who signs, with what) and <code>chain.ts</code> (the chain client and the relayer).</li>
<li><code>dependencies/</code>: one file per library you call and don't govern, if you need one the standard library doesn't already wrap. The worked example needs none.</li>
<li><code>journeys/</code>: the stories that prove the operations, such as <code>spend-within-allowance.ts</code>.</li>
<li><code>starting-worlds/</code>: named setups a journey starts from, such as <code>founded</code> and <code>funded</code>.</li>
<li><code>environments/</code>: one file per place the application runs: <code>local.ts</code>, <code>test.ts</code>, <code>staging.ts</code>, <code>production.ts</code>.</li>
</ul>
<h2>Inside implementation</h2>
<ul>
<li><code>handlers/&lt;thing&gt;/&lt;verb&gt;.ts</code>: one handler per operation, at the path that mirrors its declaration. Reads have none.</li>
<li><code>services.ts</code>: your own Effect services.</li>
<li><code>contracts/</code>: the Solidity you own, such as <code>AllowanceVault.sol</code>.</li>
</ul>
<h2>Inside generated</h2>
<p><code>server</code> is the running application, which wires your handlers to their routes. <code>api</code> is the contract between
server and clients, <code>sdk</code> the typed client, <code>cli</code> the command-line tool, and <code>mcp</code> a tool per operation for
agents. <code>contracts</code> holds the Solidity types, the compiled machine, what each person signs, and the Foundry tests.
<code>keeper</code> holds the timers for the moves time makes, one per thing, fired through the world's Timers service. <code>infra</code> is the infrastructure for each
environment, <code>docs</code> a page per thing and operation, <code>model</code> the compiled blueprint, and <code>portal</code> the site
that shows it all.</p>
<h2>Where the generators live</h2>
<p>The generators themselves are target-neutral, in <code>@architect/generators</code>. Each language the blueprint writes into is a
package of its own, <code>target-effect</code> and <code>target-solidity</code>, and where the generated code runs is a host package,
<code>host-cloudflare</code>. Kits come from <code>@architect/std</code>, such as the chain follower, which keeps an organisation's index
in step with anything that reached a contract some other way.</p>
<h2>The dependency chain</h2>
<p>The server implements the API, using your handlers. The SDK is built on the API. The CLI and the MCP are built on the SDK. So a
change flows one way. Add a field to <code>allowance.spend</code>'s payload, and the API's schema changes, then the SDK's call, then the
CLI's flag and the MCP tool. Nx, the monorepo tool Architect is built on, knows which project depends on which, so it rebuilds and
retests only what the change touched.</p>` },

{ id: "conventions", group: "Reference", t: "Conventions", h: () => `
<h1>Conventions</h1>
<p class="lede">Architect works names out from places. If a name comes from a path, it can't be spelt one way in one file and
another way in the next, and from an operation's name alone you can find everything about it. The same conventions are what the
generators write from, and what makes the code readable to someone who has never seen it.</p>
<h2>Which files are yours</h2>
<p>Architect writes two kinds of file, and they follow different rules.</p>
<ul>
<li><b>Scaffolds</b> are written once, with the right imports and names and with blanks marked <code>Blueprint.todo("...")</code>, or <code>notWritten("...")</code> in Solidity. You fill the blanks and own the file from then on. Declarations, handlers, the contract and journeys are scaffolds; each starts <code>Scaffolded from the blueprint ... Yours from now on.</code> Check fails while any blank is left. A handler is scaffolded only once its declaration has no blanks left, because until then Architect doesn't know what the handler is given.</li>
<li><b>Outputs</b> are everything under <code>generated/</code>. They're rewritten on every run, each starts <code>Generated from the blueprint. Do not edit.</code>, and editing one fails check.</li>
</ul>
<h2>The life of each declaration</h2>
<p>Every kind of declaration goes through the same five stages: a convention says where it lives and what it's called, a scaffold
writes it with blanks, the agent fills the blanks, Architect generates what follows, and the built-in evals check it. Step through each one.</p>
<div data-life="all"></div>
<h2>One path, many files</h2>
<p><code>blueprint/things/allowance/verbs/spend.ts</code> declares <code>allowance.spend</code>. Everything else about it
sits at a path derived from that one. Here are all of its files:</p>
<div class="mini" data-mini="spend"></div>
<div class="tablewrap"><table>
<tr><th>In use</th><th>For allowance.spend</th></tr>
<tr><td>Route</td><td><code>POST /allowance/spend</code></td></tr>
<tr><td>CLI</td><td><code>acme allowance spend</code></td></tr>
<tr><td>SDK</td><td><code>acme.allowance.spend(...)</code></td></tr>
<tr><td>MCP tool</td><td><code>allowance_spend</code></td></tr>
<tr><td>Span</td><td><code>allowance.spend</code>, with its steps <code>allowance.spend.load</code>, <code>.submit</code> and <code>.confirm</code></td></tr>
</table></div>
<h2>Names</h2>
<div class="tablewrap"><table>
<tr><th>Kind</th><th>Rule</th><th>Example</th></tr>
<tr><td>Thing</td><td>singular, kebab-case folder</td><td><code>things/api-key/</code></td></tr>
<tr><td>Operation</td><td><code>&lt;thing&gt;.&lt;verb&gt;</code>, from the path; the verb kebab-case</td><td><code>membership.change-role</code></td></tr>
<tr><td>In code (SDK, handlers)</td><td>the verb in camelCase</td><td><code>acme.membership.changeRole(...)</code></td></tr>
<tr><td>State</td><td>a lowercase adjective or participle</td><td><code>active</code>, <code>exhausted</code></td></tr>
<tr><td>Move</td><td>the verb of the operation that makes it, or a verb for what time does</td><td><code>spend</code>, <code>reset</code></td></tr>
<tr><td>Event</td><td><code>&lt;Thing&gt;&lt;PastTense&gt;</code></td><td><code>AllowanceSpent</code></td></tr>
<tr><td>Error</td><td><code>&lt;Thing&gt;&lt;Reason&gt;</code>, with an exit code</td><td><code>AllowanceExceeded</code> (41)</td></tr>
<tr><td>Refusal from the machine</td><td><code>&lt;Thing&gt;Not&lt;State&gt;</code>, generated</td><td><code>AllowanceNotActive</code> (40)</td></tr>
<tr><td>Step</td><td><code>&lt;operation&gt;.&lt;step&gt;</code></td><td><code>allowance.spend.submit</code></td></tr>
<tr><td>Role</td><td>a lowercase noun, in its thing's <code>roles.ts</code></td><td><code>grantee</code> in <code>things/allowance/roles.ts</code></td></tr>
<tr><td>Value</td><td>a capitalised noun, in <code>values/</code></td><td><code>Amount</code> in <code>values/money.ts</code></td></tr>
<tr><td>Kit</td><td>the kit's name, one file in <code>kits/</code></td><td><code>kits/wallets.ts</code></td></tr>
<tr><td>Dependency</td><td>the package's name, one file</td><td><code>dependencies/&lt;package&gt;.ts</code></td></tr>
<tr><td>Journey</td><td>a sentence in kebab-case, its file's name</td><td><code>spend-within-allowance</code></td></tr>
<tr><td>Environment</td><td>one lowercase word, one file</td><td><code>environments/staging.ts</code></td></tr>
</table></div>
<h2>What check enforces</h2>
<ul>
<li>A declared name is read from its path or imported, never retyped as a string.</li>
<li>Outputs are never edited; scaffolds have no blanks left.</li>
<li>A handler sits at the path that mirrors its declaration and implements exactly that operation.</li>
<li>One declaration per file.</li>
<li>A thing's folder holds only <code>thing.ts</code>, <code>machine.ts</code>, <code>events.ts</code>, <code>errors.ts</code>, <code>roles.ts</code> and <code>verbs/</code>.</li>
<li>Anything project-wide has a folder with one file per declaration. The only loose file is <code>architect.config.ts</code>.</li>
</ul>` },

{ id: "concepts", group: "Primitives", t: "The primitives", h: () => `
<h1>The primitives</h1>
<p class="lede">Architect has a small vocabulary. You start with the things, because the nouns of an application change least,
and the operations follow as verbs on them. Each term comes with its part in the allowance example.</p>
<h2>What the application holds</h2>
<ul>
<li><b>Thing:</b> a noun with an identity and fields. An allowance has an id, a key on chain, an organisation, a member, a token, a limit and what's been spent. A thing says where its state lives: in the database, which is Cloudflare's D1; in an actor, a Durable Object that owns it in its own storage; or on the chain. From layer four the allowance's state lives on chain, in the organisation's vault contract.</li>
<li><b>Value:</b> a named type a field is made of. <code>Amount</code> is a bigint in Effect and a <code>uint128</code> in Solidity, declared once.</li>
<li><b>Machine:</b> the states a thing can be in and the moves between them. An allowance is <code>active</code>, <code>exhausted</code>, <code>revoked</code> or <code>expired</code>. Spend has two outcomes; reset and expire are made by time. Once the moves are declared, every "you can't do that from this state" refusal is generated for you.</li>
<li><b>Event:</b> what a move emits, and what it carries. Spending emits <code>AllowanceSpent { allowance, to, amount, remaining }</code>.</li>
</ul>
<h2>What can be done to it</h2>
<ul>
<li><b>Operation:</b> a verb on a thing, with a payload in, an answer out, and the errors it may refuse with. <code>allowance.spend</code> takes <code>{ allowance, to, amount }</code> and answers <code>{ remaining, tx }</code>.</li>
<li><b>Read:</b> a verb that changes nothing, with no move and no handler. A read of one thing, such as <code>allowance.get</code>, is answered by whoever owns it: the database, its actor, or the contract's own view. A read across things, such as <code>list</code>, comes from the organisation's index. A question across every organisation comes from an export, to R2 or D1.</li>
<li><b>Error:</b> a refusal with a name and an exit code, the number the CLI exits with. <code>AllowanceExceeded</code> (41) is declared in <code>errors.ts</code>; <code>AllowanceNotActive</code> (40) is generated from the machine.</li>
<li><b>Step:</b> a named part of an operation's work, of a kind (database, chain, wait, site). Each becomes a span, a timed entry in the trace. Spend has three: <code>load</code>, <code>submit</code> and <code>confirm</code>. Its receipt is written straight through to the organisation's index, so no step waits for an indexer.</li>
<li><b>Budget:</b> how fast an operation should be, such as a p95 of 4 seconds (95 calls in 100 faster than that), with its waits left out. It's a target, and never fails a run.</li>
</ul>
<h2>Who may do it</h2>
<ul>
<li><b>Principal:</b> whoever is calling: a person, an agent, a service, or the system itself, which includes the keeper.</li>
<li><b>Role:</b> a right a principal holds over one particular thing, decided by a rule written once. The grantee of an allowance is the person it was granted to. On chain, the same role decides whose wallet must sign.</li>
<li><b>Signer:</b> what signs for a principal: a local key, a browser wallet, a plain wallet delegated with EIP-7702, and later an embedded wallet or a smart account. A kit of the standard library.</li>
</ul>
<h2>What it reaches beyond Effect</h2>
<ul>
<li><b>Target:</b> a language the blueprint writes into. Effect always; Solidity once a thing lives on chain.</li>
<li><b>Kit:</b> existing packages wrapped behind a primitive, from the standard library: wallets, chain. A kit arrives finished, with no blanks: adding one writes one file of your choices, and generate folds its declarations into your model.</li>
<li><b>Dependency:</b> a library you call and don't govern, wrapped once. The standard library wraps viem, so projects don't.</li>
<li><b>Edge:</b> a thin generated entry for code that runs inside someone else's framework, such as a webhook, or a worker's entry. Not in the worked example.</li>
</ul>
<h2>Where it runs</h2>
<ul>
<li><b>Environment:</b> a place the application runs: local, test, staging or production, each declared in its own file.</li>
<li><b>World:</b> one running copy of an environment, made for a purpose and destroyed afterwards. CI makes a fresh test world for every pull request.</li>
<li><b>Clock:</b> each world has one. Stepped in local and test, where journeys move it; real in staging and production. See <a href="#time">Time and the clock</a>.</li>
</ul>
<h2>How it's proven</h2>
<ul>
<li><b>Journey:</b> a short story through real operations, played by a <b>cast</b> of principals. "Spend within allowance": Olga spends some, can't spend more than is left, spends the rest, and then can't spend at all.</li>
<li><b>Starting world:</b> a named setup a journey begins from. In <code>funded</code>, Ada has granted Olga an allowance of 500, by running the grant operation. From layer four, the organisation's vault is deployed and holds money.</li>
<li><b>Evidence:</b> what a journey run records about every call: who called, the answer or refusal, the events, the spans and the timings.</li>
<li><b>Eval:</b> a rule checked against the evidence. Nine come built in, and a tenth, on time, for moves made by time; you add value checks in journeys.</li>
<li><b>Verdict:</b> all of an operation's evals together, at one revision, in one environment. Only CI writes one.</li>
<li><b>Logbook:</b> the small service each project runs to keep verdicts and the compiled blueprint.</li>
<li><b>Stale:</b> a verdict whose evidence was gathered for an older declaration.</li>
</ul>
<h2>Keeping track of gaps and work</h2>
<ul>
<li><b>Ratchet:</b> a list of known gaps between the code and the blueprint, whose count may fall and never rise.</li>
<li><b>Task:</b> a blueprint change that an agent carries out, with its own brief.</li>
<li><b>Ask:</b> a question waiting on a person, with options and a recommendation, answered in the portal.</li>
</ul>` },

{ id: "starter", group: "Reference", t: "The starter", h: () => `
<h1>The starter</h1>
<p class="lede">Every real application needs sign-up, sign-in, organisations, roles and somewhere to run, and they're tedious to
build and easy to get wrong. The starter gives you all of them, declared and proven, so the first feature you build is your own.</p>
<pre class="code term">${highlight("npx create-nx-workspace acme --preset=@architect/preset", "bash")}</pre>
<p>A preset is Nx's template for a new workspace. Architect's writes the full layout and the things below. Then
<code>architect check</code> passes before you've declared anything.</p>
<div class="tablewrap"><table>
<tr><th>Thing</th><th>Operations</th><th>Handlers</th></tr>
<tr><td>system</td><td><code>health</code>, <code>version</code></td><td>scaffolded, working</td></tr>
<tr><td>person</td><td><code>sign-up</code>, <code>update</code></td><td>Architect's (Better Auth)</td></tr>
<tr><td>session</td><td><code>sign-in</code>, <code>sign-out</code>, <code>show</code></td><td>Architect's (Better Auth)</td></tr>
<tr><td>organization</td><td><code>create</code>, <code>show</code>, <code>list</code>, <code>archive</code></td><td>scaffolded, working</td></tr>
<tr><td>membership</td><td><code>list</code>, <code>change-role</code>, <code>remove</code></td><td>Architect's (Better Auth organisations)</td></tr>
<tr><td>api-key</td><td><code>create</code>, <code>revoke</code></td><td>Architect's (Better Auth API keys)</td></tr>
</table></div>
<p>Some handlers say "Architect's". Those operations are declared in your blueprint like any other, so they get an SDK call, a
CLI command, an MCP tool, docs and evals, but their handlers come from Architect's Better Auth adapter and you never write them. The adapter is built in from layer one; in layer three it becomes the standard library's auth kit, with Sign-In with Ethereum added, and nothing in your project changes. The others
are scaffolded and already working, as examples to read and change. The allowance vault isn't in the starter: it's the first
feature you add, in the <a href="#s1">walkthrough</a>.</p>
<p>The starter also gives you:</p>
<ul>
<li><b>Journeys:</b> "health is up", "sign up and sign in" and "found an organisation".</li>
<li><b>Roles:</b> owner and member, in ${f("acme/blueprint/things/organization/roles.ts", "things/organization/roles.ts")}, plus the built-in anyone, signed-in and keeper.</li>
<li><b>Environments:</b> local and test, ready to run; staging and production, declared and waiting for their cloud details. Data lives in Cloudflare's D1 everywhere; locally the runtime emulates it, so there's no database to install.</li>
<li><b>CI and git hooks,</b> running check on every pull request and proving in a fresh test world.</li>
<li><b>The portal,</b> running, with every starter operation already proven.</li>
</ul>` },

{ id: "generate", group: "Reference", t: "Generators", h: () => `
<h1>Generators</h1>
<p class="lede">A generator writes files from the blueprint. There are two kinds, one for each kind of file: scaffolding
generators, which you run to make a new place to write, and output generators, which keep <code>generated/</code> in step and which
Nx runs for you.</p>
<h2>Scaffolding generators: the ones you run</h2>
<ul>
<li><code>architect add thing allowance</code> writes <code>things/allowance/</code> with <code>thing.ts</code>, <code>machine.ts</code>, <code>events.ts</code>, <code>errors.ts</code> and <code>roles.ts</code>, each with blanks, and a values file. Moving it on chain later is one line in <code>thing.ts</code>.</li>
<li><code>architect add operation allowance.spend</code> writes <code>verbs/spend.ts</code>. Its move is already filled in, because <code>spend</code> is a move of the allowance's machine. There's no handler yet.</li>
<li><code>architect add read allowance.get</code> writes <code>verbs/get.ts</code>. A read never gets a handler.</li>
<li><code>architect add kit wallets chain</code> writes <code>kits/wallets.ts</code> and <code>kits/chain.ts</code>, one file of your choices each, and gives the CLI its wallet commands. The kits themselves arrive finished; generate folds their declarations into your model, so their operations get endpoints, docs and evals like yours.</li>
<li><code>architect add dependency &lt;package&gt;</code> writes <code>dependencies/&lt;package&gt;.ts</code>, and its wrapper with one blank: how the library's failures map to your errors.</li>
<li><code>architect add journey monthly-reset</code> writes <code>journeys/monthly-reset.ts</code>, which fails until the operations work.</li>
<li><code>architect add environment staging</code> writes <code>environments/staging.ts</code> and its infrastructure stack.</li>
</ul>
<p>Each is an Nx generator underneath (<code>nx g @architect/generators:&lt;name&gt;</code>), so <code>--dry-run</code> lists every file it
would write before it writes one.</p>
<p><b>The handler and the contract come later, by themselves.</b> When <code>allowance.spend</code>'s declaration has no blanks left, the next run writes
${f("acme/implementation/handlers/allowance/spend.ts", "implementation/handlers/allowance/spend.ts")}: imports done, declared
steps laid out, blanks where your logic goes. The same run scaffolds ${f("acme/implementation/contracts/AllowanceVault.sol", "the vault contract")},
with a blank in every function. They wait because only a complete declaration says what they take, answer and may refuse with.</p>
<h2>Output generators: the ones Nx runs</h2>
<p>These are Nx <b>sync generators</b>: Nx runs them before every task (build, test, serve), so outputs are never out of date and
you rarely type <code>architect generate</code>.</p>
<div class="tablewrap"><table>
<tr><th>Generator</th><th>Writes</th><th>From</th></tr>
<tr><td>model</td><td><code>generated/model/</code></td><td>every declaration</td></tr>
<tr><td>solidity</td><td><code>generated/contracts/</code></td><td>things that live on chain</td></tr>
<tr><td>abi</td><td><code>generated/contracts/abi.ts</code></td><td><code>forge build</code></td></tr>
<tr><td>api</td><td><code>generated/api/</code></td><td>the model and the ABI</td></tr>
<tr><td>sdk</td><td><code>generated/sdk/</code></td><td>the API</td></tr>
<tr><td>cli, mcp</td><td><code>generated/cli/</code>, <code>generated/mcp/</code></td><td>the SDK</td></tr>
<tr><td>keeper</td><td><code>generated/keeper/</code></td><td>moves made by time</td></tr>
<tr><td>docs</td><td><code>generated/docs/</code></td><td>the model</td></tr>
<tr><td>infra</td><td><code>generated/infra/</code></td><td><code>environments/</code></td></tr>
</table></div>
<p>The most useful output to read is what a handler is given. ${f("acme/generated/api/src/allowance/spend.handler.ts", "generated/api/src/allowance/spend.handler.ts")}
types the handler for <code>allowance.spend</code>: the caller is already checked against the grantee role, the steps wrap your code
as spans, the vault's client decodes the contract's reverts into typed errors, and the error type is exactly the declared union. If
you write the wrong thing, it doesn't compile.</p>
<p>In CI, <code>nx sync:check</code> fails if any output would change. See ${f("architect/packages/generators/src/sync/sdk.ts", "the SDK's sync generator")} and ${f("architect/packages/generators/src/generators/operation/index.ts", "the operation generator")}.</p>` },

{ id: "check", group: "Reference", t: "Check and ratchets", h: () => `
<h1>Check and ratchets</h1>
<p class="lede">Generators keep the outputs in step. <code>architect check</code> catches the places where code you write can still
disagree with the blueprint. It runs in your editor, in git hooks and in CI, and every message names the file to fix.</p>
<p>It works in four layers, cheapest first:</p>
<ol>
<li><b>Types.</b> A handler's type is generated from its declaration, so a handler that doesn't match won't compile. The contract inherits its generated machine, so it can't move state any other way.</li>
<li><b>Rules,</b> for what types can't see: a declared name retyped as a string, a handler at the wrong path, an edited output, a blank left unfilled. Each is an oxlint rule, such as ${f("architect/packages/lint/src/rules/handler-matches-path.ts", "handler-matches-path")}.</li>
<li><b>Drift:</b> generating again would change nothing.</li>
<li><b>Ratchets:</b> no list of known gaps has grown.</li>
</ol>
<p>Here is a failure. In the spend handler you try to fail with <code>OrganizationArchived</code>, an error <code>spend</code> doesn't declare:</p>
<pre class="out">✖ types   implementation/handlers/allowance/spend.ts:9
          OrganizationArchived is not an error allowance.spend declares.
          Add it to errors in blueprint/things/allowance/verbs/spend.ts</pre>
<p>The fix starts in the declaration. That holds for every change: the declaration first, then the code.</p>
<h2>Ratchets</h2>
<p>When Architect adds a new rule, existing code may not meet it yet. Failing every pull request until it does would stop all
work; ignoring the gap would let it grow. A ratchet records the gap as a list with a count that may fall and never rise.</p>
<p>Say a new built-in eval needs every operation to declare whether a retry is safe, and two existing operations don't. They go on that
ratchet's list, and check passes. A pull request that adds a third fails. One that fixes one lowers the count to one. A new
starter project has no ratchets.</p>
<p>Working the lists down to empty is called <b>the climb</b>. Every entry is a ready-made task for an agent: see <a href="#agents">Tasks for agents</a>.</p>
<div class="callout open">Open: which rules are generated per project, and which ship fixed with Architect.</div>` },

{ id: "proof", group: "Primitives", t: "Journeys, evals, verdicts", h: () => `
<h1>Journeys, evals and verdicts</h1>
<p class="lede">A handler that compiles can still do the wrong thing. Architect proves each operation by running journeys against
a running application and checking what happened. An operation is proven when its evals pass, on evidence from journeys, at a
revision, in an environment, and only CI writes that down.</p>
<h2>Journeys</h2>
<p>A journey is a short story told through real operations, played by a cast. "Spend within allowance" starts from the starting world
<code>funded</code>, where Olga has an allowance of 500. Olga spends 120. She can't spend 400, because only 380 is left. She spends the
rest. Then she can't spend at all, because the allowance is exhausted. See ${f("acme/blueprint/journeys/spend-within-allowance.ts", "spend-within-allowance.ts")}.
Another journey moves the clock: ${f("acme/blueprint/journeys/monthly-reset.ts", "monthly-reset.ts")}.</p>
<p>A step can say what it expects: <code>expect((a) =&gt; a.remaining).toBe(380n)</code>, or
<code>refuses(AllowanceExceeded, { remaining: 380n })</code>. These value checks are all you write per operation. A journey is written by someone other than
whoever writes the handler, so the code is judged by a story its author didn't write.</p>
<h2>Evidence and evals</h2>
<p>While journeys run, Architect records every call: the caller, the answer or refusal, the events, the spans and the timings.
That record is the <b>evidence</b>. An <b>eval</b> is a rule checked against it. Every operation gets nine from its declaration
alone, and a tenth for moves made by time (${f("architect/packages/prove/src/evals/index.ts", "the list")}):</p>
<ol>
<li><b>Answer shape:</b> the answer decodes with its declared schema.</li>
<li><b>Declared errors only,</b> each with its exit code.</li>
<li><b>Machine path:</b> every move started from a state it may start from, and ended in one of its outcomes.</li>
<li><b>Events:</b> each move emitted its event, carrying what it declares.</li>
<li><b>Who may call:</b> a caller without the role was refused.</li>
<li><b>Steps:</b> each declared step that ran has its span, each wait finished in its time, and each refusal has the log that decided it.</li>
<li><b>Performance:</b> p50 and p95 against the budget. Over 1.5 times the budget raises a review, and never fails.</li>
<li><b>Coverage:</b> every declared move, error and outcome was reached by some journey.</li>
<li><b>Explainability:</b> how much of each call's time its declared steps account for.</li>
<li><b>On time:</b> every move made by time happened when it was due, within its lateness. The keeper's expiries and the lazy resets are both checked.</li>
</ol>
<p>Things that live on chain are also proven in Foundry: the generated tests try every move from every state, every write signed by the wrong wallet, and every signed request sent twice.</p>
<h2>Verdicts</h2>
<p>A <b>verdict</b> is all of an operation's evals together, at one revision, in one environment: "allowance.spend passed on test at 7c1e9a0".</p>
<pre class="code term">${highlight("architect prove --env local\narchitect prove --env test", "bash")}</pre>
<p>On your machine, <code>prove</code> prints each operation's results and publishes nothing, because nobody can confirm what ran on
your machine. In CI, it runs in a fresh test world, and CI writes the verdicts to the logbook, signed with GitHub's OIDC token: a
token GitHub gives each workflow run, proving which repository, branch and workflow it came from. So a verdict can't be faked.</p>
<p>In production, nobody runs journeys: the same evals run on what the running system records.</p>
<h2>Staleness</h2>
<p>Change a declaration and every verdict that depends on it turns stale until CI proves it again. Loosen <code>allowance.spend</code>'s
budget, and its verdicts in staging and production turn stale in the portal, while grant, revoke and get stay proven. Nothing keeps
an old proof without saying so.</p>` },

{ id: "auth", group: "Primitives", t: "Who may call", h: () => `
<h1>Who may call</h1>
<p class="lede">Every call raises two questions: who is calling, and may they? Architect answers them with two primitives.</p>
<ul>
<li>A <b>principal</b> is whoever is calling. There are four kinds, fixed by Architect so that evals and telemetry can rely on them: person, agent, service and system. The keeper, which makes the moves time makes, is a system principal. Every call's telemetry records the caller's kind and role.</li>
<li>A <b>role</b> is a right a principal holds over one particular thing, decided by a rule written once. It lives in the folder of the thing it's scoped to, as in ${f("acme/blueprint/things/allowance/roles.ts", "things/allowance/roles.ts")}.</li>
</ul>
<p>The grantee of an allowance is the person it was granted to. Owner and member of an organisation are in
${f("acme/blueprint/things/organization/roles.ts", "things/organization/roles.ts")}. Anyone (callers who aren't signed in
included), signed-in and the keeper are built in.</p>
<p>Each operation lists its roles in <code>allowed</code>. <code>allowance.spend</code> allows <code>[grantee]</code>; <code>allowance.grant</code>
allows <code>[owner.of("organization")]</code>, the owner of the organisation named in the payload. Anyone else gets <code>NotAllowed</code>
before the handler runs. That refusal, the "who may call" line in the docs and the "who may call" eval are all generated from the list.</p>
<h2>Who signs</h2>
<p>Once a thing lives on chain, the contract can't see the server's session, and the server can't stop someone calling the contract
directly. So the same role answers both questions.</p>
<ul>
<li><b>Off chain,</b> the role decides who may call: the grantee, or the organisation's owner. The server checks it before anything is sent.</li>
<li><b>On chain,</b> the operation's <code>signedBy</code> names the same role, and it decides whose wallet must sign. Architect turns the payload into typed data, the caller's own wallet signs it, and ${f("acme/generated/contracts/AllowanceSignatures.sol", "the generated signature helpers")} check it in the contract: a plain wallet or a smart account alike, with a nonce so a signed request lands once.</li>
<li><b>The relayer only pays the gas.</b> It submits what was signed; without a person's signature it can do nothing.</li>
<li><b>The keeper's key may only make time moves.</b> The contract refuses it for anything else.</li>
</ul>
<p>Which wallet signs for whom is set in ${f("acme/blueprint/kits/wallets.ts", "the wallets kit")}: a local key in the CLI, any signer the caller passes to the SDK, and a fresh test wallet per person in every world. The generated Foundry tests sign every write with the wrong wallet and expect it refused, so the two sides can't drift apart.</p>
<h2>Where identity comes from</h2>
<p>Better Auth, an open-source TypeScript auth library, is the default. It provides:</p>
<ul>
<li><b>sessions,</b> which give the principal;</li>
<li><b>Sign-In with Ethereum,</b> which links a person to the wallet addresses they prove are theirs;</li>
<li><b>organisations,</b> whose memberships the owner and member rules read;</li>
<li><b>API keys,</b> which make agents and services principals;</li>
<li><b>device login,</b> which is how <code>acme login</code> works in the CLI;</li>
<li><b>OAuth,</b> which is how an agent signs in to the remote MCP server as a person.</li>
</ul>
<p>Each environment names its identity. Local and test use fixed test principals, such as Ada and Olga, with no sign-in; staging
and production use real sign-in. Agents are principals of kind agent, so their calls are checked and traced like anyone else's.</p>` },

{ id: "infra", group: "Reference", t: "Environments and infra", h: () => `
<h1>Environments and infrastructure</h1>
<p class="lede">An environment is a place the application runs. You declare each one, because evidence and verdicts are kept per
environment: "proven" always says where.</p>
<p>There are four by default, one file each in <code>blueprint/environments/</code>: ${f("acme/blueprint/environments/local.ts", "local.ts")},
${f("acme/blueprint/environments/test.ts", "test.ts")}, ${f("acme/blueprint/environments/staging.ts", "staging.ts")} and
${f("acme/blueprint/environments/production.ts", "production.ts")}. Each says how it runs, which identity it uses and which cloud it needs, and, as layers add them, its chain, its clock and the secrets it needs by name. Where each output goes is on <a href="#deploy">Deploy and publish</a>; how
the clocks work is on <a href="#time">Time and the clock</a>.</p>
<p>Architect turns each one that needs a cloud into an Alchemy stack under <code>generated/infra/</code>. Alchemy is a TypeScript
library for infrastructure as code: deploying a stack creates its cloud resources, and destroying it removes them.</p>
<ul>
<li><b>Test worlds:</b> for each pull request, CI creates a fresh copy of the test environment, with its own D1 database, and its own chain from layer four, proves in it and destroys it. A world is itself a Durable Object: things register with it, it runs the clock, and its own alarm destroys it at expiry. Heavy processes, such as the local Anvil chain, run as benches: Cloudflare Containers that the world's objects own. A world is made and destroyed as one unit, with an owner and an expiry (<code>lifetime: "2 hours"</code> in <code>test.ts</code>), so nothing is left running.</li>
<li><b>The logbook</b> is deployed as part of each project's own infrastructure (proposed).</li>
</ul>
<p>See ${f("acme/generated/infra/src/test.ts", "the generated test stack")} and ${f("acme/generated/infra/src/production.ts", "the production stack")}.</p>` },

{ id: "state", group: "Reference", t: "Durable state", h: () => `
<h1>Durable state</h1>
<p class="lede">The portal and agents need the blueprint's current shape and what's proven, and they need it without cloning and
parsing the repository. They also need to trust it.</p>
<p>So the code stays the source, and CI publishes a compiled copy. On every push that passes check, CI compiles the blueprint into
one <b>model</b>: a JSON description of every thing, operation, machine, role, journey and environment, and the links between them.
It sends the model to the project's logbook, where the verdicts already are.</p>
<ul>
<li><b>Only CI writes,</b> with its OIDC token, so only a model that passed check is ever published.</li>
<li><b>A model never changes:</b> each is stored under the hash of its content, keyed by revision and branch.</li>
<li><b>Questions are one lookup:</b> the logbook keeps the latest model as tables, so "which journeys use <code>allowance.spend</code>?" is a single query.</li>
<li><b>Staleness is worked out on arrival:</b> the logbook compares the new model with the branch's last one and marks stale every verdict whose declaration, or anything it depends on, changed. The same comparison sets the next version: see ${f("acme/generated/model/changes.json", "changes.json")}.</li>
<li><b>Changes go through code:</b> an agent or the portal asks for a change, it becomes an edit to declaration files, and it's reviewed and merged like any other.</li>
</ul>
<p>The logbook is a Cloudflare Worker each project deploys. Model files sit in R2, Cloudflare's file storage, and the index in a
Durable Object: a small, single-threaded server with its own storage, one per key. Durable Objects are also where things,
worlds and organisations can live: see <a href="#runtime">Where state lives</a>. Offline, the same Worker runs on your machine, and
<code>architect show</code> compiles the model straight from the code.</p>
<p>The whole flow, with its tables: <a href="https://claude.ai/artifact/DMXJ1D44Y3uqyh2dB9dXEP" target="_blank" rel="noopener">Architect's Durable State</a>.
See also ${f("acme/generated/model/model.json", "model.json")} and ${f("architect/packages/logbook/src/blueprint-index.ts", "the index")}.</p>` },

{ id: "agents", group: "Reference", t: "Tasks for agents", h: () => `
<h1>Tasks for agents</h1>
<p class="lede">An agent does its best work with a small, exact job and a clear test of when it's finished. The blueprint provides both.</p>
<p>A <b>task</b> is a blueprint change. For example: "owners can see every allowance in their organisation", which adds the read
<code>allowance.list</code>.</p>
<pre class="code term">${highlight("architect task start list-allowances", "bash")}</pre>
<p>It does two things:</p>
<ol>
<li><b>Scaffolds the change:</b> the declaration edits, and blanks in every handler or contract function they break.</li>
<li><b>Writes the brief:</b> one file telling the agent which files to change; what depends on them; which evals must pass, and where; which ratchets it may lower and must not raise; what it must not touch (a builder never edits the journeys, the generated Foundry tests or the built-in evals that judge its work); and the commands to check itself.</li>
</ol>
<p>A brief for filling the spend handler, for example, names ${f("acme/implementation/handlers/allowance/spend.ts", "the handler")}, tells
it to read the allowance's five declaration files and ${f("acme/generated/api/src/allowance/spend.handler.ts", "what the handler is given")},
and says it's done when "spend within allowance" and "revoke then spend" pass locally with every eval green.</p>
<p>The agent works from the brief. <code>architect check</code> and <code>prove</code> tell it what is still wrong, in the same terms. The
task is done when its evals pass, proven by a verdict from CI.</p>
<p>Every ratchet entry is a ready-made task, with its own scaffold and brief, so the climb is a queue any agent can take from.</p>
<p>When an agent needs a decision only a person can make, it raises an <b>ask</b>: the context, two to four options with their
trade-offs, and a recommendation. The portal lists open asks, and answering them is the one thing you can do there for now.</p>` },
