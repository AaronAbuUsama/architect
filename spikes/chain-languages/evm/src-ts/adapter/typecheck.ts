// What the ABI-typed adapter buys us, proven by the compiler: wrong names, wrong arg types and wrong event fields do not compile.
import { getContract, type Address, type PublicClient } from "viem";
import { testTokenAbi } from "../../gen/abi.ts";
declare const client: PublicClient; declare const a: Address;
const t = getContract({ address: a, abi: testTokenAbi, client });
export const ok: Promise<bigint> = t.read.balanceOf([a]);
// @ts-expect-error  no such function on their ABI
t.read.balanceOff([a]);
// @ts-expect-error  the argument is an address, not a number
t.read.balanceOf([1n]);
// @ts-expect-error  a read result is bigint, not string
export const bad: Promise<string> = t.read.balanceOf([a]);
export const logs = client.getContractEvents({ address: a, abi: testTokenAbi, eventName: "Transfer", strict: true });
export const f = async () => { const l = await logs; const v: bigint = l[0]!.args.value; return v; };
// @ts-expect-error  Transfer has no field `amount`
export const g = async () => { const l = await logs; return l[0]!.args.amount; };
