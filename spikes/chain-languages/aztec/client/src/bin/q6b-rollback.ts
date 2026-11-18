// Q6 follow-up: after a forced rollback, does the node recover, and does the rolled-back tx come back?
import { getPublicEvents } from "@aztec/aztec.js/events";
import { createAztecNodeAdminClient } from "@aztec/stdlib/interfaces/client";
import { GovernanceContract } from "../generated/Governance.js";
import { connect, newActor, introduce, deployGovernance, gov, now, save } from "../lib/world.js";

const w = await connect();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const admin = await newActor(w); await introduce([admin]);
const g = await deployGovernance(w, admin);
const at = gov(admin, g.address).methods;
const adm = createAztecNodeAdminClient("http://127.0.0.1:8880");
const tips = async () => Object.fromEntries(Object.entries(await w.node.getChainTips()).map(([k, v]: any) => [k, Number(v?.block?.number ?? v?.number ?? v)]));
const events = async () => (await getPublicEvents<any>(w.node, GovernanceContract.events.ProposalOpened, { contractAddress: g.address, fromBlock: 1 } as never)).events.map((e: any) => ({ proposal: String(e.event.proposal), block: Number(e.metadata.l2BlockNumber) }));
const back = Number(process.argv[2] ?? 1);
const log: any[] = [];
const snap = async (label: string, hash?: any) => { const r: any = hash ? await w.node.getTxReceipt(hash) : undefined; const s = { label, tips: await tips(), events: await events(), tx: r ? { status: r.status, block: r.blockNumber ? Number(r.blockNumber) : null } : undefined }; log.push(s); console.log(JSON.stringify(s)); };

const a: any = await at.open_proposal(1n, 11n).send({ from: admin.address, fee: w.fee });
const blockA = Number(a.receipt.blockNumber);
await snap("A mined", a.receipt.txHash);
try { await adm.rollbackTo(blockA - back); log.push({ rollbackTo: blockA - back, accepted: true }); } catch (e) { log.push({ rollbackTo: blockA - back, refused: String((e as Error).message).slice(0, 200) }); }
for (const s of [1, 5, 15, 30]) { await sleep(s === 1 ? 1000 : 4000 * (s === 5 ? 1 : 3)); await snap(`+${s}s after rollbackTo(${blockA - back})`, a.receipt.txHash); }
// Poke: submit a new tx. Does the node produce blocks again? Is A re-included?
const t = now();
let poke: any;
try { poke = await at.open_proposal(2n, 22n).send({ from: admin.address, fee: w.fee, wait: { timeout: 60 } } as never); log.push({ poke: "mined", ms: Math.round(now() - t), block: Number(poke.receipt.blockNumber) }); }
catch (e) { log.push({ poke: "failed", ms: Math.round(now() - t), error: String((e as Error).message).slice(0, 200) }); }
await sleep(5000);
await snap("after poke", a.receipt.txHash);
save(`q6b-rollback-back${back}.json`, log);
process.exit(0);
