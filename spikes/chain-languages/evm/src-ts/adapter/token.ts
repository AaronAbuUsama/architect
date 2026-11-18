// Q2(a): an adapter for someone else's ERC-20, typed only from its ABI (`as const`). Nothing here knows our contract.
import { getContract, type Address, type PublicClient } from "viem";
import { testTokenAbi } from "../../gen/abi.ts";

export const tokenAdapter = (client: PublicClient, address: Address) => {
  const token = getContract({ address, abi: testTokenAbi, client });
  return {
    /** typed: owner is an Address, result is bigint */
    balanceOf: (owner: Address) => token.read.balanceOf([owner]),
    /** typed events: args are { from: Address; to: Address; value: bigint } */
    transfers: (fromBlock: bigint, toBlock?: bigint) =>
      client.getContractEvents({ address, abi: testTokenAbi, eventName: "Transfer", fromBlock, toBlock, strict: true }),
  };
};
