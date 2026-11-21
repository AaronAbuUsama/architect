import type { Address } from "viem"

export function budgetSpendData(chainId: number, verifyingContract: Address, message: {
  safe: Address; hatId: bigint; to: Address; amount: bigint; signer: Address; nonce: bigint; deadline: bigint;
}) {
  return {
    domain: { name: "Budgets", version: "1", chainId, verifyingContract },
    types: { BudgetSpend: [
      { name: "safe", type: "address" },
      { name: "hatId", type: "uint256" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "signer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ] },
    primaryType: "BudgetSpend",
    message,
  } as const
}
