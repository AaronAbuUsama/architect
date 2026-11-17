import type { Effect } from "effect";
import type { AztecAddress } from "@aztec/aztec.js/addresses";
import type { AztecNode } from "@aztec/aztec.js/node";
import type { AztecNodeAdmin } from "@aztec/stdlib/interfaces/client";
import type { EthCheatCodes } from "@aztec/ethereum/test";
import type { PrivateCoreContract } from "~/generated/PrivateCore.js";
import type { Committed, Interaction, OpError, Proven, WalletAccess } from "~/modules/client/types.js";

export interface Person { wallet: WalletAccess; address: AztecAddress }
export type ClockControls = Pick<Harness, "node" | "eth" | "tick" | "wait">;
export interface Harness {
  readonly node: AztecNode;
  readonly api: AztecNodeAdmin;
  readonly eth: EthCheatCodes;
  readonly pool: AztecAddress;
  readonly admin: Person;
  readonly member: Person;
  readonly recipient: Person;
  readonly raceMembers: readonly Person[];
  core(person: Person): PrivateCoreContract;
  run(person: Person, name: string, interaction: Interaction): Effect.Effect<Committed, OpError>;
  prove(person: Person, name: string, interaction: Interaction): Effect.Effect<Proven, OpError>;
  read(person: Person): Effect.Effect<readonly [boolean, bigint, bigint, bigint], unknown>;
  tick(): Effect.Effect<Committed, OpError>;
  ordinary(): Effect.Effect<Committed, OpError>;
  wait(ms: number): Effect.Effect<void>;
}
