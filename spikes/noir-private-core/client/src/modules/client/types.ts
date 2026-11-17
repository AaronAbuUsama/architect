import { Context, Data, Effect } from "effect";
import type { AztecAddress } from "@aztec/aztec.js/addresses";
import type { AztecNode } from "@aztec/aztec.js/node";
import type { ExecutionPayload, Tx, TxReceipt, TxExecutionRequest } from "@aztec/stdlib/tx";
import type { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import type { EmbeddedWallet } from "@aztec/wallets/embedded";
import type { PXE } from "@aztec/pxe/server";
import type { FeeOptions } from "@aztec/wallet-sdk/base-wallet";

export class AllowanceExceeded extends Data.TaggedError("AllowanceExceeded")<{ remaining: bigint }> {}
export class AllowanceNotAdmin extends Data.TaggedError("AllowanceNotAdmin") {}
export class AllowanceNotMember extends Data.TaggedError("AllowanceNotMember") {}
export class NetworkRejected extends Data.TaggedError("NetworkRejected")<{ reason: "Existing nullifier" | "Nullifier conflict" | "Invalid expiration timestamp" | "dropped" | "reverted" }> {}
export class AztecFailure extends Data.TaggedError("AztecFailure")<{ step: string }> {}
export type OpError = AllowanceExceeded | AllowanceNotAdmin | AllowanceNotMember | NetworkRejected | AztecFailure;
export type Step = "request" | "sync" | "prove" | "submit" | "wait" | "read";
export type ClassifyFailure = (step: Step, error: unknown) => OpError;
export interface Interaction {
  request(options: { fee: { paymentMethod: SponsoredFeePaymentMethod } }): Promise<ExecutionPayload>;
}
export interface Timings { provingMs: number; proveMs: number; totalMs: number }
export interface Proven {
  readonly tx: Tx;
  readonly anchor: number;
  readonly expires: number;
  readonly timings: Timings;
  readonly submit: Effect.Effect<Committed, OpError>;
}
export interface Committed {
  readonly tx: Tx;
  readonly receipt: TxReceipt;
  readonly anchor: number;
  readonly expires: number;
  readonly timings: Timings;
}
export interface DeviceConfig {
  readonly wallet: WalletAccess;
  readonly node: AztecNode;
  readonly from: AztecAddress;
  readonly pool: AztecAddress;
  readonly sponsor: AztecAddress;
}
export interface WalletAccess extends EmbeddedWallet {
  readonly engine: PXE;
  fee(payload: ExecutionPayload, from: AztecAddress): Promise<FeeOptions>;
  execution(payload: ExecutionPayload, from: AztecAddress, fee: FeeOptions): Promise<TxExecutionRequest>;
  scope(from: AztecAddress, pool: AztecAddress): AztecAddress[];
}
export interface ClientShape {
  readonly prove: (operation: string, interaction: Interaction) => Effect.Effect<Proven, OpError>;
  readonly run: (operation: string, interaction: Interaction) => Effect.Effect<Committed, OpError>;
}
export class Device extends Context.Service<Device, DeviceConfig>()("spike/Device") {}
export class Client extends Context.Service<Client, ClientShape>()("spike/Client") {}
