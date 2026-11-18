// The "generated client" in miniature: PDA derivation, instruction builders (from the IDL), simulate/send, error decoding.
// Spike code. No secret key is ever printed or written: keypairs are generated in memory by the callers.
import { readFileSync } from "node:fs";
import {
  Connection, Keypair, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction,
  type Commitment, type SimulatedTransactionResponse,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program, type Idl } from "@anchor-lang/core";

export const RPC = "http://127.0.0.1:18899";
export const WS = "ws://127.0.0.1:18900";
export const idl = JSON.parse(readFileSync(new URL("../target/idl/governance.json", import.meta.url), "utf8")) as Idl;
export const PROGRAM_ID = new PublicKey(idl.address);
export const conn = new Connection(RPC, { commitment: "confirmed", wsEndpoint: WS });

// Anchor's Program wants a wallet; we only use it as an instruction/coder factory, so give it a throwaway one.
const dummy = Keypair.generate();
const provider = new AnchorProvider(conn, { publicKey: dummy.publicKey, signTransaction: async (t) => t, signAllTransactions: async (t) => t }, {});
export const program = new Program(idl, provider);

// ---- stable refusal codes (generated from the blueprint; the chain only knows numbers) -------------------------------
export const STABLE: Record<string, string> = { AlreadyVoted: "PR-001", ProposalExists: "PR-002", ProposalNotOpen: "PR-900", NotAllowed: "AR-001" };
export const STATE = ["absent", "open", "passed", "failed"] as const;

// ---- PDAs: the client derives these; it cannot know them from the chain --------------------------------------------
const u64 = (n: number | bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const find = (seeds: Array<Buffer | Uint8Array>) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID)[0];
export const pda = {
  workshop: (admin: PublicKey) => find([Buffer.from("workshop"), admin.toBuffer()]),
  member: (w: PublicKey, wallet: PublicKey) => find([Buffer.from("member"), w.toBuffer(), wallet.toBuffer()]),
  proposal: (w: PublicKey, id: number) => find([Buffer.from("proposal"), w.toBuffer(), u64(id)]),
  vote: (proposal: PublicKey, member: PublicKey) => find([Buffer.from("vote"), proposal.toBuffer(), member.toBuffer()]),
};

// ---- instruction builders (one per declared operation) -------------------------------------------------------------
const choice = (c: "yes" | "no") => (c === "yes" ? { yes: {} } : { no: {} });
export const ix = {
  initializeWorkshop: (admin: PublicKey, gateMint = PublicKey.default) =>
    program.methods.initializeWorkshop(gateMint).accountsPartial({ workshop: pda.workshop(admin), admin, systemProgram: SystemProgram.programId }).instruction(),
  addMember: (w: PublicKey, admin: PublicKey, payer: PublicKey, wallet: PublicKey) =>
    program.methods.addMember(wallet).accountsPartial({ workshop: w, admin, payer, member: pda.member(w, wallet) }).instruction(),
  openProposal: (w: PublicKey, admin: PublicKey, payer: PublicKey, id: number, digest: Buffer | number[]) =>
    program.methods.openProposal(new BN(id), Array.from(digest)).accountsPartial({ workshop: w, admin, payer, proposal: pda.proposal(w, id) }).instruction(),
  vote: (w: PublicKey, voter: PublicKey, payer: PublicKey, id: number, c: "yes" | "no", opts: { init?: boolean; gateToken?: PublicKey | null } = {}) => {
    const proposal = pda.proposal(w, id);
    const accounts = { workshop: w, voter, payer, member: pda.member(w, voter), proposal, voteRecord: pda.vote(proposal, voter), gateToken: opts.gateToken ?? null };
    const m = opts.init ? program.methods.voteInit(new BN(id), choice(c)) : program.methods.vote(new BN(id), choice(c));
    return m.accountsPartial(accounts).instruction();
  },
  closeProposal: (w: PublicKey, admin: PublicKey, id: number) =>
    program.methods.closeProposal(new BN(id)).accountsPartial({ workshop: w, admin, proposal: pda.proposal(w, id) }).instruction(),
  getProposal: (w: PublicKey, id: number) => program.methods.getProposal(new BN(id)).accountsPartial({ workshop: w, proposal: pda.proposal(w, id) }).instruction(),
  previewOutcome: (w: PublicKey, id: number) => program.methods.previewOutcome(new BN(id)).accountsPartial({ workshop: w, proposal: pda.proposal(w, id) }).instruction(),
  resetTally: (w: PublicKey, admin: PublicKey, id: number) =>
    program.methods.resetTally(new BN(id)).accountsPartial({ workshop: w, admin, proposal: pda.proposal(w, id) }).instruction(),
  noisy: (who: PublicKey, n: number, width = 400) => program.methods.noisy(n, width).accountsPartial({ who }).instruction(),
};

// ---- transactions -----------------------------------------------------------------------------------------------
export interface Built { tx: VersionedTransaction; blockhash: string; lastValidBlockHeight: number }
export async function build(ixs: TransactionInstruction[], feePayer: PublicKey, blockhash?: { blockhash: string; lastValidBlockHeight: number }): Promise<Built> {
  const bh = blockhash ?? (await conn.getLatestBlockhash("confirmed"));
  const msg = new TransactionMessage({ payerKey: feePayer, recentBlockhash: bh.blockhash, instructions: ixs }).compileToV0Message();
  return { tx: new VersionedTransaction(msg), blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight };
}
/** Partial signing: each key signs only for itself; the others' slots stay zeroed until their owner signs. */
export const signWith = (b: Built, ...kps: Keypair[]) => {
  const req = b.tx.message.staticAccountKeys.slice(0, b.tx.message.header.numRequiredSignatures); // keys the message really asks to sign
  b.tx.sign(kps.filter((k) => req.some((r) => r.equals(k.publicKey))));
  return b;
};

/** Preflight: simulate with NO signatures checked, so the client can refuse before anybody signs or pays. */
export async function simulate(b: Built, commitment: Commitment = "confirmed") {
  const r = await conn.simulateTransaction(b.tx, { sigVerify: false, replaceRecentBlockhash: true, commitment });
  return r.value;
}

export interface Landed { signature: string; err: unknown; slot: number; logs: string[]; confirmedMs: number }
export async function sendConfirmed(b: Built, level: "processed" | "confirmed" | "finalized" = "confirmed"): Promise<Landed> {
  const t0 = performance.now();
  const signature = await conn.sendRawTransaction(b.tx.serialize(), { skipPreflight: true });
  const order = { processed: 0, confirmed: 1, finalized: 2 } as const;
  for (;;) {
    const st = (await conn.getSignatureStatuses([signature])).value[0];
    if (st?.confirmationStatus && order[st.confirmationStatus] >= order[level]) {
      const ms = performance.now() - t0;
      const t = await conn.getTransaction(signature, { commitment: level === "processed" ? "confirmed" : level, maxSupportedTransactionVersion: 0 });
      return { signature, err: st.err, slot: st.slot, logs: t?.meta?.logMessages ?? [], confirmedMs: ms };
    }
    if ((await conn.getBlockHeight("processed")) > b.lastValidBlockHeight + 2) throw new Error("blockhash expired before landing: " + signature);
    await new Promise((r) => setTimeout(r, 15));
  }
}

export async function airdrop(to: PublicKey, sol: number) {
  const sig = await conn.requestAirdrop(to, sol * 1e9);
  for (;;) { const s = (await conn.getSignatureStatuses([sig])).value[0]; if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return; await new Promise((r) => setTimeout(r, 20)); }
}

// ---- refusal decoding: simulate/transaction error + logs -> typed class with stable code ------------------------------
export type Decoded =
  | { kind: "ok" }
  | { kind: "refusal"; refusal: string; code: string; state?: string; number: number }          // ours, with our stable code
  | { kind: "anchor-framework"; name: string; number: number; account?: string }               // Anchor's own: no code of ours
  | { kind: "other-program"; program: string; custom: number; summary: string }                 // SPL Token, System, ...
  | { kind: "runtime"; summary: string };                                                       // compute, blockhash, ...

// Not our IDL: SPL Token's and the System Program's own error tables (from their source), keyed by (program, number).
const SPL_TOKEN_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SPL_ERRORS: Record<number, string> = { 0: "NotRentExempt", 1: "InsufficientFunds", 2: "InvalidMint", 3: "MintMismatch", 4: "OwnerMismatch", 17: "AccountFrozen" };
const SYSTEM_ERRORS: Record<number, string> = { 0: "AccountAlreadyInUse", 1: "ResultWithNegativeLamports", 2: "InvalidProgramId" };
const byNumber = new Map<number, string>((idl.errors ?? []).map((e) => [e.code, e.name]));
export function decode(err: unknown, logs: string[] = []): Decoded {
  if (err === null || err === undefined) return { kind: "ok" };
  const failed = logs.find((l) => /^Program \w+ failed/.test(l)); // the INNERMOST failing program is the first "failed" line
  const failedProgram = failed?.split(" ")[1];
  const ie = (err as { InstructionError?: [number, unknown] }).InstructionError;
  const custom = typeof ie?.[1] === "object" && ie[1] !== null ? (ie[1] as { Custom?: number }).Custom : undefined;
  if (custom !== undefined && failedProgram === PROGRAM_ID.toBase58()) {
    const name = byNumber.get(custom);
    if (name && STABLE[name]) {
      const m = logs.map((l) => /refusal PR-900 ProposalNotOpen state=(\d)/.exec(l)).find(Boolean);
      return { kind: "refusal", refusal: name, code: STABLE[name], number: custom, ...(m ? { state: STATE[Number(m[1])] } : {}) };
    }
    const fw = logs.map((l) => /AnchorError (?:caused by account: (\w+)\. )?Error Code: (\w+)\. Error Number: (\d+)/.exec(l)).find(Boolean);
    if (fw) return { kind: "anchor-framework", name: fw[2], number: Number(fw[3]), ...(fw[1] ? { account: fw[1] } : {}) };
    return { kind: "anchor-framework", name: "unknown", number: custom };
  }
  if (custom !== undefined && failedProgram) {
    const name = failedProgram === SPL_TOKEN_ID ? SPL_ERRORS[custom] : failedProgram === "11111111111111111111111111111111" ? SYSTEM_ERRORS[custom] : undefined;
    return { kind: "other-program", program: failedProgram, custom, summary: name ?? "not in any IDL we hold" };
  }
  return { kind: "runtime", summary: JSON.stringify(err) };
}
export type { SimulatedTransactionResponse };

// ---- small helper used by the Q2..Q6 scripts: simulate first, send only when the simulation is clean --------------------
export async function attempt(label: string, ixs: TransactionInstruction[], payer: Keypair, ...signers: Keypair[]) {
  const b = signWith(await build(ixs, payer.publicKey), payer, ...signers);
  const sim = await simulate(b);
  const d = decode(sim.err, sim.logs ?? []);
  const landed = d.kind === "ok" ? await sendConfirmed(b) : undefined;
  return { label, d, sim, landed, built: b };
}
export const show = (r: { label: string; d: Decoded }) => `${r.label.padEnd(58)} -> ${r.d.kind === "ok" ? "OK" : JSON.stringify(r.d)}`;
export const lines: string[] = [];
export const say = (s = "") => { console.log(s); lines.push(s); };

/** A funded cast and a ready workshop (admin = cast[0], members = cast[1..n], proposal 1 opened). Keypairs stay in memory. */
export async function fixture(n = 2) {
  const relayer = Keypair.generate(), cast = Array.from({ length: n + 1 }, () => Keypair.generate());
  await Promise.all([airdrop(relayer.publicKey, 100), ...cast.map((k) => airdrop(k.publicKey, 1))]);
  const [admin, ...members] = cast, w = pda.workshop(admin.publicKey);
  const steps: Array<[string, TransactionInstruction]> = [["init", await ix.initializeWorkshop(admin.publicKey)]];
  for (const m of members) steps.push(["add", await ix.addMember(w, admin.publicKey, relayer.publicKey, m.publicKey)]);
  steps.push(["open", await ix.openProposal(w, admin.publicKey, relayer.publicKey, 1, Buffer.alloc(32, 9))]);
  for (const [label, i] of steps) { const r = await attempt(label, [i], relayer, admin); if (r.d.kind !== "ok") throw new Error("fixture " + label + " " + JSON.stringify(r.d)); }
  return { relayer, admin, members, w };
}
