import { EmbeddedWallet } from "@aztec/wallets/embedded";
import type { AztecAddress } from "@aztec/aztec.js/addresses";
import type { ExecutionPayload } from "@aztec/stdlib/tx";
import type { FeeOptions } from "@aztec/wallet-sdk/base-wallet";

// The pinned SDK's static create() preserves subclasses. This adapter exposes
// the same protected seams the handoff used, with their actual SDK types.
export class DeviceWallet extends EmbeddedWallet {
  get engine() { return this.pxe; }
  fee(payload: ExecutionPayload, from: AztecAddress) {
    return this.completeFeeOptions({ from, feePayer: payload.feePayer });
  }
  execution(payload: ExecutionPayload, from: AztecAddress, fee: FeeOptions) {
    return this.createTxExecutionRequestFromPayloadAndFee(payload, from, fee);
  }
  scope(from: AztecAddress, pool: AztecAddress) {
    return this.scopesFrom(from, [pool], pool);
  }
}
