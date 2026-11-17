{ id: "get", group: "Start", t: "What you get", h: () => `
<h1>What you get</h1>
<p class="lede">Start at the end. You declare what your system is, fill in a few blanks, and Architect gives you a running, proven,
published system: every part generated from one blueprint, every part with a place to go.</p>
<p>Some outputs are <b>deployed</b>: they run somewhere. Others are <b>published</b>: other people install them. Each environment says where each one goes.</p>
<h2>Deployed: what runs</h2>
<ul>
<li><b>The server.</b> Every operation as an endpoint, with its role check, its steps as spans, its refusals typed, and your handlers wired in. Deployed as a worker. ${f("acme/generated/server/main.ts", "generated/server")}</li>
<li><b>The MCP server.</b> One tool per operation and read, built on the SDK. Deployed as a remote server that agents connect to, signing in as a person with OAuth. ${f("acme/generated/mcp/src/server.ts", "generated/mcp")}</li>
<li><b>The contracts,</b> for any thing that lives on chain: its types, its compiled machine, what each person signs, and Foundry tests for every move. Your contract is deployed and verified, and redeployed only when its bytecode changes. ${f("acme/generated/contracts/AllowanceMachine.sol", "generated/contracts")}</li>
<li><b>The keeper,</b> for moves made by time. A grant sets the thing's own timer, a Durable Object alarm, and the keeper fires the move when it is due: no scan and no schedule. ${f("acme/generated/keeper/src/allowance.expire.ts", "generated/keeper")}</li>
<li><b>The world, each organisation and the chain follower,</b> as Durable Objects: the registry and clock, the indexes that reads across things come from, and the watcher of each contract's events. See <a href="#runtime">where state lives</a>.</li>
<li><b>The portal.</b> The whole blueprint, what's proven in which environment, and what a change has put back in doubt, with the docs inside it. Deployed as a site.</li>
</ul>
<h2>Published: what others install</h2>
<ul>
<li><b>The SDK.</b> One typed call per operation, with its exact errors, and a signer slot for anything signed. Published to npm. ${f("acme/generated/sdk/package.json", "its package")}</li>
<li><b>The CLI.</b> One command per operation, with sign-in and wallet commands, and each error's exit code as its own. Published to npm, a Homebrew tap and GitHub releases. ${f("acme/generated/cli/homebrew/acme.rb", "its formula")}</li>
</ul>
<h2>Kept for you</h2>
<ul>
<li><b>The docs.</b> A page per thing and operation, with its machine, its refusals and how to call it. ${f("acme/generated/docs/allowance/spend.md", "an example")}</li>
<li><b>The infrastructure.</b> An Alchemy stack per environment, from its declaration. ${f("acme/generated/infra/src/production.ts", "production's")}</li>
<li><b>The model.</b> Every declaration compiled, with its hash and what depends on it. Comparing two models gives each release its version, and the list of proofs it made stale. ${f("acme/generated/model/changes.json", "a change")}</li>
<li><b>The evidence.</b> A verdict per operation per environment, made only by CI, and the same evals watching production.</li>
</ul>
<h2>And what you write</h2>
<p>The declarations in <code>blueprint/</code>, and the blanks in <code>implementation/</code>: handlers, and the body of a contract.
You don't get all of it at once: it arrives in <a href="#layers">layers</a>, and the first layer is just a server, an SDK, a CLI and docs.</p>
<div class="callout">See it built from nothing in <a href="#example">the worked example</a>, or go straight to the <a href="#s1">Explorer</a>.</div>` },

{ id: "layers", group: "Start", t: "The five layers", h: () => `
<h1>The five layers</h1>
<p class="lede">Architect is built, learned and used in layers. Each layer is something you can stop at and use, and each one only needs
the primitives it introduces. The rest wait until a layer needs them.</p>
<h2>1. Declare and call</h2>
<p>Things, machines, events, errors, roles, operations, reads, steps and budgets. Architect generates the server, the API, the SDK, the CLI
and the docs, running on your machine in Cloudflare's own local runtime, and proves the journeys locally with the built-in evals. No cloud and no chain. Moves made by time wait for layer five, but the world and its one clock are there from the start, so nothing ever reads the wall clock.
In the example, the allowance is plain records.</p>
<h2>2. Prove and ship</h2>
<p>Fresh test worlds in CI, verdicts, staging and production. The server, the MCP server and the portal are deployed; the SDK and the CLI
are published, with versions the model works out. The same evals watch production.</p>
<h2>3. Reach out</h2>
<p>The <a href="#std">standard library</a>: kits that wrap code that already exists behind a primitive, so you never wrap it yourself.
The example uses two: wallets, which gives the signer, and chain, which gives viem wrapped once, the relayer, simulation and the chain follower. Kits arrive finished; adding one writes one file of your choices.</p>
<h2>4. On chain</h2>
<p>A thing can live on chain, which makes Solidity a target. The allowance moves into a vault as one declared change, and every write is
signed by the person's own wallet. Architect generates the Solidity types, the compiled machine, what each person signs, and Foundry tests.</p>
<h2>5. Time</h2>
<p>One clock per world, moves made by time, and the keeper. The allowance resets every month and expires after a year.</p>
<h2>Later</h2>
<p>More kits: embedded wallets, smart accounts, Safe, tokens. Python as a third target. See <a href="#open">Still to design</a>.</p>
<h2>Before layer one: eight spikes</h2>
<p>Each answers one question in throwaway code, before anything is built on it: names from paths; one declaration through the whole chain; the move without races; evals from telemetry; Nx scaffolds and outputs; two lint rules; the clock and the world's controller; and a thing as a Durable Object with its world. The first, the seventh and the eighth are done, and each said yes, with rules attached.</p>
<h2>What the first layer must prove</h2>
<ol>
<li><code>architect new</code> makes the starter, and check passes.</li>
<li>Adding a thing writes its declarations with blanks, and check names each blank.</li>
<li>With no blanks left, generate writes the server, the API, the SDK, the CLI and the docs, and scaffolds the handlers.</li>
<li>An agent given only its brief fills a handler and gets it green, without seeing the journeys' code.</li>
<li>Prove runs the journeys locally, and every operation passes every eval.</li>
<li>Check catches an edited generated file, a name typed as a string, an undeclared error, and a refusal with no deciding log.</li>
<li>The world's one clock and its controller run under every journey, and a plain sleep in a handler is refused by lint.</li>
<li>Changing a declaration makes stale exactly the proofs it touches.</li>
</ol>` },

{ id: "example", group: "Start", t: "The worked example", h: () => `
<h1>The worked example</h1>
<p class="lede">One example runs through these docs: an allowance. An owner lets a member spend some of the organisation's money each month,
up to a limit. It grows through the five layers, from plain records to real money on chain with a monthly reset.</p>
<p>Each step of the walkthrough introduces one idea and links the page that explains it.</p>
${[1, 2, 3, 4, 5].map((n) => '<h2>Layer ' + n + ": " + LAYER_NAMES[n] + '</h2><ol class="steps-index" start="' + (STEPS.findIndex((s) => s.layer === n) + 1) + '">' +
  STEPS.map((s, i) => [s, i]).filter(([s]) => s.layer === n).map(([s, i]) => '<li><a href="#s' + (i + 1) + '">' + esc(s.t) + "</a>" + (s.see && PAGE_TITLE(s.see) ? ' <span class="muted">· ' + esc(PAGE_TITLE(s.see)) + "</span>" : "") + "</li>").join("") + "</ol>").join("\n")}` },

{ id: "std", group: "Primitives", t: "The standard library and signing", h: () => `
<h1>The standard library and signing</h1>
<p class="lede">Most of what a system reaches for already exists: auth, wallets, a chain client, tokens. The standard library wraps it once,
as kits, behind primitives Architect declares. A project uses a kit and never wraps the package itself.</p>
<h2>Kits</h2>
<p>A kit packages a dependency for every target at once, written in the same blueprint language: its values, operations, errors and
events, its Solidity where it has some, a seed for local worlds, and a brief for agents. See ${f("architect/packages/std/README.md", "what's in it")}.
The example uses two: ${f("acme/blueprint/kits/wallets.ts", "wallets")} and ${f("acme/blueprint/kits/chain.ts", "chain")}, described on <a href="#chain-kit">The chain kit</a>.</p>
<p>Kits arrive finished, with no blanks. <code>architect add kit</code> writes one scaffolded file of your project's choices. Generate then folds the kit's declarations into your model, so its operations get an endpoint, an SDK call, a CLI command, an MCP tool and docs, and the evals apply to them. Agents only fill in where your code meets the kit.</p>
<h2>The signer primitive</h2>
<p>A ${f("architect/packages/std/src/wallets/signer.ts", "signer")} does one thing: given typed data, it returns a signature and the address that made it. Kits implement it with packages that already exist:</p>
<ul>
<li>a local key, in an encrypted keystore, through viem: what the CLI uses;</li>
<li>a browser wallet, anything that speaks the standard wallet protocol;</li>
<li>test keys, a fresh wallet for every test person in every world;</li>
<li>EIP-7702: a person's plain wallet delegated to smart-account code, for batching and sponsored gas, without changing address;</li>
<li>later, an embedded wallet held for the person, such as Openfort, and smart accounts, with Safe as its own kit.</li>
</ul>
<p>A person proves an address is theirs by signing in with Ethereum, which Better Auth supports. The server never holds anyone's key.</p>
<h2>How a signed operation works</h2>
<ol>
<li>An operation says who signs: <code>signedBy: grantee</code> in ${f("acme/blueprint/things/allowance/verbs/spend.ts", "spend")}.</li>
<li>Architect turns its payload into EIP-712 typed data, with a nonce and a deadline: ${f("acme/generated/contracts/AllowanceSignatures.sol", "what each person signs")}.</li>
<li>The SDK fetches the data, signs it with the signer the caller passes, and sends both. The CLI signs with your local key.</li>
<li>The server checks the signature belongs to the caller's linked wallet, so the role and the signer agree, and hands it to ${f("acme/implementation/handlers/allowance/spend.ts", "the handler")}.</li>
<li>The ${f("architect/packages/std/src/chain/relayer.ts", "relayer")} submits it and pays the gas. Without the person's signature it can do nothing.</li>
<li>The contract checks it with OpenZeppelin's SignatureChecker, which accepts a plain wallet and a smart account alike, and uses the nonce so a signed request lands once.</li>
</ol>
<p>Because the contract checks every kind of signer the same way, moving people from a local key to a smart account changes the wallets kit, not the contract or the handlers.</p>` },

{ id: "targets", group: "Primitives", t: "Targets and values", h: () => `
<h1>Targets and values</h1>
<p class="lede">A target is a language the blueprint writes into. Effect is always one. Solidity becomes one the moment a thing lives on
chain. Python is planned as the next.</p>
<p>Every target does the same jobs from the same declarations: it writes the types, the errors, the events and the state machine in its own
language; it scaffolds what you write there, with blanks; it carries telemetry under the declared names; and it generates conformance tests
that run in its own test runner. Targets differ only in how much their own tooling can enforce.</p>
<h2>Solidity</h2>
<p>When ${f("acme/blueprint/things/allowance/thing.ts", "the allowance")} says it lives on chain, in a vault per organisation, Architect writes:</p>
<ul>
<li>${f("acme/generated/contracts/AllowanceTypes.sol", "the types")}: the states and moves as enums, the events, and the errors, including the machine's own refusal;</li>
<li>${f("acme/generated/contracts/AllowanceMachine.sol", "the machine, compiled")}: a contract the vault inherits, so state can only change through its step function;</li>
<li>${f("acme/generated/contracts/AllowanceSignatures.sol", "what each person signs")}, from each operation's payload and its <code>signedBy</code>;</li>
<li>${f("acme/generated/contracts/test/AllowanceMachine.t.sol", "the Foundry tests")}: every move from every state, every write signed by the wrong wallet, and every signed request sent twice;</li>
<li>${f("acme/implementation/contracts/AllowanceVault.sol", "the contract itself")}, scaffolded with blanks where the money moves.</li>
</ul>
<p>The compiled contract then owns its ABI. Architect reads it with <code>forge build</code> and generates ${f("acme/generated/api/src/contracts/allowance-vault.ts", "the contract's Effect client")}: every write a span, every custom error decoded into its typed error. Nothing is declared twice.</p>
<h2>Values</h2>
<p>Fields are made of named values, and a value that crosses into another language says what it is there. ${f("acme/blueprint/values/money.ts", "An amount")} is declared once: a bigint in Effect, a <code>uint128</code> in Solidity. ${f("acme/blueprint/values/chain.ts", "The chain's values")} come with the chain kit.</p>
<h2>Python, later</h2>
<p>Python would be a target built the same way: generated Pydantic models and error classes, a type checker in strict mode in CI, the
Returns library so errors are visible in a function's type, a telemetry helper that continues the trace, and conformance tests in pytest.
Python's types disappear at runtime, so the generated wrapper also checks every call as it comes in and goes out.</p>` },

{ id: "time", group: "Primitives", t: "Time and the clock", h: () => `
<h1>Time and the clock</h1>
<p class="lede">Time belongs to the world, not to any thing. Every world has exactly one clock, and every system in it reads that clock:
the server, the database, the keeper and the chain. A thing never owns time; it only declares moves that depend on it.</p>
<h2>Three kinds of clock</h2>
<ul>
<li><b>Real,</b> in staging and production. Nobody controls a public chain's time.</li>
<li><b>Stepped,</b> in local and test worlds. Time stands still until a journey moves it: <code>s.clock.advance("1 month")</code>.</li>
<li><b>Scaled,</b> for long soak runs: a month in a few minutes.</li>
</ul>
<p>In a stepped world, the world's Durable Object steps time like a simulation. It moves the clock, fires every timer that is due (alarms, sleeping workflows, the keeper), moves the local chain's time with it, and waits until the world is quiet before the next step, so <code>block.timestamp</code> always agrees with the server. How, and what a spike found, is on <a href="#clock-design">How the clock works</a>. See ${f("acme/blueprint/environments/local.ts", "the local environment")}.</p>
<h2>Moves made by time</h2>
<p>A move can be made by time instead of a caller. It says when, with <code>every</code> or <code>after</code>, and who fires it, with <code>fires</code>:</p>
<ul>
<li><b>Lazy:</b> worked out the next time anything touches the thing. On chain, that uses the block's own time and costs nothing. The monthly reset is lazy.</li>
<li><b>Keeper:</b> fired by Architect's built-in caller for time, within a declared <code>late</code> window. Expiry is fired by the keeper, because nobody may touch an allowance for a year.</li>
</ul>
<p>See ${f("acme/blueprint/things/allowance/machine.ts", "the allowance's machine")}. The keeper is generated: a grant sets the allowance's own timer, through the world's ${f("acme/generated/keeper/src/allowance.expire.ts", "Timers service")}. In a real world that's a Durable Object alarm; in a stepped world it's a row in the world's timer table, fired when the clock reaches it. On chain the keeper has its own wallet, and ${f("acme/implementation/contracts/AllowanceVault.sol", "the contract")} only lets it make time moves.</p>
<h2>What's checked</h2>
<p>One more eval, <b>on time</b>: did the move happen within its window, with its event? In a journey, after the clock moves; in production,
on every move the keeper fires. The keeper is a caller, so its calls are traced and refused like anyone else's.</p>` },

{ id: "operations", group: "Primitives", t: "Operations and reads", h: () => `
<h1>Operations and reads</h1>
<p class="lede">An operation changes something: it makes one move of its thing's machine. A read changes nothing: it has no move and no handler.</p>
<h2>What an operation declares</h2>
<p>${f("acme/blueprint/things/allowance/verbs/spend.ts", "Spend")} says:</p>
<ul>
<li>its payload and answer, made of named values;</li>
<li>the move it makes, and so the event it emits and the states it refuses from;</li>
<li>the errors that depend on data, such as <code>AllowanceExceeded</code>;</li>
<li>who may call, and once it's on chain, whose wallet signs;</li>
<li>its steps, each of a kind: database, chain, wait;</li>
<li>its budget, with waits left out;</li>
<li>that it's idempotent: a retry with the same request key spends once. On chain, the signed nonce does the same job.</li>
</ul>
<h2>What the handler is given</h2>
<p>From that, Architect generates ${f("acme/generated/api/src/allowance/spend.handler.ts", "exactly what the handler is given")}: its steps as span wrappers, its move or the contract's client, a checked signature, and an error type that's the declared union, nothing more. The role check, the idempotency key, the move and its event all happen around ${f("acme/implementation/handlers/allowance/spend.ts", "the handler")}, which only does the work.</p>
<h2>Waits</h2>
<p>Some things settle later, like a transaction being confirmed. A wait is a step of its own, and may say <code>within</code>. Waits are left out of the budget and measured on their own.</p>
<h2>Reads</h2>
<p>${f("acme/blueprint/things/allowance/verbs/get.ts", "Get")} and ${f("acme/blueprint/things/allowance/verbs/list.ts", "list")} declare what they return, how they're filtered and who may call. They're generated outright, with no handler. A read of one thing is answered by whoever owns it: the database, its actor, or the contract's own view. A read across things, such as list, comes from the organisation's index, which each thing's events keep current: its own receipts are written through, and the chain follower catches anything else. A question across every organisation comes from an export to R2.</p>` },

{ id: "dependencies", group: "Primitives", t: "Dependencies and edges", h: () => `
<h1>Dependencies and edges</h1>
<p class="lede">Every boundary is a contract with one owner. Code that isn't Effect meets the blueprint in one of two ways: you call it, or it calls you.</p>
<h2>A dependency is something you call</h2>
<p>viem, any library on npm, any outside API. You don't govern it, so it owns its shape. Its declaration adds what it lacks: the errors each
call can fail with, and a span on every call. Its types already exist, so nothing is retyped. Architect generates the service's shape and
its spans, and scaffolds one blank: how its failures map to your errors, because only you know what each one means.</p>
<p>The standard library has done this for viem already: see ${f("architect/packages/std/src/chain/viem.ts", "its declaration")}, so a project uses the chain kit instead. A dependency with a machine-readable contract, such as an OpenAPI file or an ABI, gets its client generated outright.</p>
<h2>An edge is where something calls you</h2>
<p>A framework that calls plain functions: a webhook, or a worker's entry. The edge is generated. It decodes its
input with the blueprint's own schemas, continues the trace, and runs an Effect you write. Being the same language, an edge is fully type-safe.</p>
<h2>Keeping it safe across the boundary</h2>
<ol>
<li>One owner for the shape: the blueprint, or the other side's own contract.</li>
<li>Types generated from that owner, on both sides.</li>
<li>A decode at the wire, so drift becomes a typed error, never a wrong value.</li>
<li>A conformance test, in the other side's own runtime.</li>
</ol>` },

{ id: "worlds", group: "Primitives", t: "Worlds and journeys", h: () => `
<h1>Worlds and journeys</h1>
<p class="lede">A journey is a story told through the operations, with what each step must answer or refuse. A starting world is where the
story begins. Both are part of the blueprint, and both are written by someone other than the builder.</p>
<h2>Starting worlds run operations</h2>
<p>${f("acme/blueprint/starting-worlds/funded.ts", "The funded world")} starts from the starter's organisation and grants an allowance by running the declared operation, so it's seeded exactly the way the system is used. From layer four it also deploys the organisation's vault and funds it on a local chain, and from layer five it sets the clock to a known time. Every test person gets a fresh wallet.</p>
<h2>Journeys move through them</h2>
<ul>
<li>${f("acme/blueprint/journeys/spend-within-allowance.ts", "Spend within the allowance")}: spends, is refused past the limit with what's left, spends the rest, and is refused by the machine.</li>
<li>${f("acme/blueprint/journeys/revoke-then-spend.ts", "Revoke, then spend")}: the owner revokes; the member is refused with the state it was in, and can't revoke it either.</li>
<li>${f("acme/blueprint/journeys/monthly-reset.ts", "The monthly reset")}: the clock moves a month and the allowance is back; it moves a year and the keeper has expired it.</li>
</ul>
<p>Journeys are written against operations, not storage, so moving the allowance on chain barely changes them. Refusals are named, never strings: <code>refuses(AllowanceExceeded, { remaining: 380n })</code>, or <code>refuses(machine.notFrom)</code> for the machine's own.</p>
<h2>Worlds are made and destroyed</h2>
<p>Every journey runs in a fresh world: on your machine, or in CI with a two-hour expiry. A world is created, used and destroyed as one unit, with an owner, so nothing is left running.</p>` },

{ id: "deploy", group: "Primitives", t: "Deploy and publish", h: () => `
<h1>Deploy and publish</h1>
<p class="lede">Every output has a destination, and each environment declares it. Promotion carries one revision through the environments: it deploys what runs, and publishes what others install.</p>
<h2>Destinations</h2>
<p>${f("acme/blueprint/environments/production.ts", "Production")} says where each output goes:</p>
<ul>
<li>the server and the MCP server are workers; the MCP server is a remote server agents connect to with OAuth;</li>
<li>the world, each organisation, each contract's chain follower and each thing that lives in an actor are Durable Objects, and the keeper fires through their alarms;</li>
<li>things that live in the database are kept in D1, and exports go to R2;</li>
<li>the portal is a site;</li>
<li>contracts are deployed and verified, and only redeployed when their bytecode changes;</li>
<li>the SDK is published to npm; the CLI to npm, a Homebrew tap and GitHub releases.</li>
</ul>
<p>Architect turns that into ${f("acme/generated/infra/src/production.ts", "an Alchemy stack")} for each environment. Secrets, such as the relayer's gas wallet, are named in the environment, and their values live only there.</p>
<h2>Versions are worked out</h2>
<p>The compiled model knows exactly what changed between two releases, so ${f("acme/generated/model/changes.json", "it sets the version")}: a new operation or read is minor; a payload that changed is major; a changed budget is a patch. The same comparison lists the proofs that went stale, and whether a contract must be deployed.</p>
<h2>Promotion</h2>
<p><code>architect promote --to staging</code>, then <code>--to production</code>. Production accepts only a revision that's green in staging. After a deploy, the same evals watch what the running system records.</p>` },
{ id: "runtime", group: "Primitives", t: "Where state lives, and the runtime", h: () => `
<h1>Where state lives, and the runtime</h1>
<p class="lede">Every thing's state has exactly one owner. The owner is chosen per thing, with <code>lives</code>, and everything else reads from it or asks it.</p>
<div class="callout">Proposed, and backed by a spike: a thing as a Durable Object, with its world, run locally in Cloudflare's own runtime. What it found is below.</div>
<h2>Three owners</h2>
<ul>
<li><b>The database.</b> Layer one's default: Cloudflare's D1, its managed SQLite. The thing's records are rows, and a version column generated from the machine stops two moves landing on the same state. Locally, Cloudflare's runtime emulates D1 itself, so a local world needs no database process at all.</li>
<li><b>An actor:</b> <code>lives: Blueprint.actor()</code>. Each instance of the thing is a Cloudflare Durable Object, a small server with an address and its own SQLite storage. It owns its state there, and handles one message at a time, so two moves on one allowance can't race.</li>
<li><b>The chain:</b> <code>lives: Blueprint.chain(...)</code>. The contract owns the state, as ${f("acme/blueprint/things/allowance/thing.ts", "the allowance")} does from layer four.</li>
</ul>
<h2>The world is an object too</h2>
<p>Each world, the running copy of the system that a journey or an environment uses, is a Durable Object. It is the registry every thing registers with, the controller of the world's clock, and the front door everyone talks to. Its own alarm, a timer the object sets for itself, destroys the world when it expires.</p>
<h2>Organisations hold the index</h2>
<p>Each organisation is a Durable Object holding an index of its things, built from their events. A read across things, such as listing an organisation's allowances, is answered by that one object, without visiting each thing. Questions across every organisation come from an export to R2.</p>
<h2>Benches</h2>
<p>Some processes are too heavy for an object, such as a local Anvil chain. These run in Cloudflare Containers, each owned by a Durable Object. Every world registers with a bench, and the bench serves it on that world's own clock. This is the lesson of Capxul's shared Frappe bench: two worlds at different clocks can share one bench, as long as time belongs to the world and never to the host.</p>
<h2>Waits and the relayer</h2>
<ul>
<li><b>Durable workflows</b> carry long waits. Each declared step is a durable activity, saved as it finishes, and <code>idempotent: "request"</code> becomes the workflow's key, so a restart never runs a finished step twice.</li>
<li><b>The ${f("architect/packages/std/src/chain/relayer.ts", "relayer")}</b> is an actor, one per key, so nonces are handed out in order.</li>
</ul>
<h2>What the spike found</h2>
<ul>
<li><b>The race is real.</b> A Durable Object runs one request at a time only until the code waits on something, such as a timer or a call to another object. With a wait in the middle of a move, two spends at once both went through and one was lost.</li>
<li><b>A generated lock fixes it.</b> Architect wraps every move in a lock of one permit, so a second move waits for the first to finish. Reads don't take the lock. It cost nothing measurable: about seven milliseconds a spend, locally, with or without it.</li>
<li><b>The index stays right.</b> The world's index answered every question correctly after every move, because it only applies a thing's snapshot when it is newer than the one it holds.</li>
</ul>
<p>It also named what the framework must add: an <b>outbox</b>, so a move and its event reach the index even if the hop fails, retried by the thing's alarm; an <b>in-between state</b>, such as <code>spending</code>, for a chain call, because a chain call can't be undone; and a <b>time limit</b> on waiting for the lock.</p>
<h2>One runtime</h2>
<p>Only Cloudflare is built, and its storage is all SQLite: D1 for things that live in the database, each Durable Object's own storage for actors and organisation indexes, and R2 for exports. A second runtime would mean a second of everything under the blueprint, so the seam is kept in the code, but nothing uses it.</p>
<h2>What follows</h2>
<ul>
<li>An actor never holds a second copy of data owned elsewhere.</li>
<li>Each call to a thing gains a hop, from the server to the thing's object.</li>
<li>The stepped clock must reach alarms and workflows, not just the server. See <a href="#clock-design">How the clock works</a>.</li>
</ul>` },

{ id: "clock-design", group: "Primitives", t: "How the clock works", h: () => `
<h1>How the clock works</h1>
<p class="lede">A stepped world only works if nothing reads time behind the clock's back. This page is the design that makes that true.</p>
<h2>1. One clock</h2>
<p>All code reads time from Effect's <code>Clock</code>, the service Effect provides for the current time. The database never calls <code>now()</code>: times are passed in. A lint rule forbids <code>Date.now</code> and <code>new Date()</code>, so the rule holds without anyone remembering it.</p>
<h2>2. One Timers service</h2>
<p>Every wait goes through one service, <code>Timers</code>: Durable Object alarms, workflow sleeps, and the keeper's timers. In a real world it sets real alarms. In a stepped world it records each timer in the world's table instead, with when it's due.</p>
<h2>3. Stepping is a simulation</h2>
<p>When a journey moves the clock, for example <code>s.clock.advance("1 month")</code>, the world's Durable Object steps time like a simulation:</p>
<ol>
<li>Find the earliest due timer before the target time.</li>
<li>Move every clock to it: Effect's <code>TestClock</code>, and the chain, by setting Anvil's next block timestamp and mining a block.</li>
<li>Fire whatever is due.</li>
<li>Wait until the world is quiet: nothing in flight, nothing queued, every workflow parked.</li>
<li>Repeat, then move to the target.</li>
</ol>
<p>So ${f("acme/blueprint/journeys/monthly-reset.ts", "the monthly reset")} sees each month's reset and the year's expiry in order, exactly as a real year would, and ${f("acme/generated/keeper/src/allowance.expire.ts", "the keeper")} fires once.</p>
<h2>What the spike found</h2>
<p>A whole year ran in under a tenth of a second, and ten runs out of ten gave the same timeline. At every step, Effect's clock, the timers, a sleeping workflow and the local chain agreed to the millisecond. It holds only under three rules:</p>
<ol>
<li><b>All work is counted.</b> Every handler, workflow and keeper job runs as counted work, so the world knows when it is quiet. Effect's test clock can't tell on its own, because a woken fiber that waits on a network call escapes it.</li>
<li><b>No plain sleeps.</b> A lint rule bans <code>Effect.sleep</code> and other timers in handlers; every wait goes through <code>Timers</code>. With plain sleeps, the chain ended up anything from a month behind to most of a year ahead, and runs stopped matching.</li>
<li><b>The chain stands still between steps.</b> The local chain is told not to follow the wall clock, and instants are whole seconds, as a chain's are.</li>
</ol>
<p>It also caught a real bug: counting months as thirty-day blocks since 1970 resets an allowance a day and a half after it's granted. A period has an anchor. The allowance's monthly reset counts calendar months from the grant.</p>
<h2>4. Outside clocks</h2>
<p>An outside service keeps its own time. It is a dependency with declared tolerances, such as how far its clock may drift, or a fake in test worlds that reads the world's clock.</p>
<h2>5. Why it's spiked in layer one</h2>
<p>Time moves arrive in layer five. But time must go through the clock from the first line of code, or layer five means finding every hidden read. The spike proves the clock, the timers and the world's controller before anything depends on them.</p>` },

{ id: "chain-kit", group: "Primitives", t: "The chain kit", h: () => `
<h1>The chain kit</h1>
<p class="lede">viem is the only real dependency for reaching a chain, and it enters through this one kit. Everything else is adapted into the kit, or built small, so a project never wraps a chain library itself.</p>
<p>See ${f("acme/blueprint/kits/chain.ts", "how a project uses it")}, and ${f("architect/packages/std/src/chain/viem.ts", "viem's declaration")}.</p>
<h2>Adapted, not depended on</h2>
<p>From <code>@prb/effect-evm</code>, which is MIT-licensed and built on Effect 4, the kit adapts:</p>
<ul>
<li>services to read and write contracts;</li>
<li>transaction tracking: receipts, and transactions replaced or dropped;</li>
<li>viem's errors as tagged errors: <code>ChainUnavailable</code>, <code>ChainRejected</code>, <code>ChainTimeout</code>;</li>
<li>typed-data signing.</li>
</ul>
<p>Skipped: the browser parts, React hooks, wagmi, NFTs, Safe Apps, and WebSocket subscriptions.</p>
<h2>The relayer</h2>
<p>${f("architect/packages/std/src/chain/relayer.ts", "The relayer")} submits signed requests and pays the gas. It runs as an actor, one per key, so nonces stay in order.</p>
<h2>The chain follower</h2>
<p>The follower keeps things in step with what the chain records, in two ways:</p>
<ul>
<li><b>Write-through:</b> each thing reads its own receipts, so its own moves land at once.</li>
<li><b>One Durable Object per contract.</b> It wakes on its alarm, reads new events in chunks, and keeps a checkpoint of how far it got. It watches recent block hashes for reorganisations, when the chain replaces recent blocks, and sends corrections. It decodes each event with generated schemas, and hands it to its thing.</li>
</ul>
<p>The ideas are credited to <code>effective-indexer</code>, an MIT package. There's no Ponder, and nothing hosted.</p>
<h2>Simulation</h2>
<p>Simulation is a primitive: run a write without sending it, and see whether it would succeed. It's free through the node, with <code>eth_call</code>, or <code>eth_simulateV1</code> where supported. A forked local Anvil in a bench can do the same. Tenderly is an opt-in kit. The relayer simulates before it spends gas, so a refusal comes back as a typed error first.</p>
<h2>EIP-7702, in the wallets kit</h2>
<p>EIP-7702 lets a person's plain wallet delegate to smart-account code, for batching and sponsored gas, without changing its address. It belongs to ${f("acme/blueprint/kits/wallets.ts", "the wallets kit")}, beside ${f("architect/packages/std/src/wallets/signer.ts", "the signer")}.</p>
<h2>Safe, later</h2>
<p>Safe becomes its own kit. It's built from Safe's ABI events and a small core of our own: address prediction, transaction hashing, execution encoding and multisend. Safe's Protocol Kit is used only in conformance tests, and Safe's LGPL contracts are used as published.</p>` },

{ id: "day", group: "Start", t: "Day to day", h: () => `
<h1>Day to day</h1>
<p class="lede">What working with Architect feels like, from a quiet morning to a release. The commands are short; most of the work is reading what they tell you.</p>
<h2>Keep a world running</h2>
<p><code>architect dev</code> starts a local world and keeps it: the server, the portal live, and a log with one line per call, showing its steps and its evals. When you save a file, it regenerates and re-proves only what changed.</p>
<pre class="code">$ architect dev
world local-7c2 · clock stepped · portal http://localhost:4100
allowance.spend   200  38ms  load·submit·confirm  evals 9/9 ✓
saved blueprint/things/allowance/verbs/spend.ts
regenerated 4 files · re-proved 2 journeys ✓</pre>
<h2>Design with your agent</h2>
<p><code>architect add thing</code> writes the declarations with blanks. Check lists each blank, and the portal draws the machine as you fill it in.</p>
<pre class="code">$ architect add thing allowance
wrote blueprint/things/allowance/ (thing, machine, events, errors, roles)
$ architect check
blank  machine.ts      states: which states can an allowance be in?
blank  verbs/spend.ts  allowed: who may spend?</pre>
<h2>Hand work to an agent</h2>
<p>A brief is everything an agent needs for one blank: the job, what to read, what not to touch, when it's done, and what the handler is given.</p>
<pre class="code">$ architect brief allowance.spend
job        fill implementation/handlers/allowance/spend.ts
read       blueprint/things/allowance/verbs/spend.ts
don't touch generated/, blueprint/
done when  journeys spend-within-allowance, revoke-then-spend pass
given      steps load, submit, confirm · errors AllowanceExceeded</pre>
<p>See ${f("acme/generated/api/src/allowance/spend.handler.ts", "what the handler is given")}.</p>
<h2>Reach for the chain</h2>
<p>Adding the chain and wallets kits gives the handler a contract client and the relayer. The dev log then shows each call's relay, confirm and follower lines.</p>
<pre class="code">$ architect add kit chain wallets
$ architect chain status
anvil   bench local-7c2 · block 1,204 · clock 2026-11-16T09:00Z
relayer 0x3b…9e · nonce 18 · nothing pending
follower AllowanceVault · checkpoint 1,204 · 0 reorgs</pre>
<h2>What a person using it sees</h2>
<p>Someone installs the CLI with Homebrew, signs in, makes a wallet and links it, then spends. The CLI asks them to sign, because the spend is theirs.</p>
<pre class="code">$ brew install acme/tap/acme
$ acme login
$ acme wallet create
$ acme wallet link
$ acme allowance spend alw_7f3 --to 0x5a…c1 --amount 400
sign this spend of 400 from alw_7f3? [y/N] y
remaining 600 · tx 0x91…4d</pre>
<p>A developer using ${f("acme/generated/sdk/src/allowance/spend.ts", "the SDK")} passes a signer. An agent using ${f("acme/generated/mcp/src/server.ts", "the MCP server")} asks the person to sign, and never holds a key.</p>
<h2>Ship</h2>
<p><code>git push</code> runs the journeys in a fresh world and posts a verdict per operation. <code>architect promote</code> carries a green revision on.</p>
<pre class="code">$ git push
ci  allowance.spend  green · allowance.grant  green · 14/14 journeys
$ architect promote --to staging</pre>
<h2>Change something</h2>
<p><code>architect impact</code> says what a change will cost before you make it: the version, the proofs it makes stale, what regenerates, who is re-briefed and which journeys re-run.</p>
<pre class="code">$ architect impact blueprint/things/allowance/verbs/spend.ts
version   1.4.0 → 2.0.0 (payload changed)
stale     allowance.spend in staging, production
regenerate sdk, cli, docs, api: 7 files
re-brief  implementation/handlers/allowance/spend.ts
re-run    spend-within-allowance, revoke-then-spend</pre>
<p>The version comes from ${f("acme/generated/model/changes.json", "the model's comparison")}.</p>` },

{ id: "open", group: "Decisions", t: "Still to design", h: () => `
<h1>Still to design</h1>
<p class="lede">Only the first layer's primitives are decided before Architect is built. Everything else is noted here, with the layer that first needs it, and decided at the start of that layer, using the earlier layers as evidence.</p>
<h2>Layer 1</h2>
<ul>
<li><b>Moves with more than one outcome.</b> Proposed: <code>to</code> takes a list; the handler or contract says which, the machine says whether it may.</li>
<li><b>Reads.</b> Proposed: <code>Blueprint.read</code>, answered from the thing's records, with no handler.</li>
<li><b>Idempotency.</b> Proposed: <code>idempotent: "request"</code>, keyed by the caller's request key.</li>
<li><b>Starting worlds that run operations</b> rather than writing rows.</li>
<li><b>Where state lives,</b> and the database: D1, each Durable Object's own storage, and R2 for exports. See <a href="#runtime">Where state lives</a>.</li>
<li><b>Sign-in:</b> a built-in Better Auth adapter, which becomes the auth kit in layer three.</li>
<li><b>File names with several words</b> keep their dashes, such as <code>change-role.ts</code>, and the compiler maps them to <code>changeRole</code>.</li>
<li><b>The clock and timers,</b> routed through from day one, though time moves wait for layer five. See <a href="#clock-design">How the clock works</a>.</li>
</ul>
<h2>Layer 2</h2>
<ul>
<li><b>Destinations, and versions worked out from the model,</b> as on <a href="#deploy">Deploy and publish</a>.</li>
<li><b>Secrets,</b> named per environment.</li>
</ul>
<h2>Layer 3</h2>
<ul>
<li><b>Kits,</b> and the exact shape of one, as on <a href="#std">The standard library</a>.</li>
<li><b>The chain kit,</b> simulation, and the chain follower, as on <a href="#chain-kit">The chain kit</a>.</li>
</ul>
<h2>Layer 4</h2>
<ul>
<li><b>Targets and values,</b> as on <a href="#targets">Targets and values</a>.</li>
<li><b>Signing:</b> <code>signedBy</code>, the generated typed data, the relayer, and wallets linked by signing in with Ethereum.</li>
<li><b>EIP-7702</b> in the wallets kit.</li>
<li><b>One contract per owner,</b> such as a vault per organisation, and how worlds deploy them.</li>
</ul>
<h2>Layer 5</h2>
<ul>
<li><b>Time moves,</b> as on <a href="#time">Time and the clock</a>.</li>
<li><b>The keeper's own key,</b> limited to time moves.</li>
</ul>
<h2>Later</h2>
<ul>
<li><b>Safe</b> as its own kit, built from its own events and our own small core.</li>
<li><b>An outbox and in-between states,</b> from the Durable Object spike: a move's event always reaches its index, and a chain call has a state of its own while it is in flight.</li>
<li><b>Python</b> as a third target.</li>
<li><b>Actors for every thing,</b> as on <a href="#runtime">Where state lives</a>.</li>
<li><b>Migrations</b> when a machine's states change.</li>
<li><b>Side-by-side versions</b> of an operation, once real callers exist.</li>
<li><b>Derivations,</b> such as an address worked out from something else.</li>
</ul>
<h2>Eight spikes before layer one</h2>
<p>A spike is a small, throwaway build that answers one question. These come first. Three are already done, each a yes with rules attached: names from paths, the clock and the world's controller, and a thing as a Durable Object.</p>
<ol>
<li><b>Names from paths</b> (done): an operation's name comes from its file's path, and an error's from its exported class. A rename in one place renames it everywhere, and the compiler guides every edit.</li>
<li><b>One declaration through the whole chain:</b> from the blueprint to the server, the SDK, the CLI and the docs.</li>
<li><b>The move without races:</b> two moves on one thing, and only one lands.</li>
<li><b>Evals from telemetry:</b> each eval judged from the trace alone.</li>
<li><b>Nx scaffolds and outputs:</b> generators that write blanks once and outputs every time.</li>
<li><b>Two lint rules:</b> a declared name typed as a string, and a refusal with no deciding log.</li>
<li><b>The clock and the world's controller</b> (done), stepping time as on <a href="#clock-design">How the clock works</a>.</li>
<li><b>A thing as a Durable Object, with its world</b> (done), as on <a href="#runtime">Where state lives</a>.</li>
</ol>` },
