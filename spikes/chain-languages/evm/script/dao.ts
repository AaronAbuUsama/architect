// A thin typed handle on a deployed MiniDao: simulate first (eth_call), then send; decode every revert.
import { encodeFunctionData, pad, toHex, type Address, type Hex } from "viem";
import { miniDaoAbi } from "../gen/abi.ts";
import { decodeRevert, type Decoded } from "./decode.ts";
import { publicClient, rawCall, walletFor } from "./lib.ts";

export const id = (n: number | bigint): Hex => pad(toHex(n), { size: 32 });
type Fn = "open" | "vote" | "close" | "addMember" | "voteBySig" | "forceClose";

export const daoAt = (to: Address, abi: any = miniDaoAbi) => {
  const data = (fn: Fn, args: unknown[]) => encodeFunctionData({ abi, functionName: fn, args } as never);
  /** eth_call from `from`: ok, or the decoded refusal plus the raw revert data. */
  const sim = async (from: Address, fn: Fn, args: unknown[]): Promise<{ ok: true } | { ok: false; refusal: Decoded; raw: Hex | undefined; message: string }> => {
    const r = await rawCall({ from, to, data: data(fn, args) });
    return r.ok ? { ok: true } : { ok: false, refusal: decodeRevert(r.data, abi), raw: r.data, message: r.message };
  };
  /** Sends regardless of simulation (explicit gas so a reverting tx still gets mined). Returns the receipt. */
  const send = async (from: Address, fn: Fn, args: unknown[], gas = 1_000_000n) => {
    const hash = await walletFor(from).sendTransaction({ to, data: data(fn, args), gas });
    const pc = publicClient(); // automine: the receipt is already there; fall back to polling when it is not
    return pc.getTransactionReceipt({ hash }).catch(() => pc.waitForTransactionReceipt({ hash }));
  };
  const get = (proposal: Hex) => publicClient().readContract({ address: to, abi, functionName: "get", args: [proposal] }) as Promise<readonly [Hex, bigint, bigint, number]>;
  return { address: to, data, sim, send, get };
};
