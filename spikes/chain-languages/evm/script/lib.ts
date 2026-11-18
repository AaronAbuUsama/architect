// Shared helpers for the spike scripts: start/stop Anvil, clients on unlocked dev accounts, artifacts, raw reverts.
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";

export const PORT = 18545;
export const URL = `http://127.0.0.1:${PORT}`;
const ANVIL = `${process.env.HOME}/.foundry/bin/anvil`;

const procs: ChildProcess[] = [];
const killAll = () => { for (const p of procs) if (!p.killed) p.kill("SIGKILL"); };
process.on("exit", killAll);
for (const s of ["SIGINT", "SIGTERM"] as const) process.on(s, () => { killAll(); process.exit(130); });

/** Starts Anvil on 18545 with --silent (the banner prints dev private keys; we never want those in output). */
export const startAnvil = async (args: string[] = []) => {
  const t0 = performance.now();
  const p = spawn(ANVIL, ["--silent", "--port", String(PORT), ...args], { stdio: "ignore" });
  procs.push(p);
  const pc = publicClient();
  for (;;) {
    try { await pc.getChainId(); break; } catch { await new Promise((r) => setTimeout(r, 5)); }
  }
  return { startMs: performance.now() - t0, stop: () => { p.kill("SIGKILL"); } };
};

export const transport = http(URL);
export const publicClient = () => createPublicClient({ chain: foundry, transport, pollingInterval: 20 });
export const walletFor = (account: Address) => createWalletClient({ chain: foundry, transport, account }); // JSON-RPC account: eth_sendTransaction, the node signs
export const accountsOf = async () => (await rpc<Address[]>("eth_accounts"));

export const artifact = (file: string, name = file) => {
  const j = JSON.parse(readFileSync(`out/${file}.sol/${name}.json`, "utf8"));
  return { abi: j.abi as Abi, bytecode: j.bytecode.object as Hex };
};

export const deploy = async (file: string, from: Address, args: unknown[] = [], name = file) => {
  const { abi, bytecode } = artifact(file, name);
  const pc = publicClient();
  const hash = await walletFor(from).deployContract({ abi, bytecode, args });
  const r = await pc.waitForTransactionReceipt({ hash });
  if (r.status !== "success" || !r.contractAddress) throw new Error(`deploy ${name} failed`);
  return r.contractAddress;
};

/** eth_call that returns the raw revert data (or the error message when the node gives none). */
export type Raw = { ok: true; data: Hex } | { ok: false; data: Hex | undefined; message: string; code?: number };
export const rawCall = async (tx: { from: Address; to: Address; data: Hex; gas?: Hex }): Promise<Raw> => {
  try {
    const data = (await publicClient().request({ method: "eth_call", params: [tx, "latest"] })) as Hex;
    return { ok: true, data };
  } catch (e: any) {
    const inner = e?.cause ?? e;
    const d = inner?.data ?? e?.data;
    return { ok: false, data: typeof d === "string" ? (d as Hex) : undefined, message: String(e?.details ?? inner?.message ?? e?.message).split("\n")[0], code: e?.code ?? inner?.code };
  }
};

export const rpc = <T = unknown>(method: string, params: unknown[] = []) =>
  publicClient().request({ method, params } as never) as Promise<T>;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const log = (k: string, v: unknown) => console.log(`${k}: ${typeof v === "string" ? v : JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() + "n" : x))}`);
